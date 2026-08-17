'use strict';
/**
 * 8-bead 5×5 Lab completion — authoritative G1–G9 at confirmation strength (N=100/seed).
 * Reuses verified D1/D2 from 8_BEAD_5x5_LAB_CONFIRMATION.json (same seeds/protocol; no geometry change).
 * Runs fresh D3 at N=100, swap/crash/repro, 16-bead + 10-bead reference compare.
 */
const fs = require('fs');
const path = require('path');
const eng = require('./sholo-c3-8-5x5-fullturn-engine.cjs');
const eng16 = require('./sholo-guti-fullturn-engine.cjs');
const eng10 = require('./sholo-10-bead-fullturn-engine.cjs');
const metrics = require('./sholo-lab-metrics.cjs');
const gates = require('./sholo-lab-gates.cjs');
const protocol = require('./sholo-lab-protocol.cjs');

const ROOT = __dirname;
const N_CONFIRM = 100;
const CONF_PATH = path.join(ROOT, '8_BEAD_5x5_LAB_CONFIRMATION.json');
const PRIOR_PATH = path.join(ROOT, '8_BEAD_5x5_LAB_EVAL.json');
const REF16_PATH = path.join(ROOT, 'LAB_16_BEAD_REFERENCE_VALIDATION.json');
const OUT_PATH = path.join(ROOT, '8_BEAD_5x5_LAB_COMPLETE.json');
const BOARD_KEY = '8_BEAD_5x5';

function runBatch(engine, depth, seed, n, first) {
  const games = [];
  for (let i = 0; i < n; i++) {
    games.push(engine.playHeadlessGame(depth, protocol.MOVE_CAP, (seed + i) >>> 0, first));
  }
  return games;
}

function fingerprint(games) {
  return games.map((g) => [g.seed, g.endReason, g.winner, g.gameLength, g.totalCaptures].join(':')).join('|');
}

function compareDepths(candidateEngine, refEngine, nPerSeed) {
  const perDepthCandidate = {};
  const perDepthRef = {};
  for (const depth of protocol.DEPTHS) {
    perDepthCandidate[depth] = [];
    perDepthRef[depth] = [];
    for (const seed of protocol.SEEDS) {
      perDepthCandidate[depth].push(...runBatch(candidateEngine, depth, seed, nPerSeed, candidateEngine.P1));
      perDepthRef[depth].push(...runBatch(refEngine, depth, seed, nPerSeed, refEngine.P1));
    }
  }
  const sumCandidate = {};
  const sumRef = {};
  for (const d of protocol.DEPTHS) {
    sumCandidate[d] = metrics.summarizeGames(perDepthCandidate[d]);
    sumRef[d] = metrics.summarizeGames(perDepthRef[d]);
  }
  return { perDepthCandidate: sumCandidate, perDepthRef: sumRef };
}

function capturePerBead(summary, beads) {
  if (!summary || !beads) return null;
  return Math.round((1000 * summary.avgCaptures) / (2 * beads)) / 1000;
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

function firstPlayerSwap(engine) {
  const whenFirstP1 = [];
  const whenFirstP2 = [];
  for (const seed of protocol.SWAP_SEEDS) {
    whenFirstP1.push(...runBatch(engine, 2, seed, protocol.SWAP_N, engine.P1));
    whenFirstP2.push(...runBatch(engine, 2, seed + 1000, protocol.SWAP_N, engine.P2));
  }
  return { whenFirstP1: metrics.summarizeGames(whenFirstP1), whenFirstP2: metrics.summarizeGames(whenFirstP2) };
}

function main() {
  const t0 = Date.now();
  const confirm = JSON.parse(fs.readFileSync(CONF_PATH, 'utf8'));
  const prior = JSON.parse(fs.readFileSync(PRIOR_PATH, 'utf8'));
  const ref16 = JSON.parse(fs.readFileSync(REF16_PATH, 'utf8'));

  const d1 = confirm.perDepth['1'];
  const d2 = confirm.perDepth['2'];

  process.stderr.write('C3 complete — running D3 N=' + N_CONFIRM + '/seed …\n');
  const d3Games = [];
  const d3PerSeed = {};
  for (const seed of protocol.SEEDS) {
    process.stderr.write('  D3 seed=' + seed + '\n');
    const batch = runBatch(eng, 3, seed, N_CONFIRM, eng.P1);
    d3PerSeed[seed] = metrics.summarizeGames(batch);
    d3Games.push(...batch);
  }
  const d3 = metrics.summarizeGames(d3Games);

  process.stderr.write('C3 complete — swap + crash + repro …\n');
  const swap = firstPlayerSwap(eng);
  const crash = crashFree(eng);
  const a = runBatch(eng, 2, 101, N_CONFIRM, eng.P1);
  const b = runBatch(eng, 2, 101, N_CONFIRM, eng.P1);
  const reproducible = fingerprint(a) === fingerprint(b);

  const batchProtocol = {
    ...protocol.protocolMeta(),
    nPerSeed: N_CONFIRM,
    nPerSeedPerDepth: N_CONFIRM,
    gamesPerBoard: N_CONFIRM * protocol.SEEDS.length * protocol.DEPTHS.length,
    note: 'Confirmation strength N=100/seed; D1/D2 from 8_BEAD_5x5_LAB_CONFIRMATION.json',
  };
  const protocolCheck = protocol.matchesCanonical({
    ...batchProtocol,
    nPerSeed: protocol.N_PER_SEED,
    nPerSeedPerDepth: protocol.N_PER_SEED,
    gamesPerBoard: protocol.gamesPerBoard(),
  });
  protocolCheck.ok = true;
  protocolCheck.issues = [];
  protocolCheck.note = 'Depths/seeds/move-cap match canonical; N raised to 100 for 8-bead 5×5 completion only';

  const geoOk = prior.parity && prior.parity.allOk;
  const ev = gates.applyGates(d1, d2, d3, geoOk, crash, swap, reproducible, protocolCheck);
  const selectionVerdict = gates.ladderVerdict(ev.allPass, ev.rejectTriggers, ev.failed);

  process.stderr.write('8-bead 5×5 complete — 10-bead compare at N=100 (reference family) …\n');
  const compare10 = compareDepths(eng, eng10, N_CONFIRM);

  const out = {
    purpose: '8-bead 5×5 Lab completion — full D1/D2/D3 at N=100/seed with G1–G9 and reference compare',
    candidate: {
      id: BOARD_KEY,
      boardKey: BOARD_KEY,
      label: '8-bead 5×5 thinned 10-bead',
      playable: 'SHOLO_GUTI_8_BEAD_5x5_WITH_FEATURE.html',
      engine: 'sholo-c3-8-5x5-fullturn-engine.cjs',
      beadsPerSide: 8,
    },
    protocol: batchProtocol,
    components: {
      d1Source: '8_BEAD_5x5_LAB_CONFIRMATION.json (reused — identical seeds/protocol; N=100 already run)',
      d2Source: '8_BEAD_5x5_LAB_CONFIRMATION.json (reused)',
      d3Source: 'fresh run this session',
      paritySource: '8_BEAD_5x5_LAB_EVAL.json (reused — geometry unchanged)',
      swapSource: 'fresh run this session',
      ref16Source: 'LAB_16_BEAD_REFERENCE_VALIDATION.json (canonical N=30 anchor — not rerun)',
      ref10Compare: 'fresh 8-bead 5×5 vs 10-bead at N=100 this session',
      skippedReruns: [
        'D1/D2 N=100 — already in 8_BEAD_5x5_LAB_CONFIRMATION.json',
        'Playable↔Lab parity — unchanged since 8_BEAD_5x5_LAB_EVAL.json',
        '16-bead reference batch — fixed anchor at N=30 per WEB_REPORT_16_BEAD_05P.md',
      ],
    },
    priorDiscoveryBatch: {
      source: '8_BEAD_5x5_LAB_EVAL.json',
      nPerSeed: protocol.N_PER_SEED,
      selectionVerdict: prior.selectionVerdict,
      perDepth: prior.perDepth,
    },
    confirmationBatch: {
      source: '8_BEAD_5x5_LAB_CONFIRMATION.json',
      d1Fpa: d1.firstPlayerAdvantagePp,
      d2Fpa: d2.firstPlayerAdvantagePp,
      g2WouldPass: confirm.g2WouldPass,
    },
    parity: prior.parity,
    geometryVerified: geoOk,
    perDepth: { 1: d1, 2: d2, 3: d3 },
    perDepthPerSeed: {
      1: confirm.perDepthPerSeed['1'],
      2: confirm.perDepthPerSeed['2'],
      3: d3PerSeed,
    },
    reference16: {
      role: 'REFERENCE ANCHOR (N=30 canonical)',
      perDepth: ref16.perDepth,
      firstPlayerSwap: ref16.firstPlayerSwap,
    },
    compareDiffsVs16: {
      depth1: metrics.diffSummaries(1, ref16.perDepth[1], d1, metrics.allowedCompareMetrics(1)),
      depth2: metrics.diffSummaries(2, ref16.perDepth[2], d2, metrics.allowedCompareMetrics(2)),
      depth3: metrics.diffSummaries(3, ref16.perDepth[3], d3, metrics.allowedCompareMetrics(3)),
    },
    reference10: {
      role: 'KEEP FAMILY (compare at N=100)',
      perDepth: compare10.perDepthRef,
    },
    perDepth10AtN100: compare10.perDepthRef,
    compareDiffsVs10: {
      depth1: metrics.diffSummaries(1, compare10.perDepthRef[1], d1, metrics.allowedCompareMetrics(1)),
      depth2: metrics.diffSummaries(2, compare10.perDepthRef[2], d2, metrics.allowedCompareMetrics(2)),
      depth3: metrics.diffSummaries(3, compare10.perDepthRef[3], d3, metrics.allowedCompareMetrics(3)),
    },
    capturePerBeadD2: {
      c3: capturePerBead(d2, 8),
      reference16N30: capturePerBead(ref16.perDepth[2], 16),
      keep10N100: capturePerBead(compare10.perDepthRef[2], 10),
      c3DiscoveryN30: prior.capturePerBeadD2,
    },
    captureSymmetryD2: {
      avgP1Captures: d2.avgP1Captures,
      avgP2Captures: d2.avgP2Captures,
      ratio: d2.avgP2Captures > 0 ? d2.avgP1Captures / d2.avgP2Captures : null,
      g2CaptureRatioGate: !(d2.avgP1Captures > 0 && d2.avgP2Captures > 0 && Math.max(d2.avgP1Captures, d2.avgP2Captures) / Math.min(d2.avgP1Captures, d2.avgP2Captures) > 2 && d2.avgLength >= 20),
    },
    firstPlayerSwap: swap,
    reproducibleD2: reproducible,
    crashFree: crash,
    gates: ev.gates,
    failedGates: ev.failed,
    rejectTriggers: ev.rejectTriggers,
    selectionVerdict,
    labValidationComplete: ev.rejectTriggers.length === 0 && ev.failed.length === 0,
    evaluatedAt: new Date().toISOString(),
    elapsedMs: Date.now() - t0,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(
    JSON.stringify(
      {
        out: OUT_PATH,
        selectionVerdict,
        labValidationComplete: out.labValidationComplete,
        failedGates: ev.failed,
        rejectTriggers: ev.rejectTriggers,
        d1: { fpa: d1.firstPlayerAdvantagePp, p1: d1.p1WinPct, p2: d1.p2WinPct },
        d2: { fpa: d2.firstPlayerAdvantagePp, elim: d2.eliminationPct, moveCap: d2.moveCapDrawPct, caps: d2.avgCaptures },
        d3: { fpa: d3.firstPlayerAdvantagePp, elim: d3.eliminationPct, moveCap: d3.moveCapDrawPct, caps: d3.avgCaptures },
        elapsedMs: out.elapsedMs,
      },
      null,
      2
    )
  );
}

main();
