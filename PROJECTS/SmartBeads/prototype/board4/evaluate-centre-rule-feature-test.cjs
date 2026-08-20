'use strict';
/**
 * Per-board End-Game vs Cumulative centre-rule Feature Test (KEEP boards only).
 * Output: FEATURE_TEST_CENTRE_RULE_EVALUATION.json + merges summary into FEATURE_TEST_EVALUATION.json
 * Lab G1-G9 verdicts are produced against per-board .cjs reimplementations of the rules, not against the production SmartBeadsEngine/HonestAi, and therefore certify geometry/balance only, not production PvE correctness.
 */
const fs = require('fs');
const path = require('path');
const protocol = require('./sholo-lab-protocol.cjs');
const metrics = require('./sholo-lab-metrics.cjs');
const gates = require('./sholo-lab-gates.cjs');
const centreLab = require('./sholo-centre-lab.cjs');

const ROOT = __dirname;
const REGISTRY_PATH = path.join(ROOT, 'FEATURE_TEST_KEEP_REGISTRY.json');
const OUT_PATH = path.join(ROOT, 'FEATURE_TEST_CENTRE_RULE_EVALUATION.json');
const MAIN_OUT = path.join(ROOT, 'FEATURE_TEST_EVALUATION.json');

const PRIMARY_DEPTH = 2;
const SEEDS = protocol.SEEDS;
const N_PER_SEED = protocol.N_PER_SEED;
const MOVE_CAP = protocol.MOVE_CAP;

function normalizeGame(g) {
  let endReason = g.endReason;
  if (endReason === 'score_decision') endReason = 'move_cap_lab_safety';
  if (endReason === 'max_moves') endReason = 'move_cap_lab_safety';
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

function summarize(games) {
  return metrics.summarizeGames(games.map(normalizeGame));
}

function rawEndReasonPct(games) {
  const c = {};
  const n = games.length || 1;
  for (const g of games) c[g.endReason] = (c[g.endReason] || 0) + 1;
  const pct = {};
  for (const k of Object.keys(c)) pct[k] = (100 * c[k]) / n;
  return pct;
}

function contestScore(summary, beadsPerSide) {
  const fpa = Math.abs(summary.firstPlayerAdvantagePp || 0);
  const winSpread = Math.abs(summary.p1WinPct - summary.p2WinPct);
  const capturePerBead = summary.avgCaptures / (2 * beadsPerSide);
  return {
    avgCaptures: summary.avgCaptures,
    capturePerBead: capturePerBead,
    avgLength: summary.avgLength,
    eliminationPct: summary.eliminationPct,
    elimOrStalematePct: summary.elimOrStalematePct,
    repetitionDrawPct: summary.repetitionDrawPct,
    moveCapDrawPct: summary.moveCapDrawPct,
    stalematePct: summary.stalematePct,
    firstPlayerAdvantagePp: summary.firstPlayerAdvantagePp,
    p1WinPct: summary.p1WinPct,
    p2WinPct: summary.p2WinPct,
    winSpread,
    compositeScore:
      summary.avgCaptures * 2 +
      summary.eliminationPct * 0.4 +
      capturePerBead * 10 -
      fpa * 1.2 -
      winSpread * 0.3 -
      summary.repetitionDrawPct * 0.6,
  };
}

function recommendPerBoard(endgame, cumulative, beadsPerSide, cumulativeInUi) {
  const eg = contestScore(endgame.summary, beadsPerSide);
  const cu = contestScore(cumulative.summary, beadsPerSide);
  const delta = eg.compositeScore - cu.compositeScore;
  const absDelta = Math.abs(delta);

  let recommendation;
  let confidence;
  let reason;

  if (absDelta < 1.5) {
    recommendation = 'INSUFFICIENT_EVIDENCE';
    confidence = 'low';
    reason =
      'End-Game vs Cumulative composite scores within noise (Δ=' +
      delta.toFixed(2) +
      '). No reliable per-board winner.';
  } else if (delta > 0) {
    recommendation = 'endgame';
    confidence = absDelta >= 4 ? 'moderate' : 'low';
    reason =
      'End-Game leads on contest composite (avgCaptures ' +
      eg.avgCaptures.toFixed(1) +
      ' vs ' +
      cu.avgCaptures.toFixed(1) +
      ', FPA ' +
      (eg.firstPlayerAdvantagePp != null ? eg.firstPlayerAdvantagePp.toFixed(1) : 'n/a') +
      ' vs ' +
      (cu.firstPlayerAdvantagePp != null ? cu.firstPlayerAdvantagePp.toFixed(1) : 'n/a') +
      ' pp, elim ' +
      eg.eliminationPct.toFixed(1) +
      '% vs ' +
      cu.eliminationPct.toFixed(1) +
      '%)';
  } else {
    recommendation = 'cumulative';
    confidence = absDelta >= 4 ? 'moderate' : 'low';
    reason =
      'Cumulative leads on contest composite (avgCaptures ' +
      cu.avgCaptures.toFixed(1) +
      ' vs ' +
      eg.avgCaptures.toFixed(1) +
      ', capture/bead ' +
      cu.capturePerBead.toFixed(2) +
      ' vs ' +
      eg.capturePerBead.toFixed(2) +
      ')';
  }

  const limitations = [];
  if (!cumulativeInUi) {
    limitations.push('Cumulative is not in product UI — comparison is Lab projection using playable centre-node geometry.');
  }
  limitations.push('Centre rules affect move-cap / tiebreak resolution; D2 search eval unchanged (same as certified engines).');
  if (confidence === 'low') limitations.push('Score margin small — human playtest should confirm.');

  return {
    recommendation,
    confidence,
    reason,
    deltaComposite: delta,
    endgameMetrics: eg,
    cumulativeMetrics: cu,
    limitations,
  };
}

function resolveCenterNodes(boardId, def) {
  if (def.centerNodes) return def.centerNodes;
  const eng = centreLab.resolveEngine(def);
  if (eng.useFactory) {
    const e = eng.factory('off');
    return def.centerNodes;
  }
  return centreLab.centreNodesFromNodes(eng.mod.NODES, def.nodePredicate);
}

function main() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  const keep = registry.humanConfirmedKeep || [];

  const out = {
    purpose: 'Per-board End-Game vs Cumulative centre-rule Feature Test (KEEP boards only)',
    labInstrumentDisclaimer: gates.LAB_INSTRUMENT_DISCLAIMER,
    evaluator: 'evaluate-centre-rule-feature-test.cjs',
    evaluatedAt: new Date().toISOString(),
    protocol: {
      depth: PRIMARY_DEPTH,
      seeds: SEEDS,
      nPerSeed: N_PER_SEED,
      gamesPerRule: SEEDS.length * N_PER_SEED,
      moveCap: MOVE_CAP,
      note: 'Certified fullturn engines + sholo-centre-lab.cjs wrapper. Compares endgame vs cumulative only.',
    },
    boards: [],
  };

  for (const entry of keep) {
    const def = centreLab.KEEP_BOARD_CENTRE[entry.id];
    if (!def) throw new Error('No centre def for ' + entry.id);

    const boardOut = {
      id: entry.id,
      playable: def.playable,
      beadsPerSide: def.beadsPerSide,
      centreNodeExists: def.centreNodesExist,
      centreNodeProof: def.centreNodeProof,
      cumulativeInProductUi: def.cumulativeInProductUi,
      endgameInProductUi: def.endgameInProductUi,
    };

    if (!def.centreNodesExist) {
      boardOut.comparisonRun = false;
      boardOut.recommendation = 'n/a — no centre nodes';
      out.boards.push(boardOut);
      continue;
    }

    const centerNodes = resolveCenterNodes(entry.id, def);
    boardOut.centerNodeIndices = centerNodes;
    boardOut.centerNodeCount = centerNodes.length;

    console.error('Centre rule test:', entry.id, 'endgame…');
    const endgameGames = centreLab.playBatch(def, centerNodes, 'endgame', PRIMARY_DEPTH, SEEDS, N_PER_SEED, MOVE_CAP);
    console.error('Centre rule test:', entry.id, 'cumulative…');
    const cumulativeGames = centreLab.playBatch(def, centerNodes, 'cumulative', PRIMARY_DEPTH, SEEDS, N_PER_SEED, MOVE_CAP);

    boardOut.endgame = {
      centerRule: 'endgame',
      games: endgameGames.length,
      rawEndReasons: rawEndReasonPct(endgameGames),
      summary: summarize(endgameGames),
    };
    boardOut.cumulative = {
      centerRule: 'cumulative',
      games: cumulativeGames.length,
      rawEndReasons: rawEndReasonPct(cumulativeGames),
      summary: summarize(cumulativeGames),
    };

    boardOut.measurableComparison = {
      endgame: contestScore(boardOut.endgame.summary, def.beadsPerSide),
      cumulative: contestScore(boardOut.cumulative.summary, def.beadsPerSide),
    };

    const rec = recommendPerBoard(boardOut.endgame, boardOut.cumulative, def.beadsPerSide, def.cumulativeInProductUi);
    boardOut.recommendation = rec.recommendation;
    boardOut.confidence = rec.confidence;
    boardOut.recommendationReason = rec.reason;
    boardOut.limitations = rec.limitations;
    boardOut.deltaComposite = rec.deltaComposite;

    out.boards.push(boardOut);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

  if (fs.existsSync(MAIN_OUT)) {
    const main = JSON.parse(fs.readFileSync(MAIN_OUT, 'utf8'));
    main.centreRulePerBoardStudy = {
      evaluatedAt: out.evaluatedAt,
      artifact: 'FEATURE_TEST_CENTRE_RULE_EVALUATION.json',
      protocol: out.protocol,
      perBoard: out.boards.map((b) => ({
        id: b.id,
        playable: b.playable,
        centreNodeExists: b.centreNodeExists,
        recommendation: b.recommendation,
        confidence: b.confidence,
        cumulativeInProductUi: b.cumulativeInProductUi,
      })),
    };
    if (main.aiRecommendations && main.aiRecommendations.perBoard) {
      for (const b of out.boards) {
        if (!main.aiRecommendations.perBoard[b.id]) continue;
        main.aiRecommendations.perBoard[b.id].centreRule = b.recommendation;
        main.aiRecommendations.perBoard[b.id].centreRuleReason = b.recommendationReason;
        main.aiRecommendations.perBoard[b.id].centreRuleConfidence = b.confidence;
        main.aiRecommendations.perBoard[b.id].cumulativeCaptureRule =
          b.recommendation === 'cumulative' ? 'cumulative' : b.recommendation === 'endgame' ? 'endgame' : b.recommendation;
        main.aiRecommendations.perBoard[b.id].cumulativeReason = b.recommendationReason;
      }
    }
    fs.writeFileSync(MAIN_OUT, JSON.stringify(main, null, 2));
  }

  console.log(JSON.stringify({ out: OUT_PATH, boards: out.boards.length, recommendations: out.boards.map((b) => ({ id: b.id, rec: b.recommendation })) }, null, 2));
}

main();
