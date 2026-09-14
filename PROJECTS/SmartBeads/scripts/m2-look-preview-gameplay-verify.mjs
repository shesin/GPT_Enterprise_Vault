/**
 * Theme must stay correct for 2+ minutes, including after simulated DOM drift.
 */
import { chromium } from 'playwright';
import { playShellUrl } from './lib/play-shell-setup.mjs';

const URL = playShellUrl();
const RUN_MS = 130_000;
const SAMPLE_MS = 10_000;

async function readState(page) {
  return page.evaluate(() => ({
    board: document.getElementById('play-shell')?.getAttribute('data-play-board-look'),
    side: document.getElementById('play-shell')?.getAttribute('data-play-side-look'),
    storedBoard: localStorage.getItem('sb-play-board-look'),
    storedSide: localStorage.getItem('sb-play-side-look-v3'),
    gameOver: document.getElementById('result-modal')?.style.display === 'flex',
  }));
}

async function sampleBoardGreenness(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('board');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const x = Math.floor(canvas.width * 0.5);
    const y = Math.floor(canvas.height * 0.45);
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    return { r, g, b, greenDominant: g > r + 20 && g > b + 10 };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#play-theme-setting');

  await page.locator('.play-theme-swatches--light-charcoal .play-theme-swatch[data-play-theme="12"]').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__SB_TEST__.enterFromHub('7x4x5', 'pve', 'play');
    window.__SB_TEST__.forceStarter('RED');
  });
  await page.waitForTimeout(800);

  const failures = [];
  const start = Date.now();
  let sampleIndex = 0;

  while (Date.now() - start < RUN_MS) {
    if (sampleIndex === 3) {
      await page.evaluate(() => {
        const shell = document.getElementById('play-shell');
        shell?.setAttribute('data-play-board-look', '1');
        shell?.setAttribute('data-play-side-look', '1');
        shell?.setAttribute('data-play-theme', '1');
        shell?.setAttribute('data-play-board-match', 'matched');
      });
      console.log('injected DOM drift to default classic green');
    }

    await page.waitForTimeout(SAMPLE_MS);
    sampleIndex += 1;

    const state = await readState(page);
    const pixel = await sampleBoardGreenness(page);
    const elapsed = Math.round((Date.now() - start) / 1000);
    const ok =
      state.storedBoard === '12'
      && state.storedSide === '7'
      && state.board === '12'
      && state.side === '7'
      && pixel
      && !pixel.greenDominant;

    console.log(`t=${elapsed}s`, JSON.stringify(state), 'pixel', pixel, ok ? 'OK' : 'FAIL');
    if (!ok) failures.push({ elapsed, state, pixel });
  }

  await browser.close();

  if (failures.length === 0) {
    console.log(`CONFIRMED warm walnut stable for ${RUN_MS / 1000}s including DOM drift`);
    process.exit(0);
  }

  console.log('UNCONFIRMED theme drift:', failures);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
