'use strict';
/**
 * Smoke-test 4×4 6-bead playable: load in VM, play complete Human-vs-AI games.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ROOT, playablePath } = require('./playable-dir.cjs');
const PLAYABLE = 'SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html';

function el(id, extra) {
  const o = {
    id,
    style: {},
    value: '',
    disabled: false,
    textContent: '',
    innerText: '',
    innerHTML: '',
    className: '',
    options: [],
    selectedIndex: 0,
    classList: {
      _c: new Set(),
      toggle(n, on) { if (on) this._c.add(n); else this._c.delete(n); },
      add(n) { this._c.add(n); },
      remove(n) { this._c.delete(n); },
    },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 560, height: 560 }),
    width: 560,
    height: 560,
    getContext: () => ({
      setTransform() {},
      clearRect() {},
      fillRect() {},
      strokeRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      fill() {},
      arc() {},
      setLineDash() {},
      save() {},
      restore() {},
      closePath() {},
      createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
    }),
  };
  return Object.assign(o, extra || {});
}

function loadIndex(file) {
  const html = fs.readFileSync(playablePath(file), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('no script in ' + file);

  const elements = {
    'game-mode-select': el('game-mode-select', { value: 'pve' }),
    'ai-level-select': el('ai-level-select', {
      value: '2',
      options: [{ text: 'Easy' }, { text: 'Medium' }, { text: 'Hard' }],
      selectedIndex: 1,
    }),
    'ai-level-container': el('ai-level-container'),
    'shot-clock-select': el('shot-clock-select', { value: 'off' }),
    'match-timer-select': el('match-timer-select', { value: 'off' }),
    'max-move-select': el('max-move-select', { value: '40' }),
    'center-rule-select': el('center-rule-select', { value: 'off' }),
    'move-highlight-select': el('move-highlight-select', { value: 'on', dataset: {} }),
    'starts-label': el('starts-label'),
    'p1-pieces': el('p1-pieces'),
    'p2-pieces': el('p2-pieces'),
    'p1-caps': el('p1-caps'),
    'p2-caps': el('p2-caps'),
    'p1-center': el('p1-center'),
    'p2-center': el('p2-center'),
    'turn-count': el('turn-count'),
    'pill-p1': el('pill-p1'),
    'pill-p2': el('pill-p2'),
    'finish-btn': el('finish-btn'),
    'p1-clock': el('p1-clock'),
    'p2-clock': el('p2-clock'),
    'match-clock-val': el('match-clock-val'),
    'p2-role': el('p2-role'),
    'status': el('status'),
    'undo-btn': el('undo-btn'),
    'result-modal': el('result-modal', { style: {} }),
    'result-title': el('result-title'),
    'result-desc': el('result-desc'),
    'play-again-btn': el('play-again-btn'),
    'restart-btn': el('restart-btn'),
    board: el('board'),
  };

  const listeners = {};
  const sandbox = {
    console, Math, Date, Object, Array, Map, Set, Infinity, parseInt, parseFloat, isFinite,
    performance: { now: () => Date.now() },
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    clearInterval() {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    window: {},
    document: {
      getElementById: (id) => elements[id] || el(id),
      body: { addEventListener(type, fn) { listeners['body:' + type] = fn; } },
    },
    AudioContext: function () {
      this.state = 'running'; this.resume = () => {};
      this.createOscillator = () => ({ connect() {}, frequency: { setValueAtTime() {} }, start() {}, stop() {}, type: '' });
      this.createGain = () => ({ connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } });
      this.destination = {}; this.currentTime = 0;
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window.AudioContext = sandbox.AudioContext;
  sandbox.window.webkitAudioContext = sandbox.AudioContext;
  sandbox.window.addEventListener = (type, fn) => { listeners['window:' + type] = fn; };
  sandbox.window.devicePixelRatio = 1;
  vm.runInNewContext(match[1], sandbox, { filename: file, timeout: 120000 });
  if (typeof listeners['window:load'] === 'function') listeners['window:load']();
  const api = sandbox.window.__CURSOR_INDEX__;
  if (!api) throw new Error('__CURSOR_INDEX__ missing in ' + file);
  return { api, elements };
}

function playFullHumanVsAi(api, elements) {
  let humanPlies = 0;
  for (let guard = 0; guard < 80 && api.getState() !== api.STATE.GAME_OVER; guard++) {
    if (api.getTurn() === api.CONFIG.P1 && !api.isAiThinking()) {
      const legal = api.getAllLegalMoves(api.getBoard(), api.CONFIG.P1);
      if (!legal.length) break;
      const step = legal.find((m) => m.captured === null) || legal[0];
      api.executeMove(step);
      humanPlies++;
      continue;
    }
    if (api.getTurn() === api.CONFIG.P2) api.makeAIMove();
    humanPlies++;
  }
  return {
    humanPlies,
    finished: api.getState() === api.STATE.GAME_OVER,
    winnerText: elements['result-title'].textContent,
    reason: elements['result-desc'].textContent,
    modal: elements['result-modal'].style.display,
  };
}

function playOneGame(file, beads) {
  const { api, elements } = loadIndex(file);
  assert(api.BEADS === beads, file + ' BEADS');

  elements['game-mode-select'].value = 'pve';
  elements['ai-level-select'].value = '2';
  api.resetGame();
  for (let i = 0; i < 3 && api.getTurn() !== api.CONFIG.P1; i++) api.resetGame();
  assert(api.getTurn() === api.CONFIG.P1, 'expected P1 to start');

  const board0 = api.getBoard();
  assert(board0.filter((x) => x === 1).length === beads, 'P1 bead count');
  assert(board0.filter((x) => x === 2).length === beads, 'P2 bead count');

  const legal = api.getAllLegalMoves(board0, api.CONFIG.P1);
  assert(legal.length > 0, 'human has moves');
  const step = legal.find((m) => m.captured === null) || legal[0];
  api.executeMove(step);
  assert(api.getBoard().join('') !== board0.join(''), 'board changed after human+AI');

  assert(Number.isFinite(api.evaluateBoard(api.getBoard())), 'eval finite');

  const html = fs.readFileSync(playablePath(file), 'utf8');
  assert(!html.includes('Run 100-Game Lab'), 'lab button removed');
  assert(board0.length === 16, '4x4 board size');
  assert(html.includes('Ivory (P1)'), 'sholo shell present');
  assert(html.includes('class="shell"'), '4-column shell present');
  assert(html.includes('full box crosses'), 'full box cross geometry label');
  assert(html.includes('link(tl, br)'), 'every-cell diagonal links present');
  assert(!html.includes('[0, 5, 10, 15]'), 'long board diagonal rays absent');
  assert(!html.includes('_b_4x4'), 'legacy _b_ filename absent from playable');

  const fullGame = playFullHumanVsAi(api, elements);
  assert(fullGame.finished, file + ' did not finish Human-vs-AI game');
  assert(fullGame.modal === 'flex', file + ' result modal not shown');

  return { file, beads, ok: true, humanMove: step, fullGame };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

assert(fs.existsSync(playablePath(PLAYABLE)), PLAYABLE + ' missing');
assert(!fs.existsSync(path.join(ROOT, 'SHOLO_GUTI_6_BEAD_b_4x4_WITH_FEATURE.html')), 'legacy _b_ playable must be removed');

const r6 = playOneGame(PLAYABLE, 6);

console.log(JSON.stringify({ ok: true, r6, playable: PLAYABLE }, null, 2));
fs.writeFileSync(path.join(ROOT, 'CURSOR_INDEX_VERIFY_SMOKE.json'), JSON.stringify({ ok: true, r6, playable: PLAYABLE, at: new Date().toISOString() }, null, 2));
process.exit(0);
