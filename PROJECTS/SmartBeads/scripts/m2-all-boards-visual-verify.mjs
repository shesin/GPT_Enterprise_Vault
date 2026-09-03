/**
 * Visual + turn-control verification for all V1 boards (Playwright).
 * Requires: npm run web:smartbeads (http://localhost:5173/)
 */
import { chromium } from 'playwright';
import { clickNode } from './lib/project-node.mjs';

const URL = process.env.SMARTBEADS_URL || 'http://localhost:5173/';
const BOARDS = ['16', '12x6x5', '10x5', '8x4x6', '7x4x5', '6x4', '6x3x5'];
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#board');
    if (await page.locator('#start-game-btn').isVisible()) {
      await page.locator('#start-game-btn').click();
    }
    await page.waitForTimeout(200);

    for (const boardId of BOARDS) {
      await page.selectOption('#board-select', boardId);
      await page.locator('#restart-btn').click();
      await page.waitForTimeout(400);

      const info = await page.evaluate(async (id) => {
        const { resolveEngineVariant } = await import('/PROJECTS/SmartBeads/src/config/BoardCatalog.ts');
        const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
        const { getBoardVisualProfile, getBoardCanvasSize } = await import(
          '/PROJECTS/SmartBeads/src/playtest/web/layout/boardVisualProfile.ts'
        );
        const { drawCanvasBoard } = await import(
          '/PROJECTS/SmartBeads/src/playtest/web/render/CanvasBoardRenderer.ts'
        );
        const v = resolveEngineVariant(id);
        const eng = new SmartBeadsEngine(v);
        const board = eng.getState().board;
        const profile = getBoardVisualProfile(board.name);
        const canvas = document.getElementById('board');
        const expected = getBoardCanvasSize(board.name);
        let ringDraws = 0;
        const ctx = canvas.getContext('2d');
        const origArc = ctx.arc.bind(ctx);
        ctx.arc = function (x, y, r, ...rest) {
          if (Math.abs(r - 22) < 0.1) ringDraws++;
          return origArc(x, y, r, ...rest);
        };
        drawCanvasBoard(canvas, {
          board,
          currentPlayer: 'RED',
          gameOver: false,
          selectedId: null,
          legalTargets: [],
          chainPieceId: null,
          anim: null,
          turnPulse: 0,
        });
        const red = board.intersections.filter((p) => p.occupant === 'RED').length;
        const blue = board.intersections.filter((p) => p.occupant === 'BLUE').length;
        return {
          canvasW: canvas.width,
          canvasH: canvas.height,
          expectedW: expected.width,
          expectedH: expected.height,
          ringDraws,
          expectedRings: profile.centerRingPoints?.length ?? 0,
          red,
          blue,
        };
      }, boardId);

      record(
        `${boardId} canvas size matches prototype`,
        info.canvasW === info.expectedW && info.canvasH === info.expectedH,
        `${info.canvasW}x${info.canvasH}`,
      );
      record(
        `${boardId} centre ring count matches profile`,
        info.ringDraws === info.expectedRings,
        `rings=${info.ringDraws} expected=${info.expectedRings}`,
      );
      record(
        `${boardId} starting piece counts`,
        info.red === info.blue && info.red > 0,
        `R=${info.red} B=${info.blue}`,
      );
    }

    // PvP: P1 moves, then P2 moves on the live session
    await page.selectOption('#start-mode-select', 'pvp');
    await page.selectOption('#board-select', '10x5');
    await page.locator('#restart-btn').click();
    await page.waitForTimeout(400);

    const p1Move = await page.evaluate(async () => {
      const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      const eng = new SmartBeadsEngine('10x5');
      const board = eng.getState().board;
      const isJump = (m) => board.jumpPaths?.some((p) => p.from === m.from && p.to === m.to);
      return eng.getLegalMoves().find((m) => !isJump(m)) ?? null;
    });
    if (p1Move) {
      await clickNode(page, '10x5', p1Move.from);
      await clickNode(page, '10x5', p1Move.to);
      await page.waitForTimeout(500);
      const p2Move = await page.evaluate(async (move) => {
        const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
        const eng = new SmartBeadsEngine('10x5');
        eng.applyMove(move);
        const board = eng.getState().board;
        const isJump = (m) => board.jumpPaths?.some((p) => p.from === m.from && p.to === m.to);
        return eng.getLegalMoves().find((m) => !isJump(m)) ?? null;
      }, p1Move);
      if (p2Move) {
        await clickNode(page, '10x5', p2Move.from);
        await clickNode(page, '10x5', p2Move.to);
        await page.waitForTimeout(500);
      }
      const turns = await page.locator('#turn-count').textContent();
      record('PvP P1 then P2 both move on 10-bead', turns === '2', `turns=${turns}`);
    } else {
      record('PvP P1 then P2 both move on 10-bead', false, 'no P1 opening move');
    }

    console.log('\n--- ALL BOARDS SUMMARY ---');
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
