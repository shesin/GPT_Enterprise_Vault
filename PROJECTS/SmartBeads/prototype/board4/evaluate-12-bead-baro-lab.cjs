'use strict';
/**
 * Authoritative G1–G9 Lab for Baro Guti 12-bead (5×5 Alquerque classic start).
 * Compares candidate vs 16-bead reference anchor and KEEP 10-bead family under same protocol.
 */
const fs = require('fs');
const path = require('path');
const eng16 = require('./sholo-guti-fullturn-engine.cjs');
const eng10 = require('./sholo-10-bead-fullturn-engine.cjs');
const eng12 = require('./sholo-12-bead-baro-fullturn-engine.cjs');
const { loadDiscoveryPlayable, ROOT } = require('./discovery-playable-loader.cjs');
const metrics = require('./sholo-lab-metrics.cjs');
const gates = require('./sholo-lab-gates.cjs');
const protocol = require('./sholo-lab-protocol.cjs');

const REF16_PATH = path.join(ROOT, 'LAB_16_BEAD_REFERENCE_VALIDATION.json');
const REF10_PATH = path.join(ROOT, 'LADDER_LAB_EVALUATION.json');
const OUT_PATH = path.join(ROOT, 'BARO_12_LAB_EVALUATION.json');
const PLAYABLE = 'SHOLO_GUTI_12_BEAD_BARO_WITH_FEATURE.html';

function edgeCount(adj) {
  let e = 0;
  for (let i = 0; i < adj.length; i++) for (const j of adj[i]) if (j > i) e++;
  return e;
}

function runBatch(engine, depth, seed, n, firstPlayer) {
  const games = [];
  for (let i = 0; i < n; i++) {
    games.push(engine.playHeadlessGame(depth, protocol.MOVE_CAP, (seed + i) >>> 0, firstPlayer));
  }
  return games;
}

function fingerprint(games) {
  return games
    .map((g) => [g.seed, g.endReason, g.winner, g.gameLength, g.totalCaptures].join(':'))
    .join('|');
}

function parityCheck(api, engine) {
  const checks = [];
  function g(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail });
  }
  g('N_25', api.N === 25 && engine.N === 25, { play: api.N, lab: engine.N });
  let coordMatch = true;
  for (let i = 0; i < engine.N; i++) {
    if (
      api.NODES[i].id !== engine.NODES[i].id ||
      api.NODES[i].x !== engine.NODES[i].x ||
      api.NODES[i].y !== engine.NODES[i].y
    ) {
      coordMatch = false;
      break;
    }
  }
  g('node_coords', coordMatch, {});
  g('edge_count_match', edgeCount(api.ADJ) === edgeCount(engine.ADJ), {
    play: edgeCount(api.ADJ),
    lab: edgeCount(engine.ADJ),
  });
  const playStart = api.getBoard();
  const labStart = engine.startingBoard();
  g('start_match', playStart.every((v, i) => v === labStart[i]), {});
  const openPlay = api.getAllLegalMoves(playStart, api.P1).length;
  const openLab = engine.getAllLegalMoves(labStart, engine.P1).length;
  g('opening_moves', openPlay === openLab, { openPlay, openLab });
  g('opening_captures_zero', api.getAllLegalMoves(playStart, api.P1).every((m) => m.captured == null), {});
  g('search_unit_complete_turn', engine.describeSearchSemantics(2).searchUnit === 'complete turn', {});
  g('eval_noise_off', engine.describeSearchSemantics(2).evalNoise === false, {});
  return { allOk: checks.every((x) => x.ok), checks };
}

function firstPlayerSwap(engine) {
  const whenFirstP1 = [];
  const whenFirstP2 = [];
  for (const seed of protocol.SWAP_SEEDS) {
    whenFirstP1.push(...runBatch(engine, 2, seed, protocol.SWAP_N, engine.P1));
    whenFirstP2.push(...runBatch(engine, 2, seed + 1000, protocol.SWAP_N, engine.P2));
  }
  return { whenFirstP1: metrics.summarizeGames(whenFirstP1), whenFirstP2: metrics.summarizeGames(whenFirstP2) };
}

function crashFree(engine) {
  try {
    const g = runBatch(engine, 2, 99000, 40, engine.P1);
    const ok = g.every(
      (x) =>
        ['elimination', 'stalemate', 'move_cap_lab_safety', 'repetition'].includes(x.endReason) &&
        ['P1', 'P2', 'draw'].includes(x.winner)
    );
    return { ok, n: g.length };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

function compareDepths(candidateEngine, refEngine) {
  const perDepthCandidate = {};
  const perDepthRef = {};
  let totalGames = 0;
  for (const depth of protocol.DEPTHS) {
    perDepthCandidate[depth] = [];
    perDepthRef[depth] = [];
    for (const seed of protocol.SEEDS) {
      perDepthCandidate[depth].push(...runBatch(candidateEngine, depth, seed, protocol.N_PER_SEED, candidateEngine.P1));
      perDepthRef[depth].push(...runBatch(refEngine, depth, seed, protocol.N_PER_SEED, refEngine.P1));
      totalGames += protocol.N_PER_SEED * 2;
    }
  }
  const sumCandidate = {};
  const sumRef = {};
  for (const d of protocol.DEPTHS) {
    sumCandidate[d] = metrics.summarizeGames(perDepthCandidate[d]);
    sumRef[d] = metrics.summarizeGames(perDepthRef[d]);
  }
  return { perDepthCandidate: sumCandidate, perDepthRef: sumRef, totalGames };
}

function capturePerBead(summary, beads) {
  if (!summary || !beads) return null;
  return Math.round((1000 * summary.avgCaptures) / (2 * beads)) / 1000;
}

function main() {
  const t0 = Date.now();
  const ref16 = JSON.parse(fs.readFileSync(REF16_PATH, 'utf8'));
  const ladder = JSON.parse(fs.readFileSync(REF10_PATH, 'utf8'));
  const ref10Entry = ladder.boards && ladder.boards['10-bead'];
  const batchProtocol = protocol.protocolMeta();
  const { api } = loadDiscoveryPlayable(PLAYABLE);
  const parity = parityCheck(api, eng12);
  if (!parity.allOk) {
    process.stderr.write('parity FAIL: ' + parity.checks.filter((x) => !x.ok).map((x) => x.name).join(', ') + '\n');
  }

  const compare16 = compareDepths(eng12, eng16);
  const compare10 = compareDepths(eng12, eng10);
  const crash = crashFree(eng12);
  const swap = firstPlayerSwap(eng12);
  const a = runBatch(eng12, 2, 101, protocol.N_PER_SEED, eng12.P1);
  const b = runBatch(eng12, 2, 101, protocol.N_PER_SEED, eng12.P1);
  const reproducible = fingerprint(a) === fingerprint(b);
  const protocolCheck = protocol.matchesCanonical(batchProtocol);

  const d1 = compare16.perDepthCandidate[1];
  const d2 = compare16.perDepthCandidate[2];
  const d3 = compare16.perDepthCandidate[3];
  const ev = gates.applyGates(d1, d2, d3, parity.allOk, crash, swap, reproducible, protocolCheck);
  const selection = gates.ladderVerdict(ev.allPass, ev.rejectTriggers, ev.failed);

  const out = {
    purpose: 'Baro Guti 12-bead G1–G9 Lab vs 16-bead anchor + 10-bead KEEP family compare',
    authoritativeEvaluator: 'evaluate-12-bead-baro-lab.cjs',
    protocol: batchProtocol,
    candidate: {
      id: 'BARO12',
      label: 'Baro Guti 12-bead · 5×5 Alquerque classic camps',
      playable: PLAYABLE,
      engine: 'sholo-12-bead-baro-fullturn-engine.cjs',
      beadsPerSide: 12,
      nodeCount: eng12.N,
      geometryNote:
        'Traditional Baro Guti / Bara Guti / Alquerque 12: rows 0–1 P1 full, rows 3–4 P2 full, row 2 a3 b3 P2 / centre A22 empty / d3 e3 P1. Distinct from C4 mini-wings and C6 6×5 stretch.',
      traditionalSources: ['Murray 1951 / Ludii Bára Guti', 'OMerkel Alquerque README', 'Bead 12 / Baro Guti regional apps'],
      labWorthiness:
        'Untested 12-bead geometry; traditional proven layout; same 5×5 graph as KEEP 10-bead but different occupancy (rank camps vs empty centre file). C4 REJECT does not predict Baro outcome.',
    },
    reference16: {
      role: 'REFERENCE ANCHOR',
      perDepth: ref16.perDepth,
      firstPlayerSwap: ref16.firstPlayerSwap,
    },
    reference10: {
      role: 'KEEP FAMILY',
      perDepth: ref10Entry ? ref10Entry.perDepth : null,
      selectionVerdict: ref10Entry ? ref10Entry.selectionVerdict : 'KEEP (ladder)',
    },
    parity,
    geometryVerified: parity.allOk,
    reproducibleD2: reproducible,
    perDepth: compare16.perDepthCandidate,
    perDepth16: compare16.perDepthRef,
    perDepth10: compare10.perDepthRef,
    perDepth12: compare16.perDepthCandidate,
    compareDiffsVs16: {
      depth1: metrics.diffSummaries(1, compare16.perDepthRef[1], d1, metrics.allowedCompareMetrics(1)),
      depth2: metrics.diffSummaries(2, compare16.perDepthRef[2], d2, metrics.allowedCompareMetrics(2)),
      depth3: metrics.diffSummaries(3, compare16.perDepthRef[3], d3, metrics.allowedCompareMetrics(3)),
    },
    compareDiffsVs10: {
      depth1: metrics.diffSummaries(1, compare10.perDepthRef[1], compare10.perDepthCandidate[1], metrics.allowedCompareMetrics(1)),
      depth2: metrics.diffSummaries(2, compare10.perDepthRef[2], compare10.perDepthCandidate[2], metrics.allowedCompareMetrics(2)),
      depth3: metrics.diffSummaries(3, compare10.perDepthRef[3], compare10.perDepthCandidate[3], metrics.allowedCompareMetrics(3)),
    },
    capturePerBeadD2: {
      baro12: capturePerBead(d2, 12),
      reference16: capturePerBead(ref16.perDepth[2], 16),
      keep10: ref10Entry ? capturePerBead(ref10Entry.perDepth[2], 10) : capturePerBead(compare10.perDepthRef[2], 10),
    },
    firstPlayerSwap: swap,
    gates: ev.gates,
    failedGates: ev.failed,
    rejectTriggers: ev.rejectTriggers,
    selectionVerdict: selection,
    totalGamesCompared: compare16.totalGames + compare10.totalGames,
    evaluatedAt: new Date().toISOString(),
    elapsedMs: Date.now() - t0,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(
    JSON.stringify({
      out: OUT_PATH,
      selectionVerdict: selection,
      failedGates: ev.failed,
      rejectTriggers: ev.rejectTriggers,
      D1_FPA: d1.firstPlayerAdvantagePp,
      D2_FPA: d2.firstPlayerAdvantagePp,
      D3_FPA: d3.firstPlayerAdvantagePp,
      elapsedMs: out.elapsedMs,
    })
  );
}

main();
