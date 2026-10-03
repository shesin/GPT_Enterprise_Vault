import net from 'net';
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { WebSocket } from 'ws';
import { startApp, type RunningApp } from '../app';
import { MAX_ROOMS } from '../RoomManager';
import type { ServerMessage } from '../protocol';

/**
 * Audit 2026-10-03: three single requests killed the whole Node process (bad percent-encoding, an
 * unparsable request line, a WebSocket frame holding JSON null). These tests send that traffic and then
 * check the server still answers every other player.
 */

let app: RunningApp;
let base: string;
let staticDir: string;

beforeAll(async () => {
  staticDir = mkdtempSync(path.join(tmpdir(), 'sb-static-'));
  writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><title>x</title>');
  mkdirSync(path.join(staticDir, 'assets'));
  writeFileSync(path.join(staticDir, 'assets', 'main-abc123.js'), 'console.log(1)');
  app = await startApp({ port: 0, staticDir, tickMs: 50 });
  base = `http://127.0.0.1:${app.port}`;
});
afterAll(async () => {
  await app.close();
});

/** Sends raw bytes (fetch would normalise a bad URL away) and returns the status line. */
function raw(text: string): Promise<string> {
  return new Promise((resolve) => {
    const s = net.connect(app.port, '127.0.0.1', () => s.write(text));
    let data = '';
    s.on('data', (d) => (data += String(d)));
    s.on('close', () => resolve(data.split('\r\n')[0] ?? ''));
    s.on('error', () => resolve('(error)'));
    setTimeout(() => s.destroy(), 800);
  });
}

async function stillServes(): Promise<void> {
  const r = await fetch(`${base}/api/rooms`, {
    method: 'POST',
    body: JSON.stringify({ boardId: '6x4' }),
  });
  expect(r.status).toBe(200);
}

describe('hostile requests never take the server down', () => {
  it('a bad percent-encoding in the path gets a 4xx and the server lives', async () => {
    const line = await raw('GET /% HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n');
    expect(line).toMatch(/ 4\d\d /);
    await stillServes();
  });

  it('an unparsable request target gets a 4xx and the server lives', async () => {
    const line = await raw('GET //[ HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n');
    expect(line).toMatch(/ 4\d\d /);
    await stillServes();
  });

  it.each(['null', '123', '"text"', '[]', 'true'])(
    'a WebSocket message %s gets an error message and the socket stays usable',
    async (payload) => {
      const made = await (
        await fetch(`${base}/api/rooms`, {
          method: 'POST',
          body: JSON.stringify({ boardId: '6x4' }),
        })
      ).json();
      const ws = new WebSocket(
        `ws://127.0.0.1:${app.port}/ws?code=${made.code}&token=${made.token}`,
      );
      const seen: ServerMessage[] = [];
      ws.on('message', (d) => seen.push(JSON.parse(String(d)) as ServerMessage));
      await new Promise<void>((r) => ws.on('open', () => r()));
      ws.send(payload);
      await new Promise((r) => setTimeout(r, 300));
      expect(seen.some((m) => m.type === 'error')).toBe(true);
      ws.close();
      await stillServes();
    },
  );

  it('an oversized WebSocket frame closes that socket and the server lives', async () => {
    const made = await (
      await fetch(`${base}/api/rooms`, { method: 'POST', body: JSON.stringify({ boardId: '6x4' }) })
    ).json();
    const ws = new WebSocket(`ws://127.0.0.1:${app.port}/ws?code=${made.code}&token=${made.token}`);
    ws.on('error', () => {});
    await new Promise<void>((r) => ws.on('open', () => r()));
    const closed = new Promise<void>((r) => ws.on('close', () => r()));
    ws.send('x'.repeat(10_000));
    await closed;
    await stillServes();
  });

  it('a JSON null body on create is a plain 400, without an internal error message', async () => {
    const r = await fetch(`${base}/api/rooms`, { method: 'POST', body: 'null' });
    expect(r.status).toBe(400);
    const j = (await r.json()) as { error: string };
    expect(j.error).not.toMatch(/Cannot read properties/);
  });

  it('a JSON null body on action is a plain 400', async () => {
    const made = await (
      await fetch(`${base}/api/rooms`, { method: 'POST', body: JSON.stringify({ boardId: '6x4' }) })
    ).json();
    const r = await fetch(`${base}/api/rooms/${made.code}/action`, {
      method: 'POST',
      body: 'null',
    });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).not.toMatch(/Cannot read properties/);
  });
});

describe('server limits and delivery headers', () => {
  it('a full room table answers 503 (retry later), not a client error', async () => {
    const own = await startApp({ port: 0, tickMs: 100000 });
    try {
      for (let i = 0; i < MAX_ROOMS; i++) own.manager.create('6x4', undefined);
      const r = await fetch(`http://127.0.0.1:${own.port}/api/rooms`, {
        method: 'POST',
        body: JSON.stringify({ boardId: '6x4' }),
      });
      expect(r.status).toBe(503);
    } finally {
      await own.close();
    }
  });

  it('static files carry nosniff; hashed assets cache for a year; pages revalidate', async () => {
    const page = await fetch(`${base}/`);
    expect(page.headers.get('x-content-type-options')).toBe('nosniff');
    expect(page.headers.get('cache-control')).toBe('no-cache');
    const asset = await fetch(`${base}/assets/main-abc123.js`);
    expect(asset.headers.get('x-content-type-options')).toBe('nosniff');
    expect(asset.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  });
});
