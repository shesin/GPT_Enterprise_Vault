'use strict';
/** One-time: rename Lab JSON artifacts from round codes (D1, F2b, …) to bead+board keys. */
const fs = require('fs');
const path = require('path');
const { boardKeyFromPlayable, legacyKeyToBoardKey, LEGACY_ID_TO_PLAYABLE, labelFromBoardKey } = require('./board-lab-artifacts.cjs');

const ROOT = __dirname;

const RENAMES = [
  ['D1_LAB_EVAL.json', '9_BEAD_5x5_LAB_EVAL.json'],
  ['D2_LAB_EVAL.json', '7_BEAD_5x5_LAB_EVAL.json'],
  ['D3_LAB_EVAL.json', '5_BEAD_3x5_REAR_THIN_LAB_EVAL.json'],
  ['D4_LAB_EVAL.json', '12_BEAD_6x5_LAB_EVAL.json'],
  ['D5_LAB_EVAL.json', '4_BEAD_3x5_REAR_LAB_EVAL.json'],
  ['F1b_LAB_EVAL.json', '5_BEAD_4x3_HOURGLASS_LAB_EVAL.json'],
  ['F2b_LAB_EVAL.json', '7_BEAD_4x4_DENSE_LAB_EVAL.json'],
  ['F3b_LAB_EVAL.json', '8_BEAD_5x4_LAB_EVAL.json'],
  ['F1a_LAB_EVAL.json', '8_BEAD_4x6_HOURGLASS_LAB_EVAL.json'],
  ['F2a_LAB_EVAL.json', '12_BEAD_5x7_LAB_EVAL.json'],
  ['F4b_LAB_EVAL.json', '10_BEAD_4x6_HOURGLASS_LAB_EVAL.json'],
  ['F5b_LAB_EVAL.json', '12_BEAD_4x7_HOURGLASS_LAB_EVAL.json'],
  ['C1_LAB_EVAL.json', '5_BEAD_3x5_LR_LAB_EVAL.json'],
  ['C2_LAB_EVAL.json', '5_BEAD_4x4_LAB_EVAL.json'],
  ['C3_LAB_EVAL.json', '8_BEAD_5x5_LAB_EVAL.json'],
  ['C4_LAB_EVAL.json', '12_BEAD_MINIWING_LAB_EVAL.json'],
  ['D1_D5_LAB_EVALUATION.json', 'LAB_EVALUATION_9_7_5_12_4_BEAD_SET.json'],
  ['FINAL_ROUND_LAB_EVALUATION.json', 'LAB_EVALUATION_5_7_8_10_12_BEAD_COMPACT_SET.json'],
  ['SHOLO_D1_D5_FEATURE_SMOKE.json', 'SHOLO_9_7_5_12_4_BEAD_FEATURE_SMOKE.json'],
  ['SHOLO_FINAL_ROUND_FEATURE_SMOKE.json', 'SHOLO_5_7_8_10_12_BEAD_COMPACT_FEATURE_SMOKE.json'],
  ['C1_C4_LAB_EVALUATION.json', 'LAB_EVALUATION_5_5_8_12_BEAD_DISCOVERY_SET.json'],
  ['SHOLO_C1_C4_FEATURE_SMOKE.json', 'SHOLO_5_5_8_12_BEAD_DISCOVERY_FEATURE_SMOKE.json'],
  ['C3_LAB_COMPLETE.json', '8_BEAD_5x5_LAB_COMPLETE.json'],
  ['C3_LAB_CONFIRMATION.json', '8_BEAD_5x5_LAB_CONFIRMATION.json'],
];

const DROPPED_KEY_MAP = {
  C5: '4_BEAD_3x4_LR',
  F3a: '6_BEAD_5x5',
  F5a: '5_BEAD_5x5',
  F4a: '10_BEAD_6x5',
};

function remapSingleBoard(data) {
  if (data && data.id && LEGACY_ID_TO_PLAYABLE[data.id]) {
    const boardKey = legacyKeyToBoardKey(data.id);
    return {
      ...data,
      boardKey,
      id: boardKey,
      label: data.label || labelFromBoardKey(boardKey),
    };
  }
  return data;
}

function remapBoardKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(remapBoardKeys);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const nk = LEGACY_ID_TO_PLAYABLE[k] ? legacyKeyToBoardKey(k) : k;
    let nv = v;
    if (v && typeof v === 'object') {
      nv = remapBoardKeys(v);
      if (nv && nv.id && LEGACY_ID_TO_PLAYABLE[nv.id]) {
        nv = { ...nv, boardKey: legacyKeyToBoardKey(nv.id), id: legacyKeyToBoardKey(nv.id) };
        delete nv.legacyId;
      }
    }
    out[nk] = nv;
  }
  return out;
}

function remapRanking(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((row) => {
    if (!row || !row.id) return row;
    if (LEGACY_ID_TO_PLAYABLE[row.id]) {
      const boardKey = legacyKeyToBoardKey(row.id);
      return { ...row, boardKey, id: boardKey, label: row.label || undefined };
    }
    return row;
  });
}

for (const [from, to] of RENAMES) {
  const src = path.join(ROOT, from);
  const dst = path.join(ROOT, to);
  if (!fs.existsSync(src)) {
    console.warn('skip missing', from);
    continue;
  }
  if (from.endsWith('.json') && from !== to) {
    let data = JSON.parse(fs.readFileSync(src, 'utf8'));
    if (data.boards) data.boards = remapBoardKeys(data.boards);
    if (data.ranking) data.ranking = remapRanking(data.ranking);
    if (data.humanKeep) data.humanKeep = remapRanking(data.humanKeep);
    if (data.discoveryNeedsFurtherTesting) data.discoveryNeedsFurtherTesting = remapRanking(data.discoveryNeedsFurtherTesting);
    if (data.excludedFromRanking) {
      const ex = data.excludedFromRanking;
      if (ex.rejected) ex.rejected = ex.rejected.map((x) => (LEGACY_ID_TO_PLAYABLE[x] ? legacyKeyToBoardKey(x) : x));
      if (ex.notBuiltNotLab) {
        ex.notBuiltNotLab = ex.notBuiltNotLab.map((x) => DROPPED_KEY_MAP[x] || x);
      }
    }
    if (data.dropped && typeof data.dropped === 'object' && !Array.isArray(data.dropped)) {
      const dropped = {};
      for (const [k, v] of Object.entries(data.dropped)) {
        dropped[DROPPED_KEY_MAP[k] || (LEGACY_ID_TO_PLAYABLE[k] ? legacyKeyToBoardKey(k) : k)] = v;
      }
      data.dropped = dropped;
    }
    data = remapSingleBoard(data);
    if (data.boards && Array.isArray(data.boards)) {
      data.boards = data.boards.map((b) => {
        if (b.id && LEGACY_ID_TO_PLAYABLE[b.id]) {
          const boardKey = legacyKeyToBoardKey(b.id);
          return { ...b, boardKey, id: boardKey };
        }
        return b;
      });
    }
    fs.writeFileSync(dst, JSON.stringify(data, null, 2));
    if (src !== dst) fs.unlinkSync(src);
    console.log('migrated', from, '→', to);
  }
}

console.log('Done migrate-board-lab-names');
