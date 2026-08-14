'use strict';
/**
 * Cursor Index 4×4 family protocol (separate instrument from Sholo ladder).
 * Verdict evaluator: evaluate-cursor-index-lab.cjs only.
 */
const DEPTHS = [1, 2, 3];
const SEEDS = [101, 202, 303];
const N_PER_SEED = 50;
const MOVE_CAP = 40;
const SWAP_N = 20;
const SWAP_SEEDS = [7000, 8000, 9000];
const CENTER_RULE = 'off';

function protocolMeta(extra) {
  return {
    depths: DEPTHS,
    seeds: SEEDS,
    nPerSeed: N_PER_SEED,
    moveCap: MOVE_CAP,
    centerRule: CENTER_RULE,
    ...(extra || {}),
  };
}

function matchesCanonical(meta) {
  if (!meta || typeof meta !== 'object') return { ok: false, reason: 'missing protocol object' };
  const issues = [];
  if (meta.nPerSeed !== N_PER_SEED) issues.push('nPerSeed=' + meta.nPerSeed + ' expected ' + N_PER_SEED);
  if (meta.moveCap !== MOVE_CAP) issues.push('moveCap=' + meta.moveCap + ' expected ' + MOVE_CAP);
  if (meta.centerRule !== CENTER_RULE) issues.push('centerRule=' + meta.centerRule);
  return { ok: issues.length === 0, issues, expected: protocolMeta(), received: meta };
}

module.exports = {
  DEPTHS,
  SEEDS,
  N_PER_SEED,
  MOVE_CAP,
  SWAP_N,
  SWAP_SEEDS,
  CENTER_RULE,
  protocolMeta,
  matchesCanonical,
};
