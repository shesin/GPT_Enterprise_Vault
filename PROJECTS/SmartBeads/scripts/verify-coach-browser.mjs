/**
 * Browser smoke: coach video panel visible after ?coach=start.
 * Requires: npx vite (http://127.0.0.1:5173/)
 */
import { chromium } from 'playwright';

const BASE = process.env.SMARTBEADS_URL || 'http://127.0.0.1:5173';

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

  console.log(label);
  console.log('  page errors:', errors.length ? errors : 'none');
  console.log('  coach panel visible:', !panelHidden);
  console.log('  title:', title?.trim());
  console.log('  time:', time?.trim());
  console.log('  scrub max:', scrubMax);
  console.log('  multi-bead copy:', /four, five, or more/i.test(introText ?? '') ? 'yes' : 'no');
  console.log('  board select:', board);
  console.log('  canvas size:', canvas ? `${Math.round(canvas.width)}x${Math.round(canvas.height)}` : 'missing');

  await browser.close();
  return {
    ok:
      !panelHidden
      && errors.length === 0
      && board === '7x4x5'
      && Boolean(canvas?.width)
      && time?.includes('2:00')
      && scrubMax === '120000'
      && /four, five, or more/i.test(introText ?? ''),
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
