'use strict';
/**
 * Headless C1 / 5-bead 3×5 left–right Lab engine.
 * Geometry + start match SHOLO_GUTI_5_BEAD_3x5_LR_WITH_FEATURE.html.
 * Search/AI identical to sholo-guti-fullturn-engine.cjs (honest D1/D2/D3).
 */

const P1 = 1;
const P2 = 2;

const SEARCH_LIMITS = {
  rootBranchByLevel: { 1: 160, 2: 140, 3: 80 },
  replyBranchByLevel: { 1: null, 2: 80, 3: 40 },
  chainDepthMax: 8,
  rootBranchLegacyPlayable: { 1: 140, 2: 120, 3: 80 },
  replyBranchLegacyPlayable: { 1: null, 2: 72, 3: 40 },
  note:
    'Honest depths: D1 greedy, D2 = 1 opponent full-turn reply, D3 = 2 opponent full-turn replies. ' +
    'Branch caps can truncate; root moves are captures-first. Chain hops beyond depth 8 are not expanded.',
};

const REP_SOFT = 25;
/** Soft only — never hard-block a legal third repeat; repetition draws remain a legal outcome. */
const REP_HARD = 0;

let aiTestSeed = null;
let aiTestRng = null;

function createSeededRng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function aiRandom() {
  return aiTestRng ? aiTestRng() : Math.random();
}
function setAiTestSeed(seed) {
  if (seed == null || seed === '') {
    aiTestSeed = null;
    aiTestRng = null;
    return null;
  }
  aiTestSeed = (seed >>> 0) || 1;
  aiTestRng = createSeededRng(aiTestSeed);
  return aiTestSeed;
}
function clearAiTestSeed() {
  aiTestSeed = null;
  aiTestRng = null;
}
function getAiTestSeed() {
  return aiTestSeed;
}

const NODES = [];
const NODE_INDEX = Object.create(null);
function addNode(id, x, y) {
  NODE_INDEX[id] = NODES.length;
  NODES.push({ id, x, y });
}
const COLS = 3;
const ROWS = 5;
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) addNode('A' + r + c, 2 * c, 2 * r);
const N = NODES.length;
const ADJ = Array.from({ length: N }, () => []);
function link(a, b) {
  const i = NODE_INDEX[a];
  const j = NODE_INDEX[b];
  if (!ADJ[i].includes(j)) ADJ[i].push(j);
  if (!ADJ[j].includes(i)) ADJ[j].push(i);
}
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const r2 = r + dr;
      const c2 = c + dc;
      if (r2 < 0 || r2 >= ROWS || c2 < 0 || c2 >= COLS) continue;
      link('A' + r + c, 'A' + r2 + c2);
    }
  }
}

function startingBoard() {
  const b = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const p = NODES[i];
    if (p.x === 0) b[i] = P1;
    else if (p.x === 4) b[i] = P2;
  }
  return b;
}

function sameDir(dx, dy, ex, ey) {
  return dx * ey === dy * ex && dx * ex + dy * ey > 0;
}
function continueCollinear(from, over) {
  const a = NODES[from];
  const b = NODES[over];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (const k of ADJ[over]) {
    const c = NODES[k];
    if (sameDir(dx, dy, c.x - b.x, c.y - b.y)) return k;
  }
  return -1;
}
function getMovesForNode(board, node, player) {
  const moves = [];
  for (const to of ADJ[node]) if (board[to] === 0) moves.push({ from: node, to, captured: null });
  for (const over of ADJ[node]) {
    if (!board[over] || board[over] === player) continue;
    const land = continueCollinear(node, over);
    if (land >= 0 && board[land] === 0) moves.push({ from: node, to: land, captured: over });
  }
  return moves;
}
function getAllLegalMoves(board, player) {
  let m = [];
  for (let i = 0; i < N; i++) if (board[i] === player) m = m.concat(getMovesForNode(board, i, player));
  return m;
}
function getFollowUpJumps(board, node, player) {
  return getMovesForNode(board, node, player).filter((x) => x.captured !== null);
}
function applyMove(board, move) {
  const next = board.slice();
  next[move.to] = next[move.from];
  next[move.from] = 0;
  if (move.captured !== null) next[move.captured] = 0;
  return next;
}
function count(board, p) {
  return board.reduce((n, x) => n + (x === p ? 1 : 0), 0);
}
function pathCaptureCount(path) {
  let n = 0;
  for (let i = 0; i < path.length; i++) if (path[i].captured !== null) n++;
  return n;
}
function positionKey(board, moverJustMoved) {
  return board.join('') + '_' + moverJustMoved;
}

/**
 * Complete-turn enumeration. Captures-first at root so branch caps truncate
 * quiet lines before tactics. Optional early chain stops included (Capture Optionality).
 * Returns { ends, truncated }.
 */
function generateTurnEndsDetailed(currBoard, player, maxBranch) {
  const ends = [];
  const root = getAllLegalMoves(currBoard, player).slice();
  root.sort((a, b) => {
    const ca = a.captured !== null ? 1 : 0;
    const cb = b.captured !== null ? 1 : 0;
    return cb - ca;
  });
  for (let i = 0; i < root.length; i++) {
    const m = root[i];
    const after = applyMove(currBoard, m);
    if (m.captured === null) {
      ends.push({ board: after, path: [m] });
      if (ends.length >= maxBranch) {
        return { ends, truncated: true };
      }
      continue;
    }
    ends.push({ board: after, path: [m] });
    if (ends.length >= maxBranch) return { ends, truncated: true };
    const stack = [{ board: after, pos: m.to, path: [m], depth: 1 }];
    while (stack.length) {
      const node = stack.pop();
      if (node.depth > SEARCH_LIMITS.chainDepthMax) continue;
      const jumps = getFollowUpJumps(node.board, node.pos, player);
      for (let j = 0; j < jumps.length; j++) {
        const hop = jumps[j];
        const nb = applyMove(node.board, hop);
        const path = node.path.concat([hop]);
        ends.push({ board: nb, path });
        stack.push({ board: nb, pos: hop.to, path, depth: node.depth + 1 });
        if (ends.length >= maxBranch) return { ends, truncated: true };
      }
    }
  }
  return { ends, truncated: false };
}

/** Array-only wrapper (search call sites). */
function generateTurnEnds(currBoard, player, maxBranch) {
  return generateTurnEndsDetailed(currBoard, player, maxBranch).ends;
}

/**
 * Absolute eval: positive favors P1. Same material/mobility weights as playable
 * (playable was P2-positive; Lab flips sign so both sides share one scale).
 */
function evaluate(b) {
  const a = count(b, P1);
  const c = count(b, P2);
  if (a === 0) return -10000;
  if (c === 0) return 10000;
  const mob1 = getAllLegalMoves(b, P1).length;
  const mob2 = getAllLegalMoves(b, P2).length;
  return (a - c) * 48 + (mob1 - mob2) * 1.5;
}

/** Score from `player`'s perspective (both sides maximize this). */
function scoreForPlayer(b, player) {
  const v = evaluate(b);
  return player === P1 ? v : -v;
}

function opponentReplyPlies(level) {
  if (level <= 1) return -1;
  if (level === 2) return 1;
  return 2;
}

function rootBranch(level) {
  return level >= 3 ? SEARCH_LIMITS.rootBranchByLevel[3] : SEARCH_LIMITS.rootBranchByLevel[2];
}
function replyBranch(level) {
  return level >= 3 ? SEARCH_LIMITS.replyBranchByLevel[3] : SEARCH_LIMITS.replyBranchByLevel[2];
}

/**
 * Minimax over complete turns. `maximizing` true ⇒ P1 to move (P1-centric evaluate).
 */
function minimaxTurns(curr, depth, maximizing, alpha, beta, branchCap) {
  if (depth === 0) return evaluate(curr);
  const player = maximizing ? P1 : P2;
  const ends = generateTurnEnds(curr, player, branchCap);
  if (!ends.length) return maximizing ? -900 : 900;
  if (maximizing) {
    let best = -Infinity;
    for (let i = 0; i < ends.length; i++) {
      const v = minimaxTurns(ends[i].board, depth - 1, false, alpha, beta, branchCap);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (let i = 0; i < ends.length; i++) {
    const v = minimaxTurns(ends[i].board, depth - 1, true, alpha, beta, branchCap);
    if (v < best) best = v;
    if (v < beta) beta = v;
    if (beta <= alpha) break;
  }
  return best;
}

function repetitionPenaltyForMover(boardAfter, mover, hist) {
  if (!hist) return 0;
  const key = positionKey(boardAfter, mover);
  const c = hist[key] || 0;
  // Soft steer away from early cycles; do not forbid the legal third repeat.
  if (c + 1 >= 2) return REP_SOFT * (c + 1);
  return 0;
}

/**
 * Both players maximize scoreForPlayer. Capture tie-break signed for the mover.
 * Optional hist applies soft repetition steer (outcomes still legal).
 */
function selectAITurn(level, fromBoard, player, hist) {
  const b = fromBoard;
  const pl = player;
  const branch = rootBranch(level);
  const ends = generateTurnEnds(b, pl, branch);
  if (!ends.length) return null;

  if (level <= 1) {
    let bestScore = -Infinity;
    let pool = [];
    for (let i = 0; i < ends.length; i++) {
      const end = ends[i];
      const caps = pathCaptureCount(end.path);
      let score = caps * 100 + scoreForPlayer(end.board, pl) * 0.01;
      score -= repetitionPenaltyForMover(end.board, pl, hist);
      if (score > bestScore) {
        bestScore = score;
        pool = [end];
      } else if (score === bestScore) pool.push(end);
    }
    return pool[Math.floor(aiRandom() * pool.length)].path;
  }

  const reply = opponentReplyPlies(level);
  const rBranch = replyBranch(level);
  let bestScore = -Infinity;
  let best = [];
  for (let i = 0; i < ends.length; i++) {
    const end = ends[i];
    let abs;
    if (reply <= 0) abs = evaluate(end.board);
    else {
      // After mover's turn, opponent plays. P1-to-move ⇒ maximizing true.
      const p1ToMove = pl === P2;
      abs = minimaxTurns(end.board, reply, p1ToMove, -Infinity, Infinity, rBranch);
    }
    let score = pl === P1 ? abs : -abs;
    score += pathCaptureCount(end.path) * 0.05;
    score -= repetitionPenaltyForMover(end.board, pl, hist);
    if (score > bestScore) {
      bestScore = score;
      best = [end];
    } else if (score === bestScore) best.push(end);
  }
  return best[Math.floor(aiRandom() * best.length)].path;
}

function applyPath(board, path) {
  let b = board;
  let captures = 0;
  for (let i = 0; i < path.length; i++) {
    if (path[i].captured !== null) captures++;
    b = applyMove(b, path[i]);
  }
  return { board: b, captures, hops: path.length };
}

function describeSearchSemantics(requestedDepth) {
  const d = requestedDepth | 0;
  if (d <= 1) {
    return {
      requestedDepth: d,
      actualEffectiveDepth: 'greedy captures + light eval (0 opponent reply plies)',
      searchUnit: 'complete turn',
      opponentReplyPlies: 0,
      search: false,
      rootBranchLimit: rootBranch(1),
      replyBranchLimit: null,
      chainDepthLimit: SEARCH_LIMITS.chainDepthMax,
      depthCapMathMin: false,
      evalNoise: false,
      playerPerspective: 'both maximize scoreForPlayer; P1-centric evaluate absolute scale',
      truncationRisk: SEARCH_LIMITS.note,
    };
  }
  if (d === 2) {
    return {
      requestedDepth: 2,
      actualEffectiveDepth: '1 opponent full-turn reply after own turn',
      searchUnit: 'complete turn',
      opponentReplyPlies: 1,
      search: true,
      rootBranchLimit: rootBranch(2),
      replyBranchLimit: replyBranch(2),
      chainDepthLimit: SEARCH_LIMITS.chainDepthMax,
      depthCapMathMin: false,
      evalNoise: false,
      playerPerspective: 'both maximize scoreForPlayer',
      truncationRisk: SEARCH_LIMITS.note,
    };
  }
  if (d === 3) {
    return {
      requestedDepth: 3,
      actualEffectiveDepth: '2 opponent full-turn reply plies after own turn',
      searchUnit: 'complete turn',
      opponentReplyPlies: 2,
      search: true,
      rootBranchLimit: rootBranch(3),
      replyBranchLimit: replyBranch(3),
      chainDepthLimit: SEARCH_LIMITS.chainDepthMax,
      depthCapMathMin: false,
      evalNoise: false,
      playerPerspective: 'both maximize scoreForPlayer; minimax on P1-centric evaluate',
      truncationRisk: SEARCH_LIMITS.note,
    };
  }
  return {
    requestedDepth: d,
    actualEffectiveDepth: null,
    error: 'Only depths 1–3 are implemented. Refusing to claim search for depth ' + d,
  };
}

function playHeadlessGame(aiDepth, moveCap, seed, firstPlayer) {
  const sem = describeSearchSemantics(aiDepth);
  if (sem.actualEffectiveDepth == null) throw new Error(sem.error);
  const resolvedSeed = setAiTestSeed(seed);
  const first = firstPlayer || P1;
  try {
    let sim = startingBoard();
    let turn = first;
    let moves = 0;
    let hist = {};
    let totalCaptures = 0;
    let p1Captures = 0;
    let p2Captures = 0;
    let maxChain = 0;
    while (moves < moveCap) {
      const legal = getAllLegalMoves(sim, turn);
      if (!legal.length) {
        clearAiTestSeed();
        return finish(resolvedSeed, turn === P1 ? 'P2' : 'P1', 'stalemate', moves, totalCaptures, p1Captures, p2Captures, maxChain, first, sem);
      }
      const path = selectAITurn(aiDepth, sim, turn, hist);
      if (!path || !path.length) {
        clearAiTestSeed();
        return finish(resolvedSeed, turn === P1 ? 'P2' : 'P1', 'stalemate', moves, totalCaptures, p1Captures, p2Captures, maxChain, first, sem);
      }
      const turnRes = applyPath(sim, path);
      sim = turnRes.board;
      moves++;
      totalCaptures += turnRes.captures;
      if (turn === P1) p1Captures += turnRes.captures;
      else p2Captures += turnRes.captures;
      if (turnRes.hops > maxChain) maxChain = turnRes.hops;
      if (count(sim, P1) === 0) {
        clearAiTestSeed();
        return finish(resolvedSeed, 'P2', 'elimination', moves, totalCaptures, p1Captures, p2Captures, maxChain, first, sem);
      }
      if (count(sim, P2) === 0) {
        clearAiTestSeed();
        return finish(resolvedSeed, 'P1', 'elimination', moves, totalCaptures, p1Captures, p2Captures, maxChain, first, sem);
      }
      const key = positionKey(sim, turn);
      hist[key] = (hist[key] || 0) + 1;
      if (hist[key] >= 3) {
        clearAiTestSeed();
        return finish(resolvedSeed, 'draw', 'repetition', moves, totalCaptures, p1Captures, p2Captures, maxChain, first, sem);
      }
      turn = turn === P1 ? P2 : P1;
    }
    clearAiTestSeed();
    return finish(resolvedSeed, 'draw', 'move_cap_lab_safety', moves, totalCaptures, p1Captures, p2Captures, maxChain, first, sem);
  } catch (e) {
    clearAiTestSeed();
    throw e;
  }
}

function finish(seed, winner, endReason, gameLength, totalCaptures, p1Captures, p2Captures, maxChain, firstPlayer, sem) {
  return {
    seed,
    winner,
    endReason,
    gameLength,
    totalCaptures,
    p1Captures,
    p2Captures,
    maxChain,
    firstPlayer: firstPlayer === P1 ? 'P1' : 'P2',
    firstPlayerWon: winner !== 'draw' && ((firstPlayer === P1 && winner === 'P1') || (firstPlayer === P2 && winner === 'P2')),
    searchSemantics: sem,
    note: endReason === 'move_cap_lab_safety' ? 'move-cap is LAB harness safety only — not a traditional Sholo Guti rule' : undefined,
  };
}

module.exports = {
  P1,
  P2,
  N,
  NODES,
  ADJ,
  NODE_INDEX,
  SEARCH_LIMITS,
  REP_SOFT,
  REP_HARD,
  startingBoard,
  getAllLegalMoves,
  getMovesForNode,
  getFollowUpJumps,
  applyMove,
  applyPath,
  count,
  pathCaptureCount,
  generateTurnEnds,
  generateTurnEndsDetailed,
  evaluate,
  scoreForPlayer,
  opponentReplyPlies,
  minimaxTurns,
  selectAITurn,
  describeSearchSemantics,
  playHeadlessGame,
  setAiTestSeed,
  clearAiTestSeed,
  getAiTestSeed,
  aiRandom,
  rootBranch,
  replyBranch,
  continueCollinear,
  positionKey,
};
