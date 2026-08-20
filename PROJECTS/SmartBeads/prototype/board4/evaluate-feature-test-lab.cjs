'use strict';
/**
 * Feature Test evaluator — runs ONLY on human-confirmed KEEP boards (FEATURE_TEST_KEEP_REGISTRY.json).
 * Lab G1-G9 verdicts are produced against per-board .cjs reimplementations of the rules, not against the production SmartBeadsEngine/HonestAi, and therefore certify geometry/balance only, not production PvE correctness.
 */
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const protocol = require('./sholo-lab-protocol.cjs');
const metrics = require('./sholo-lab-metrics.cjs');
const gates = require('./sholo-lab-gates.cjs');
const loader = require('./feature-playable-loader.cjs');
const cursorIndex = require('./cursor-index-fullturn-engine.cjs');

const ROOT = __dirname;
const REGISTRY_PATH = path.join(ROOT, 'FEATURE_TEST_KEEP_REGISTRY.json');
const OUT_PATH = path.join(ROOT, 'FEATURE_TEST_EVALUATION.json');

const PRIMARY_DEPTH = 2;
const COMPARE_SEEDS = protocol.SEEDS;
const N_PER_SEED = protocol.N_PER_SEED;
const LAB_MOVE_CAP = protocol.MOVE_CAP;

const ENGINE_MAP = {
  INDEX_6_ACTIVE: {
    factory: (opts) => cursorIndex.createEngine(6, { geometry: 'fullBoxCross', ...opts }),
    centerRules: ['off', 'cumulative', 'endgame'],
    maxMoves: [20, 40, 60, 0],
  },
  LADDER_10: {
    factory: () => require('./sholo-10-bead-fullturn-engine.cjs'),
    centerRules: ['off'],
    centerRulesPlayable: ['off', 'endgame'],
    maxMoves: null,
  },
  LADDER_7: {
    factory: () => require('./sholo-7-bead-fullturn-engine.cjs'),
    centerRules: ['off'],
    centerRulesPlayable: ['off', 'endgame'],
    maxMoves: null,
  },
  LADDER_6_3x5: {
    factory: () => require('./sholo-6-bead-fullturn-engine.cjs'),
    centerRules: ['off'],
    centerRulesPlayable: ['off', 'endgame'],
    maxMoves: null,
  },
};

function runEngineBatch(engine, depth, seeds, nPerSeed, moveCap, firstPlayer) {
  const games = [];
  const first = firstPlayer || engine.P1;
  for (const seed of seeds) {
    for (let i = 0; i < nPerSeed; i++) {
      games.push(engine.playHeadlessGame(depth, moveCap, (seed + i) >>> 0, first));
    }
  }
  return games;
}

function normalizeEngineGame(g) {
  let endReason = g.endReason;
  if (endReason === 'max_moves') endReason = 'move_cap_lab_safety';
  if (endReason === 'score_decision') endReason = 'move_cap_lab_safety';
  return {
    seed: g.seed,
    endReason,
    winner: g.winner,
    gameLength: g.gameLength,
    totalCaptures: g.totalCaptures,
    p1Captures: g.p1Captures,
    p2Captures: g.p2Captures,
    firstPlayerWon: g.firstPlayerWon,
  };
}

function summarizeEngine(games) {
  return metrics.summarizeGames(games.map(normalizeEngineGame));
}

function fairnessScore(summary) {
  return Math.abs(summary.firstPlayerAdvantagePp || 0) + Math.abs(summary.p1WinPct - summary.p2WinPct) * 0.25;
}

function pickCentreRule(rows, boardId) {
  const scored = rows.map((r) => {
    const s = r.summary;
    const premature = s.moveCapDrawPct + s.repetitionDrawPct + (r.rawEndReasons?.max_moves || 0);
    return {
      rule: r.centerRule,
      summary: s,
      score: s.avgCaptures * 2 + s.elimOrStalematePct * 0.4 - premature * 0.5 - fairnessScore(s) * 1.2,
      prematurePct: premature,
      fairness: fairnessScore(s),
    };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return {
    recommendation: best.rule,
    reason:
      'D2 certified engine batch: best contested play (avgCaptures=' +
      best.summary.avgCaptures.toFixed(1) +
      ', elimOrStalemate=' +
      best.summary.elimOrStalematePct.toFixed(1) +
      '%, moveCap+rep=' +
      best.prematurePct.toFixed(1) +
      '%)',
    compared: scored,
    boardId,
  };
}

function pickCumulativeRule(centrePick, boardId) {
  const cum = centrePick.compared.find((c) => c.rule === 'cumulative');
  if (!cum) {
    return { recommendation: 'n/a — board UI has off/endgame only', reason: 'Cumulative not in UI', boardId };
  }
  const off = centrePick.compared.find((c) => c.rule === 'off');
  const end = centrePick.compared.find((c) => c.rule === 'endgame');
  if (centrePick.recommendation === 'cumulative') {
    return { recommendation: 'cumulative', reason: 'Best overall centre mode at D2 on 4×4 engine', boardId };
  }
  if (end && end.score > (cum?.score || 0)) {
    return { recommendation: 'endgame', reason: 'Endgame outscores cumulative at D2 without cumulative AI eval bias', boardId };
  }
  return { recommendation: 'off', reason: 'Off-centre engine contest preferred vs cumulative tiebreak (' + (off?.summary.avgCaptures || 0).toFixed(1) + ' avgCaptures)', boardId };
}

function pickMaxMoves(rows, d2BaselineLength) {
  const scored = rows.map((r) => {
    const s = r.summary;
    const cutPct = r.rawEndReasons?.max_moves || 0;
    const tooShort = r.maxMoveLimit > 0 && r.maxMoveLimit < d2BaselineLength * 0.45;
    return {
      limit: r.maxMoveLimit,
      summary: s,
      cutPct,
      score: s.avgCaptures - cutPct * 0.8 - (tooShort ? 40 : 0) + (r.maxMoveLimit === 0 ? 8 : 0),
    };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  let recommendation = best.limit;
  let reason =
    best.limit === 0
      ? 'Unlimited — D2 off-centre baseline avgLength ~' + d2BaselineLength.toFixed(0)
      : 'Max ' + best.limit + ' vs baseline length ~' + d2BaselineLength.toFixed(0);
  if (best.limit > 0 && best.limit < d2BaselineLength * 0.45) {
    recommendation = 0;
    reason = 'Unlimited recommended — limits 20/40 cut before D2 median (~' + d2BaselineLength.toFixed(0) + ' turns)';
  }
  return { recommendation, reason, compared: scored };
}

function rawEndReasonCounts(games) {
  const pct = {};
  const n = games.length || 1;
  for (const g of games) {
    const k = g.endReason;
    pct[k] = (pct[k] || 0) + 1;
  }
  for (const k of Object.keys(pct)) pct[k] = (100 * pct[k]) / n;
  return pct;
}

function measureEngineTurnBudget(engine, depth, samples) {
  engine.setAiTestSeed(4242);
  const b = engine.startingBoard();
  const times = [];
  for (let i = 0; i < samples; i++) {
    engine.setAiTestSeed((4242 + i) >>> 0);
    const t0 = performance.now();
    engine.playHeadlessGame(depth, 3, (9000 + i) >>> 0, engine.P1);
    times.push(performance.now() - t0);
  }
  engine.clearAiTestSeed();
  times.sort((a, b) => a - b);
  return {
    samples: times.length,
    medianMs: times[Math.floor(times.length / 2)],
    p95Ms: times[Math.min(times.length - 1, Math.floor(times.length * 0.95))],
    maxMs: times[times.length - 1],
    note: 'Full-game probe (3-turn cap) for order-of-magnitude budget — not single-turn only',
  };
}

function timerViableRange(uiOptions, d2Summary, budgetD2, budgetD3) {
  const shotOpts = (uiOptions.shotClock || []).filter((v) => v !== 'off').map((v) => parseInt(v, 10));
  const matchOpts = (uiOptions.matchTimer || []).filter((v) => v !== 'off').map((v) => parseInt(v, 10));
  const needSec = Math.max(1, Math.ceil(Math.max(budgetD2.p95Ms, budgetD3.p95Ms) / 1000));
  const turnsPerPlayer = Math.max(1, d2Summary.avgLength / 2);
  const needMatchSec = Math.ceil(turnsPerPlayer * (budgetD2.p95Ms / 1000));
  return {
    selectAITurnBudget: { d2: budgetD2, d3: budgetD3 },
    d2MedianGameLength: d2Summary.avgLength,
    estimatedTurnsPerPlayer: turnsPerPlayer,
    minShotClockSecondsForD2D3Search: needSec,
    viableShotClockSeconds: shotOpts.filter((s) => s >= needSec),
    allShotClockUiOptions: shotOpts,
    minMatchTimerMinutesPerPlayer: Math.max(1, Math.ceil(needMatchSec / 60)),
    viableMatchTimerMinutes: matchOpts.filter((m) => m * 60 >= needMatchSec),
    allMatchTimerUiOptions: matchOpts,
    note: 'Technical floor: UI values below min* may cut games or interrupt search; final choice is human playtest.',
  };
}

function runCentreEngineMatrix(spec, rules) {
  return rules.map((centerRule) => {
    const engine = spec.factory({ centerRule, maxMoveLimit: 0 });
    const games = runEngineBatch(engine, PRIMARY_DEPTH, COMPARE_SEEDS, N_PER_SEED, LAB_MOVE_CAP, engine.P1);
    return { centerRule, games: games.length, rawEndReasons: rawEndReasonCounts(games), summary: summarizeEngine(games) };
  });
}

function runMaxMoveMatrix(spec, centerRule, limits) {
  return limits.map((maxMoveLimit) => {
    const engine = spec.factory({ centerRule, maxMoveLimit });
    const games = runEngineBatch(engine, PRIMARY_DEPTH, COMPARE_SEEDS, N_PER_SEED, LAB_MOVE_CAP, engine.P1);
    return { maxMoveLimit, rawEndReasons: rawEndReasonCounts(games), summary: summarizeEngine(games) };
  });
}

function runDepthSweepEngine(spec, settings) {
  const out = {};
  for (const depth of protocol.DEPTHS) {
    const engine = spec.factory(settings);
    const games = runEngineBatch(engine, depth, COMPARE_SEEDS, N_PER_SEED, LAB_MOVE_CAP, engine.P1);
    out['D' + depth] = summarizeEngine(games);
  }
  return out;
}

function main() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  const keep = registry.humanConfirmedKeep || [];
  const batchProtocol = protocol.protocolMeta();

  const out = {
    purpose: 'Feature Test — settings recommendation for human-confirmed KEEP boards only',
    labInstrumentDisclaimer: gates.LAB_INSTRUMENT_DISCLAIMER,
    authoritativeEvaluator: 'evaluate-feature-test-lab.cjs',
    evaluatedAt: new Date().toISOString(),
    status: keep.length ? 'COMPLETE' : 'BLOCKED_NO_KEEP_BOARDS',
    protocol: {
      measurableFeatures: batchProtocol,
      featureTestNote:
        'Centre/max-move on 4×4: cursor-index-fullturn-engine.cjs (fullBoxCross) with feature options. ' +
        '10/7/6-bead: certified sholo-*-fullturn-engine (centre off); endgame is playable tiebreak-only. ' +
        'Setting comparisons at D2 (90 games/variant); recommended settings at D1/D2/D3 (270 games).',
    },
    humanConfirmedKeepBoards: keep,
    pendingNotEligible: registry.pendingNotEligible || [],
    referenceNotKeep: registry.referenceNotKeep || [],
    boardsTested: [],
    testsRun: {
      nPerSeed: N_PER_SEED,
      seeds: COMPARE_SEEDS,
      depths: protocol.DEPTHS,
      primaryDepth: PRIMARY_DEPTH,
      labMoveCap: LAB_MOVE_CAP,
      executed: keep.length > 0,
    },
    results: {},
    aiRecommendations: { perBoard: {}, consolidated: {} },
    technicallyViableRange: { perBoard: {} },
    humanDecisionsStillRequired: [
      'Match timer final minutes-per-player',
      'Shot clock final seconds',
      'Resignation rule — not yet decided; out of scope',
    ],
    resignation: 'not yet decided — not tested',
  };

  if (!keep.length) {
    out.blockReason = 'Zero human-confirmed KEEP boards.';
    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
    process.exit(0);
  }

  const centreRecs = [];
  const boardResults = [];

  for (const entry of keep) {
    const spec = ENGINE_MAP[entry.id];
    if (!spec) throw new Error('No engine map for ' + entry.id);
    const ctx = loader.loadFeaturePlayable(entry.playable);

    console.error('Feature Test:', entry.id, 'centre matrix…');
    const centreRows = runCentreEngineMatrix(spec, spec.centerRules);
    const centrePick = pickCentreRule(centreRows, entry.id);
    const cumPick = pickCumulativeRule(centrePick, entry.id);

    let maxMoveRows = null;
    let maxMovePick = { recommendation: 'n/a', reason: 'No max-move UI' };
    if (spec.maxMoves) {
      console.error('Feature Test:', entry.id, 'max-move matrix…');
      maxMoveRows = runMaxMoveMatrix(spec, centrePick.recommendation, spec.maxMoves);
      const baselineLen = centreRows.find((r) => r.centerRule === 'off')?.summary.avgLength || 100;
      maxMovePick = pickMaxMoves(maxMoveRows, baselineLen);
    }

    const recommendedSettings = {
      centerRule: centrePick.recommendation,
      maxMoveLimit: typeof maxMovePick.recommendation === 'number' ? maxMovePick.recommendation : 0,
    };

    console.error('Feature Test:', entry.id, 'depth sweep…');
    const depthSweep = runDepthSweepEngine(spec, recommendedSettings);
    const engineForBudget = spec.factory(recommendedSettings);
    const budgetD2 = measureEngineTurnBudget(engineForBudget, 2, 15);
    const budgetD3 = measureEngineTurnBudget(spec.factory(recommendedSettings), 3, 15);
    const timerRange = timerViableRange(ctx.uiOptions, depthSweep.D2, budgetD2, budgetD3);

    const br = {
      id: entry.id,
      playable: entry.playable,
      uiOptions: ctx.uiOptions,
      enginePath: entry.id === 'INDEX_6_ACTIVE' ? 'cursor-index-fullturn-engine.cjs' : 'sholo-*-fullturn-engine.cjs',
      centreRuleComparison: centreRows,
      centreRecommendation: centrePick,
      cumulativeRecommendation: cumPick,
      maxMoveComparison: maxMoveRows,
      maxMoveRecommendation: maxMovePick,
      recommendedSettings,
      depthSweepRecommended: depthSweep,
      timerViableRange: timerRange,
      centreNote:
        entry.id !== 'INDEX_6_ACTIVE'
          ? 'Engine batches use centre off (certified path). UI endgame tiebreak applies at timed/max-move endings only.'
          : null,
    };
    boardResults.push(br);
    out.boardsTested.push(entry.playable);
    centreRecs.push(centrePick);
    out.aiRecommendations.perBoard[entry.id] = {
      centreRule: centrePick.recommendation,
      centreRuleReason: centrePick.reason,
      cumulativeCaptureRule: cumPick.recommendation,
      cumulativeReason: cumPick.reason,
      endConditionMaxMoves: maxMovePick.recommendation,
      maxMoveReason: maxMovePick.reason,
    };
    out.technicallyViableRange.perBoard[entry.id] = timerRange;
  }

  out.results = { boards: boardResults };
  const votes = {};
  centreRecs.forEach((r) => { votes[r.recommendation] = (votes[r.recommendation] || 0) + 1; });
  const idx = boardResults.find((b) => b.id === 'INDEX_6_ACTIVE');
  out.aiRecommendations.consolidated = {
    centreRule: votes.off === centreRecs.length ? 'off' : Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0],
    centreRuleReason: 'Certified engine D2 picks per board: ' + JSON.stringify(votes),
    cumulativeCaptureRule: idx ? idx.cumulativeRecommendation.recommendation : 'n/a',
    cumulativeReason: idx ? idx.cumulativeRecommendation.reason : '4×4 only',
    endConditionMaxMoves: idx ? idx.maxMoveRecommendation.recommendation : 'n/a',
    endConditionReason: idx ? idx.maxMoveRecommendation.reason : '4×4 only has max-move UI',
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ status: out.status, boards: out.boardsTested.length, consolidated: out.aiRecommendations.consolidated }, null, 2));
}

main();
