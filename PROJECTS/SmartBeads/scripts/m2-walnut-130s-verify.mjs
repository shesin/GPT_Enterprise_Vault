/** Warm Walnut 130s — lines + swatch + board colour stable */
import { chromium } from 'playwright';
import { playShellUrl } from './lib/play-shell-setup.mjs';

const URL = playShellUrl();
const RUN_MS = 130_000;
const SAMPLE_MS = 10_000;

async function readState(page) {
  return page.evaluate(() => ({
    board: document.getElementById('play-shell')?.getAttribute('data-play-board-look'),
    storedBoard: localStorage.getItem('sb-play-board-look'),
    activeCount: document.querySelectorAll('#play-theme-setting .play-theme-swatch.is-active').length,
    activeIds: [...document.querySelectorAll('#play-theme-setting .play-theme-swatch.is-active')].map(
      (e) => e.getAttribute('data-play-theme'),
    ),
  }));
}

async function samplePixels(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('board');
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return null;
    const w = canvas.width;
    const h = canvas.height;
    const line = ctx.getImageData(Math.floor(w * 0.5), Math.floor(h * 0.35), 1, 1).data;
    const bg = ctx.getImageData(Math.floor(w * 0.25), Math.floor(h * 0.25), 1, 1).data;
    const goldLine = line[0] > 180 && line[1] > 150 && line[2] < 150;
    const walnutBg = line[0] < 200 && line[1] < 180 && !goldLine;
    return {
      line: [line[0], line[1], line[2]],
      bg: [bg[0], bg[1], bg[2]],
      goldLine,
      walnutBg,
    };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#play-theme-setting');

  await page.locator('#play-theme-setting .play-theme-swatches--light-charcoal .play-theme-swatch[data-play-theme="12"]').click();
  await page.evaluate(() => {
    window.__SB_TEST__.enterFromHub('7x4x5', 'spectate', 'spectate');
    window.__SB_TEST__.forceStarter('RED');
  });
  await page.waitForTimeout(15_000);

  const failures = [];
  const start = Date.now();
  let n = 0;
  while (Date.now() - start < RUN_MS) {
    await page.waitForTimeout(SAMPLE_MS);
    n += 1;
    const state = await readState(page);
    const px = await samplePixels(page);
    const ok =
      state.storedBoard === '12'
      && state.board === '12'
      && state.activeCount === 1
      && state.activeIds[0] === '12'
      && px?.goldLine;
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`t=${elapsed}s`, JSON.stringify({ state, px }), ok ? 'OK' : 'FAIL');
    if (!ok) failures.push({ elapsed, state, px });
  }

  await browser.close();
  if (failures.length) {
    console.log('FAILURES', failures);
    process.exit(1);
  }
  console.log('CONFIRMED Warm Walnut stable 130s with visible gold lines');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
