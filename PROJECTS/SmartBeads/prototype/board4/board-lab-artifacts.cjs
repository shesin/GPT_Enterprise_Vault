'use strict';
/**
 * Canonical board keys and Lab artifact names derived from playable filenames.
 * Pattern: SHOLO_GUTI_{N}_BEAD_{board}_WITH_FEATURE.html
 * Lab eval: {N}_BEAD_{board}_LAB_EVAL.json
 */
function boardKeyFromPlayable(playable) {
  return playable.replace(/^SHOLO_GUTI_/, '').replace(/_WITH_FEATURE\.html$/, '');
}

function labEvalPath(ROOT, playable) {
  const path = require('path');
  return path.join(ROOT, boardKeyFromPlayable(playable) + '_LAB_EVAL.json');
}

function labelFromBoardKey(key) {
  const m = key.match(/^(\d+)_BEAD_(.+)$/);
  if (!m) return key;
  const beads = m[1];
  const board = m[2].replace(/_/g, ' ').replace(/x/g, '×');
  return beads + '-bead ' + board;
}

/** Legacy round-code → playable (for one-time migration). */
const LEGACY_ID_TO_PLAYABLE = {
  D1: 'SHOLO_GUTI_9_BEAD_5x5_WITH_FEATURE.html',
  D2: 'SHOLO_GUTI_7_BEAD_5x5_WITH_FEATURE.html',
  D3: 'SHOLO_GUTI_5_BEAD_3x5_REAR_THIN_WITH_FEATURE.html',
  D4: 'SHOLO_GUTI_12_BEAD_6x5_WITH_FEATURE.html',
  D5: 'SHOLO_GUTI_4_BEAD_3x5_REAR_WITH_FEATURE.html',
  F1b: 'SHOLO_GUTI_5_BEAD_4x3_HOURGLASS_WITH_FEATURE.html',
  F2b: 'SHOLO_GUTI_7_BEAD_4x4_DENSE_WITH_FEATURE.html',
  F3b: 'SHOLO_GUTI_8_BEAD_5x4_WITH_FEATURE.html',
  F1a: 'SHOLO_GUTI_8_BEAD_4x6_HOURGLASS_WITH_FEATURE.html',
  F2a: 'SHOLO_GUTI_12_BEAD_5x7_WITH_FEATURE.html',
  F4b: 'SHOLO_GUTI_10_BEAD_4x6_HOURGLASS_WITH_FEATURE.html',
  F5b: 'SHOLO_GUTI_12_BEAD_4x7_HOURGLASS_WITH_FEATURE.html',
  C1: 'SHOLO_GUTI_5_BEAD_3x5_LR_WITH_FEATURE.html',
  C2: 'SHOLO_GUTI_5_BEAD_4x4_WITH_FEATURE.html',
  C3: 'SHOLO_GUTI_8_BEAD_5x5_WITH_FEATURE.html',
  C4: 'SHOLO_GUTI_12_BEAD_MINIWING_WITH_FEATURE.html',
};

function legacyKeyToBoardKey(legacyId) {
  const playable = LEGACY_ID_TO_PLAYABLE[legacyId];
  return playable ? boardKeyFromPlayable(playable) : legacyId;
}

module.exports = {
  boardKeyFromPlayable,
  labEvalPath,
  labelFromBoardKey,
  legacyKeyToBoardKey,
  LEGACY_ID_TO_PLAYABLE,
};
