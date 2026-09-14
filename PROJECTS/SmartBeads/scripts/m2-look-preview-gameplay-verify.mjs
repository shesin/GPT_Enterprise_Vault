/**
 * Theme stability during live gameplay + timer ticks (not just click/reload).
 */
import { chromium } from 'playwright';
import { playShellUrl } from './lib/play-shell-setup.mjs';

const URL = playShellUrl();

async function readLook(page) {
  return page.evaluate(() => ({
    board: document.getElementById('play-shell')?.getAttribute('data-play-board-look'),
    side: document.getElementById('play-shell')?.getAttribute('data-play-side-look'),
    timerP1: document.getElementById('timer-mmss-p1')?.textContent,
    timerP2: document.getElementById('timer-mmss-p2')?.textContent,
    shotP1: document.getElementById('shot-sec-p1')?.textContent,
  }));
}

async function sampleBoardGreenness(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('board');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const { width, height } = canvas;
    const x = Math.floor(width * 0.5);
    const y = Math.floor(height * 0.45);
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    return { r, g, b, greenDominant: g > r + 20 && g > b + 10 };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#play-theme-setting');

  await page.locator('.play-theme-swatches--light-charcoal .play-theme-swatch[data-play-theme="4"]').click();
  await page.waitForTimeout(300);
  const afterLight = await readLook(page);
  const lightPixel = await sampleBoardGreenness(page);
  console.log('after sandy beige:', JSON.stringify(afterLight), 'pixel', lightPixel);

  await page.evaluate(() => {
    window.__SB_TEST__.enterFromHub('7x4x5', 'pve', 'play');
    window.__SB_TEST__.forceStarter('RED');
  });
  await page.waitForTimeout(800);

  const midGame = await readLook(page);
  const midPixel = await sampleBoardGreenness(page);
  console.log('after enterFromHub + start:', JSON.stringify(midGame), 'pixel', midPixel);

  await page.waitForTimeout(12000);
  const after12s = await readLook(page);
  const latePixel = await sampleBoardGreenness(page);
  console.log('after 12s timer ticks:', JSON.stringify(after12s), 'pixel', latePixel);

  await page.click('#restart-btn');
  await page.waitForTimeout(600);
  const afterRestart = await readLook(page);
  const restartPixel = await sampleBoardGreenness(page);
  console.log('after new game:', JSON.stringify(afterRestart), 'pixel', restartPixel);

  const ok =
    afterLight.board === '4'
    && midGame.board === '4'
    && after12s.board === '4'
    && afterRestart.board === '4'
    && lightPixel && !lightPixel.greenDominant
    && midPixel && !midPixel.greenDominant
    && latePixel && !latePixel.greenDominant
    && restartPixel && !restartPixel.greenDominant;

  console.log(ok ? 'CONFIRMED light theme stable through gameplay' : 'UNCONFIRMED theme or board colour drift');
  await browser.close();
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
