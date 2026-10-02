/**
 * Production-build gate (W6): builds the site the way it ships (`vite build`, no test hooks), serves it and checks in a
 * real browser that (1) the test hooks and the local premium flag are gone, (2) the start page still starts a game,
 * (3) setting localStorage 'sb-premium' does not remove ads.
 */
import { spawnSync } from 'child_process';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = path.join(os.tmpdir(), `sb-prod-gate-${process.pid}`);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const results = [];
function record(name, ok, detail) {
  results.push(ok);
  console.log(`${ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const build = spawnSync('npx', ['vite', 'build', '--outDir', OUT, '--emptyOutDir'], { cwd: ROOT, shell: true, encoding: 'utf8', env: { ...process.env, SB_TEST_HOOKS: '' } });
if (build.status !== 0) {
  console.log(build.stdout, build.stderr);
  record('production build succeeds', false);
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const p = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = path.join(OUT, p === '/' ? 'index.html' : p);
  if (!file.startsWith(OUT)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.addInitScript(() => { try { localStorage.setItem('sb-premium', '1'); } catch { /* ignore */ } });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('#hub-mode-grid button, #hub-mode-grid [role=button]', { timeout: 15000 });

  const hooks = await page.evaluate(() => typeof window.__SB_TEST__);
  record('Production build: window.__SB_TEST__ does not exist', hooks === 'undefined', `typeof=${hooks}`);

  // start page -> a real game starts (the hub launches through the app's own code, not a test hook)
  await page.locator('#hub-mode-grid button').first().click();
  const started = await page.waitForFunction(() => {
    const shell = document.getElementById('play-shell');
    const board = document.getElementById('board');
    return shell && !shell.classList.contains('is-hidden') && board && board.getBoundingClientRect().width > 100;
  }, null, { timeout: 15000 }).then(() => true, () => false);
  record('Production build: a hub Play button opens the game board', started);

  const adsOn = await page.evaluate(() => {
    const s = document.getElementById('play-shell');
    return { adsOn: s.classList.contains('shell--ads-on'), noAds: s.classList.contains('shell--no-ads'), stored: localStorage.getItem('sb-premium') };
  });
  record("Production build: localStorage 'sb-premium'='1' does not remove ads", adsOn.adsOn && !adsOn.noAds, JSON.stringify(adsOn));
  record('Production build: no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
} finally {
  await browser.close();
  server.close();
}
const ok = results.every(Boolean);
console.log(`m3-prod-build-gate: ${results.filter(Boolean).length}/${results.length} confirmed`);
process.exit(ok ? 0 : 1);
