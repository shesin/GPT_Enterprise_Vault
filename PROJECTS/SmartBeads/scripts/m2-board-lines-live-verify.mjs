/**
 * Live check: grid lines visible on Warm Walnut + single active swatch after sync.
 */
import { chromium } from 'playwright';
import { playShellUrl } from './lib/play-shell-setup.mjs';

const URL = playShellUrl();

function lineContrast(pixel) {
  const [r, g, b] = pixel;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const goldish = r > 180 && g > 150 && b < 140;
  return { r, g, b, lum, goldish };
}

async function sampleLinePixels(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('board');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const w = canvas.width;
    const h = canvas.height;
    const pts = [
      [Math.floor(w * 0.5), Math.floor(h * 0.35)],
      [Math.floor(w * 0.35), Math.floor(h * 0.5)],
      [Math.floor(w * 0.65), Math.floor(h * 0.55)],
    ];
    return pts.map(([x, y]) => {
      const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
      return { x, y, r, g, b, a };
    });
  });
}

async function readState(page) {
  return page.evaluate(() => ({
    storedBoard: localStorage.getItem('sb-play-board-look'),
    activeIds: [...document.querySelectorAll('#play-theme-setting .play-theme-swatch.is-active')].map(
      (el) => el.getAttribute('data-play-theme'),
    ),
    activeCount: document.querySelectorAll('#play-theme-setting .play-theme-swatch.is-active').length,
  }));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#play-theme-setting');

  // Simulate dual-click bug: dark wood then light blush before match (user screenshot pattern)
  await page.locator('#play-theme-setting .play-theme-swatches--dark-charcoal .play-theme-swatch[data-play-theme="2"]').click();
  await page.locator('#play-theme-setting .play-theme-swatches--light-charcoal .play-theme-swatch[data-play-theme="9"]').click();
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    window.__SB_TEST__.enterFromHub('7x4x5', 'spectate', 'spectate');
    window.__SB_TEST__.forceStarter('RED');
  });
  await page.waitForTimeout(8000);

  const failures = [];
  for (let i = 0; i < 6; i += 1) {
    await page.waitForTimeout(5000);
    const state = await readState(page);
    const pixels = await sampleLinePixels(page);
    const analyzed = pixels?.map((p) => lineContrast([p.r, p.g, p.b])) ?? [];
    const anyGold = analyzed.some((p) => p.goldish);
    const ok = state.storedBoard === '9' && state.activeCount === 1 && state.activeIds[0] === '9' && anyGold;
    console.log(`sample ${i + 1}`, { state, pixels, anyGold, ok: ok ? 'OK' : 'FAIL' });
    if (!ok) failures.push({ i, state, pixels, anyGold });
  }

  await browser.close();
  if (failures.length) {
    console.log('UNCONFIRMED / FAILURES', failures);
    process.exit(1);
  }
  console.log('CONFIRMED gold lines visible + single active swatch on live server');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
