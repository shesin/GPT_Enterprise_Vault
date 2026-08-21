/**
 * Live browser-level stall verification.
 * Reproduces the original observed stall: AI optional-stops but UI stays on "AI is thinking".
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { liveSnap, waitForAiTurnComplete } from './lib/live-ply.mjs';

const URL = process.env.SMARTBEADS_URL || 'http://localhost:5173/';

/**
 * AI is thinking, P1 15, P2 16, 1 Ebony capture.
 */
const STALL_RED = ['LT', 'LM', 'LB', 'LIT', 'LIM', 'A00', 'A01', 'A10', 'A21', 'A30', 'A31', 'A32', 'A40', 'A41'];
const STALL_BLUE = ['RT', 'RM', 'RB', 'RIT', 'RIM', 'RIB', 'A03', 'A04', 'A14', 'A20', 'A23', 'A24', 'A33', 'A34', 'A43', 'A44'];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#board');

  // Load the stall position into the live shell
  await page.evaluate(({ red, blue }) => {
    // Access the bootstrap-injected test hook
    const sb = window.__SB_TEST__;
    const session = sb.session;
    const engine = session.getEngine();
    const state = engine.getState();
    
    for (const point of state.board.intersections) {
      point.occupant = undefined;
    }
    for (const label of red) {
      state.board.intersections.find((p) => p.label === label).occupant = 'RED';
    }
    for (const label of blue) {
      state.board.intersections.find((p) => p.label === label).occupant = 'BLUE';
    }
    state.currentPlayer = 'BLUE';
    state.captures.RED = 0;
    state.captures.BLUE = 1;
    state.moveCount = 1;
    
    // Force UI update and trigger AI
    sb.updateUI();
    sb.afterHumanOrAiTurn();
  }, { red: STALL_RED, blue: STALL_BLUE });

  console.log('AI turn triggered for stall position...');
  
  const result = await waitForAiTurnComplete(page, 10000);
  const snap = result.snap;

  console.log('Final Snapshot State:');
  console.log(`- moveCount: ${snap.moveCount}`);
  console.log(`- currentPlayer: ${snap.currentPlayer}`);
  console.log(`- aiThinking: ${snap.aiThinking}`);
  console.log(`- statusText: "${snap.statusText}"`);
  console.log(`- uiState: ${snap.uiState}`);
  console.log(`- stalled: ${result.stalled}`);

  const ok = !result.stalled
    && snap.moveCount >= 2
    && snap.aiThinking === false
    && !/AI is thinking/i.test(snap.statusText)
    && (snap.gameOver || snap.currentPlayer === 'RED')
    && snap.uiState !== 'chain';

  if (ok) {
    console.log('PASS');
    process.exit(0);
  } else {
    console.log('FAIL');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
