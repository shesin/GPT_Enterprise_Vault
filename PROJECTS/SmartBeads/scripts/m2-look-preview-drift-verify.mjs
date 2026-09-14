/**
 * Extended check — theme should not drift after idle, new game, reload.
 */
import { chromium } from 'playwright';
import { playShellUrl } from './lib/play-shell-setup.mjs';

const URL = playShellUrl();

async function readLook(page) {
  return page.evaluate(() => ({
    board: document.getElementById('play-shell')?.getAttribute('data-play-board-look'),
    side: document.getElementById('play-shell')?.getAttribute('data-play-side-look'),
    storedBoard: localStorage.getItem('sb-play-board-look'),
    storedSide: localStorage.getItem('sb-play-side-look-v3'),
  }));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#play-theme-setting');

  await page.locator('#play-theme-setting .play-theme-swatches--light-charcoal .play-theme-swatch[data-play-theme="12"]').click();
  await page.waitForTimeout(200);
  const afterClick = await readLook(page);
  console.log('after walnut click:', JSON.stringify(afterClick));

  await page.waitForTimeout(6000);
  const afterIdle = await readLook(page);
  console.log('after 6s idle:', JSON.stringify(afterIdle));

  await page.click('#restart-btn');
  await page.waitForTimeout(500);
  const afterNewGame = await readLook(page);
  console.log('after new game:', JSON.stringify(afterNewGame));

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#play-theme-setting');
  const afterReload = await readLook(page);
  console.log('after reload:', JSON.stringify(afterReload));

  const active = await page.locator(
    '.play-theme-swatches--light-charcoal .play-theme-swatch.is-active',
  ).getAttribute('data-play-theme');
  console.log('active light swatch after reload:', active);

  const stable =
    afterClick.board === '12'
    && afterIdle.board === '12'
    && afterNewGame.board === '12'
    && afterReload.board === '12'
    && afterReload.side === '7'
    && active === '12';

  console.log(stable ? 'CONFIRMED theme stable over time' : 'UNCONFIRMED theme drift detected');
  await browser.close();
  process.exit(stable ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
