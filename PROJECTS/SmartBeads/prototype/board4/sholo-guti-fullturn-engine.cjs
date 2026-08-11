'use strict';
/**
 * Headless Sholo Guti full-turn engine.
 * Reuses AI architecture from SHOLO_GUTI.html (generateTurnEnds, evaluate,
 * opponentReplyPlies, minimaxTurns, selectAITurn) — no new search/eval.
 * DOM-free. Seeded RNG for AI tie-breaks only.
 * NOT a SmartBeads product instrument proof.
 */

const P1 = 1;
const P2 = 2;

/** Exact branch / chain limits from SHOLO_GUTI.html selectAITurn / generateTurnEnds. */
const SEARCH_LIMITS = {
  rootBranchByLevel: { 1: 140, 2: 140, 3: 90 },
  replyBranchByLevel: { 1: null, 2: 80, 3: 56 },
  chainDepthMax: 8,
  note:
    'If generateTurnEnds hits maxBranch, remaining legal turn ends are not searched (truncation). ' +
    'Chain hops beyond depth 8 are not expanded further.',
};

// --- Seeded RNG (same Mulberry32 pattern as SHOLO_GUTI_CALIBRATION / GEMINI_LAB) ---
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

// --- Geometry (identical to SHOLO_GUTI.html) ---
const NODES = [];
const NODE_INDEX = Object.create(null);
function addNode(id, x, y) {
  NODE_INDEX[id] = NODES.length;
  NODES.push({ id, x, y });
}
for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) addNode('A' + r + c, 2 * c, 2 * r);
[
  ['LT', -2, 0], ['LM', -2, 4], ['LB', -2, 8], ['LIT', -1, 2], ['LIM', -1, 4], ['LIB', -1, 6],
  ['RT', 10, 0], ['RM', 10, 4], ['RB', 10, 8], ['RIT', 9, 2], ['RIM', 9, 4], ['RIB', 9, 6],
].forEach(([id, x, y]) => addNode(id, x, y));
const N = NODES.length;
const ADJ = Array.from({ length: N }, () => []);
function link(a, b) {
  const i = NODE_INDEX[a];
  const j = NODE_INDEX[b];
  if (!ADJ[i].includes(j)) ADJ[i].push(j);
  if (!ADJ[j].includes(i)) ADJ[j].push(i);
}
for (let r = 0; r < 5; r++) {
  for (let c = 0; c < 5; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const r2 = r + dr;
      const c2 = c + dc;
      if (r2 < 0 || r2 > 4 || c2 < 0 || c2 > 4) continue;
      link('A' + r + c, 'A' + r2 + c2);
    }
  }
}
[
  ['RT', 'RM'], ['RM', 'RB'], ['RIT', 'RIM'], ['RIM', 'RIB'],
  ['RT', 'RIT'], ['RIT', 'A24'], ['RB', 'RIB'], ['RIB', 'A24'], ['A24', 'RIM'], ['RIM', 'RM'],
  ['LT', 'LM'], ['LM', 'LB'], ['LIT', 'LIM'], ['LIM', 'LIB'],
  ['LT', 'LIT'], ['LIT', 'A20'], ['LB', 'LIB'], ['LIB', 'A20'], ['A20', 'LIM'], ['LIM', 'LM'],
].forEach(([a, b]) => link(a, b));

function startingBoard() {
  const b = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const p = NODES[i];
    if (p.id.startsWith('L') || (p.id.startsWith('A') && (p.x === 0 || p.x === 2))) b[i] = P1;
    else if (p.id.startsWith('R') || (p.id.startsWith('A') && (p.x === 6 || p.x === 8))) b[i] = P2;
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

/** Enumerate legal complete turns — same as SHOLO_GUTI.html. */
function generateTurnEnds(currBoard, player, maxBranch) {
  const ends = [];
  const root = getAllLegalMoves(currBoard, player);
  for (let i = 0; i < root.length; i++) {
    const m = root[i];
    const after = applyMove(currBoard, m);
    if (m.captured === null) {
      ends.push({ board: after, path: [m] });
      continue;
    }
    ends.push({ board: after, path: [m] });
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
        if (ends.length >= maxBranch) return ends;
      }
    }
  }
  return ends;
}

/** P2-centric eval — identical formula to SHOLO_GUTI.html (no random noise). */
function evaluate(b) {
  const a = count(b, P1);
  const c = count(b, P2);
  if (a === 0) return 10000;
  if (c === 0) return -10000;
  const mob = getAllLegalMoves(b, P2).length - getAllLegalMoves(b, P1).length;
  return (c - a) * 48 + mob * 1.5;
}

/** L1 unused; L2→0; L3→1. Never Math.min-capped. */
function opponentReplyPlies(level) {
  if (level <= 1) return -1;
  return level - 2;
}

function minimaxTurns(curr, depth, maximizing, alpha, beta, branchCap) {
  if (depth === 0) return evaluate(curr);
  const player = maximizing ? P2 : P1;
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

function rootBranch(level) {
  return level >= 3 ? 90 : 140;
}
function replyBranch(level) {
  return level >= 3 ? 56 : 80;
}

/**
 * Full-turn path for `player`. Same algorithm as SHOLO_GUTI.html selectAITurn;
 * player arg enables AI-vs-AI (playable was P2-only). Eval remains P2-centric:
 * P2 maximizes, P1 minimizes. Tie-breaks use aiRandom().
 */
function selectAITurn(level, fromBoard, player) {
  const b = fromBoard;
  const pl = player;
  const branch = rootBranch(level);
  const ends = generateTurnEnds(b, pl, branch);
  if (!ends.length) return null;

  if (level <= 1) {
    let maxC = -1;
    let pool = [];
    for (let i = 0; i < ends.length; i++) {
      const c = pathCaptureCount(ends[i].path);
      if (c > maxC) {
        maxC = c;
        pool = [ends[i]];
      } else if (c === maxC) pool.push(ends[i]);
    }
    return pool[Math.floor(aiRandom() * pool.length)].path;
  }

  const reply = opponentReplyPlies(level);
  const rBranch = replyBranch(level);
  const maximize = pl === P2;
  let bestScore = maximize ? -Infinity : Infinity;
  let best = [];
  for (let i = 0; i < ends.length; i++) {
    const end = ends[i];
    let score;
    if (reply <= 0) score = evaluate(end.board);
    else {
      // After this player's turn end, opponent moves. maximizing=true means P2 to move.
      const oppIsP2 = pl === P1;
      score = minimaxTurns(end.board, reply, oppIsP2, -Infinity, Infinity, rBranch);
    }
    score += pathCaptureCount(end.path) * 0.05;
    if (maximize) {
      if (score > bestScore) {
        bestScore = score;
        best = [end];
      } else if (score === bestScore) best.push(end);
    } else if (score < bestScore) {
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

/**
 * Explicit search semantics for a requested level. Never claims a deeper search than coded.
 */
function describeSearchSemantics(requestedDepth) {
  const d = requestedDepth | 0;
  if (d <= 1) {
    return {
      requestedDepth: d,
      actualEffectiveDepth: 'greedy / 0-ply search (max captures among turn ends)',
      searchUnit: 'complete turn',
      opponentReplyPlies: 0,
      search: false,
      rootBranchLimit: rootBranch(1),
      replyBranchLimit: null,
      chainDepthLimit: SEARCH_LIMITS.chainDepthMax,
      depthCapMathMin: false,
      evalNoise: false,
      truncationRisk:
        'Root turn-end enumeration capped at ' + rootBranch(1) + '; chain expand stops after depth ' +
        SEARCH_LIMITS.chainDepthMax + '. Truncation can omit legal turn ends.',
    };
  }
  if (d === 2) {
    return {
      requestedDepth: 2,
      actualEffectiveDepth: '1-turn look (evaluate own turn ends only)',
      searchUnit: 'complete turn',
      opponentReplyPlies: 0,
      search: true,
      rootBranchLimit: rootBranch(2),
      replyBranchLimit: replyBranch(2),
      chainDepthLimit: SEARCH_LIMITS.chainDepthMax,
      depthCapMathMin: false,
      evalNoise: false,
      truncationRisk:
        'Root capped at ' + rootBranch(2) + '; reply branch ' + replyBranch(2) +
        ' unused at L2 (no opponent ply). Chain depth ' + SEARCH_LIMITS.chainDepthMax + '.',
    };
  }
  // Only levels 1–3 exist in playable; refuse to invent deeper labels
  if (d === 3) {
    return {
      requestedDepth: 3,
      actualEffectiveDepth: '2-turn look (own turn ends + 1 opponent full-turn reply ply)',
      searchUnit: 'complete turn',
      opponentReplyPlies: 1,
      search: true,
      rootBranchLimit: rootBranch(3),
      replyBranchLimit: replyBranch(3),
      chainDepthLimit: SEARCH_LIMITS.chainDepthMax,
      depthCapMathMin: false,
      evalNoise: false,
      truncationRisk:
        'Root capped at ' + rootBranch(3) + '; opponent reply enumeration capped at ' +
        replyBranch(3) + '; chain depth ' + SEARCH_LIMITS.chainDepthMax +
        '. These limits can truncate the legal search tree.',
    };
  }
  return {
    requestedDepth: d,
    actualEffectiveDepth: null,
    error: 'Only depths 1–3 are implemented in the reused SHOLO_GUTI AI. Refusing to claim search for depth ' + d,
    searchUnit: 'complete turn',
    opponentReplyPlies: null,
  };
}

/**
 * AI-vs-AI headless game. Both sides use selectAITurn.
 * Termination/metrics aligned with prior Sholo calibration harness.
 */
function playHeadlessGame(aiDepth, moveCap, seed, firstPlayer) {
  const sem = describeSearchSemantics(aiDepth);
  if (sem.actualEffectiveDepth == null) {
    throw new Error(sem.error);
  }
  const resolvedSeed = setAiTestSeed(seed);
  try {
    let sim = startingBoard();
    let turn = firstPlayer || P1;
    let moves = 0;
    let hist = {};
    let totalCaptures = 0;
    let maxChain = 0;
    while (moves < moveCap) {
      const legal = getAllLegalMoves(sim, turn);
      if (!legal.length) {
        clearAiTestSeed();
        return {
          seed: resolvedSeed,
          winner: turn === P1 ? 'P2' : 'P1',
          endReason: 'stalemate',
          gameLength: moves,
          totalCaptures,
          maxChain,
          searchSemantics: sem,
        };
      }
      const path = selectAITurn(aiDepth, sim, turn);
      if (!path || !path.length) {
        clearAiTestSeed();
        return {
          seed: resolvedSeed,
          winner: turn === P1 ? 'P2' : 'P1',
          endReason: 'stalemate',
          gameLength: moves,
          totalCaptures,
          maxChain,
          searchSemantics: sem,
        };
      }
      const turnRes = applyPath(sim, path);
      sim = turnRes.board;
      moves++;
      totalCaptures += turnRes.captures;
      if (turnRes.hops > maxChain) maxChain = turnRes.hops;
      if (count(sim, P1) === 0) {
        clearAiTestSeed();
        return {
          seed: resolvedSeed,
          winner: 'P2',
          endReason: 'elimination',
          gameLength: moves,
          totalCaptures,
          maxChain,
          searchSemantics: sem,
        };
      }
      if (count(sim, P2) === 0) {
        clearAiTestSeed();
        return {
          seed: resolvedSeed,
          winner: 'P1',
          endReason: 'elimination',
          gameLength: moves,
          totalCaptures,
          maxChain,
          searchSemantics: sem,
        };
      }
      const key = sim.join('') + '_' + turn;
      hist[key] = (hist[key] || 0) + 1;
      if (hist[key] >= 3) {
        clearAiTestSeed();
        return {
          seed: resolvedSeed,
          winner: 'draw',
          endReason: 'repetition',
          gameLength: moves,
          totalCaptures,
          maxChain,
          searchSemantics: sem,
        };
      }
      turn = turn === P1 ? P2 : P1;
    }
    clearAiTestSeed();
    return {
      seed: resolvedSeed,
      winner: 'draw',
      endReason: 'move_cap_lab_safety',
      gameLength: moves,
      totalCaptures,
      maxChain,
      searchSemantics: sem,
      note: 'move-cap is LAB harness safety only — not a traditional Sholo Guti rule',
    };
  } catch (e) {
    clearAiTestSeed();
    throw e;
  }
}

module.exports = {
  P1,
  P2,
  N,
  NODES,
  ADJ,
  SEARCH_LIMITS,
  startingBoard,
  getAllLegalMoves,
  getMovesForNode,
  getFollowUpJumps,
  applyMove,
  applyPath,
  count,
  generateTurnEnds,
  evaluate,
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
};
