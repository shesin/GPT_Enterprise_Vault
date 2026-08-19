/**
 * Browser verification for 6-bead · 4×4 (catalog id 6x4).
 * Requires: npm run web:smartbeads (http://localhost:5173/)
 */
import { chromium } from 'playwright';
import { clickNode as clickBoardNode } from './lib/project-node.mjs';
import { playTwoClicksIsolated, timingWindow } from './lib/live-ply.mjs';

const URL = process.env.SMARTBEADS_URL || 'http://localhost:5173/';
const BOARD_ID = '6x4';
const VARIANT = '6';
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function clickNode(page, nodeIndex) {
  await clickBoardNode(page, BOARD_ID, nodeIndex);
}

async function selectBoard(page) {
  await page.selectOption('#board-select', BOARD_ID);
  await page.waitForTimeout(600);
  await page.locator('#restart-btn').click();
  await page.waitForTimeout(500);
}

async function waitForHumanTurn(page, maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const status = await page.locator('#status').textContent();
    if (status && /P1 turn|select a piece/i.test(status)) return true;
    if (await page.locator('#result-modal').isVisible()) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#board', { timeout: 15000 });

    const boardOptions = await page.locator('#board-select option').allTextContents();
    record('board selector lists 6x4', boardOptions.some((t) => /6-bead.*4×4|6-bead.*4x4/i.test(t)), boardOptions.join(' | '));

    await selectBoard(page);

    const p1 = await page.locator('#p1-pieces').textContent();
    const p2 = await page.locator('#p2-pieces').textContent();
    record('starting pieces 6+6', p1 === '6' && p2 === '6', `P1=${p1} P2=${p2}`);

    const geom = await page.evaluate(async () => {
      const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      const eng = new SmartBeadsEngine('6');
      const b = eng.getState().board;
      return {
        nodes: b.intersections.length,
        edges: b.connections.length,
        centers: b.centerNodeIds,
      };
    });
    record('geometry 16 nodes / 42 edges', geom.nodes === 16 && geom.edges === 42, JSON.stringify(geom));

    const opening = await page.evaluate(async () => {
      const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      return new SmartBeadsEngine('6').getLegalMoves().length;
    });
    record('opening legal moves (RED)', opening === 10, `moves=${opening}`);

    const slide = await page.evaluate(async () => {
      const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      const eng = new SmartBeadsEngine('6');
      const board = eng.getState().board;
      const isJump = (m) => board.jumpPaths?.some((p) => p.from === m.from && p.to === m.to);
      return eng.getLegalMoves().find((m) => !isJump(m)) || null;
    });
    if (slide) {
      await clickNode(page, slide.from);
      await clickNode(page, slide.to);
      await waitForHumanTurn(page);
    }
    const turnsAfterSlide = await page.locator('#turn-count').textContent();
    record('normal slide + turn advance', parseInt(turnsAfterSlide || '0', 10) >= 1, `turns=${turnsAfterSlide}`);

    const centerOpts = await page.evaluate(() => {
      const sel = document.getElementById('center-rule-select');
      return sel ? Array.from(sel.options).map((o) => o.value) : [];
    });
    record(
      'centre rule off/cumulative/endgame',
      centerOpts.includes('off') && centerOpts.includes('cumulative') && centerOpts.includes('endgame'),
      centerOpts.join(','),
    );

    await page.selectOption('#center-rule-select', 'endgame');
    await page.waitForTimeout(300);
    const centerDisplay = await page.locator('#p1-center').textContent();
    record('centre endgame display updates', centerDisplay !== 'Off', centerDisplay || 'empty');

    const capture = await page.evaluate(async () => {
      const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      const eng = new SmartBeadsEngine('6');
      const b = eng.getState().board;
      for (const p of b.intersections) p.occupant = undefined;
      b.intersections.find((p) => p.id === 0).occupant = 'RED';
      b.intersections.find((p) => p.id === 4).occupant = 'BLUE';
      b.intersections.find((p) => p.id === 9).occupant = 'BLUE';
      eng.applyMove({ from: 0, to: 8 });
      const chainMoves = eng.getLegalMoves();
      return {
        caps: eng.getState().captures.RED,
        chain: eng.getChainPieceId(),
        hasFollowUp: chainMoves.some((m) => m.from === 8),
      };
    });
    record(
      'capture + chain state (engine)',
      capture.caps === 1 && capture.chain === 8 && capture.hasFollowUp,
      `caps=${capture.caps} chain=${capture.chain} followUp=${capture.hasFollowUp}`,
    );

    await page.locator('#restart-btn').click();
    await page.waitForTimeout(400);
    const finishWorks = await page.evaluate(async () => {
      const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      const eng = new SmartBeadsEngine('6');
      const b = eng.getState().board;
      for (const p of b.intersections) p.occupant = undefined;
      b.intersections.find((p) => p.id === 0).occupant = 'RED';
      b.intersections.find((p) => p.id === 4).occupant = 'BLUE';
      b.intersections.find((p) => p.id === 9).occupant = 'BLUE';
      eng.applyMove({ from: 0, to: 8 });
      eng.endTurn();
      return eng.getChainPieceId() === null && eng.getState().currentPlayer === 'BLUE';
    });
    record('finish chain ends turn (engine)', finishWorks, String(finishWorks));

    record('finish chain button present', (await page.locator('#finish-btn').count()) === 1, 'finish-btn');

    await page.locator('#restart-btn').click();
    await page.waitForTimeout(500);
    const ply = await playTwoClicksIsolated(page, BOARD_ID, VARIANT);
    record(
      'two clicks = isolated Ivory ply (AI has not moved)',
      ply.iso.ok && ply.after.moveCount === 1 && ply.selectDiff.length === 0,
      ply.iso.detail,
    );
    const timing = await timingWindow(page);
    await page.waitForTimeout(timing.AI_REPLY_DELAY_MS + 900);
    const turnAfterAi = await page.locator('#turn-count').textContent();
    record('AI reply is a later ply', parseInt(turnAfterAi || '0', 10) >= 2, `turns=${turnAfterAi}`);

    await page.selectOption('#game-mode-select', 'pvp');
    await page.waitForTimeout(300);
    await page.locator('#restart-btn').click();
    await page.waitForTimeout(400);
    if (slide) {
      await clickNode(page, slide.from);
      await clickNode(page, slide.to);
      await page.waitForTimeout(400);
    }
    const undoEnabled = await page.locator('#undo-btn').isEnabled();
    if (undoEnabled) {
      await page.locator('#undo-btn').click();
      await page.waitForTimeout(400);
    }
    const turnsAfterUndo = await page.locator('#turn-count').textContent();
    record('undo restores prior state', undoEnabled && turnsAfterUndo === '0', `undo=${undoEnabled} turns=${turnsAfterUndo}`);

    await page.locator('#restart-btn').click();
    await page.waitForTimeout(400);
    record('restart resets turn count', (await page.locator('#turn-count').textContent()) === '0', await page.locator('#turn-count').textContent());

    console.log('\n--- 6x4 BROWSER SUMMARY ---');
    results.forEach((r) => console.log(`${r.ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${r.name}`));
    const failed = results.filter((r) => !r.ok);
    if (failed.length) process.exit(1);
  } catch (err) {
    console.error('UNCONFIRMED  browser session failed:', err.stack || err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
