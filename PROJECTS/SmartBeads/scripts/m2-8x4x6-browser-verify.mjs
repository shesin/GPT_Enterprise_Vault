/**
 * Browser verification for 8-bead · 4×6 hourglass (catalog id 8x4x6).
 * Requires: npm run web:smartbeads (http://localhost:5173/)
 */
import { chromium } from 'playwright';

const URL = process.env.SMARTBEADS_URL || 'http://localhost:5173/';
const BOARD_ID = '8x4x6';
const VARIANT = '8x4x6';
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function projectNode(page, variant, nodeIndex) {
  return page.evaluate(
    async ({ v, i }) => {
      const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      const eng = new SmartBeadsEngine(v);
      const node = eng.getState().board.intersections[i];
      const canvas = document.getElementById('board');
      if (!canvas || node.x === undefined || node.y === undefined) return null;
      const w = canvas.width;
      const h = canvas.height;
      const px = 40 + (node.y / 8) * (w - 80);
      const py = 36 + ((10 - node.x) / 12) * (h - 72);
      const rect = canvas.getBoundingClientRect();
      return {
        x: rect.left + (px * rect.width) / w,
        y: rect.top + (py * rect.height) / h,
      };
    },
    { v: variant, i: nodeIndex },
  );
}

async function clickNode(page, variant, nodeIndex) {
  const coords = await projectNode(page, variant, nodeIndex);
  if (!coords) throw new Error(`node ${nodeIndex} coords missing`);
  await page.mouse.click(coords.x, coords.y);
  await page.waitForTimeout(450);
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
    record(
      'board selector lists 8x4x6',
      boardOptions.some((t) => /8-bead.*4×6|8-bead.*4x6|hourglass/i.test(t)),
      boardOptions.join(' | '),
    );

    await selectBoard(page);

    const p1 = await page.locator('#p1-pieces').textContent();
    const p2 = await page.locator('#p2-pieces').textContent();
    record('starting pieces 8+8', p1 === '8' && p2 === '8', `P1=${p1} P2=${p2}`);

    const geom = await page.evaluate(async () => {
      const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      const eng = new SmartBeadsEngine('8x4x6');
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
      'geometry 24 nodes / 68 edges / centres 9,10,13,14',
      geom.nodes === 24 && geom.edges === 68 && geom.centers?.join(',') === '9,10,13,14',
      JSON.stringify(geom),
    );
    record('empty hourglass waist (8 nodes)', geom.emptyIds.join(',') === '5,6,9,10,13,14,17,18', geom.emptyIds.join(','));
    record('opening legal moves (RED)', geom.opening === 16, `moves=${geom.opening}`);

    const centerOpts = await page.evaluate(() =>
      Array.from(document.getElementById('center-rule-select')?.options || []).map((o) => o.value),
    );
    record(
      'centre rule off/cumulative/endgame',
      centerOpts.includes('off') && centerOpts.includes('cumulative') && centerOpts.includes('endgame'),
      centerOpts.join(','),
    );

    const defaultCenter = await page.locator('#center-rule-select').inputValue();
    record('default centre rule endgame (human catalog)', defaultCenter === 'endgame', defaultCenter);

    const slide = await page.evaluate(async () => {
      const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      const eng = new SmartBeadsEngine('8x4x6');
      const board = eng.getState().board;
      const isJump = (m) => board.jumpPaths?.some((p) => p.from === m.from && p.to === m.to);
      return eng.getLegalMoves().find((m) => !isJump(m)) || null;
    });
    if (slide) {
      await clickNode(page, VARIANT, slide.from);
      await clickNode(page, VARIANT, slide.to);
      await page.waitForTimeout(1200);
    }
    const turnAfterMove = await page.locator('#turn-count').textContent();
    record('slide + AI turn advance', parseInt(turnAfterMove || '0', 10) >= 2, `turns=${turnAfterMove}`);

    await page.selectOption('#game-mode-select', 'pvp');
    await page.waitForTimeout(300);
    await page.locator('#restart-btn').click();
    await page.waitForTimeout(400);
    if (slide) {
      await clickNode(page, VARIANT, slide.from);
      await clickNode(page, VARIANT, slide.to);
      await page.waitForTimeout(400);
      await page.locator('#undo-btn').click();
      await page.waitForTimeout(400);
    }
    record('undo in PvP', (await page.locator('#turn-count').textContent()) === '0', await page.locator('#turn-count').textContent());

    record('finish chain button present', (await page.locator('#finish-btn').count()) === 1, 'finish-btn');

    console.log('\n--- 8x4x6 BROWSER SUMMARY ---');
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
