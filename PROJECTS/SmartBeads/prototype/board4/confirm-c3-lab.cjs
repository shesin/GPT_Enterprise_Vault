'use strict';
/**
 * C3 confirmation batch — resolves D1 first-mover lean (+28.9 pp at N=30).
 * Same protocol except N=100/seed on D1 and D2 only (G2 input depths).
 * Does not retest C1/C2/C4 or rerun full G1–G9 on KEEP boards.
 */
const fs = require('fs');
const path = require('path');
const eng = require('./sholo-c3-8-5x5-fullturn-engine.cjs');
const metrics = require('./sholo-lab-metrics.cjs');
const gates = require('./sholo-lab-gates.cjs');
const protocol = require('./sholo-lab-protocol.cjs');

const N_CONFIRM = 100;
const DEPTHS = [1, 2];
const OUT = path.join(__dirname, 'C3_LAB_CONFIRMATION.json');

function runBatch(depth, seed, n, first) {
  const games = [];
  for (let i = 0; i < n; i++) {
    games.push(eng.playHeadlessGame(depth, protocol.MOVE_CAP, (seed + i) >>> 0, first));
  }
  return games;
}

function fingerprint(games) {
  return games.map((g) => [g.seed, g.endReason, g.winner, g.gameLength, g.totalCaptures].join(':')).join('|');
}

function firstPlayerSwap() {
  const whenFirstP1 = [];
  const whenFirstP2 = [];
  for (const seed of protocol.SWAP_SEEDS) {
    whenFirstP1.push(...runBatch(2, seed, protocol.SWAP_N, eng.P1));
    whenFirstP2.push(...runBatch(2, seed + 1000, protocol.SWAP_N, eng.P2));
  }
  return { whenFirstP1: metrics.summarizeGames(whenFirstP1), whenFirstP2: metrics.summarizeGames(whenFirstP2) };
}

function main() {
  const t0 = Date.now();
  const perDepth = {};
  const perDepthPerSeed = {};
  for (const depth of DEPTHS) {
    perDepth[depth] = [];
    perDepthPerSeed[depth] = {};
    for (const seed of protocol.SEEDS) {
      process.stderr.write('C3 confirm depth=' + depth + ' seed=' + seed + ' N=' + N_CONFIRM + '\n');
      const batch = runBatch(depth, seed, N_CONFIRM, eng.P1);
      perDepthPerSeed[depth][seed] = metrics.summarizeGames(batch);
      perDepth[depth].push(...batch);
    }
  }
  const d1 = metrics.summarizeGames(perDepth[1]);
  const d2 = metrics.summarizeGames(perDepth[2]);
  const d3Stub = { avgCaptures: d2.avgCaptures, avgLength: d2.avgLength, eliminationPct: d2.eliminationPct };
  const swap = firstPlayerSwap();
  const a = runBatch(2, 101, N_CONFIRM, eng.P1);
  const b = runBatch(2, 101, N_CONFIRM, eng.P1);
  const reproducible = fingerprint(a) === fingerprint(b);
  const ev = gates.applyGates(d1, d2, d3Stub, true, { ok: true }, swap, reproducible, { ok: true });
  const prior = JSON.parse(fs.readFileSync(path.join(__dirname, 'C3_LAB_EVAL.json'), 'utf8'));

  const out = {
    purpose: 'C3 confirmation — D1/D2 fairness at N=100/seed (G2 input depths only)',
    candidate: 'C3 — 8-bead 5×5 thinned',
    playable: 'SHOLO_GUTI_8_BEAD_5x5_WITH_FEATURE.html',
    priorBatch: {
      source: 'C3_LAB_EVAL.json',
      nPerSeed: protocol.N_PER_SEED,
      d1Fpa: prior.perDepth[1].firstPlayerAdvantagePp,
      d2Fpa: prior.perDepth[2].firstPlayerAdvantagePp,
      selectionVerdict: prior.selectionVerdict,
    },
    protocol: {
      depths: DEPTHS,
      seeds: protocol.SEEDS,
      nPerSeed: N_CONFIRM,
      moveCap: protocol.MOVE_CAP,
      note: 'Confirmation only — same seeds/move-cap as certified protocol; N raised to reduce D1 FPA noise',
    },
    perDepth: { 1: d1, 2: d2 },
    perDepthPerSeed,
    firstPlayerSwap: swap,
    gates: ev.gates,
    failedGates: ev.failed,
    rejectTriggers: ev.rejectTriggers,
    g2WouldPass: ev.gates.find((g) => g.id === 'G2').pass,
    reproducibleD2: reproducible,
    elapsedMs: Date.now() - t0,
  };

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({
    out: OUT,
    nPerSeed: N_CONFIRM,
    d1: { p1: d1.p1WinPct, p2: d1.p2WinPct, fpa: d1.firstPlayerAdvantagePp, n: d1.n },
    d2: { p1: d2.p1WinPct, p2: d2.p2WinPct, fpa: d2.firstPlayerAdvantagePp, avgCapt: d2.avgCaptures, withWinner: d2.counts.withWinner, n: d2.n },
    g2WouldPass: out.g2WouldPass,
    rejectTriggers: ev.rejectTriggers,
    elapsedMs: out.elapsedMs,
  }, null, 2));
}

main();
