/**
 * Browser smoke: coach video panel visible after ?coach=start.
 * Requires: npx vite (http://127.0.0.1:5173/)
 */
import { chromium } from 'playwright';

const BASE = process.env.SMARTBEADS_URL || 'http://127.0.0.1:5173';

const COACH_VIDEO_DURATION_MS = 102_335;

async function check(url, label) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const panelHidden = await page.locator('#coach-panel').evaluate((el) => el.classList.contains('is-hidden'));
  const title = await page.locator('#coach-lesson-title').textContent();
  const time = await page.locator('#coach-time-label').textContent();
  const board = await page.locator('#board-select').inputValue().catch(() => 'n/a');
  const canvas = await page.locator('#board').boundingBox();

  const scrubMax = await page.locator('#coach-scrub').getAttribute('max').catch(() => null);
  const introText = await page.locator('#coach-lesson-body').textContent().catch(() => '');
  const endingCopy = /Win —|Draw —|Resign —/.test(introText ?? '');
  const segmentBanner = await page.locator('#start-banner-title').textContent().catch(() => '');

  console.log(label);
  console.log('  page errors:', errors.length ? errors : 'none');
  console.log('  coach panel visible:', !panelHidden);
  console.log('  title:', title?.trim());
  console.log('  time:', time?.trim());
  console.log('  scrub max:', scrubMax);
  console.log('  segment banner:', segmentBanner?.trim());
  console.log('  board select:', board);
  console.log('  canvas size:', canvas ? `${Math.round(canvas.width)}x${Math.round(canvas.height)}` : 'missing');

  await browser.close();
  return {
    ok:
      !panelHidden
      && errors.length === 0
      && board === '7x4x5'
      && Boolean(canvas?.width)
      && time?.includes('1:42')
      && scrubMax === String(COACH_VIDEO_DURATION_MS)
      && /four, five, or more/i.test(introText ?? '')
      && endingCopy
      && /MOVE/i.test(segmentBanner ?? ''),
    panelHidden,
    errors,
    board,
  };
}

const hub = await check(`${BASE}/?coach=start`, 'HUB ?coach=start');
const play = await check(`${BASE}/play-board.html?coach=start`, 'PLAY-BOARD ?coach=start');

console.log('HUB OK:', hub.ok);
console.log('PLAY OK:', play.ok);
process.exit(hub.ok && play.ok ? 0 : 1);
