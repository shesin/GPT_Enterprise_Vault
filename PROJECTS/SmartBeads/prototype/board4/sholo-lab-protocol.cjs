'use strict';
/**
 * Canonical Sholo ladder Lab protocol (16-bead reference anchor).
 * Single source for N, seeds, depths, move-cap used by reference, compare, and evaluator.
 */
const metrics = require('./sholo-lab-metrics.cjs');

const DEPTHS = [1, 2, 3];
const SEEDS = [101, 202, 303];
/** Approved reference batch size — LAB_REPORT_16_BEAD_05P.md */
const N_PER_SEED = 30;
const MOVE_CAP = 120;
const SWAP_N = 20;
const SWAP_SEEDS = [7000, 8000, 9000];
const FIRST_PLAYER_BASELINE = 'P1';

/** Plain-language certification: browser playable AI ≠ headless Lab AI at same level label. */
const PLAYABLE_VS_LAB_DEPTH = {
  note:
    'Rules/geometry parity only. Lab D1/D2/D3 batch AI is NOT the same as browser Level 1/2/3 human-vs-AI.',
  playable: {
    source: 'SHOLO_GUTI.html',
    role: 'Human P1 vs AI P2 only',
    levels: {
      1: 'Greedy max-captures among complete turns; Math.random tie-break; no opponent reply search',
      2: 'Static eval after own complete turn only (0 opponent reply plies); not Lab D2',
      3: 'One opponent complete-turn reply (minimax); P2-centric evaluate',
    },
    repetition: 'none in interactive play',
    moveCap: 'none in interactive play',
    seeding: 'unseeded Math.random tie-breaks',
  },
  lab: {
    source: 'sholo-guti-fullturn-engine.cjs',
    role: 'Symmetric AI-vs-AI headless batch',
    depths: {
      1: 'Greedy complete turn + light scoreForPlayer; 0 opponent reply plies; seeded tie-break',
      2: '1 opponent complete-turn reply (honest D2 primary depth)',
      3: '2 opponent complete-turn replies',
    },
    repetition: '3-fold draw (position after mover)',
    moveCap: MOVE_CAP + ' turns (move_cap_lab_safety)',
    seeding: 'setAiTestSeed per game',
    evalNoise: false,
  },
  reportingRule:
    'Never imply Lab D2 metrics describe browser Level 2 human-vs-AI strength or game length.',
};

function gamesPerBoard() {
  return DEPTHS.length * SEEDS.length * N_PER_SEED;
}

/** One compare run batches candidate + 16-bead reference. */
function gamesPerCompareRun() {
  return gamesPerBoard() * 2;
}

function protocolMeta(extra) {
  return {
    depths: DEPTHS,
    seeds: SEEDS,
    nPerSeed: N_PER_SEED,
    nPerSeedPerDepth: N_PER_SEED,
    moveCap: MOVE_CAP,
    firstPlayerBaseline: FIRST_PLAYER_BASELINE,
    gamesPerBoard: gamesPerBoard(),
    comparisonProtocol: metrics.COMPARISON_PROTOCOL,
    ...(extra || {}),
  };
}

function seedsMatch(a, b) {
  return Array.isArray(a) && Array.isArray(b) &&
    a.length === b.length && a.every((v, i) => v === b[i]);
}

function depthsMatch(a, b) {
  return seedsMatch(a, b);
}

/** G9: verify compare/reference batch metadata matches canonical protocol. */
function matchesCanonical(meta) {
  if (!meta || typeof meta !== 'object') return { ok: false, reason: 'missing protocol object' };
  const n = meta.nPerSeed != null ? meta.nPerSeed : meta.nPerSeedPerDepth;
  const issues = [];
  if (n !== N_PER_SEED) issues.push('nPerSeed=' + n + ' expected ' + N_PER_SEED);
  if (meta.moveCap !== MOVE_CAP) issues.push('moveCap=' + meta.moveCap + ' expected ' + MOVE_CAP);
  if (!seedsMatch(meta.seeds, SEEDS)) issues.push('seeds mismatch');
  if (!depthsMatch(meta.depths, DEPTHS)) issues.push('depths mismatch');
  return { ok: issues.length === 0, issues, expected: protocolMeta(), received: meta };
}

module.exports = {
  DEPTHS,
  SEEDS,
  N_PER_SEED,
  MOVE_CAP,
  SWAP_N,
  SWAP_SEEDS,
  FIRST_PLAYER_BASELINE,
  PLAYABLE_VS_LAB_DEPTH,
  gamesPerBoard,
  gamesPerCompareRun,
  protocolMeta,
  matchesCanonical,
};
