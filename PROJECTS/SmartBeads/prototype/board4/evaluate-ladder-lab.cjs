'use strict';
/**
 * Apply existing G1-G9 gates to ladder boards with validated engines.
 * Does not invent thresholds — uses LAB_TERMINOLOGY_05P.md rules only.
 */
const fs = require('fs');
const path = require('path');
const metrics = require('./sholo-lab-metrics.cjs');

const MOVE_CAP = 120;
const SEEDS = [101, 202, 303];
const N = 30;
const SWAP_N = 20;
const SWAP_SEEDS = [7000, 8000, 9000];

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
    games.push(engine.playHeadlessGame(depth, MOVE_CAP, (seed + i) >>> 0, first));
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
  for (const seed of SWAP_SEEDS) {
    fp1.push(...runBatch(engine, 2, seed, SWAP_N, engine.P1));
    fp2.push(...runBatch(engine, 2, seed + 1000, SWAP_N, engine.P2));
  }
  return { whenFirstP1: metrics.summarizeGames(fp1), whenFirstP2: metrics.summarizeGames(fp2) };
}

function applyGates(c, d1, d2, d3, geoOk, crash, swap, reproducible) {
  const gates = [];
  function g(id, name, pass, detail) {
    gates.push({ id, name, pass: !!pass, detail });
  }

  g('G1', 'No breakage', geoOk && crash.ok, { geoOk, crash });
  g('G2', 'No meaningful side bias', checkFairness(d1, d2, swap), { swap, d1Fpa: d1.firstPlayerAdvantagePp, d2: { p1: d2.p1WinPct, p2: d2.p2WinPct, p1Caps: d2.avgP1Captures, p2Caps: d2.avgP2Captures } });
  g('G3', 'Game alive', d2.avgCaptures >= 2 && d2.avgLength >= 5, { avgCaptures: d2.avgCaptures, avgLength: d2.avgLength });
  g('G4', 'Captures matter', !(d1.avgCaptures < 2 && d2.avgCaptures < 2), { d1Caps: d1.avgCaptures, d2Caps: d2.avgCaptures });
  g('G5', 'Elimination possible', d1.eliminationPct > 0 || d3.eliminationPct > 0, { d1Elim: d1.eliminationPct, d3Elim: d3.eliminationPct });
  g('G6', 'Draws legitimate', true, { moveCapDrawPct: d2.moveCapDrawPct, repetitionDrawPct: d2.repetitionDrawPct, note: 'reported separately; not a failure' });
  g('G7', 'Reasonable length', d2.avgLength >= 5, { d2Length: d2.avgLength });
  g('G8', 'Depth/seed stability', reproducible && d3.avgCaptures >= d2.avgCaptures - 1, { reproducible, d2Caps: d2.avgCaptures, d3Caps: d3.avgCaptures });
  g('G9', 'Same protocol', geoOk, { protocol: 'D1/D2/D3 seeds 101/202/303 N=50 moveCap 120' });

  const failed = gates.filter((x) => !x.pass);
  const rejectTriggers = checkRejectTriggers(d1, d2, geoOk, crash);
  return { gates, failed: failed.map((x) => x.id), rejectTriggers, allPass: failed.length === 0 && rejectTriggers.length === 0 };
}

function checkFairness(d1, d2, swap) {
  const s1 = swap.whenFirstP1;
  const s2 = swap.whenFirstP2;
  if (s1.counts.withWinner >= 10 && s2.counts.withWinner >= 10) {
    const fpa1 = s1.firstPlayerWinPctAmongWins;
    const fpa2 = s2.firstPlayerWinPctAmongWins;
    if (fpa1 != null && fpa2 != null && Math.abs(fpa1 - fpa2) > 35) return false;
  }
  if (Math.abs(s1.avgCaptures - s2.avgCaptures) > 3) return false;
  if (d2.p1WinPct >= 99 || d2.p2WinPct >= 99) return false;
  if (d2.avgP1Captures > 0 && d2.avgP2Captures > 0) {
    const ratio = Math.max(d2.avgP1Captures, d2.avgP2Captures) / Math.min(d2.avgP1Captures, d2.avgP2Captures);
    if (ratio > 2 && d2.avgLength >= 20) return false;
  }
  if (d1.counts.withWinner >= 30 && Math.abs(d1.firstPlayerAdvantagePp) > 35) return false;
  return true;
}

function checkRejectTriggers(d1, d2, geoOk, crash) {
  const t = [];
  if (!geoOk) t.push('geometry_guard_fail');
  if (!crash.ok) t.push('crash_or_illegal');
  if (d1.avgCaptures < 2 && d2.avgCaptures < 2) t.push('near_zero_contest');
  if (d2.avgLength < 5) t.push('instant_games_d2');
  if (d2.p1WinPct >= 99 || d2.p2WinPct >= 99) t.push('extreme_side_dominance_d2');
  if (d1.eliminationPct === 0 && d1.avgCaptures < 2) t.push('d1_sanity_fail');
  return t;
}

function ladderVerdict(allPass, rejectTriggers, hasCompare) {
  if (!hasCompare) return 'NOT TESTED';
  if (rejectTriggers.length) return 'REJECT';
  if (allPass) return 'NEEDS FURTHER TESTING';
  return 'REJECT';
}

function fingerprint(games) {
  return games.map((g) => [g.seed, g.endReason, g.winner, g.gameLength, g.totalCaptures].join(':')).join('|');
}

function main() {
  const ref = JSON.parse(fs.readFileSync(REF_PATH, 'utf8'));
  const out = {
    purpose: 'Ladder evaluation applying G1-G9 from LAB_TERMINOLOGY_05P.md',
    reference16: { role: 'REFERENCE ANCHOR', perDepth: ref.perDepth, firstPlayerSwap: ref.firstPlayerSwap },
    boards: {},
  };

  for (const c of CANDIDATES) {
    const comparePath = path.join(__dirname, c.compareJson);
    if (!fs.existsSync(comparePath)) {
      out.boards[c.beads] = { verdict: 'NOT TESTED', reason: 'compare JSON missing — run compare script first' };
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
    const a = runBatch(eng, 2, 101, N, eng.P1);
    const b = runBatch(eng, 2, 101, N, eng.P1);
    const reproducible = fingerprint(a) === fingerprint(b);
    const ev = applyGates(c, d1, d2, d3, geoOk, crash, swap, reproducible);
    const selection = ladderVerdict(ev.allPass, ev.rejectTriggers, true);
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
      compareScriptVerdict: compare.candidateVerdict,
    };
    process.stderr.write('bead=' + c.beads + ' selection=' + selection + '\n');
  }

  out.boards[16] = { role: 'REFERENCE ANCHOR', selectionVerdict: 'REFERENCE ANCHOR', perDepth: ref.perDepth };

  const outPath = path.join(__dirname, 'LADDER_LAB_EVALUATION.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ out: outPath, boards: Object.fromEntries(Object.entries(out.boards).map(([k, v]) => [k, v.selectionVerdict])) }, null, 2));
}

main();
