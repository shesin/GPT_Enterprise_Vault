'use strict';
/**
 * Smoke checks for SHOLO_GUTI_10_BEAD_WITH_FEATURE.html
 * Geometry: 5×5 only (no triangles), 10 vs 10, move-highlight toggle.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { playablePath } = require('./playable-dir.cjs');
const FILE = playablePath('SHOLO_GUTI_10_BEAD_WITH_FEATURE.html');

function assert(ok, msg) {
  if (!ok) throw new Error(msg);
}

function el(id, extra) {
  const o = {
    id,
    style: {},
    value: '',
    disabled: false,
    textContent: '',
    dataset: {},
    classList: {
      _c: new Set(),
      toggle(n, on) { if (on === false) this._c.delete(n); else this._c.add(n); },
      add(n) { this._c.add(n); },
      remove(n) { this._c.delete(n); },
    },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
    getContext: () => ({
      clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc() {},
      save() {}, restore() {}, closePath() {},
      createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
    }),
    width: 560,
    height: 560,
  };
  return Object.assign(o, extra || {});
}

function main() {
  const html = fs.readFileSync(FILE, 'utf8');
  assert(!/addNode\('LT'/.test(html), 'triangle LT still present');
  assert(!/addNode\('RT'/.test(html), 'triangle RT still present');
  assert(/move-highlight-select/.test(html), 'move highlight control missing');

  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert(scriptMatch, 'script missing');

  const elements = {
    'game-mode-select': el('game-mode-select', { value: 'pve' }),
    'ai-level-select': el('ai-level-select', { value: '2' }),
    'center-rule-select': el('center-rule-select', { value: 'off' }),
    'match-timer-select': el('match-timer-select', { value: 'off' }),
    'shot-clock-select': el('shot-clock-select', { value: 'off' }),
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
    console,
    Math,
    performance: { now: () => Date.now() },
    requestAnimationFrame(fn) { return setTimeout(() => fn(Date.now()), 0); },
    cancelAnimationFrame(id) { clearTimeout(id); },
    setTimeout(fn) { fn(); return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    clearInterval() {},
    window: {},
    document: {
      getElementById: (id) => elements[id] || el(id),
      addEventListener() {},
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(scriptMatch[1], sandbox, { filename: 'SHOLO_GUTI_10_BEAD_WITH_FEATURE.html' });
  const api = sandbox.window.__SHOLO_GUTI_10_FEATURE__;
  assert(api, 'API missing');
  assert(api.N === 25, 'expected 25 nodes, got ' + api.N);

  const start = api.getBoard();
  const p1 = start.filter((x) => x === api.P1).length;
  const p2 = start.filter((x) => x === api.P2).length;
  assert(p1 === 10 && p2 === 10, 'start counts not 10/10: ' + p1 + '/' + p2);

  api.setOptions({ mode: 'pvp', moveHighlight: false });
  assert(api.getMode() === 'pvp', 'pvp not set');
  assert(api.getMoveHighlight() === false, 'pvp highlight should be off');

  api.setOptions({ mode: 'pve', moveHighlight: true, aiLevel: 2 });
  assert(api.getMoveHighlight() === true, 'pve highlight on failed');
  const legal = api.getAllLegalMoves().length;
  assert(legal > 0, 'no opening moves');
  api.completeTurn();
  const path = api.playAITurnSync(2);
  assert(path && path.length >= 1, 'AI failed');

  const report = {
    file: 'SHOLO_GUTI_10_BEAD_WITH_FEATURE.html',
    N: api.N,
    start: { p1, p2 },
    trianglesRemoved: true,
    moveHighlight: { pvpDefaultOff: true, togglePresent: true },
    aiPathLen: path.length,
    openingLegal: legal,
    ok: true,
  };
  const out = require('path').join(__dirname, 'SHOLO_10_BEAD_FEATURE_SMOKE.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main();
