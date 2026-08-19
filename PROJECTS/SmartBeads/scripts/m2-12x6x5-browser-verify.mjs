/**
 * Browser verification for 12-bead · 6×5 (catalog id 12x6x5).
 * Requires: npm run web:smartbeads (http://localhost:5173/)
 */
import { chromium } from 'playwright';
import { clickNode } from './lib/project-node.mjs';
import { playTwoClicksIsolated, timingWindow } from './lib/live-ply.mjs';

const URL = process.env.SMARTBEADS_URL || 'http://localhost:5173/';
const BOARD_ID = '12x6x5';
const VARIANT = '12x6x5';
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${name}${detail ? ' — ' + detail : ''}`);
}


async function selectBoard(page) {
  await page.selectOption('#board-select', BOARD_ID);
  await page.waitForTimeout(600);
  await page.locator('#restart-btn').click();
  await page.waitForTimeout(500);
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#board', { timeout: 15000 });

    const boardOptions = await page.locator('#board-select option').allTextContents();
    record('board selector lists 12x6x5', boardOptions.some((t) => /12-bead.*6×5|12-bead.*6x5/i.test(t)), boardOptions.join(' | '));

    await selectBoard(page);

    const p1 = await page.locator('#p1-pieces').textContent();
    const p2 = await page.locator('#p2-pieces').textContent();
    record('starting pieces 12+12', p1 === '12' && p2 === '12', `P1=${p1} P2=${p2}`);

    const geom = await page.evaluate(async () => {
      const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      const eng = new SmartBeadsEngine('12x6x5');
      const b = eng.getState().board;
      return {
        nodes: b.intersections.length,
        edges: b.connections.length,
        centers: b.centerNodeIds,
        opening: eng.getLegalMoves().length,
        emptyIds: b.intersections.filter((p) => p.occupant === undefined).map((p) => p.id).sort((a, b) => a - b),
      };
    });
    record(
      'geometry 30 nodes / 89 edges / centres 12,17',
      geom.nodes === 30 && geom.edges === 89 && geom.centers?.join(',') === '12,17',
      JSON.stringify(geom),
    );
    record('empty centre file (6 nodes)', geom.emptyIds.join(',') === '2,7,12,17,22,27', geom.emptyIds.join(','));
    record('opening legal moves (RED)', geom.opening === 16, `moves=${geom.opening}`);

    const centerOpts = await page.evaluate(() =>
      Array.from(document.getElementById('center-rule-select')?.options || []).map((o) => o.value),
    );
    record(
      'centre rule off/endgame',
      centerOpts.includes('off') && centerOpts.includes('endgame') && !centerOpts.includes('cumulative'),
      centerOpts.join(','),
    );

    const defaultCenter = await page.locator('#center-rule-select').inputValue();
    record('default centre rule off (catalog)', defaultCenter === 'off', defaultCenter);

    const slide = await page.evaluate(async () => {
      const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      const eng = new SmartBeadsEngine('12x6x5');
      const board = eng.getState().board;
      const isJump = (m) => board.jumpPaths?.some((p) => p.from === m.from && p.to === m.to);
      return eng.getLegalMoves().find((m) => !isJump(m)) || null;
    });
    const ply = await playTwoClicksIsolated(page, BOARD_ID, VARIANT);
    record(
      'two clicks = isolated Ivory ply (AI has not moved)',
      ply.iso.ok && ply.after.moveCount === 1 && ply.selectDiff.length === 0,
      ply.iso.detail,
    );
    const timing = await timingWindow(page);
    await page.waitForTimeout(timing.AI_REPLY_DELAY_MS + 900);
    const turnAfterMove = await page.locator('#turn-count').textContent();
    record('AI reply is a later ply', parseInt(turnAfterMove || '0', 10) >= 2, `turns=${turnAfterMove}`);

    await page.selectOption('#game-mode-select', 'pvp');
    await page.waitForTimeout(300);
    await page.locator('#restart-btn').click();
    await page.waitForTimeout(400);
    if (slide) {
      await clickNode(page, BOARD_ID, slide.from);
      await clickNode(page, BOARD_ID, slide.to);
      await page.waitForTimeout(400);
      await page.locator('#undo-btn').click();
      await page.waitForTimeout(400);
    }
    record('undo in PvP', (await page.locator('#turn-count').textContent()) === '0', await page.locator('#turn-count').textContent());

    record('finish chain button present', (await page.locator('#finish-btn').count()) === 1, 'finish-btn');

    console.log('\n--- 12x6x5 BROWSER SUMMARY ---');
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
