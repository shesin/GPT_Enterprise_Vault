'use strict';
/**
 * Lab aggregation + comparison guards for Sholo full-turn instrument.
 *
 * TERM GLOSSARY (plain language — use these with humans):
 * - elimination: one side captured all of the opponent's beads (a real win).
 * - stalemate: side to move has no legal move (opponent wins).
 * - move-cap: Lab safety stop after N turns so a batch cannot run forever.
 *   Not a traditional Sholo rule. High move-cap % means games stayed contested
 *   until the harness stopped them — OK for measurement, not a "bad game" label.
 * - repetition: same position occurred 3 times → draw.
 * - withWinner / gamesWithWinner: games that ended with a P1 or P2 win
 *   (elimination or stalemate). Do NOT call this "decisive" — that word is banned
 *   as a synonym for elimination.
 * - elimOrStalematePct: % of games ending by elimination OR stalemate.
 *   Legacy alias: forcedWinPct (same number; prefer elimOrStalematePct in new text).
 */

const PRIMARY_DEPTH = 2;
const SECONDARY_DEPTH = 3;

const TERM_GLOSSARY = {
  elimination: 'One player captured all opposing beads → win.',
  stalemate: 'Player to move has no legal move → opponent wins.',
  moveCap:
    'Lab-only turn limit (e.g. 120). Stops endless games for batch testing. Not a traditional rule.',
  repetition: 'Same board+side-to-move appeared 3 times → draw.',
  withWinner: 'Game ended with a winner (elimination or stalemate). Not called "decisive".',
  elimOrStalematePct: 'Share of games ending by elimination or stalemate (legacy name: forcedWinPct).',
};

function summarizeGames(games) {
  let elim = 0;
  let stalemate = 0;
  let moveCap = 0;
  let rep = 0;
  let p1Wins = 0;
  let p2Wins = 0;
  let draws = 0;
  let firstWins = 0;
  let withWinner = 0;
  let lenSum = 0;
  let capSum = 0;
  let p1CapSum = 0;
  let p2CapSum = 0;
  for (const g of games) {
    if (g.endReason === 'elimination') elim++;
    else if (g.endReason === 'stalemate') stalemate++;
    else if (g.endReason === 'move_cap_lab_safety') moveCap++;
    else if (g.endReason === 'repetition') rep++;
    else throw new Error('unknown endReason: ' + g.endReason);
    if (g.winner === 'P1') p1Wins++;
    else if (g.winner === 'P2') p2Wins++;
    else if (g.winner === 'draw') draws++;
    else throw new Error('unknown winner: ' + g.winner);
    if (g.winner !== 'draw') {
      withWinner++;
      if (g.firstPlayerWon) firstWins++;
    }
    lenSum += g.gameLength;
    capSum += g.totalCaptures;
    p1CapSum += g.p1Captures || 0;
    p2CapSum += g.p2Captures || 0;
  }
  const n = games.length;
  if (!n) throw new Error('summarizeGames: empty');
  const repetitionDrawPct = (100 * rep) / n;
  const moveCapDrawPct = (100 * moveCap) / n;
  const elimOrStalematePct = (100 * (elim + stalemate)) / n;
  return {
    n,
    eliminationPct: (100 * elim) / n,
    stalematePct: (100 * stalemate) / n,
    /** Preferred name. Legacy alias forcedWinPct kept for older scripts. */
    elimOrStalematePct,
    forcedWinPct: elimOrStalematePct,
    repetitionDrawPct,
    moveCapDrawPct,
    drawPct: (100 * draws) / n,
    p1WinPct: (100 * p1Wins) / n,
    p2WinPct: (100 * p2Wins) / n,
    firstPlayerWinPctAmongWins: withWinner ? (100 * firstWins) / withWinner : null,
    /** @deprecated name — use firstPlayerWinPctAmongWins */
    firstPlayerWinPctAmongDecisive: withWinner ? (100 * firstWins) / withWinner : null,
    firstPlayerAdvantagePp: withWinner ? (100 * firstWins) / withWinner - 50 : null,
    avgLength: lenSum / n,
    avgCaptures: capSum / n,
    avgP1Captures: p1CapSum / n,
    avgP2Captures: p2CapSum / n,
    counts: {
      elim,
      stalemate,
      moveCap,
      rep,
      p1Wins,
      p2Wins,
      draws,
      withWinner,
      /** @deprecated — same as withWinner; do not say "decisive" in reports */
      decisive: withWinner,
    },
  };
}

function allowedCompareMetrics(depth) {
  if (depth === PRIMARY_DEPTH || depth === 1) {
    return [
      'eliminationPct',
      'elimOrStalematePct',
      'forcedWinPct',
      'repetitionDrawPct',
      'moveCapDrawPct',
      'drawPct',
      'p1WinPct',
      'p2WinPct',
      'firstPlayerAdvantagePp',
      'avgLength',
      'avgCaptures',
    ];
  }
  if (depth === SECONDARY_DEPTH) {
    return ['avgCaptures', 'avgLength', 'moveCapDrawPct', 'repetitionDrawPct', 'drawPct'];
  }
  return [];
}

function assertSafeCompare(depth, metricKeys) {
  const allowed = new Set(allowedCompareMetrics(depth));
  if (!allowed.size) {
    throw new Error('No compare protocol for depth ' + depth);
  }
  const bad = metricKeys.filter((k) => !allowed.has(k));
  if (bad.length) {
    throw new Error(
      'Unsafe/misleading compare at depth ' + depth + ' for metrics: ' + bad.join(', ') +
        '. Allowed: ' + [...allowed].join(', ')
    );
  }
  return true;
}

function diffSummaries(depth, a, b, metricKeys) {
  assertSafeCompare(depth, metricKeys);
  const out = {};
  for (const k of metricKeys) {
    if (a[k] == null || b[k] == null) out[k] = null;
    else out[k] = b[k] - a[k];
  }
  return out;
}

const COMPARISON_PROTOCOL = {
  primaryDepth: PRIMARY_DEPTH,
  secondaryDepth: SECONDARY_DEPTH,
  primaryUse:
    'Contested play under honest 1-reply search: elimination%, captures, length, ' +
    'legitimate draws (split repetition vs move-cap), W/L and F/SP when gamesWithWinner > 0',
  secondaryUse: 'Longer-horizon attrition (2-reply) — never rank by D3 elimination% alone',
  drawsAreLegitimate: true,
  moveCapIsLabSafetyNotTraditionalRule: true,
  terminologyNote:
    'Say elimination — not "decisive". move-cap is Lab harness safety only.',
  honestDepthNote:
    'D1=greedy, D2=1 opponent full-turn reply, D3=2 opponent full-turn replies.',
  termGlossary: TERM_GLOSSARY,
};

module.exports = {
  PRIMARY_DEPTH,
  SECONDARY_DEPTH,
  TERM_GLOSSARY,
  COMPARISON_PROTOCOL,
  summarizeGames,
  allowedCompareMetrics,
  assertSafeCompare,
  diffSummaries,
};
