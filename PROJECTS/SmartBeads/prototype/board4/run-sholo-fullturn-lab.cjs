'use strict';
/**
 * Small Sholo Guti calibration using full-turn headless engine.
 * Depths 1/2/3 × seeds 101/202/303 × N=30 = 270 games. Move cap 120.
 * Not a SmartBeads board ranking.
 */
const fs = require('fs');
const path = require('path');
const engine = require('./sholo-guti-fullturn-engine.cjs');
const protocol = require('./sholo-lab-protocol.cjs');

const DEPTHS = protocol.DEPTHS;
const SEEDS = protocol.SEEDS;
const N = protocol.N_PER_SEED;
const MOVE_CAP = protocol.MOVE_CAP;
const EXPECTED_TOTAL = protocol.gamesPerBoard();
const OLD_HOP_CALIBRATION = {
  source: 'SHOLO_LAB_CAPABILITY_VALIDATION.json (hop-based SHOLO_GUTI_CALIBRATION AI)',
  depth1_elimPct: 51.3,
  depth2_elimPct: 0,
  depth3_elimPct: 22,
};

function summarize(games) {
  let elim = 0;
  let stalemate = 0;
  let moveCap = 0;
  let rep = 0;
  let lenSum = 0;
  let capSum = 0;
  for (const g of games) {
    if (g.endReason === 'elimination') elim++;
    else if (g.endReason === 'stalemate') stalemate++;
    else if (g.endReason === 'move_cap_lab_safety') moveCap++;
    else if (g.endReason === 'repetition') rep++;
    else throw new Error('unknown endReason ' + g.endReason);
    lenSum += g.gameLength;
    capSum += g.totalCaptures;
  }
  const n = games.length;
  const forced = elim + stalemate;
  return {
    n,
    eliminationPct: (100 * elim) / n,
    forcedWinPct: (100 * forced) / n,
    moveCapPct: (100 * moveCap) / n,
    repetitionPct: (100 * rep) / n,
    avgLength: lenSum / n,
    avgCaptures: capSum / n,
    counts: { elim, stalemate, moveCap, rep },
  };
}

function fingerprint(games) {
  return games
    .map((g) =>
      [g.seed, g.endReason, g.winner, g.gameLength, g.totalCaptures, g.maxChain].join(':')
    )
    .join('|');
}

function runBatch(depth, seed, n) {
  const games = [];
  for (let i = 0; i < n; i++) {
    const gameSeed = (seed + i) >>> 0;
    games.push(engine.playHeadlessGame(depth, MOVE_CAP, gameSeed, engine.P1));
  }
  return games;
}

function main() {
  const t0 = Date.now();
  const searchSemanticsByDepth = {};
  for (const d of DEPTHS) searchSemanticsByDepth[d] = engine.describeSearchSemantics(d);

  const byDepth = {};
  const byDepthSeed = {};
  for (const depth of DEPTHS) {
    byDepth[depth] = [];
    byDepthSeed[depth] = {};
    for (const seed of SEEDS) {
      const games = runBatch(depth, seed, N);
      byDepthSeed[depth][seed] = { summary: summarize(games) };
      byDepth[depth].push(...games);
      process.stderr.write('done depth=' + depth + ' seed=' + seed + ' n=' + N + '\n');
    }
  }

  const repDepth = 2;
  const repSeed = 101;
  const a = runBatch(repDepth, repSeed, N);
  const b = runBatch(repDepth, repSeed, N);
  const reproducible = fingerprint(a) === fingerprint(b);

  const report = {
    instrument: 'sholo-guti-fullturn-engine.cjs (reused SHOLO_GUTI.html full-turn AI)',
    purpose:
      'Technically transparent reproducible headless instrument calibration — NOT proof of fitness for ranking SmartBeads boards',
    totalGames: DEPTHS.length * SEEDS.length * N,
    expectedTotal: EXPECTED_TOTAL,
    moveCap: MOVE_CAP,
    seeds: SEEDS,
    nPerSeedPerDepth: N,
    gameSeedRule: 'baseSeed + i for i in 0..N-1',
    searchLimits: engine.SEARCH_LIMITS,
    searchSemanticsByDepth,
    perDepth: {},
    perDepthPerSeed: {},
    reproducibility: {
      depth: repDepth,
      baseSeed: repSeed,
      n: N,
      identical: reproducible,
    },
    observedVsOldHopCalibration: {
      old: OLD_HOP_CALIBRATION,
      architectureChange:
        'Old: hop-based minimax + eval noise + chain random early-stop. ' +
        'New: complete-turn generateTurnEnds / minimaxTurns; chains chosen inside turn-end search; no eval noise; seeded tie-breaks only.',
      note:
        'Different elim% is expected from different search units; not evidence that either instrument ranks board quality.',
    },
    elapsedMs: Date.now() - t0,
  };

  for (const depth of DEPTHS) {
    report.perDepth[depth] = summarize(byDepth[depth]);
    report.perDepthPerSeed[depth] = {};
    for (const seed of SEEDS) {
      report.perDepthPerSeed[depth][seed] = byDepthSeed[depth][seed].summary;
    }
  }

  const newElim = {
    1: report.perDepth[1].eliminationPct,
    2: report.perDepth[2].eliminationPct,
    3: report.perDepth[3].eliminationPct,
  };
  report.observedVsOldHopCalibration.newElimPct = newElim;

  const outPath = path.join(__dirname, 'SHOLO_FULLTURN_LAB_CALIBRATION.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.stderr.write('wrote ' + outPath + '\n');
  if (report.totalGames !== EXPECTED_TOTAL) process.exit(2);
  if (!reproducible) process.exit(3);
}

main();
