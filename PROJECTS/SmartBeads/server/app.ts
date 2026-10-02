/**
 * Online play server (A9): one Node process that serves the built site (dist/) and the game API.
 *  - WebSocket  /ws?code=ABCDE&token=...      live state pushes + intents (best experience)
 *  - HTTP       POST /api/rooms               create a room  -> { code, token, seat }
 *               POST /api/rooms/:code/join    join a room    -> { code, token, seat }
 *               GET  /api/rooms/:code/state?token=..&since=N   -> view (204 when nothing changed)
 *               POST /api/rooms/:code/action  { token, intent } -> { ok } | { error }
 * The HTTP routes are the polling fallback for hosts that cannot keep WebSocket connections open.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { WebSocketServer, type WebSocket } from 'ws';
import { RoomManager } from './RoomManager';
import type { GameRoom } from './GameRoom';
import type { ClientMessage, Intent, ServerMessage } from './protocol';

export interface AppOptions {
  port?: number;
  /** Folder with the built site (vite build output). Omit to serve the API only. */
  staticDir?: string;
  now?: () => number;
  /** Clock tick period; 1000 in production, small in tests. */
  tickMs?: number;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webmanifest': 'application/manifest+json',
};

const MAX_BODY = 4 * 1024;

function send(res: ServerResponse, status: number, body?: unknown): void {
  if (body === undefined) {
    res.writeHead(status).end();
    return;
  }
  res
    .writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
    .end(JSON.stringify(body));
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        if (size - c.length <= MAX_BODY) reject(new Error('Request too large.'));
        return; // keep draining (cheaply) so the 413 reply can be delivered
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Bad JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function roomReply(room: GameRoom, token: string, seat: 'RED' | 'BLUE') {
  return { code: room.code, token, seat, boardId: room.boardId, settings: room.settings };
}

function isIntent(x: unknown): x is Intent {
  if (!x || typeof x !== 'object') return false;
  const t = (x as { type?: unknown }).type;
  return t === 'move' || t === 'finishChain' || t === 'resign' || t === 'resignRespond';
}

export interface RunningApp {
  server: Server;
  manager: RoomManager;
  port: number;
  close: () => Promise<void>;
}

export async function startApp(options: AppOptions = {}): Promise<RunningApp> {
  const now = options.now ?? (() => Date.now());
  const manager = new RoomManager(now);
  const sockets = new Map<string, Set<{ ws: WebSocket; seat: 'RED' | 'BLUE' }>>();

  function push(room: GameRoom): void {
    const set = sockets.get(room.code);
    if (!set) return;
    for (const s of set) {
      if (s.ws.readyState !== s.ws.OPEN) continue;
      const msg: ServerMessage = { type: 'state', view: room.view(s.seat) };
      s.ws.send(JSON.stringify(msg));
    }
  }

  async function serveStatic(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!options.staticDir) return send(res, 404, { error: 'Not found.' });
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const root = path.resolve(options.staticDir);
    const file = path.resolve(root, rel);
    if (file !== root && !file.startsWith(root + path.sep))
      return send(res, 403, { error: 'Forbidden.' });
    try {
      const body = await readFile(file);
      res
        .writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' })
        .end(body);
    } catch {
      send(res, 404, { error: 'Not found.' });
    }
  }

  async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
    const parts = url.pathname.split('/').filter(Boolean); // ['api','rooms',code?,action?]
    try {
      if (parts.length === 2 && req.method === 'POST') {
        const body = (await readJson(req)) as { boardId?: unknown; settings?: never };
        const made = manager.create(body.boardId, body.settings);
        if ('error' in made) return send(res, 400, made);
        return send(res, 200, roomReply(made.room, made.token, made.seat));
      }
      const code = parts[2] ?? '';
      const action = parts[3];
      if (action === 'join' && req.method === 'POST') {
        const joined = manager.join(code);
        if ('error' in joined)
          return send(res, joined.error.startsWith('No room') ? 404 : 409, joined);
        push(joined.room);
        return send(res, 200, roomReply(joined.room, joined.token, joined.seat));
      }
      const room = manager.get(code);
      if (!room) return send(res, 404, { error: 'No room with that code.' });
      if (action === 'state' && req.method === 'GET') {
        const seat = room.seatFor(url.searchParams.get('token'));
        if (!seat) return send(res, 403, { error: 'Not a player in this room.' });
        room.tick();
        const since = Number(url.searchParams.get('since') ?? '0');
        if (Number.isFinite(since) && since === room.getVersion()) return send(res, 204);
        return send(res, 200, room.view(seat));
      }
      if (action === 'action' && req.method === 'POST') {
        const body = (await readJson(req)) as { token?: string; intent?: unknown };
        const seat = room.seatFor(body.token);
        if (!seat) return send(res, 403, { error: 'Not a player in this room.' });
        if (!isIntent(body.intent)) return send(res, 400, { error: 'Unknown action.' });
        const result = room.act(seat, body.intent);
        push(room);
        return result.ok ? send(res, 200, { ok: true }) : send(res, 409, { error: result.error });
      }
      send(res, 404, { error: 'Not found.' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Bad request.';
      send(res, message === 'Request too large.' ? 413 : 400, { error: message });
    }
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      void handleApi(req, res, url);
    } else {
      void serveStatic(req, res);
    }
  });

  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_BODY });
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const room = manager.get(url.searchParams.get('code') ?? '');
    const seat = room?.seatFor(url.searchParams.get('token'));
    if (!room || !seat) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Not a player in this room.',
        } satisfies ServerMessage),
      );
      ws.close();
      return;
    }
    const entry = { ws, seat };
    let set = sockets.get(room.code);
    if (!set) sockets.set(room.code, (set = new Set()));
    set.add(entry);
    ws.send(JSON.stringify({ type: 'state', view: room.view(seat) } satisfies ServerMessage));
    ws.on('message', (data) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(String(data)) as ClientMessage;
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Bad message.' } satisfies ServerMessage));
        return;
      }
      if (msg.type !== 'intent' || !isIntent(msg.intent)) {
        ws.send(
          JSON.stringify({ type: 'error', message: 'Unknown action.' } satisfies ServerMessage),
        );
        return;
      }
      const result = room.act(seat, msg.intent);
      if (!result.ok) {
        ws.send(JSON.stringify({ type: 'error', message: result.error } satisfies ServerMessage));
      }
      push(room);
    });
    ws.on('close', () => set.delete(entry));
  });

  const ticker = setInterval(() => {
    for (const room of manager.tickAll()) push(room);
  }, options.tickMs ?? 1000);
  const sweeper = setInterval(() => manager.sweep(), 10 * 60 * 1000);
  ticker.unref();
  sweeper.unref();

  await new Promise<void>((resolve) => server.listen(options.port ?? 0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : (options.port ?? 0);

  return {
    server,
    manager,
    port,
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(ticker);
        clearInterval(sweeper);
        for (const client of wss.clients) client.terminate();
        wss.close(() => server.close(() => resolve()));
      }),
  };
}
