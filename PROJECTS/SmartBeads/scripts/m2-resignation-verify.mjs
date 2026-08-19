/**
 * Browser verification — resignation rule (PvP + PvE).
 * Requires: npm run web:smartbeads (http://localhost:5173/)
 */
import { chromium } from 'playwright';

const URL = process.env.SMARTBEADS_URL || 'http://localhost:5173/';
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function dismissConfirm(page) {
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
}

async function cancelConfirm(page) {
  page.once('dialog', async (dialog) => {
    await dialog.dismiss();
  });
}

async function runPvpResign(page, acceptDraw) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.selectOption('#game-mode-select', 'pvp');
  await page.locator('#restart-btn').click();
  await page.waitForTimeout(400);

  await dismissConfirm(page);
  await page.locator('#resign-btn').click();
  await page.waitForSelector('#resign-offer-modal', { state: 'visible', timeout: 5000 });

  if (acceptDraw) {
    await page.locator('#resign-agree-btn').click();
  } else {
    await page.locator('#resign-decline-btn').click();
  }

  await page.waitForSelector('#result-modal', { state: 'visible', timeout: 5000 });
  const title = await page.locator('#result-title').textContent();
  const desc = await page.locator('#result-desc').textContent();
  return { title: title?.trim(), desc: desc?.trim() };
}

async function runPveResign(page, aiOverride) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate((mode) => {
    sessionStorage.setItem('sb-test-resign-ai', mode);
  }, aiOverride);

  await page.selectOption('#game-mode-select', 'pve');
  await page.locator('#restart-btn').click();
  await page.waitForTimeout(400);

  await dismissConfirm(page);
  await page.locator('#resign-btn').click();
  await page.waitForSelector('#result-modal', { state: 'visible', timeout: 8000 });
  const title = await page.locator('#result-title').textContent();
  const desc = await page.locator('#result-desc').textContent();
  return { title: title?.trim(), desc: desc?.trim() };
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    record('resign button present', await (async () => {
      await page.goto(URL, { waitUntil: 'networkidle' });
      return page.locator('#resign-btn').isVisible();
    })(), '');

    const pvpDraw = await runPvpResign(page, true);
    record(
      'PvP resign → agree → Draw',
      pvpDraw.title === 'Draw' && /agreed to a draw/i.test(pvpDraw.desc ?? ''),
      `${pvpDraw.title} | ${pvpDraw.desc}`,
    );

    const pvpLoss = await runPvpResign(page, false);
    record(
      'PvP resign → decline → resigning player loses',
      pvpLoss.title === 'Ebony wins' && /declined the draw/i.test(pvpLoss.desc ?? ''),
      `${pvpLoss.title} | ${pvpLoss.desc}`,
    );

    const pveDraw = await runPveResign(page, 'accept');
    record(
      'PvE resign → AI agree → Draw',
      pveDraw.title === 'Draw' && /agreed to a draw/i.test(pveDraw.desc ?? ''),
      `${pveDraw.title} | ${pveDraw.desc}`,
    );

    const pveLoss = await runPveResign(page, 'reject');
    record(
      'PvE resign → AI decline → P1 loses',
      pveLoss.title === 'Ebony wins' && /declined the draw/i.test(pveLoss.desc ?? ''),
      `${pveLoss.title} | ${pveLoss.desc}`,
    );

    console.log('\n--- RESIGNATION BROWSER SUMMARY ---');
    results.forEach((r) => console.log(`${r.ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${r.name}`));
    if (results.some((r) => !r.ok)) process.exit(1);
  } catch (err) {
    console.error('UNCONFIRMED  browser session failed:', err.stack || err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
