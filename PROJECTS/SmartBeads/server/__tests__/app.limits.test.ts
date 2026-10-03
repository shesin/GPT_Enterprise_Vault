import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import http, { type IncomingHttpHeaders } from 'http';
import { brotliDecompressSync, gunzipSync } from 'zlib';
import { startApp } from '../app';

/**
 * Audit 2026-10-03: one anonymous client could fill all 2000 rooms in ~2 s and guess room codes at ~3,000/s;
 * static files were sent uncompressed and without range support (Safari needs ranges for audio).
 */

const rooms = (base: string, ip?: string) =>
  fetch(`${base}/api/rooms`, {
    method: 'POST',
    headers: ip ? { 'x-forwarded-for': ip } : {},
    body: JSON.stringify({ boardId: '6x4' }),
  });
const join = (base: string, code: string, ip?: string) =>
  fetch(`${base}/api/rooms/${code}/join`, {
    method: 'POST',
    headers: ip ? { 'x-forwarded-for': ip } : {},
  });

describe('per-client rate limits', () => {
  it('room creation is limited per client address (429 with Retry-After), then recovers', async () => {
    let t = 1_000_000;
    const app = await startApp({
      port: 0,
      now: () => t,
      tickMs: 100000,
      createLimit: { max: 3, windowMs: 60_000 },
    });
    const base = `http://127.0.0.1:${app.port}`;
    try {
      for (let i = 0; i < 3; i++) expect((await rooms(base)).status).toBe(200);
      const blocked = await rooms(base);
      expect(blocked.status).toBe(429);
      expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
      t += 61_000;
      expect((await rooms(base)).status).toBe(200);
    } finally {
      await app.close();
    }
  });

  it('room-code guessing is limited per client address', async () => {
    const app = await startApp({
      port: 0,
      tickMs: 100000,
      joinLimit: { max: 5, windowMs: 60_000 },
    });
    const base = `http://127.0.0.1:${app.port}`;
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 8; i++) statuses.push((await join(base, 'ZZZZZ')).status);
      expect(statuses.slice(0, 5).every((s) => s === 404)).toBe(true);
      expect(statuses.slice(5).every((s) => s === 429)).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('X-Forwarded-For is ignored unless trustProxy is on, and separates clients when it is', async () => {
    const plain = await startApp({
      port: 0,
      tickMs: 100000,
      createLimit: { max: 1, windowMs: 60_000 },
    });
    const proxied = await startApp({
      port: 0,
      tickMs: 100000,
      trustProxy: true,
      createLimit: { max: 1, windowMs: 60_000 },
    });
    try {
      const a = `http://127.0.0.1:${plain.port}`;
      expect((await rooms(a, '1.1.1.1')).status).toBe(200);
      expect((await rooms(a, '2.2.2.2')).status).toBe(429); // a spoofed header must not dodge the limit
      const b = `http://127.0.0.1:${proxied.port}`;
      expect((await rooms(b, '1.1.1.1')).status).toBe(200);
      expect((await rooms(b, '2.2.2.2')).status).toBe(200);
      expect((await rooms(b, '1.1.1.1')).status).toBe(429);
    } finally {
      await plain.close();
      await proxied.close();
    }
  });
});

describe('static delivery', () => {
  let dir: string;
  const big = 'console.log("x");\n'.repeat(2000);
  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'sb-static2-'));
    writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>x</title>');
    mkdirSync(path.join(dir, 'assets'));
    writeFileSync(path.join(dir, 'assets', 'main-abc.js'), big);
    mkdirSync(path.join(dir, 'audio'));
    writeFileSync(path.join(dir, 'audio', 's.wav'), Buffer.alloc(1000, 7));
  });

  /** Raw GET (fetch hides the wire encoding by decoding it). */
  function rawGet(url: string, acceptEncoding: string) {
    return new Promise<{ headers: IncomingHttpHeaders; body: Buffer }>((resolve, reject) => {
      http
        .get(url, { headers: { 'accept-encoding': acceptEncoding } }, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => resolve({ headers: res.headers, body: Buffer.concat(chunks) }));
        })
        .on('error', reject);
    });
  }

  it('compresses text files for clients that accept gzip or brotli, and only those', async () => {
    const app = await startApp({ port: 0, staticDir: dir, tickMs: 100000 });
    try {
      const url = `http://127.0.0.1:${app.port}/assets/main-abc.js`;
      const gz = await rawGet(url, 'gzip');
      expect(gz.headers['content-encoding']).toBe('gzip');
      expect(gz.headers['vary']).toMatch(/accept-encoding/i);
      expect(gz.body.length).toBeLessThan(big.length / 5);
      expect(gunzipSync(gz.body).toString()).toBe(big);
      const br = await rawGet(url, 'gzip, br');
      expect(br.headers['content-encoding']).toBe('br');
      expect(brotliDecompressSync(br.body).toString()).toBe(big);
      const plain = await rawGet(url, 'identity');
      expect(plain.headers['content-encoding']).toBeUndefined();
      expect(plain.body.toString()).toBe(big);
      const wav = await rawGet(`http://127.0.0.1:${app.port}/audio/s.wav`, 'gzip');
      expect(wav.headers['content-encoding']).toBeUndefined(); // audio is already compressed or tiny
    } finally {
      await app.close();
    }
  });

  it('re-checks unchanged files cheaply: ETag, then 304 with no body', async () => {
    const app = await startApp({ port: 0, staticDir: dir, tickMs: 100000 });
    try {
      const url = `http://127.0.0.1:${app.port}/audio/s.wav`;
      const first = await fetch(url);
      const etag = first.headers.get('etag');
      expect(etag).toBeTruthy();
      const again = await fetch(url, { headers: { 'if-none-match': etag! } });
      expect(again.status).toBe(304);
      expect((await again.arrayBuffer()).byteLength).toBe(0);
      const changed = await fetch(url, { headers: { 'if-none-match': '"other"' } });
      expect(changed.status).toBe(200);
    } finally {
      await app.close();
    }
  });

  it('serves byte ranges (206), refuses impossible ones (416) and advertises support', async () => {
    const app = await startApp({ port: 0, staticDir: dir, tickMs: 100000 });
    try {
      const url = `http://127.0.0.1:${app.port}/audio/s.wav`;
      const full = await fetch(url);
      expect(full.status).toBe(200);
      expect(full.headers.get('accept-ranges')).toBe('bytes');
      const part = await fetch(url, { headers: { range: 'bytes=0-99' } });
      expect(part.status).toBe(206);
      expect(part.headers.get('content-range')).toBe('bytes 0-99/1000');
      expect((await part.arrayBuffer()).byteLength).toBe(100);
      const tail = await fetch(url, { headers: { range: 'bytes=900-' } });
      expect(tail.headers.get('content-range')).toBe('bytes 900-999/1000');
      const last = await fetch(url, { headers: { range: 'bytes=-50' } });
      expect(last.headers.get('content-range')).toBe('bytes 950-999/1000');
      const bad = await fetch(url, { headers: { range: 'bytes=5000-6000' } });
      expect(bad.status).toBe(416);
      expect(bad.headers.get('content-range')).toBe('bytes */1000');
    } finally {
      await app.close();
    }
  });
});
