/**
 * Browser verification for human-decided catalog settings on all V1 boards.
 * Requires: npm run web:smartbeads (http://localhost:5173/)
 */
import { chromium } from 'playwright';

const URL = process.env.SMARTBEADS_URL || 'http://localhost:5173/';

/** Expected catalog settings — must match BoardCatalog.ts exactly. */
const EXPECTED = {
  '16': {
    centerOptions: ['off', 'endgame'],
    centerDefault: 'off',
    timerOptions: ['off', '15', '25', '35'],
    timerDefault: '25',
    shotOptions: ['off', '60', '90', '120'],
    shotDefault: '90',
  },
  '6x4': {
    centerOptions: ['off', 'cumulative', 'endgame'],
    centerDefault: 'endgame',
    timerOptions: ['off', '3', '5', '10'],
    timerDefault: '3',
    shotOptions: ['off', '30', '60'],
    shotDefault: '30',
  },
  '6x3x5': {
    centerOptions: ['off', 'cumulative', 'endgame'],
    centerDefault: 'endgame',
    timerOptions: ['off', '3', '5', '10'],
    timerDefault: '3',
    shotOptions: ['off', '30', '60'],
    shotDefault: '30',
  },
  '10x5': {
    centerOptions: ['off', 'endgame'],
    centerDefault: 'off',
    timerOptions: ['off', '10', '20', '30'],
    timerDefault: '20',
    shotOptions: ['off', '60', '90'],
    shotDefault: '90',
  },
  '12x6x5': {
    centerOptions: ['off', 'endgame'],
    centerDefault: 'off',
    timerOptions: ['off', '10', '20', '30'],
    timerDefault: '20',
    shotOptions: ['off', '60', '90'],
    shotDefault: '90',
  },
  '8x4x6': {
    centerOptions: ['off', 'cumulative', 'endgame'],
    centerDefault: 'endgame',
    timerOptions: ['off', '3', '5', '10'],
    timerDefault: '5',
    shotOptions: ['off', '30', '60'],
    shotDefault: '30',
  },
  '7x4x5': {
    centerOptions: ['off', 'cumulative', 'endgame'],
    centerDefault: 'endgame',
    timerOptions: ['off', '3', '5', '10'],
    timerDefault: '5',
    shotOptions: ['off', '30', '60'],
    shotDefault: '30',
  },
};

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function readSelectOptions(page, selectId) {
  return page.evaluate((id) =>
    Array.from(document.getElementById(id)?.options || []).map((o) => o.value),
  selectId);
}

async function verifyBoard(page, boardId, expected) {
  await page.selectOption('#board-select', boardId);
  await page.waitForTimeout(500);

  const centerOpts = await readSelectOptions(page, 'center-rule-select');
  const timerOpts = await readSelectOptions(page, 'match-timer-select');
  const shotOpts = await readSelectOptions(page, 'shot-clock-select');

  record(
    `${boardId} centre options`,
    JSON.stringify(centerOpts) === JSON.stringify(expected.centerOptions),
    centerOpts.join(','),
  );
  record(
    `${boardId} centre default`,
    (await page.locator('#center-rule-select').inputValue()) === expected.centerDefault,
    await page.locator('#center-rule-select').inputValue(),
  );
  record(
    `${boardId} timer options`,
    JSON.stringify(timerOpts) === JSON.stringify(expected.timerOptions),
    timerOpts.join(','),
  );
  record(
    `${boardId} timer default`,
    (await page.locator('#match-timer-select').inputValue()) === expected.timerDefault,
    await page.locator('#match-timer-select').inputValue(),
  );
  record(
    `${boardId} shot options`,
    JSON.stringify(shotOpts) === JSON.stringify(expected.shotOptions),
    shotOpts.join(','),
  );
  record(
    `${boardId} shot default`,
    (await page.locator('#shot-clock-select').inputValue()) === expected.shotDefault,
    await page.locator('#shot-clock-select').inputValue(),
  );
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#board-select', { timeout: 15000 });

    for (const [boardId, expected] of Object.entries(EXPECTED)) {
      await verifyBoard(page, boardId, expected);
    }

    console.log('\n--- CATALOG SETTINGS BROWSER SUMMARY ---');
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
