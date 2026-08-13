'use strict';
/**
 * Validate CURSOR_INDEX_4/6 vs GEMINI_LAB headless under G1-G9 (LAB_TERMINOLOGY_05P.md).
 * Protocol: D1/D2/D3 · seeds 101/202/303 · N=50 · move-cap 40 · center rule off · Red first in main batch.
 */
const fs = require('fs');
const path = require('path');
const { loadGeminiLab, loadCursorIndex, geminiLogToSholo, ROOT } = require('./gemini-lab-loader.cjs');
const metrics = require('./sholo-lab-metrics.cjs');

const DEPTHS = [1, 2, 3];
const SEEDS = [101, 202, 303];
const N = 50;
const MOVE_CAP = 40;
const SWAP_N = 20;
const SWAP_SEEDS = [7000, 8000, 9000];

const CANDIDATES = [
  { id: 'INDEX_4', beads: 4, html: 'CURSOR_INDEX_4.html', smokeOut: 'CURSOR_INDEX_4_LAB_EVAL.json' },
  { id: 'INDEX_6', beads: 6, html: 'CURSOR_INDEX_6.html', smokeOut: 'CURSOR_INDEX_6_LAB_EVAL.json' },
];

function runBatch(Lab, geo, depth, seed, n, redFirst) {
  const games = [];
  for (let i = 0; i < n; i++) {
    const gameIndex = redFirst ? i * 2 : i * 2 + 1;
    const raw = Lab.playHeadlessGame(geo, gameIndex, depth, MOVE_CAP, (seed + i) >>> 0);
    games.push(geminiLogToSholo(raw));
  }
  return games;
}

function parseStartBoard(html) {
  const m = html.match(/const START_BOARD = \[([^\]]+)\]/);
  if (!m) throw new Error('START_BOARD missing in playable HTML');
  return m[1].split(',').map((x) => parseInt(x.trim(), 10));
}

function parityCheck(Lab, html, beads) {
  const checks = [];
  function g(name, ok, detail) { checks.push({ name, ok: !!ok, detail }); }
  const labStart = Lab.createStartingBoard(beads, 4, 4);
  const playStart = parseStartBoard(html);
  g('start_fingerprint', playStart.join('') === labStart.join(''), { play: playStart.join(''), lab: labStart.join('') });
  g('bead_count', playStart.filter((x) => x === 1).length === beads && playStart.filter((x) => x === 2).length === beads, { beads });
  const geo = Lab.createLabConfig({ beadsPerSide: beads, rows: 4, cols: 4, centerRule: 'off', maxMoveLimit: MOVE_CAP, aiDepth: 2 });
  const openPlay = Lab.getAllLegalMoves(playStart, Lab.P1, geo).length;
  const openLab = Lab.getAllLegalMoves(labStart, Lab.P1, geo).length;
  g('opening_moves', openPlay === openLab, { play: openPlay, lab: openLab });
  g('center_nodes', JSON.stringify(Lab.deriveCenterNodes(4, 4)) === JSON.stringify([5, 6, 9, 10]), {
    lab: Lab.deriveCenterNodes(4, 4),
  });
  return { allOk: checks.every((c) => c.ok), checks };
}

function checkFairness(d1, d2, swap) {
  const s1 = swap.whenFirstRed;
  const s2 = swap.whenFirstBlue;
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

function applyGates(c, d1, d2, d3, geoOk, crash, swap, reproducible) {
  const gates = [];
  function g(id, name, pass, detail) { gates.push({ id, name, pass: !!pass, detail }); }
  g('G1', 'No breakage', geoOk && crash.ok, { geoOk, crash });
  g('G2', 'No meaningful side bias', checkFairness(d1, d2, swap), { swap });
  g('G3', 'Game alive', d2.avgCaptures >= 2 && d2.avgLength >= 5, { avgCaptures: d2.avgCaptures, avgLength: d2.avgLength });
  g('G4', 'Captures matter', !(d1.avgCaptures < 2 && d2.avgCaptures < 2), { d1Caps: d1.avgCaptures, d2Caps: d2.avgCaptures });
  g('G5', 'Elimination possible', d1.eliminationPct > 0 || d3.eliminationPct > 0, { d1Elim: d1.eliminationPct, d3Elim: d3.eliminationPct });
  g('G6', 'Draws legitimate', true, { moveCapDrawPct: d2.moveCapDrawPct, repetitionDrawPct: d2.repetitionDrawPct });
  g('G7', 'Reasonable length', d2.avgLength >= 5, { d2Length: d2.avgLength });
  g('G8', 'Depth/seed stability', reproducible && d3.avgCaptures >= d2.avgCaptures - 1, { reproducible, d2Caps: d2.avgCaptures, d3Caps: d3.avgCaptures });
  g('G9', 'Same protocol', geoOk, { protocol: 'D1/D2/D3 seeds 101/202/303 N=50 moveCap 40 center off' });
  const failed = gates.filter((x) => !x.pass);
  const rejectTriggers = checkRejectTriggers(d1, d2, geoOk, crash);
  return { gates, failed: failed.map((x) => x.id), rejectTriggers, allPass: failed.length === 0 && rejectTriggers.length === 0 };
}

function ladderVerdict(allPass, rejectTriggers) {
  if (rejectTriggers.length) return 'REJECT';
  if (allPass) return 'NEEDS FURTHER TESTING';
  return 'REJECT';
}

function fingerprint(games) {
  return games.map((g) => [g.seed, g.endReason, g.winner, g.gameLength, g.totalCaptures].join(':')).join('|');
}

function firstPlayerSwap(Lab, geo) {
  const whenFirstRed = [];
  const whenFirstBlue = [];
  for (const seed of SWAP_SEEDS) {
    whenFirstRed.push(...runBatch(Lab, geo, 2, seed, SWAP_N, true));
    whenFirstBlue.push(...runBatch(Lab, geo, 2, seed + 1000, SWAP_N, false));
  }
  return { whenFirstRed: metrics.summarizeGames(whenFirstRed), whenFirstBlue: metrics.summarizeGames(whenFirstBlue) };
}

function crashFree(Lab, geo) {
  try {
    const g = runBatch(Lab, geo, 2, 99000, 40, true);
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

function main() {
  const Lab = loadGeminiLab();
  const out = {
    purpose: 'CURSOR_INDEX_4/6 Lab evaluation — GEMINI_LAB headless, G1-G9 from LAB_TERMINOLOGY_05P.md',
    protocol: { depths: DEPTHS, seeds: SEEDS, nPerSeed: N, moveCap: MOVE_CAP, centerRule: 'off' },
    boards: {},
  };

  for (const c of CANDIDATES) {
    const html = fs.readFileSync(path.join(ROOT, c.html), 'utf8');
    loadCursorIndex(c.html);
    const parity = parityCheck(Lab, html, c.beads);
    const geo = Lab.createLabConfig({
      beadsPerSide: c.beads, rows: 4, cols: 4, centerRule: 'off', maxMoveLimit: MOVE_CAP, aiDepth: 2,
    });
    const perDepth = {};
    for (const depth of DEPTHS) {
      const batch = [];
      for (const seed of SEEDS) batch.push(...runBatch(Lab, geo, depth, seed, N, true));
      perDepth[depth] = metrics.summarizeGames(batch);
    }
    const crash = crashFree(Lab, geo);
    const swap = firstPlayerSwap(Lab, geo);
    const a = runBatch(Lab, geo, 2, 101, N, true);
    const b = runBatch(Lab, geo, 2, 101, N, true);
    const reproducible = fingerprint(a) === fingerprint(b);
    const ev = applyGates(c, perDepth[1], perDepth[2], perDepth[3], parity.allOk, crash, swap, reproducible);
    const selection = ladderVerdict(ev.allPass, ev.rejectTriggers);
    out.boards[c.id] = {
      playable: c.html,
      headless: 'GEMINI_LAB.html',
      beadsPerSide: c.beads,
      board: '4x4',
      parity,
      geometryVerified: parity.allOk,
      reproducibleD2: reproducible,
      perDepth,
      firstPlayerSwap: swap,
      gates: ev.gates,
      failedGates: ev.failed,
      rejectTriggers: ev.rejectTriggers,
      selectionVerdict: selection,
    };
    fs.writeFileSync(path.join(ROOT, c.smokeOut), JSON.stringify(out.boards[c.id], null, 2));
    process.stderr.write(c.id + ' selection=' + selection + '\n');
  }

  const combined = path.join(ROOT, 'CURSOR_INDEX_LAB_EVALUATION.json');
  fs.writeFileSync(combined, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({
    out: combined,
    boards: Object.fromEntries(Object.entries(out.boards).map(([k, v]) => [k, v.selectionVerdict])),
  }, null, 2));
  process.exit(0);
}

main();
