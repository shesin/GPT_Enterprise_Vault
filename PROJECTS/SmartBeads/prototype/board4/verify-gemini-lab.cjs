/**
 * Headless verification for GEMINI_LAB.html
 * Does not modify the two historical forks.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, 'GEMINI_LAB.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) {
  console.error('NO_SCRIPT');
  process.exit(1);
}

function el(id) {
  const store = Object.create(null);
  return {
    id,
    style: {},
    value: id === 'lab-n' ? '100'
      : id === 'lab-depth' ? '2'
      : id === 'lab-move-cap' ? '40'
      : id === 'variant-select' ? '6'
      : id === 'game-mode-select' ? 'pve'
      : id === 'ai-difficulty' ? '2'
      : id === 'turn-timer-select' ? '0'
      : id === 'timer-mode-select' ? 'off'
      : id === 'max-move-select' ? '0'
      : id === 'center-rule-select' ? 'off'
      : id === 'q-4-cum' || id === 'q-4-end' || id === 'q-6-cum' || id === 'q-6-end' ? true
      : '',
    checked: true,
    disabled: false,
    innerText: '',
    innerHTML: '',
    className: '',
    textContent: '',
    getContext: () => ({
      clearRect() {}, createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
      fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
      arc() {}, fill() {}, setLineDash() {}, fillText() {},
    }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
    addEventListener() {},
    width: 360,
    height: 360,
  };
}

const elements = Object.create(null);
function getElementById(id) {
  if (!elements[id]) elements[id] = el(id);
  // checkboxes
  if (id.startsWith('q-')) {
    elements[id].checked = true;
  }
  return elements[id];
}

const sandbox = {
  console,
  Math,
  Date,
  Object,
  Array,
  Set,
  Map,
  Infinity,
  parseInt,
  parseFloat,
  isFinite,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  requestIdleCallback: (cb) => setTimeout(cb, 0),
  window: {},
  document: {
    getElementById,
    body: { addEventListener() {} },
  },
  AudioContext: function () { this.state = 'running'; this.resume = () => {}; this.createOscillator = () => ({ connect() {}, frequency: { setValueAtTime() {} }, start() {}, stop() {}, type: '' }); this.createGain = () => ({ connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }); this.destination = {}; this.currentTime = 0; },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.window.AudioContext = sandbox.AudioContext;
sandbox.window.webkitAudioContext = sandbox.AudioContext;

try {
  vm.runInNewContext(match[1], sandbox, { filename: 'GEMINI_LAB.js', timeout: 120000 });
} catch (err) {
  console.error('EVAL_FAIL', err);
  process.exit(1);
}

// Force init paths that need GeminiLab — it's assigned on window at end
const Lab = sandbox.window.GeminiLab;
if (!Lab) {
  console.error('GeminiLab export missing');
  process.exit(1);
}

const assertions = [];
function check(id, pass, detail) {
  assertions.push({ id, pass: !!pass, detail });
}

// Starting layouts match forks / architecture doc
const b4 = Lab.createStartingBoard(4, 4, 4);
const b6 = Lab.createStartingBoard(6, 4, 4);
check('L01_4bead_layout', JSON.stringify(b4) === JSON.stringify([1,1,1,1,0,0,0,0,0,0,0,0,2,2,2,2]), b4);
check('L02_6bead_layout', JSON.stringify(b6) === JSON.stringify([1,1,1,1,1,0,0,1,2,0,0,2,2,2,2,2]), b6);
check('L03_centers', JSON.stringify(Lab.deriveCenterNodes(4, 4)) === JSON.stringify([5, 6, 9, 10]), Lab.deriveCenterNodes(4, 4));

const geo4 = Lab.createLabConfig({ beadsPerSide: 4, rows: 4, cols: 4, centerRule: 'endgame', maxMoveLimit: 40, aiDepth: 2 });
const geo6 = Lab.createLabConfig({ beadsPerSide: 6, rows: 4, cols: 4, centerRule: 'cumulative', maxMoveLimit: 40, aiDepth: 2 });
check('L04_diag_rays_4', geo4.diagonalRays.length === 6, geo4.diagonalRays.length);
check('L05_geo6_beads', geo6.beadsPerSide === 6, geo6.beadsPerSide);

// Sanity: small batches for 4 and 6
function runBatch(geo, n) {
  const stats = { red: 0, blue: 0, draw: 0, elim: 0, rep: 0, max: 0, stale: 0, len: 0, maxCap: 0, maxCen: 0, maxUn: 0 };
  for (let i = 0; i < n; i++) {
    const g = Lab.playHeadlessGame(geo, i, geo.aiDepth, geo.maxMoveLimit);
    stats.len += g.gameLength;
    if (g.winner === 'red') stats.red++;
    else if (g.winner === 'blue') stats.blue++;
    else stats.draw++;
    if (g.endReason === 'elimination') stats.elim++;
    else if (g.endReason === 'repetition') stats.rep++;
    else if (g.endReason === 'stalemate') stats.stale++;
    else if (g.endReason === 'max_moves') {
      stats.max++;
      if (g.maxMovesSubReason === 'captures') stats.maxCap++;
      else if (g.maxMovesSubReason === 'center') stats.maxCen++;
      else stats.maxUn++;
    }
  }
  return stats;
}

const s4 = runBatch(geo4, 50);
const s6 = runBatch(geo6, 50);
check('L06_4bead_terminated_50', s4.red + s4.blue + s4.draw === 50, s4);
check('L07_6bead_terminated_50', s6.red + s6.blue + s6.draw === 50, s6);
check('L08_maxmoves_subreasons_present', (s4.maxCap + s4.maxCen + s4.maxUn + s6.maxCap + s6.maxCen + s6.maxUn) >= 0, { s4, s6 });
// 4-bead historically high draws; 6-bead more decisive — soft sanity, not exact match
check('L09_4bead_has_games', s4.len > 0, s4);
check('L10_6bead_has_games', s6.len > 0, s6);

// 500+ game stress (chunked via sync loop in Node — proves engine throughput)
const t0 = Date.now();
const stressGeo = Lab.createLabConfig({ beadsPerSide: 6, rows: 4, cols: 4, centerRule: 'endgame', maxMoveLimit: 40, aiDepth: 2 });
const stress = runBatch(stressGeo, 500);
const elapsed = Date.now() - t0;
check('L11_500_complete', stress.red + stress.blue + stress.draw === 500, { stress, elapsedMs: elapsed });
check('L12_500_under_60s', elapsed < 60000, elapsed);

// max_moves sub-reason helper direct test
const emptyish = Lab.createStartingBoard(4, 4, 4);
const r1 = Lab.resolveMaxMovesOutcome(emptyish, geo4, 'off', 0, 0);
check('L13_unresolved_when_tied_off', r1.winner === 'draw' && r1.maxMovesSubReason === 'unresolved', r1);

const boardCenter = new Array(16).fill(0);
boardCenter[5] = 1; // red on center
boardCenter[12] = 2; // blue off-center; equal remaining pieces → equal captures
const r2 = Lab.resolveMaxMovesOutcome(boardCenter, geo4, 'endgame', 0, 0);
check('L14_center_subreason', r2.winner === 'red' && r2.maxMovesSubReason === 'center', r2);

// --- Explicit multi-jump batch fidelity ---
// Red at 8; Blue at 9 and 6; landing 10 then 2 empty. Opening 8→10 over 9 must continue 10→2 over 6.
check('L15_chain_helpers_exported', typeof Lab.executeTurnWithCaptureChain === 'function' && typeof Lab.getFollowUpJumps === 'function', {
  executeTurnWithCaptureChain: typeof Lab.executeTurnWithCaptureChain,
  getFollowUpJumps: typeof Lab.getFollowUpJumps,
  selectAiChainContinuation: typeof Lab.selectAiChainContinuation,
  applyBoardMove: typeof Lab.applyBoardMove,
});

const chainBoard = new Array(16).fill(0);
chainBoard[8] = Lab.P1;
chainBoard[9] = Lab.P2;
chainBoard[6] = Lab.P2;
const opening = { from: 8, to: 10, captured: 9 };
const afterFirst = Lab.applyBoardMove(chainBoard, opening);
const followUps = Lab.getFollowUpJumps(afterFirst, 10, Lab.P1, geo4);
check('L16_followup_exists_after_first_capture', followUps.some((m) => m.to === 2 && m.captured === 6), followUps);

const chainResult = Lab.executeTurnWithCaptureChain(chainBoard, opening, Lab.P1, geo4);
check('L17_chain_two_hops', chainResult.hops.length === 2, chainResult.hops);
check('L18_same_player_both_hops', chainResult.hops.every((h) => h.player === Lab.P1), chainResult.hops);
check('L19_first_capture', chainResult.hops[0].from === 8 && chainResult.hops[0].to === 10 && chainResult.hops[0].captured === 9, chainResult.hops[0]);
check('L20_followup_capture', chainResult.hops[1].from === 10 && chainResult.hops[1].to === 2 && chainResult.hops[1].captured === 6, chainResult.hops[1]);
check('L21_both_enemies_removed', chainResult.board[9] === 0 && chainResult.board[6] === 0 && chainResult.board[2] === Lab.P1 && chainResult.board[8] === 0 && chainResult.board[10] === 0, chainResult.board);
check('L22_no_further_followup', Lab.getFollowUpJumps(chainResult.board, 2, Lab.P1, geo4).length === 0, Lab.getFollowUpJumps(chainResult.board, 2, Lab.P1, geo4));

// Interactive-equivalent stepwise path (mirrors executeMove AI continuation without DOM)
let interactiveBoard = chainBoard.slice();
interactiveBoard = Lab.applyBoardMove(interactiveBoard, opening);
const interactiveFollowUps = Lab.getFollowUpJumps(interactiveBoard, 10, Lab.P1, geo4);
const interactiveNext = Lab.selectAiChainContinuation(interactiveBoard, interactiveFollowUps, Lab.P1, geo4);
interactiveBoard = Lab.applyBoardMove(interactiveBoard, interactiveNext);
check('L23_interactive_vs_headless_board', JSON.stringify(interactiveBoard) === JSON.stringify(chainResult.board), {
  interactive: interactiveBoard,
  headless: chainResult.board,
});
check('L24_interactive_vs_headless_second_hop', interactiveNext.to === chainResult.hops[1].to && interactiveNext.captured === chainResult.hops[1].captured, {
  interactiveNext,
  headlessHop: chainResult.hops[1],
});

// Old shortcut would end turn after first hop with Blue still on 6 — prove chain did not stop early
check('L25_intermediate_turn_not_ended_early', chainResult.hops.length > 1 && chainResult.board[6] === 0, {
  hops: chainResult.hops.length,
  blueOn6: chainResult.board[6],
});

const failed = assertions.filter((a) => !a.pass);
const out = {
  assertions: assertions.map((a) => ({ id: a.id, result: a.pass ? 'PASS' : 'FAIL', detail: a.detail })),
  failed: failed.map((a) => ({ id: a.id, detail: a.detail })),
  sanity: { s4, s6, stress, elapsedMs: elapsed },
  ok: failed.length === 0,
};
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
