'use strict';
/**
 * Complete-turn headless Lab engine for Cursor Index 4×4 (4- and 6-bead layouts).
 * Same D1/D2/D3 semantics, eval, and search unit as sholo-guti-fullturn-engine.cjs.
 * Geometry/rules match GEMINI_LAB / CURSOR_INDEX_*.html (Alquerque 4×4 + diagonals).
 */
const P1 = 1;
const P2 = 2;
const ROWS = 4;
const COLS = 4;
const N = ROWS * COLS;

const SEARCH_LIMITS = {
  rootBranchByLevel: { 1: 160, 2: 140, 3: 80 },
  replyBranchByLevel: { 1: null, 2: 80, 3: 40 },
  chainDepthMax: 8,
  note:
    'Honest depths: D1 greedy, D2 = 1 opponent full-turn reply, D3 = 2 opponent full-turn replies. ' +
    'Branch caps can truncate; root moves are captures-first. Chain hops beyond depth 8 are not expanded.',
};

const REP_SOFT = 25;

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

function buildDiagonalRays(geometry) {
  if (geometry === 'fullBoxCross') return null;
  return [
    [0, 5, 10, 15], [3, 6, 9, 12],
    [1, 6, 11], [4, 9, 14], [2, 5, 8], [7, 10, 13],
  ];
}

function linkDiag(adj, u, v) {
  if (!adj[u].includes(v)) adj[u].push(v);
  if (!adj[v].includes(u)) adj[v].push(u);
}

function buildAdjacency(geometry) {
  const mode = geometry === 'fullBoxCross' ? 'fullBoxCross' : 'rays';
  const adj = Array.from({ length: N }, () => []);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const u = r * COLS + c;
      if (c + 1 < COLS) {
        const v = r * COLS + (c + 1);
        adj[u].push(v);
        adj[v].push(u);
      }
      if (r + 1 < ROWS) {
        const v = (r + 1) * COLS + c;
        adj[u].push(v);
        adj[v].push(u);
      }
    }
  }
  if (mode === 'fullBoxCross') {
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        const tl = r * COLS + c;
        linkDiag(adj, tl, tl + COLS + 1);
        linkDiag(adj, tl + 1, tl + COLS);
      }
    }
  } else {
    for (const ray of buildDiagonalRays('rays')) {
      for (let i = 0; i < ray.length - 1; i++) linkDiag(adj, ray[i], ray[i + 1]);
    }
  }
  return adj;
}

function buildJumps(adj) {
  const jumps = [];
  for (let from = 0; from < N; from++) {
    for (const over of adj[from]) {
      const r1 = Math.floor(from / COLS);
      const c1 = from % COLS;
      const r2 = Math.floor(over / COLS);
      const c2 = over % COLS;
      const tr = r2 + (r2 - r1);
      const tc = c2 + (c2 - c1);
      if (tr >= 0 && tr < ROWS && tc >= 0 && tc < COLS) {
        const to = tr * COLS + tc;
        if (adj[over].includes(to)) jumps.push({ from, over, to });
      }
    }
  }
  return jumps;
}

const ADJ = buildAdjacency('rays');
const JUMPS = buildJumps(ADJ);

function startingBoard(beadsPerSide) {
  const b = new Array(N).fill(0);
  if (beadsPerSide === 4) {
    for (let c = 0; c < 4; c++) {
      b[c] = P1;
      b[12 + c] = P2;
    }
    return b;
  }
  if (beadsPerSide === 6) {
    [0, 1, 2, 3, 4, 7].forEach((i) => { b[i] = P1; });
    [8, 11, 12, 13, 14, 15].forEach((i) => { b[i] = P2; });
    return b;
  }
  throw new Error('Unsupported beadsPerSide: ' + beadsPerSide);
}

function getMovesForNode(board, node, player, adj = ADJ, jumps = JUMPS) {
  const moves = [];
  for (const neighbor of adj[node]) {
    if (board[neighbor] === 0) moves.push({ from: node, to: neighbor, captured: null });
  }
  for (const j of jumps) {
    if (j.from === node && board[j.over] !== 0 && board[j.over] !== player && board[j.to] === 0) {
      moves.push({ from: node, to: j.to, captured: j.over });
    }
  }
  return moves;
}

function getAllLegalMoves(board, player, adj = ADJ, jumps = JUMPS) {
  let moves = [];
  for (let i = 0; i < N; i++) {
    if (board[i] === player) moves = moves.concat(getMovesForNode(board, i, player, adj, jumps));
  }
  return moves;
}

function getFollowUpJumps(board, node, player, adj = ADJ, jumps = JUMPS) {
  return getMovesForNode(board, node, player, adj, jumps).filter((m) => m.captured !== null);
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

function generateTurnEnds(currBoard, player, maxBranch, adj = ADJ, jumps = JUMPS) {
  const ends = [];
  const root = getAllLegalMoves(currBoard, player, adj, jumps).slice();
  root.sort((a, b) => (b.captured !== null ? 1 : 0) - (a.captured !== null ? 1 : 0));
  for (let i = 0; i < root.length; i++) {
    const m = root[i];
    const after = applyMove(currBoard, m);
    if (m.captured === null) {
      ends.push({ board: after, path: [m] });
      if (ends.length >= maxBranch) return ends;
      continue;
    }
    ends.push({ board: after, path: [m] });
    if (ends.length >= maxBranch) return ends;
    const stack = [{ board: after, pos: m.to, path: [m], depth: 1 }];
    while (stack.length) {
      const node = stack.pop();
      if (node.depth > SEARCH_LIMITS.chainDepthMax) continue;
      const follow = getFollowUpJumps(node.board, node.pos, player, adj, jumps);
      for (let j = 0; j < follow.length; j++) {
        const hop = follow[j];
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

function evaluate(b, adj = ADJ, jumps = JUMPS) {
  const a = count(b, P1);
  const c = count(b, P2);
  if (a === 0) return -10000;
  if (c === 0) return 10000;
  const mob1 = getAllLegalMoves(b, P1, adj, jumps).length;
  const mob2 = getAllLegalMoves(b, P2, adj, jumps).length;
  return (a - c) * 48 + (mob1 - mob2) * 1.5;
}

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

function minimaxTurns(curr, depth, maximizing, alpha, beta, branchCap, adj = ADJ, jumps = JUMPS) {
  if (depth === 0) return evaluate(curr, adj, jumps);
  const player = maximizing ? P1 : P2;
  const ends = generateTurnEnds(curr, player, branchCap, adj, jumps);
  if (!ends.length) return maximizing ? -900 : 900;
  if (maximizing) {
    let best = -Infinity;
    for (let i = 0; i < ends.length; i++) {
      const v = minimaxTurns(ends[i].board, depth - 1, false, alpha, beta, branchCap, adj, jumps);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (let i = 0; i < ends.length; i++) {
    const v = minimaxTurns(ends[i].board, depth - 1, true, alpha, beta, branchCap, adj, jumps);
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
  if (c + 1 >= 2) return REP_SOFT * (c + 1);
  return 0;
}

function selectAITurn(level, fromBoard, player, hist, adj = ADJ, jumps = JUMPS) {
  const branch = rootBranch(level);
  const ends = generateTurnEnds(fromBoard, player, branch, adj, jumps);
  if (!ends.length) return null;

  if (level <= 1) {
    let bestScore = -Infinity;
    let pool = [];
    for (let i = 0; i < ends.length; i++) {
      const end = ends[i];
      const caps = pathCaptureCount(end.path);
      let score = caps * 100 + (player === P1 ? evaluate(end.board, adj, jumps) : -evaluate(end.board, adj, jumps)) * 0.01;
      score -= repetitionPenaltyForMover(end.board, player, hist);
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
    if (reply <= 0) abs = evaluate(end.board, adj, jumps);
    else {
      const p1ToMove = player === P2;
      abs = minimaxTurns(end.board, reply, p1ToMove, -Infinity, Infinity, rBranch, adj, jumps);
    }
    let score = player === P1 ? abs : -abs;
    score += pathCaptureCount(end.path) * 0.05;
    score -= repetitionPenaltyForMover(end.board, player, hist);
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
      evalNoise: false,
      playerPerspective: 'both maximize scoreForPlayer; minimax on P1-centric evaluate',
      truncationRisk: SEARCH_LIMITS.note,
    };
  }
  return {
    requestedDepth: d,
    actualEffectiveDepth: null,
    error: 'Only depths 1–3 are implemented',
  };
}

function createEngine(beadsPerSide, options) {
  if (beadsPerSide !== 4 && beadsPerSide !== 6) {
    throw new Error('cursor-index-fullturn-engine supports beadsPerSide 4 or 6 only');
  }
  const geometry = options && options.geometry === 'fullBoxCross' ? 'fullBoxCross' : 'rays';
  const adj = buildAdjacency(geometry);
  const jumps = buildJumps(adj);

  function start() {
    return startingBoard(beadsPerSide);
  }

  function playHeadlessGame(aiDepth, moveCap, seed, firstPlayer) {
    const sem = describeSearchSemantics(aiDepth);
    if (sem.actualEffectiveDepth == null) throw new Error(sem.error);
    const resolvedSeed = setAiTestSeed(seed);
    const first = firstPlayer || P1;
    try {
      let sim = start();
      let turn = first;
      let moves = 0;
      let hist = {};
      let totalCaptures = 0;
      let p1Captures = 0;
      let p2Captures = 0;
      let maxChain = 0;
      while (moves < moveCap) {
        const legal = getAllLegalMoves(sim, turn, adj, jumps);
        if (!legal.length) {
          clearAiTestSeed();
          return finish(resolvedSeed, turn === P1 ? 'P2' : 'P1', 'stalemate', moves, totalCaptures, p1Captures, p2Captures, maxChain, first, sem);
        }
        const path = selectAITurn(aiDepth, sim, turn, hist, adj, jumps);
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

  return {
    beadsPerSide,
    geometry,
    P1,
    P2,
    N,
    ROWS,
    COLS,
    ADJ: adj,
    startingBoard: start,
    getAllLegalMoves: (b, p) => getAllLegalMoves(b, p, adj, jumps),
    describeSearchSemantics,
    playHeadlessGame,
    setAiTestSeed,
    clearAiTestSeed,
  };
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
  ROWS,
  COLS,
  ADJ,
  startingBoard,
  getAllLegalMoves,
  createEngine,
  describeSearchSemantics,
  SEARCH_LIMITS,
};
