/**
 * TC-LOOK-01: theme + swatch highlight stable for 2+ minutes; look locked mid-match.
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
    storedV2: localStorage.getItem('sb-play-theme-v2'),
    activeCount: document.querySelectorAll('#play-theme-setting .play-theme-swatch.is-active').length,
    locked: document.getElementById('play-theme-setting')?.classList.contains('play-theme-setting--locked'),
    gameOver: document.getElementById('result-modal')?.style.display === 'flex',
    moveCount: window.__SB_TEST__?.session?.getMoveCount?.() ?? 0,
  }));
}

async function sampleBoardTone(page, themeId) {
  return page.evaluate((expected) => {
    const canvas = document.getElementById('board');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const x = Math.floor(canvas.width * 0.5);
    const y = Math.floor(canvas.height * 0.45);
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    const greenDominant = g > r + 20 && g > b + 10;
    const purpleDominant = b > r + 8 && b > g;
    const tanDominant = r > 150 && g > 130 && b > 100 && !greenDominant;
    return {
      r,
      g,
      b,
      greenDominant,
      purpleDominant,
      tanDominant,
      // Drift bug reverts to classic green — any non-green board passes for 6/12
      ok: expected === '1' ? greenDominant : !greenDominant,
    };
  }, themeId);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#play-theme-setting');

  // Purple night dark-charcoal — pick before match moves (matches user screenshot scenario)
  await page.locator('#play-theme-setting .play-theme-swatches--dark-charcoal .play-theme-swatch[data-play-theme="6"]').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__SB_TEST__.enterFromHub('7x4x5', 'spectate', 'spectate');
    window.__SB_TEST__.forceStarter('RED');
  });
  await page.waitForTimeout(20_000);

  const failures = [];
  const start = Date.now();
  let sampleIndex = 0;

  while (Date.now() - start < RUN_MS) {
    if (sampleIndex === 3) {
      await page.evaluate(() => {
        const shell = document.getElementById('play-shell');
        shell?.setAttribute('data-play-board-look', '1');
        shell?.setAttribute('data-play-side-look', '1');
        document.querySelectorAll('#play-theme-setting .play-theme-swatch').forEach((el) => {
          el.classList.remove('is-active');
        });
      });
      console.log('injected DOM + swatch drift');
    }

    if (sampleIndex === 5) {
      const before = await readState(page);
      if (before.moveCount > 0 && before.locked) {
        await page.locator('#play-theme-setting .play-theme-swatches--light-charcoal .play-theme-swatch[data-play-theme="12"]').click({ force: true });
        await page.waitForTimeout(200);
        const after = await readState(page);
        if (after.board !== before.board || after.side !== before.side) {
          failures.push({ elapsed: Math.round((Date.now() - start) / 1000), kind: 'mid-game click changed theme', before, after });
        }
      } else {
        console.log('skip mid-game click lock check — moveCount', before.moveCount, 'locked', before.locked);
      }
    }

    await page.waitForTimeout(SAMPLE_MS);
    sampleIndex += 1;

    const state = await readState(page);
    const pixel = await sampleBoardTone(page, '6');
    const elapsed = Math.round((Date.now() - start) / 1000);
    const lockOk = state.moveCount === 0 || state.locked;
    const ok =
      state.storedBoard === '6'
      && state.storedSide === '7'
      && state.storedV2 === '6'
      && state.board === '6'
      && state.side === '7'
      && state.activeCount === 1
      && lockOk
      && pixel?.ok;

    console.log(`t=${elapsed}s`, JSON.stringify(state), 'pixel', pixel, ok ? 'OK' : 'FAIL');
    if (!ok) failures.push({ elapsed, state, pixel });
  }

  await browser.close();

  if (failures.length === 0) {
    console.log(`CONFIRMED purple night stable for ${RUN_MS / 1000}s; active swatch stays in sync`);
    process.exit(0);
  }

  console.log('UNCONFIRMED theme drift:', failures);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
