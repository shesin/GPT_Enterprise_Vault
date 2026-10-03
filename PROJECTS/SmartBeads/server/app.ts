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
import { readFile, stat } from 'fs/promises';
import { brotliCompress, gzip } from 'zlib';
import { promisify } from 'util';
import path from 'path';
import { WebSocketServer, type WebSocket } from 'ws';
import { RoomManager, SERVER_BUSY } from './RoomManager';
import type { GameRoom } from './GameRoom';
import type { ClientMessage, Intent, ServerMessage } from './protocol';

export interface AppOptions {
  port?: number;
  /** Folder with the built site (vite build output). Omit to serve the API only. */
  staticDir?: string;
  now?: () => number;
  /** Clock tick period; 1000 in production, small in tests. */
  tickMs?: number;
  /** Room creations allowed per client address in a window (default 20 per 10 minutes). */
  createLimit?: RateLimit;
  /** Join attempts (right or wrong code) allowed per client address in a window (default 30 per minute). */
  joinLimit?: RateLimit;
  /** Behind a reverse proxy the client address is the first X-Forwarded-For entry. Off unless the host is trusted. */
  trustProxy?: boolean;
}

export interface RateLimit {
  max: number;
  windowMs: number;
}

/** Sliding-window counter per client address. */
class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    private readonly limit: RateLimit,
    private readonly now: () => number,
  ) {}

  /** Records one attempt; returns 0 when allowed, else the seconds until it would be. */
  hit(key: string): number {
    const t = this.now();
    const recent = (this.hits.get(key) ?? []).filter((x) => t - x < this.limit.windowMs);
    if (recent.length >= this.limit.max) {
      this.hits.set(key, recent);
      return Math.max(1, Math.ceil((recent[0]! + this.limit.windowMs - t) / 1000));
    }
    recent.push(t);
    this.hits.set(key, recent);
    return 0;
  }

  sweep(): void {
    const t = this.now();
    for (const [key, list] of this.hits) {
      if (list.every((x) => t - x >= this.limit.windowMs)) this.hits.delete(key);
    }
  }
}

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.webmanifest']);

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

function tooMany(res: ServerResponse, retryAfterSec: number): void {
  res
    .writeHead(429, {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'retry-after': String(retryAfterSec),
    })
    .end(JSON.stringify({ error: 'Too many requests. Try again in a little while.' }));
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
        const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return reject(new Error('Bad JSON.'));
        }
        resolve(parsed);
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
  const createLimiter = new RateLimiter(
    options.createLimit ?? { max: 20, windowMs: 10 * 60_000 },
    now,
  );
  const joinLimiter = new RateLimiter(options.joinLimit ?? { max: 30, windowMs: 60_000 }, now);
  const compressed = new Map<string, Buffer>();

  function clientAddress(req: IncomingMessage): string {
    if (options.trustProxy) {
      const forwarded = String(req.headers['x-forwarded-for'] ?? '')
        .split(',')[0]
        ?.trim();
      if (forwarded) return forwarded;
    }
    return req.socket.remoteAddress ?? 'unknown';
  }
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
    let urlPath: string;
    try {
      urlPath = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    } catch {
      return send(res, 400, { error: 'Bad request.' });
    }
    const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const root = path.resolve(options.staticDir);
    const file = path.resolve(root, rel);
    if (file !== root && !file.startsWith(root + path.sep))
      return send(res, 403, { error: 'Forbidden.' });
    let info;
    try {
      info = await stat(file);
      if (!info.isFile()) throw new Error('not a file');
    } catch {
      return send(res, 404, { error: 'Not found.' });
    }
    try {
      const ext = path.extname(file);
      const headers: Record<string, string | number> = {
        'content-type': MIME[ext] ?? 'application/octet-stream',
        'x-content-type-options': 'nosniff',
        'accept-ranges': 'bytes',
        // Vite names built files by content hash, so they never change; pages are re-checked each visit.
        'cache-control': rel.startsWith('assets/')
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
      };
      let body: Buffer = await readFile(file);

      // Files that are not content-hashed are re-checked with a cheap validator instead of re-sent.
      const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
      if (!rel.startsWith('assets/')) headers['etag'] = etag;
      if (
        !rel.startsWith('assets/') &&
        !req.headers.range &&
        req.headers['if-none-match'] === etag
      ) {
        res.writeHead(304, { etag, 'cache-control': 'no-cache' }).end();
        return;
      }

      const range = req.headers.range;
      if (range) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
        const size = body.length;
        let start = m && m[1] ? Number(m[1]) : NaN;
        let end = m && m[2] ? Number(m[2]) : NaN;
        if (m && !m[1] && m[2]) {
          start = Math.max(0, size - Number(m[2])); // "-N" = the last N bytes
          end = size - 1;
        } else if (m && m[1] && !m[2]) {
          end = size - 1;
        }
        if (!m || Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
          res.writeHead(416, { 'content-range': `bytes */${size}` }).end();
          return;
        }
        end = Math.min(end, size - 1);
        headers['content-range'] = `bytes ${start}-${end}/${size}`;
        headers['content-length'] = end - start + 1;
        res.writeHead(206, headers).end(body.subarray(start, end + 1));
        return;
      }

      if (COMPRESSIBLE.has(ext)) {
        headers['vary'] = 'Accept-Encoding';
        const accepted = String(req.headers['accept-encoding'] ?? '')
          .split(',')
          .map((token) => (token.split(';')[0] ?? '').trim().toLowerCase());
        const encoding = accepted.includes('br') ? 'br' : accepted.includes('gzip') ? 'gzip' : null;
        if (encoding) {
          const key = `${file}|${info.mtimeMs}|${encoding}`;
          let packed = compressed.get(key);
          if (!packed) {
            packed = encoding === 'br' ? await brotliAsync(body) : await gzipAsync(body);
            compressed.set(key, packed);
          }
          body = packed;
          headers['content-encoding'] = encoding;
        }
      }
      headers['content-length'] = body.length;
      res.writeHead(200, headers).end(body);
    } catch {
      if (!res.headersSent) send(res, 500, { error: 'Server error.' });
      else res.end();
    }
  }

  async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
    const parts = url.pathname.split('/').filter(Boolean); // ['api','rooms',code?,action?]
    try {
      if (parts.length === 2 && req.method === 'POST') {
        const wait = createLimiter.hit(clientAddress(req));
        if (wait) return tooMany(res, wait);
        const body = (await readJson(req)) as { boardId?: unknown; settings?: never };
        const made = manager.create(body.boardId, body.settings);
        if ('error' in made) return send(res, made.error === SERVER_BUSY ? 503 : 400, made);
        return send(res, 200, roomReply(made.room, made.token, made.seat));
      }
      const code = parts[2] ?? '';
      const action = parts[3];
      if (action === 'join' && req.method === 'POST') {
        const wait = joinLimiter.hit(clientAddress(req));
        if (wait) return tooMany(res, wait);
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
    let url: URL;
    try {
      url = new URL(req.url ?? '/', 'http://localhost');
    } catch {
      return send(res, 400, { error: 'Bad request.' });
    }
    const fail = (): void => {
      if (!res.headersSent) send(res, 500, { error: 'Server error.' });
      else res.end();
    };
    if (url.pathname.startsWith('/api/')) {
      handleApi(req, res, url).catch(fail);
    } else {
      serveStatic(req, res).catch(fail);
    }
  });

  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_BODY });
  wss.on('connection', (ws, req) => {
    // An oversized or malformed frame makes `ws` emit 'error'; without a listener that kills the process.
    ws.on('error', () => ws.terminate());
    let url: URL;
    try {
      url = new URL(req.url ?? '/', 'http://localhost');
    } catch {
      ws.close();
      return;
    }
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
      if (!msg || typeof msg !== 'object' || msg.type !== 'intent' || !isIntent(msg.intent)) {
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
  const sweeper = setInterval(
    () => {
      manager.sweep();
      createLimiter.sweep();
      joinLimiter.sweep();
    },
    10 * 60 * 1000,
  );
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
