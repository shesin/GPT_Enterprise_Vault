'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILE = path.join(__dirname, 'SHOLO_GUTI_8_BEAD_WITH_FEATURE.html');

function assert(ok, msg) {
  if (!ok) throw new Error(msg);
}
function el(id, extra) {
  return Object.assign({
    id, style: {}, value: '', disabled: false, textContent: '', dataset: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
    getContext: () => ({
      clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc() {},
      save() {}, restore() {}, closePath() {},
      createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
    }),
    width: 560, height: 560,
  }, extra || {});
}

const html = fs.readFileSync(FILE, 'utf8');
assert(/4×5|4 x 5|COLS = 4/.test(html), '8-bead should document 4×5 / COLS=4');
assert(/isEndgameCenterNode/.test(html), 'center highlight helper missing');
assert(/__SHOLO_GUTI_8_FEATURE__/.test(html), 'API name missing');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const elements = {
  'game-mode-select': el('game-mode-select', { value: 'pve' }),
  'ai-level-select': el('ai-level-select', { value: '2' }),
  'center-rule-select': el('center-rule-select', { value: 'off' }),
  'match-timer-select': el('match-timer-select', { value: 'off' }),
  'shot-clock-select': el('shot-clock-select', { value: 'off' }),
  'move-highlight-select': el('move-highlight-select', { value: 'on', dataset: {} }),
  board: el('board'), status: el('status'), 'finish-btn': el('finish-btn'), 'undo-btn': el('undo-btn'),
  'restart-btn': el('restart-btn'), 'play-again-btn': el('play-again-btn'),
  'result-modal': el('result-modal'), 'result-title': el('result-title'), 'result-desc': el('result-desc'),
  'p1-role': el('p1-role'), 'p2-role': el('p2-role'),
  'p1-pieces': el('p1-pieces'), 'p2-pieces': el('p2-pieces'), 'p1-caps': el('p1-caps'), 'p2-caps': el('p2-caps'),
  'turn-count': el('turn-count'), 'shot-clock-val': el('shot-clock-val'), 'match-clock-val': el('match-clock-val'),
  'p1-clock': el('p1-clock'), 'p2-clock': el('p2-clock'), 'pill-p1': el('pill-p1'), 'pill-p2': el('pill-p2'),
  'p1-center': el('p1-center'), 'p2-center': el('p2-center'), 'ai-level-container': el('ai-level-container', { style: {} }),
  'bgm-audio': el('bgm-audio'), 'bgm-select': el('bgm-select'), 'bgm-vol': el('bgm-vol', { value: '0.3' }),
  'bgm-play': el('bgm-play'), 'bgm-pause': el('bgm-pause'),
};
const sandbox = {
  console, Math,
  performance: { now: () => Date.now() },
  requestAnimationFrame(fn) { return setTimeout(() => fn(Date.now()), 0); },
  cancelAnimationFrame() {},
  setTimeout(fn) { fn(); return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
  window: {},
  document: { getElementById: (id) => elements[id] || el(id), addEventListener() {} },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(scriptMatch[1], sandbox);
const api = sandbox.window.__SHOLO_GUTI_8_FEATURE__;
assert(api, 'API missing');
assert(api.N === 20, 'expected 20 nodes, got ' + api.N);
const b = api.getBoard();
const p1 = b.filter((x) => x === api.P1).length;
const p2 = b.filter((x) => x === api.P2).length;
assert(p1 === 8 && p2 === 8, 'start not 8/8: ' + p1 + '/' + p2);

const row3 = api.NODES.filter((n) => n.y === 4);
assert(row3.length === 4, 'row 3 should have 4 nodes');
assert(row3.every((n) => b[api.NODE_INDEX[n.id]] === 0), 'row 3 must start completely empty');

const centerNodes = api.NODES.filter((n) => n.y === 4 && (n.x === 2 || n.x === 4));
assert(centerNodes.length === 2, 'centre zone should be 2 nodes at row 3 col2/col3');

const fullRows = api.NODES.filter((n) => n.y !== 4);
assert(fullRows.every((n) => b[api.NODE_INDEX[n.id]] !== 0), 'rows 1,2,4,5 must be full');

const row12 = api.NODES.filter((n) => n.y === 0 || n.y === 2);
const row45 = api.NODES.filter((n) => n.y === 6 || n.y === 8);
assert(row12.every((n) => b[api.NODE_INDEX[n.id]] === api.P2), 'rows 1–2 must be all P2 (Ebony, top)');
assert(row45.every((n) => b[api.NODE_INDEX[n.id]] === api.P1), 'rows 4–5 must be all P1 (Ivory, bottom)');

assert(api.getAllLegalMoves().length > 0, 'no opening moves');

const out = {
  file: 'SHOLO_GUTI_8_BEAD_WITH_FEATURE.html',
  N: api.N,
  start: { p1, p2 },
  centerZoneNodes: centerNodes.length,
  row3Empty: true,
  ok: true,
};
fs.writeFileSync(path.join(__dirname, 'SHOLO_8_BEAD_FEATURE_SMOKE.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
