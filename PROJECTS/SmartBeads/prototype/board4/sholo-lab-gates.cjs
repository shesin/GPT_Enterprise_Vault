'use strict';
/**
 * Shared G1-G9 gate logic and authoritative ladder verdict mapping.
 * G2 fairness failure is a hard REJECT (g2_fairness_fail). Other gate failures
 * without reject triggers map to NEEDS FURTHER TESTING.
 */
const protocol = require('./sholo-lab-protocol.cjs');

function checkFairness(d1, d2, swap, swapKeys) {
  const k1 = swapKeys ? swapKeys.first : 'whenFirstP1';
  const k2 = swapKeys ? swapKeys.second : 'whenFirstP2';
  const s1 = swap[k1];
  const s2 = swap[k2];
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

/** Authoritative board selection verdict — evaluate-ladder-lab.cjs only. */
function ladderVerdict(allPass, rejectTriggers, failedGates) {
  if (rejectTriggers.length) return 'REJECT';
  if (allPass) return 'NEEDS FURTHER TESTING';
  if (failedGates && failedGates.length) return 'NEEDS FURTHER TESTING';
  return 'NOT TESTED';
}

function applyGates(d1, d2, d3, geoOk, crash, swap, reproducible, protocolCheck, swapKeys) {
  const gates = [];
  function g(id, name, pass, detail) {
    gates.push({ id, name, pass: !!pass, detail });
  }

  g('G1', 'No breakage', geoOk && crash.ok, { geoOk, crash });
  g('G2', 'No meaningful side bias', checkFairness(d1, d2, swap, swapKeys), { swap });
  g('G3', 'Game alive', d2.avgCaptures >= 2 && d2.avgLength >= 5, { avgCaptures: d2.avgCaptures, avgLength: d2.avgLength });
  g('G4', 'Captures matter', !(d1.avgCaptures < 2 && d2.avgCaptures < 2), { d1Caps: d1.avgCaptures, d2Caps: d2.avgCaptures });
  g('G5', 'Elimination possible', d1.eliminationPct > 0 || d3.eliminationPct > 0, { d1Elim: d1.eliminationPct, d3Elim: d3.eliminationPct });
  // G6 "Draws legitimate" removed: LAB_TERMINOLOGY_05P.md and WEB_REPORT_16_BEAD_05P.md
  // require reporting moveCapDrawPct / repetitionDrawPct without failing the board
  // (16-bead D2 move-cap ~98.9% is the expected reference profile). No project-supported
  // fail threshold exists; a hardcoded-true gate cannot fail, so the gate is gone.
  g('G7', 'Reasonable length', d2.avgLength >= 5, { d2Length: d2.avgLength });
  g('G8', 'Depth/seed stability', reproducible && d3.avgCaptures >= d2.avgCaptures - 1, { reproducible, d2Caps: d2.avgCaptures, d3Caps: d3.avgCaptures });
  const g9 = protocolCheck || { ok: false, reason: 'no protocol metadata' };
  g('G9', 'Same protocol', g9.ok, g9);

  const failed = gates.filter((x) => !x.pass);
  const rejectTriggers = checkRejectTriggers(d1, d2, geoOk, crash);
  const g2 = gates.find((x) => x.id === 'G2');
  if (g2 && !g2.pass) rejectTriggers.push('g2_fairness_fail');
  return {
    gates,
    failed: failed.map((x) => x.id),
    rejectTriggers,
    allPass: failed.length === 0 && rejectTriggers.length === 0,
  };
}

module.exports = {
  checkFairness,
  checkRejectTriggers,
  ladderVerdict,
  applyGates,
  CANONICAL_PROTOCOL: protocol.protocolMeta(),
};
