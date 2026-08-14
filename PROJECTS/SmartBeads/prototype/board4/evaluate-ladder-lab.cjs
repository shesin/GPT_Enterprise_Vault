'use strict';
/**
 * Authoritative G1-G9 ladder verdict evaluator (Sholo family).
 * Compare scripts supply metrics only — no board verdicts.
 */
const fs = require('fs');
const path = require('path');
const metrics = require('./sholo-lab-metrics.cjs');
const protocol = require('./sholo-lab-protocol.cjs');
const gates = require('./sholo-lab-gates.cjs');

const REF_PATH = path.join(__dirname, 'LAB_16_BEAD_REFERENCE_VALIDATION.json');

const CANDIDATES = [
  {
    beads: 10,
    engine: './sholo-10-bead-fullturn-engine.cjs',
    compareJson: 'SHOLO_10_VS_16_LAB_COMPARE.json',
    perDepthKey: 'perDepth10',
    playable: 'SHOLO_GUTI_10_BEAD_WITH_FEATURE.html',
  },
  {
    beads: 8,
    engine: './sholo-8-bead-fullturn-engine.cjs',
    compareJson: 'SHOLO_8_VS_16_LAB_COMPARE.json',
    perDepthKey: 'perDepthSlice',
    playable: 'SHOLO_GUTI_8_BEAD_WITH_FEATURE.html',
  },
  {
    beads: 7,
    engine: './sholo-7-bead-fullturn-engine.cjs',
    compareJson: 'SHOLO_7_VS_16_LAB_COMPARE.json',
    perDepthKey: 'perDepthSlice',
    playable: 'SHOLO_GUTI_7_BEAD_WITH_FEATURE.html',
  },
  {
    beads: 6,
    engine: './sholo-6-bead-fullturn-engine.cjs',
    compareJson: 'SHOLO_6_VS_16_LAB_COMPARE.json',
    perDepthKey: 'perDepthSlice',
    playable: 'SHOLO_GUTI_6_BEAD_WITH_FEATURE.html',
  },
  {
    beads: 5,
    engine: './sholo-5-bead-fullturn-engine.cjs',
    compareJson: 'SHOLO_5_VS_16_LAB_COMPARE.json',
    perDepthKey: 'perDepthSlice',
    playable: 'SHOLO_GUTI_5_BEAD_WITH_FEATURE.html',
  },
];

function runBatch(engine, depth, seed, n, first) {
  const games = [];
  for (let i = 0; i < n; i++) {
    games.push(engine.playHeadlessGame(depth, protocol.MOVE_CAP, (seed + i) >>> 0, first));
  }
  return games;
}

function crashFree(engine, depth) {
  try {
    const g = runBatch(engine, depth, 99000 + depth, 40, engine.P1);
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
  const fp1 = [];
  const fp2 = [];
  for (const seed of protocol.SWAP_SEEDS) {
    fp1.push(...runBatch(engine, 2, seed, protocol.SWAP_N, engine.P1));
    fp2.push(...runBatch(engine, 2, seed + 1000, protocol.SWAP_N, engine.P2));
  }
  return { whenFirstP1: metrics.summarizeGames(fp1), whenFirstP2: metrics.summarizeGames(fp2) };
}

function fingerprint(games) {
  return games.map((g) => [g.seed, g.endReason, g.winner, g.gameLength, g.totalCaptures].join(':')).join('|');
}

function parseOnly() {
  const idx = process.argv.indexOf('--only');
  if (idx === -1) return null;
  const raw = process.argv[idx + 1];
  if (!raw) return null;
  return raw.split(',').map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x));
}

function main() {
  const only = parseOnly();
  const outPath = path.join(__dirname, 'LADDER_LAB_EVALUATION.json');
  let prior = {};
  if (only && fs.existsSync(outPath)) {
    prior = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  }
  const ref = JSON.parse(fs.readFileSync(REF_PATH, 'utf8'));
  const refProtocolOk = protocol.matchesCanonical(ref.baselineProtocol);
  const out = {
    purpose: 'Authoritative ladder G1-G9 evaluation — LAB_TERMINOLOGY_05P.md',
    authoritativeEvaluator: 'evaluate-ladder-lab.cjs',
    reference16: { role: 'REFERENCE ANCHOR', perDepth: ref.perDepth, firstPlayerSwap: ref.firstPlayerSwap },
    referenceProtocolCheck: refProtocolOk,
    boards: prior.boards ? { ...prior.boards } : {},
    evaluatedOnly: only || null,
  };

  const list = only ? CANDIDATES.filter((c) => only.includes(c.beads)) : CANDIDATES;
  for (const c of list) {
    const comparePath = path.join(__dirname, c.compareJson);
    if (!fs.existsSync(comparePath)) {
      out.boards[c.beads] = { selectionVerdict: 'NOT TESTED', reason: 'compare JSON missing — run compare script first' };
      continue;
    }
    const compare = JSON.parse(fs.readFileSync(comparePath, 'utf8'));
    const eng = require(c.engine);
    const pd = compare[c.perDepthKey];
    const d1 = pd['1'];
    const d2 = pd['2'];
    const d3 = pd['3'];
    const geoOk = compare.geometryVerifiedNotSilent16Bead;
    const crash = crashFree(eng, 2);
    const swap = firstPlayerSwap(eng);
    const a = runBatch(eng, 2, 101, protocol.N_PER_SEED, eng.P1);
    const b = runBatch(eng, 2, 101, protocol.N_PER_SEED, eng.P1);
    const reproducible = fingerprint(a) === fingerprint(b);
    const protocolCheck = protocol.matchesCanonical(compare.protocol || {});
    const ev = gates.applyGates(d1, d2, d3, geoOk, crash, swap, reproducible, protocolCheck);
    const selection = gates.ladderVerdict(ev.allPass, ev.rejectTriggers, ev.failed);
    out.boards[c.beads] = {
      playable: c.playable,
      engine: c.engine,
      compareJson: c.compareJson,
      geometryVerified: geoOk,
      reproducibleD2: reproducible,
      perDepth: { 1: d1, 2: d2, 3: d3 },
      firstPlayerSwap: swap,
      gates: ev.gates,
      failedGates: ev.failed,
      rejectTriggers: ev.rejectTriggers,
      selectionVerdict: selection,
    };
    process.stderr.write('bead=' + c.beads + ' selection=' + selection + '\n');
  }

  out.boards[16] = { role: 'REFERENCE ANCHOR', selectionVerdict: 'REFERENCE ANCHOR', perDepth: ref.perDepth };

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({
    out: outPath,
    authoritativeEvaluator: 'evaluate-ladder-lab.cjs',
    boards: Object.fromEntries(Object.entries(out.boards).map(([k, v]) => [k, v.selectionVerdict])),
  }, null, 2));
}

main();
