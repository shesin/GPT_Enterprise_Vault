'use strict';
/**
 * Smoke + engine parity for active discovery NFT playables (Web REJECT boards removed).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { boardKeyFromPlayable, labelFromBoardKey } = require('./board-lab-artifacts.cjs');

const ROOT = __dirname;

function assert(ok, msg) {
  if (!ok) throw new Error(msg);
}

function el(id, extra) {
  return Object.assign({
    id,
    style: {},
    value: '',
    disabled: false,
    textContent: '',
    dataset: {},
    classList: { _c: new Set(), toggle(n, on) { if (on === false) this._c.delete(n); else this._c.add(n); }, add(n) { this._c.add(n); }, remove(n) { this._c.delete(n); } },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
    getContext: () => ({
      clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
      stroke() {}, fill() {}, arc() {}, save() {}, restore() {}, closePath() {},
      createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
    }),
    width: 560,
    height: 560,
  }, extra || {});
}

function loadApi(file, apiName) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  assert(/option value="off"/.test(html) && /option value="cumulative"/.test(html) && /option value="endgame"/.test(html), file + ': centre rule missing');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert(scriptMatch, file + ': script missing');
  const elements = {
    'game-mode-select': el('game-mode-select', { value: 'pve' }),
    'ai-level-select': el('ai-level-select', { value: '2' }),
    'center-rule-select': el('center-rule-select', { value: 'off' }),
    'match-timer-select': el('match-timer-select', { value: 'off' }),
    'shot-clock-select': el('shot-clock-select', { value: 'off' }),
    'max-move-select': el('max-move-select', { value: '0' }),
    'move-highlight-select': el('move-highlight-select', { value: 'on', dataset: {} }),
    board: el('board'),
    status: el('status'),
    'finish-btn': el('finish-btn'),
    'undo-btn': el('undo-btn'),
    'restart-btn': el('restart-btn'),
    'play-again-btn': el('play-again-btn'),
    'result-modal': el('result-modal'),
    'result-title': el('result-title'),
    'result-desc': el('result-desc'),
    'p1-role': el('p1-role'),
    'p2-role': el('p2-role'),
    'p1-pieces': el('p1-pieces'),
    'p2-pieces': el('p2-pieces'),
    'p1-caps': el('p1-caps'),
    'p2-caps': el('p2-caps'),
    'turn-count': el('turn-count'),
    'starts-label': el('starts-label'),
    'shot-clock-val': el('shot-clock-val'),
    'match-clock-val': el('match-clock-val'),
    'p1-clock': el('p1-clock'),
    'p2-clock': el('p2-clock'),
    'pill-p1': el('pill-p1'),
    'pill-p2': el('pill-p2'),
    'p1-center': el('p1-center'),
    'p2-center': el('p2-center'),
    'ai-level-container': el('ai-level-container', { style: {} }),
    'bgm-audio': el('bgm-audio'),
    'bgm-select': el('bgm-select'),
    'bgm-vol': el('bgm-vol', { value: '0.3' }),
    'bgm-play': el('bgm-play'),
    'bgm-pause': el('bgm-pause'),
  };
  const sandbox = {
    console, Math, performance: { now: () => Date.now() },
    requestAnimationFrame() { return 0; },
    cancelAnimationFrame() {},
    setTimeout(fn) { fn(); return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    clearInterval() {},
    window: {},
    document: { getElementById: (id) => elements[id] || el(id), addEventListener() {} },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(scriptMatch[1], sandbox, { filename: file });
  const api = sandbox.window[apiName];
  assert(api, file + ': API missing');
  return { api };
}

function parityCheck(api, eng, label) {
  assert(api.N === eng.N, label + ' N mismatch');
  const ps = api.getBoard();
  const es = eng.startingBoard();
  assert(ps.join('') === es.join(''), label + ' start mismatch');
  assert(api.getAllLegalMoves(ps, api.P1).length === eng.getAllLegalMoves(es, eng.P1).length, label + ' opening legal mismatch');
}

function reportBoard(spec) {
  const eng = require(path.join(ROOT, spec.engine));
  const { api } = loadApi(spec.file, spec.api);
  assert(api.N === spec.n, spec.file + ' N expected ' + spec.n);
  const start = api.getBoard();
  const p1 = start.filter((x) => x === api.P1).length;
  const p2 = start.filter((x) => x === api.P2).length;
  assert(p1 === spec.beads && p2 === spec.beads, spec.file + ' bead count');
  parityCheck(api, eng, spec.boardKey);
  const caps = api.getAllLegalMoves(start, api.P1).filter((m) => m.captured != null);
  assert(caps.length === 0, spec.file + ' opening captures');
  api.setOptions({ mode: 'pve', aiLevel: 2, centerRule: 'cumulative' });
  const pathMoves = api.playAITurnSync(2);
  assert(pathMoves && pathMoves.length >= 1, spec.file + ' AI failed');
  spec.extra && spec.extra(api, start);
  return {
    id: spec.boardKey,
    boardKey: spec.boardKey,
    label: spec.label,
    file: spec.file,
    engine: spec.engine,
    n: api.N,
    start: { p1, p2 },
    openingCaptures: caps.length,
    aiPathLen: pathMoves.length,
    engineParity: true,
    ok: true,
  };
}

const boards = [
  { file: 'SHOLO_GUTI_8_BEAD_5x5_WITH_FEATURE.html', engine: 'sholo-c3-8-5x5-fullturn-engine.cjs', api: '__SHOLO_GUTI_C3_8_5x5_FEATURE__', n: 25, beads: 8 },
  { file: 'SHOLO_GUTI_7_BEAD_4x4_DENSE_WITH_FEATURE.html', engine: 'sholo-f2b-7-4x4-fullturn-engine.cjs', api: '__SHOLO_GUTI_F2b_7_4x4_FEATURE__', n: 16, beads: 7 },
  { file: 'SHOLO_GUTI_8_BEAD_4x6_HOURGLASS_WITH_FEATURE.html', engine: 'sholo-f1a-8-4x6-fullturn-engine.cjs', api: '__SHOLO_GUTI_F1a_8_4x6_FEATURE__', n: 24, beads: 8 },
  { file: 'SHOLO_GUTI_12_BEAD_5x7_WITH_FEATURE.html', engine: 'sholo-f2a-12-5x7-fullturn-engine.cjs', api: '__SHOLO_GUTI_F2a_12_5x7_FEATURE__', n: 35, beads: 12 },
  { file: 'SHOLO_GUTI_7_BEAD_5x5_WITH_FEATURE.html', engine: 'sholo-d2-7-5x5-fullturn-engine.cjs', api: '__SHOLO_GUTI_D2_7_5x5_FEATURE__', n: 25, beads: 7 },
  { file: 'SHOLO_GUTI_12_BEAD_6x5_WITH_FEATURE.html', engine: 'sholo-d4-12-6x5-fullturn-engine.cjs', api: '__SHOLO_GUTI_D4_12_6x5_FEATURE__', n: 30, beads: 12 },
  { file: 'SHOLO_GUTI_4_BEAD_3x5_REAR_WITH_FEATURE.html', engine: 'sholo-d5-4-3x5-fullturn-engine.cjs', api: '__SHOLO_GUTI_D5_4_3x5_FEATURE__', n: 15, beads: 4 },
].map((spec) => ({
  ...spec,
  boardKey: boardKeyFromPlayable(spec.file),
  label: labelFromBoardKey(boardKeyFromPlayable(spec.file)),
}));

function main() {
  const results = boards.map((spec) => reportBoard(spec));
  const out = {
    purpose: 'Active discovery NFT playables — Web REJECT boards removed',
    evaluatedAt: new Date().toISOString(),
    boards: results,
    allOk: results.every((r) => r.ok),
  };
  fs.writeFileSync(path.join(ROOT, 'SHOLO_DISCOVERY_NFT_FEATURE_SMOKE.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  if (!out.allOk) process.exit(1);
}

main();
