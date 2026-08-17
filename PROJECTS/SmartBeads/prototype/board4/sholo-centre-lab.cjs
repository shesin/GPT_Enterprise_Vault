'use strict';
/**
 * Centre-rule batch wrapper for certified Sholo fullturn engines.
 * Applies endgame / cumulative tiebreak at move-cap (and score_decision) without changing search eval.
 */
const P1 = 1;
const P2 = 2;

function count(board, p) {
  return board.reduce((n, x) => n + (x === p ? 1 : 0), 0);
}

function countCenterNodes(board, centerNodes) {
  let c1 = 0;
  let c2 = 0;
  for (let i = 0; i < centerNodes.length; i++) {
    const idx = centerNodes[i];
    if (board[idx] === P1) c1++;
    else if (board[idx] === P2) c2++;
  }
  return { c1, c2 };
}

function resolveFeatureEnd(board, p1Captures, p2Captures, p1CenterPts, p2CenterPts, centerRule, centerNodes) {
  if (p1Captures > p2Captures) return 'P1';
  if (p2Captures > p1Captures) return 'P2';
  let c1 = p1CenterPts;
  let c2 = p2CenterPts;
  if (centerRule === 'endgame') {
    const live = countCenterNodes(board, centerNodes);
    c1 = live.c1;
    c2 = live.c2;
  }
  if (centerRule !== 'off') {
    if (c1 > c2) return 'P1';
    if (c2 > c1) return 'P2';
  }
  const p1Pieces = count(board, P1);
  const p2Pieces = count(board, P2);
  if (p1Pieces === p2Pieces) return 'draw';
  return p1Pieces > p2Pieces ? 'P1' : 'P2';
}

function playHeadlessGameWithCentreRule(engineMod, centerRule, centerNodes, aiDepth, moveCap, seed, firstPlayer) {
  if (centerRule === 'off' || !centerNodes.length) {
    return engineMod.playHeadlessGame(aiDepth, moveCap, seed, firstPlayer);
  }

  const sem = engineMod.describeSearchSemantics(aiDepth);
  if (sem.actualEffectiveDepth == null) throw new Error(sem.error);
  const resolvedSeed = engineMod.setAiTestSeed(seed);
  const first = firstPlayer || engineMod.P1;
  try {
    let sim = engineMod.startingBoard();
    let turn = first;
    let moves = 0;
    let hist = {};
    let totalCaptures = 0;
    let p1Captures = 0;
    let p2Captures = 0;
    let p1CenterPts = 0;
    let p2CenterPts = 0;
    let maxChain = 0;

    while (moves < moveCap) {
      const legal = engineMod.getAllLegalMoves(sim, turn);
      if (!legal.length) {
        engineMod.clearAiTestSeed();
        return finishEngine(engineMod, resolvedSeed, turn === P1 ? 'P2' : 'P1', 'stalemate', moves, totalCaptures, p1Captures, p2Captures, maxChain, first, sem);
      }
      const path = engineMod.selectAITurn(aiDepth, sim, turn, hist);
      if (!path || !path.length) {
        engineMod.clearAiTestSeed();
        return finishEngine(engineMod, resolvedSeed, turn === P1 ? 'P2' : 'P1', 'stalemate', moves, totalCaptures, p1Captures, p2Captures, maxChain, first, sem);
      }
      const turnRes = engineMod.applyPath(sim, path);
      sim = turnRes.board;
      moves++;
      totalCaptures += turnRes.captures;
      if (turn === P1) p1Captures += turnRes.captures;
      else p2Captures += turnRes.captures;
      if (centerRule === 'cumulative') {
        for (let ci = 0; ci < centerNodes.length; ci++) {
          const idx = centerNodes[ci];
          if (sim[idx] === P1) p1CenterPts++;
          if (sim[idx] === P2) p2CenterPts++;
        }
      }
      if (turnRes.hops > maxChain) maxChain = turnRes.hops;
      if (count(sim, P1) === 0) {
        engineMod.clearAiTestSeed();
        return finishEngine(engineMod, resolvedSeed, 'P2', 'elimination', moves, totalCaptures, p1Captures, p2Captures, maxChain, first, sem);
      }
      if (count(sim, P2) === 0) {
        engineMod.clearAiTestSeed();
        return finishEngine(engineMod, resolvedSeed, 'P1', 'elimination', moves, totalCaptures, p1Captures, p2Captures, maxChain, first, sem);
      }
      const key = engineMod.positionKey(sim, turn);
      hist[key] = (hist[key] || 0) + 1;
      if (hist[key] >= 3) {
        engineMod.clearAiTestSeed();
        return finishEngine(engineMod, resolvedSeed, 'draw', 'repetition', moves, totalCaptures, p1Captures, p2Captures, maxChain, first, sem);
      }
      turn = turn === P1 ? P2 : P1;
    }
    engineMod.clearAiTestSeed();
    const w = resolveFeatureEnd(sim, p1Captures, p2Captures, p1CenterPts, p2CenterPts, centerRule, centerNodes);
    const endReason = w === 'draw' ? 'move_cap_lab_safety' : 'score_decision';
    return finishEngine(engineMod, resolvedSeed, w, endReason, moves, totalCaptures, p1Captures, p2Captures, maxChain, first, sem);
  } catch (e) {
    engineMod.clearAiTestSeed();
    throw e;
  }
}

function finishEngine(engineMod, seed, winner, endReason, gameLength, totalCaptures, p1Captures, p2Captures, maxChain, firstPlayer, sem) {
  const fp = firstPlayer === engineMod.P1 ? 'P1' : 'P2';
  return {
    seed,
    winner,
    endReason,
    gameLength,
    totalCaptures,
    p1Captures,
    p2Captures,
    maxChain,
    firstPlayer: fp,
    firstPlayerWon: winner !== 'draw' && ((firstPlayer === engineMod.P1 && winner === 'P1') || (firstPlayer === engineMod.P2 && winner === 'P2')),
    searchSemantics: sem,
    note: endReason === 'move_cap_lab_safety' ? 'move-cap is LAB harness safety only — not a traditional Sholo Guti rule' : undefined,
  };
}

function centreNodesFromNodes(nodes, predicate) {
  const out = [];
  for (let i = 0; i < nodes.length; i++) {
    if (predicate(nodes[i])) out.push(i);
  }
  return out;
}

/** KEEP board centre definitions — from playable board geometry (authoritative). */
const KEEP_BOARD_CENTRE = {
  INDEX_6_ACTIVE: {
    playable: 'SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html',
    beadsPerSide: 6,
    centreNodesExist: true,
    centreNodeProof:
      'Playable CENTER_IDX = [5, 6, 9, 10] — four amber nodes in 2×2 centre block (SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html).',
    centerNodes: [5, 6, 9, 10],
    cumulativeInProductUi: true,
    endgameInProductUi: true,
    engineKind: 'cursor-index',
  },
  LADDER_10: {
    playable: 'SHOLO_GUTI_10_BEAD_WITH_FEATURE.html',
    beadsPerSide: 10,
    centreNodesExist: true,
    centreNodeProof:
      'Playable isEndgameCenterNode: node.y === 4 && node.x === 4 — single amber middle node on 5×5 lattice.',
    centerNodes: null,
    nodePredicate: (n) => n.y === 4 && n.x === 4,
    cumulativeInProductUi: true,
    endgameInProductUi: true,
    engineKind: 'sholo-10',
  },
  LADDER_7: {
    playable: 'SHOLO_GUTI_7_BEAD_WITH_FEATURE.html',
    beadsPerSide: 7,
    centreNodesExist: true,
    centreNodeProof:
      'Playable isEndgameCenterNode: node.y === 4 && (node.x === 2 || node.x === 4) — amber centre line row 3.',
    centerNodes: null,
    nodePredicate: (n) => n.y === 4 && (n.x === 2 || n.x === 4),
    cumulativeInProductUi: true,
    endgameInProductUi: true,
    engineKind: 'sholo-7',
  },
  LADDER_6_3x5: {
    playable: 'SHOLO_GUTI_6_BEAD_WITH_FEATURE.html',
    beadsPerSide: 6,
    centreNodesExist: true,
    centreNodeProof:
      'Playable isEndgameCenterNode: node.y === 4 && node.x === 2 — single amber centre node row 3 on 3×5.',
    centerNodes: null,
    nodePredicate: (n) => n.y === 4 && n.x === 2,
    cumulativeInProductUi: true,
    endgameInProductUi: true,
    engineKind: 'sholo-6',
  },
};

function resolveEngine(def) {
  if (def.engineKind === 'cursor-index') {
    const cursorIndex = require('./cursor-index-fullturn-engine.cjs');
    return {
      mod: null,
      factory: (centerRule) => cursorIndex.createEngine(6, { geometry: 'fullBoxCross', centerRule, maxMoveLimit: 0 }),
      useFactory: true,
    };
  }
  const map = {
    'sholo-10': './sholo-10-bead-fullturn-engine.cjs',
    'sholo-7': './sholo-7-bead-fullturn-engine.cjs',
    'sholo-6': './sholo-6-bead-fullturn-engine.cjs',
  };
  return { mod: require(map[def.engineKind]), useFactory: false };
}

function playBatch(def, centerNodes, centerRule, depth, seeds, nPerSeed, moveCap) {
  const eng = resolveEngine(def);
  const games = [];
  for (const seed of seeds) {
    for (let i = 0; i < nPerSeed; i++) {
      const s = (seed + i) >>> 0;
      if (eng.useFactory) {
        const engine = eng.factory(centerRule);
        games.push(engine.playHeadlessGame(depth, moveCap, s, engine.P1));
      } else {
        games.push(playHeadlessGameWithCentreRule(eng.mod, centerRule, centerNodes, depth, moveCap, s, eng.mod.P1));
      }
    }
  }
  return games;
}

module.exports = {
  playHeadlessGameWithCentreRule,
  centreNodesFromNodes,
  KEEP_BOARD_CENTRE,
  resolveEngine,
  playBatch,
  resolveFeatureEnd,
};
