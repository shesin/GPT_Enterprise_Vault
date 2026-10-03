/**
 * Long-session check (A23): random clicks, random keys, random game modes, with the CPU throttled.
 * Fails on any page error, any error bar, a page that stops answering, or a rendering loop that gets stuck.
 * Usage (dev server running): node PROJECTS/SmartBeads/scripts/m4-monkey-soak.mjs [seconds=120] [cpuSlowdown=1]
 * Not part of `npm test` (it takes minutes); run it before a release.
 */
import { chromium } from 'playwright';
import { playShellUrl } from './lib/play-shell-setup.mjs';

const SECONDS = Number(process.argv[2] ?? 120);
const SLOWDOWN = Number(process.argv[3] ?? 1);
const URL = playShellUrl().replace(/[?&]play=1/, '');

// A tiny seeded random generator so a failing run can be repeated.
let seed = Number(process.env.MONKEY_SEED ?? Date.now() % 100000);
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (list) => list[Math.floor(rand() * list.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`monkey soak: ${SECONDS}s, CPU x${SLOWDOWN}, seed ${seed}`);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message || e)));
page.on('dialog', (d) => d.dismiss().catch(() => {}));
if (SLOWDOWN > 1) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: SLOWDOWN });
}
// Links to other pages would end the run: keep every click on this page.
await page.route('**/*', (route) => {
  const req = route.request();
  if (req.isNavigationRequest() && req.frame() === page.mainFrame() && req.url() !== page.url() && !req.url().startsWith(URL)) {
    return route.abort();
  }
  return route.continue();
});
// MONKEY_BREAK=1 injects an error on purpose, to prove this check can fail.
if (process.env.MONKEY_BREAK) await page.addInitScript(() => setTimeout(() => { throw new Error('injected'); }, 3000));
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#board', { state: 'attached' });

let actions = 0;
const end = Date.now() + SECONDS * 1000;
while (Date.now() < end) {
  const roll = rand();
  try {
    if (roll < 0.55) {
      // click a random visible control
      const handles = await page.$$('button:not([disabled]), select, summary, [role=button], .hub-board-tile, .hub-mode-tile');
      const visible = [];
      for (const h of handles) if (await h.isVisible()) visible.push(h);
      const h = pick(visible);
      if (h) {
        const tag = await h.evaluate((e) => e.tagName);
        if (tag === 'SELECT') {
          const values = await h.evaluate((e) => [...e.options].map((o) => o.value));
          await h.selectOption(pick(values), { force: true, timeout: 1500 });
        } else {
          await h.click({ timeout: 1500, force: true });
        }
      }
    } else if (roll < 0.85) {
      // click a random spot on the board canvas, if there is one on screen
      const box = await page.locator('#board').boundingBox();
      if (box && box.width > 0) {
        await page.mouse.click(box.x + rand() * box.width, box.y + rand() * box.height);
      }
    } else {
      await page.keyboard.press(pick(['Tab', 'Enter', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape', 'Shift+Tab']));
    }
  } catch {
    // an element vanished between looking and clicking: normal for a monkey
  }
  actions += 1;
  if (actions % 40 === 0) await sleep(100 * rand()); // let timers and workers run
}

const bars = await page.locator('.sb-error-banner').count();
const alive = await page
  .evaluate(
    () =>
      new Promise((resolve) => {
        const t = performance.now();
        requestAnimationFrame(() => resolve(performance.now() - t));
      }),
  )
  .catch(() => -1);
const answered = await page.evaluate(() => 1 + 1).catch(() => 0);

const failures = [];
if (errors.length) failures.push(`${errors.length} page error(s): ${[...new Set(errors)].slice(0, 3).join(' | ')}`);
if (bars) failures.push(`${bars} error bar(s) shown`);
if (answered !== 2) failures.push('page stopped answering');
if (alive < 0 || alive > 2000 * SLOWDOWN) failures.push(`next frame took ${Math.round(alive)} ms`);

console.log(`${actions} random actions, next frame ${Math.round(alive)} ms, errors ${errors.length}, error bars ${bars}`);
await browser.close();
if (failures.length) {
  console.log('UNCONFIRMED  monkey soak: ' + failures.join('; '));
  process.exit(1);
}
console.log(`CONFIRMED  monkey soak ${SECONDS}s at CPU x${SLOWDOWN}: no page errors, no error bar, page still answering`);
