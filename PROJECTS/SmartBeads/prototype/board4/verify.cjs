/**
 * Headless verification harness for Board4 gameplay lab.
 * Does not touch the production SmartBeads app.
 *
 * Usage: node verify.mjs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) {
  console.error('FAIL: no script block in index.html');
  process.exit(1);
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
  globalThis: {},
};
sandbox.globalThis = sandbox;
sandbox.globalThis.__BOARD4_LAB_HEADLESS__ = true;

try {
  vm.runInNewContext(match[1], sandbox, { filename: 'board4-lab.js' });
} catch (err) {
  console.error('FAIL: script evaluation error');
  console.error(err);
  process.exit(1);
}

const Lab = sandbox.globalThis.Board4Lab;
if (!Lab) {
  console.error('FAIL: Board4Lab not exported');
  process.exit(1);
}

const results = {
  syntaxOk: true,
  aiVsAi: [],
  humanVsAi: [],
  featureChecks: {},
  failures: [],
};

function playAiVsAi(firstPlayer, difficulty, maxSteps) {
  const state = Lab.createInitialState(firstPlayer, difficulty);
  Lab.recordPosition(state);
  let steps = 0;
  let finishUsed = false;
  let captureSeen = false;
  let multiJumpSeen = false;

  while (!state.gameOver && steps < maxSteps) {
    const beforeChain = state.chainPieceId;
    const actions = Lab.listAiActions(state);
    if (actions.length === 0) {
      Lab.checkImmediateAndTerminal(state);
      break;
    }
    // Occasionally force finish when available to exercise voluntary stop
    if (Lab.canFinishMultiJump(state) && Math.random() < 0.25) {
      Lab.finishMultiJump(state);
      finishUsed = true;
    } else {
      const ok = Lab.playAiTurnStep(state);
      if (!ok) {
        Lab.checkImmediateAndTerminal(state);
        break;
      }
    }
    if (state.captures.RED + state.captures.BLUE > 0) captureSeen = true;
    if (beforeChain !== null || state.chainPieceId !== null) multiJumpSeen = true;
    steps++;
  }

  if (!state.gameOver) {
    results.failures.push('AI vs AI did not terminate: first=' + firstPlayer + ' diff=' + difficulty);
  }

  return {
    firstPlayer,
    difficulty,
    winner: state.winner,
    endReason: state.endReason,
    plies: state.plyCount,
    captures: { ...state.captures },
    finishUsed,
    captureSeen,
    multiJumpSeen,
    terminated: state.gameOver,
  };
}

function playHumanVsAi(firstPlayer, difficulty, humanPolicy) {
  const state = Lab.createInitialState(firstPlayer, difficulty);
  Lab.recordPosition(state);
  let steps = 0;
  let finishClicked = false;
  let multiJumpOffered = false;

  while (!state.gameOver && steps < 500) {
    if (state.currentPlayer === Lab.HUMAN) {
      if (Lab.canFinishMultiJump(state)) {
        multiJumpOffered = true;
        if (humanPolicy === 'finish_when_possible' && Math.random() < 0.5) {
          Lab.finishMultiJump(state);
          finishClicked = true;
          steps++;
          continue;
        }
      }
      const moves = Lab.getLegalMoves(state);
      if (moves.length === 0) {
        if (Lab.canFinishMultiJump(state)) {
          Lab.finishMultiJump(state);
          finishClicked = true;
        } else {
          Lab.checkImmediateAndTerminal(state);
        }
        steps++;
        continue;
      }
      // Prefer captures like a reasonable human
      const jumps = moves.filter((m) => m.isJump);
      const pick = jumps.length ? jumps[Math.floor(Math.random() * jumps.length)] : moves[Math.floor(Math.random() * moves.length)];
      Lab.applyMove(state, pick);
    } else {
      if (Lab.canFinishMultiJump(state) && Math.random() < 0.2) {
        Lab.finishMultiJump(state);
      } else {
        Lab.playAiTurnStep(state);
      }
    }
    steps++;
  }

  return {
    firstPlayer,
    difficulty,
    winner: state.winner,
    endReason: state.endReason,
    plies: state.plyCount,
    captures: { ...state.captures },
    finishClicked,
    multiJumpOffered,
    terminated: state.gameOver,
    historyLen: state.moveHistory.length,
  };
}

// --- Feature: alternating first player ---
{
  let next = Lab.HUMAN;
  const sequence = [];
  for (let i = 0; i < 4; i++) {
    sequence.push(next);
    next = Lab.opponent(next);
  }
  results.featureChecks.alternatingFirstPlayer =
    sequence[0] === 'RED' && sequence[1] === 'BLUE' && sequence[2] === 'RED' && sequence[3] === 'BLUE';
  if (!results.featureChecks.alternatingFirstPlayer) {
    results.failures.push('alternating first player sequence failed');
  }
}

// --- Feature: board has diagonals ---
{
  const hasDiag = Lab.CONNECTIONS.some(({ from, to }) => {
    const r1 = Math.floor(from / 4);
    const c1 = from % 4;
    const r2 = Math.floor(to / 4);
    const c2 = to % 4;
    return Math.abs(r1 - r2) === 1 && Math.abs(c1 - c2) === 1;
  });
  results.featureChecks.diagonalConnections = hasDiag && Lab.CONNECTIONS.length > 24;
  if (!results.featureChecks.diagonalConnections) {
    results.failures.push('expected diagonal connections on Alquerque-style board');
  }
}

// --- Feature: evaluate is deterministic ---
{
  const s = Lab.createInitialState('RED', 'medium');
  Lab.recordPosition(s);
  const a = Lab.evaluate(s);
  const b = Lab.evaluate(s);
  results.featureChecks.evaluateDeterministic = a === b;
  if (!results.featureChecks.evaluateDeterministic) {
    results.failures.push('evaluate() nondeterministic');
  }
}

// --- Feature: forced repetition draw ---
{
  const s = Lab.createInitialState('RED', 'easy');
  // Manually stamp the same key 3 times via recordPosition after setting a fixed position
  const keyCount = {};
  // Use engine path: apply a slide forth and back if legal
  // Simpler: call recordPosition on identical clones
  const t = Lab.createInitialState('RED', 'easy');
  const k1 = Lab.recordPosition(t);
  const k2 = Lab.recordPosition(t);
  const k3 = Lab.recordPosition(t);
  results.featureChecks.repetitionCounter = k1 === 1 && k2 === 2 && k3 === 3;

  const s2 = Lab.createInitialState('RED', 'easy');
  Lab.recordPosition(s2);
  Lab.recordPosition(s2);
  // Third recording via checkImmediateAndTerminal after fabricating same position
  s2.positionCounts = Object.assign(Object.create(null), { [Lab.positionKey(s2)]: 2 });
  Lab.checkImmediateAndTerminal(s2);
  results.featureChecks.repetitionDraw = s2.gameOver && s2.winner === 'DRAW' && s2.endReason === 'repetition';
  if (!results.featureChecks.repetitionDraw) {
    results.failures.push('repetition draw not triggered');
  }
}

// --- Feature: elimination ---
{
  const s = Lab.createInitialState('RED', 'easy');
  s.occupants = s.occupants.map(() => null);
  s.occupants[0] = 'RED';
  s.occupants[1] = 'BLUE';
  s.currentPlayer = 'RED';
  s.chainPieceId = null;
  // Jump 0 over 1 to 2 if path exists
  const moves = Lab.getLegalMoves(s);
  const jump = moves.find((m) => m.isJump && m.from === 0);
  if (jump) {
    Lab.applyMove(s, jump);
    results.featureChecks.elimination = s.gameOver && s.winner === 'RED' && s.endReason === 'elimination';
  } else {
    // Force eliminate by clearing blue
    s.occupants[1] = null;
    Lab.checkImmediateAndTerminal(s);
    results.featureChecks.elimination = s.gameOver && s.winner === 'RED' && s.endReason === 'elimination';
  }
  if (!results.featureChecks.elimination) results.failures.push('elimination win failed');
}

// --- Feature: stalemate ---
{
  const s = Lab.createInitialState('RED', 'easy');
  s.occupants = s.occupants.map(() => null);
  s.occupants[0] = 'RED';
  s.occupants[1] = 'BLUE';
  s.occupants[4] = 'BLUE';
  s.occupants[5] = 'BLUE';
  // Trap: may still have moves — force no moves by surrounding
  s.occupants = new Array(16).fill(null);
  s.occupants[5] = 'RED';
  // Fill all adjacent empty? If all other nodes are BLUE and no jump landing, may have no moves
  for (let i = 0; i < 16; i++) {
    if (i !== 5) s.occupants[i] = 'BLUE';
  }
  s.currentPlayer = 'RED';
  s.chainPieceId = null;
  Lab.checkImmediateAndTerminal(s);
  results.featureChecks.stalemate = s.gameOver && s.endReason === 'stalemate' && s.winner === 'BLUE';
  if (!results.featureChecks.stalemate) results.failures.push('stalemate detection failed');
}

// --- Feature: ply limit + tie-break (captures then center) ---
{
  const s = Lab.createInitialState('RED', 'easy');
  s.plyCount = 40;
  s.captures = { RED: 2, BLUE: 1 };
  Lab.checkImmediateAndTerminal(s);
  // stalemate/legal may fire first since pieces exist — set ply end via resolve directly
  const s3 = Lab.createInitialState('RED', 'easy');
  s3.plyCount = 40;
  s3.captures = { RED: 2, BLUE: 1 };
  const wCap = Lab.resolvePlyLimitWinner(s3);
  results.featureChecks.tieBreakCaptures = wCap === 'RED';

  const s4 = Lab.createInitialState('RED', 'easy');
  s4.captures = { RED: 1, BLUE: 1 };
  s4.occupants = s4.occupants.map(() => null);
  s4.occupants[5] = 'RED';
  s4.occupants[12] = 'BLUE';
  const wCenter = Lab.resolvePlyLimitWinner(s4);
  results.featureChecks.tieBreakCenter = wCenter === 'RED';

  const s5 = Lab.createInitialState('RED', 'easy');
  s5.captures = { RED: 0, BLUE: 0 };
  s5.occupants = s5.occupants.map(() => null);
  s5.occupants[0] = 'RED';
  s5.occupants[15] = 'BLUE';
  results.featureChecks.tieBreakDraw = Lab.resolvePlyLimitWinner(s5) === 'DRAW';

  if (!results.featureChecks.tieBreakCaptures) results.failures.push('tie-break captures failed');
  if (!results.featureChecks.tieBreakCenter) results.failures.push('tie-break center failed');
  if (!results.featureChecks.tieBreakDraw) results.failures.push('tie-break draw failed');
}

// --- Feature: multi-jump + finish flag ---
{
  const s = Lab.createInitialState('RED', 'easy');
  // Setup: RED at 8, BLUE at 9, empty 10; and BLUE at 4 empty 0 for second jump from 10? 
  // Horizontal: RED 8, BLUE 9, empty 10. After jump to 10, need another enemy adjacent.
  s.occupants = new Array(16).fill(null);
  s.occupants[8] = 'RED';
  s.occupants[9] = 'BLUE';
  s.occupants[10] = null;
  s.occupants[14] = 'BLUE'; // from 10 jump vertical over 14 to ? 14+4=18 OOB
  // From 10, over 6 to 2 (up)
  s.occupants[6] = 'BLUE';
  s.currentPlayer = 'RED';
  const before = Lab.getLegalMoves(s).filter((m) => m.isJump);
  const j = before.find((m) => m.from === 8 && m.to === 10);
  if (j) {
    Lab.applyMove(s, j);
    results.featureChecks.multiJumpChain = s.chainPieceId === 10 && Lab.canFinishMultiJump(s);
    const cont = Lab.getLegalMoves(s);
    results.featureChecks.multiJumpContinuation = cont.some((m) => m.isJump);
    Lab.finishMultiJump(s);
    results.featureChecks.finishMultiJump = s.chainPieceId === null && s.currentPlayer === 'BLUE';
  } else {
    results.featureChecks.multiJumpChain = false;
    results.failures.push('could not set up multi-jump');
  }
}

// --- 20 AI vs AI ---
for (let i = 0; i < 20; i++) {
  const first = i % 2 === 0 ? 'RED' : 'BLUE';
  const diff = ['easy', 'medium', 'hard'][i % 3];
  results.aiVsAi.push(playAiVsAi(first, diff, 400));
}

// --- 5 Human vs AI ---
for (let i = 0; i < 5; i++) {
  const first = i % 2 === 0 ? 'RED' : 'BLUE';
  const diff = i < 2 ? 'easy' : i < 4 ? 'medium' : 'hard';
  results.humanVsAi.push(playHumanVsAi(first, diff, 'finish_when_possible'));
}

const aiOk = results.aiVsAi.every((g) => g.terminated);
const hvOk = results.humanVsAi.every((g) => g.terminated);
const anyCapture = results.aiVsAi.some((g) => g.captureSeen) || results.humanVsAi.some((g) => g.captures.RED + g.captures.BLUE > 0);
const anyFinish = results.humanVsAi.some((g) => g.finishClicked) || results.aiVsAi.some((g) => g.finishUsed);
const anyMulti = results.featureChecks.multiJumpChain === true;

results.featureChecks.aiVsAiAllTerminated = aiOk;
results.featureChecks.humanVsAiAllTerminated = hvOk;
results.featureChecks.capturesObserved = anyCapture;
results.featureChecks.finishObserved = anyFinish;
results.featureChecks.multiJumpSetup = anyMulti;

if (!aiOk) results.failures.push('some AI vs AI games did not terminate');
if (!hvOk) results.failures.push('some Human vs AI games did not terminate');

const summary = {
  syntaxOk: results.syntaxOk,
  aiVsAiGames: results.aiVsAi.length,
  aiVsAiTerminated: results.aiVsAi.filter((g) => g.terminated).length,
  aiEndReasons: results.aiVsAi.reduce((acc, g) => {
    acc[g.endReason || 'null'] = (acc[g.endReason || 'null'] || 0) + 1;
    return acc;
  }, {}),
  humanVsAiGames: results.humanVsAi.length,
  humanVsAiTerminated: results.humanVsAi.filter((g) => g.terminated).length,
  featureChecks: results.featureChecks,
  failures: results.failures,
  ok: results.failures.length === 0 && aiOk && hvOk,
};

console.log(JSON.stringify(summary, null, 2));
process.exit(summary.ok ? 0 : 1);
