'use strict';
/**
 * Smoke-test CURSOR_INDEX_4/6: load in VM, play complete Human-vs-AI games.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = __dirname;

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
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
    width: 360,
    height: 360,
    getContext: () => ({
      setTransform() {},
      clearRect() {},
      fillRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      fill() {},
      arc() {},
      setLineDash() {},
      createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
    }),
  };
  return Object.assign(o, extra || {});
}

function loadIndex(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('no script in ' + file);

  const elements = {
    'audio-toggle': el('audio-toggle'),
    'game-mode-select': el('game-mode-select', { value: 'pve' }),
    'ai-difficulty': el('ai-difficulty', {
      value: '2',
      options: [{ text: 'Easy' }, { text: 'Medium' }, { text: 'Hard' }],
      selectedIndex: 1,
    }),
    'ai-level-container': el('ai-level-container'),
    'turn-timer-select': el('turn-timer-select', { value: '0' }),
    'timer-mode-select': el('timer-mode-select', { value: 'off' }),
    'max-move-select': el('max-move-select', { value: '40' }),
    'center-rule-select': el('center-rule-select', { value: 'off' }),
    'match-timer': el('match-timer'),
    'moves-left': el('moves-left'),
    'starts-label': el('starts-label'),
    'red-beads': el('red-beads'),
    'blue-beads': el('blue-beads'),
    'red-captures': el('red-captures'),
    'blue-captures': el('blue-captures'),
    'red-center-steps': el('red-center-steps'),
    'blue-center-steps': el('blue-center-steps'),
    'red-shot-clock': el('red-shot-clock'),
    'blue-shot-clock': el('blue-shot-clock'),
    'red-clock': el('red-clock'),
    'blue-clock': el('blue-clock'),
    'red-role': el('red-role'),
    'blue-role': el('blue-role'),
    'card-red': el('card-red'),
    'card-blue': el('card-blue'),
    'status-badge': el('status-badge'),
    'finish-btn': el('finish-btn'),
    'restart-btn': el('restart-btn'),
    'play-again-btn': el('play-again-btn'),
    'win-modal': el('win-modal'),
    'modal-winner': el('modal-winner'),
    'modal-desc': el('modal-desc'),
    board: el('board'),
  };

  const listeners = {};
  const sandbox = {
    console,
    Math,
    Date,
    Object,
    Array,
    Map,
    Set,
    Infinity,
    parseInt,
    parseFloat,
    isFinite,
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    clearInterval() {},
    window: {},
    document: {
      getElementById: (id) => elements[id] || el(id),
      body: { addEventListener(type, fn) { listeners['body:' + type] = fn; } },
    },
    AudioContext: function () {
      this.state = 'running';
      this.resume = () => {};
      this.createOscillator = () => ({
        connect() {}, frequency: { setValueAtTime() {} }, start() {}, stop() {}, type: '',
      });
      this.createGain = () => ({
        connect() {},
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      });
      this.destination = {};
      this.currentTime = 0;
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window.AudioContext = sandbox.AudioContext;
  sandbox.window.webkitAudioContext = sandbox.AudioContext;
  sandbox.window.devicePixelRatio = 1;
  sandbox.window.addEventListener = (type, fn) => { listeners['window:' + type] = fn; };

  vm.runInNewContext(match[1], sandbox, { filename: file });
  if (typeof listeners['window:load'] === 'function') listeners['window:load']();
  const api = sandbox.window.__CURSOR_INDEX__;
  if (!api) throw new Error('__CURSOR_INDEX__ missing in ' + file);
  return { api, elements, file };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function playFullHumanVsAi(api, elements) {
  elements['game-mode-select'].value = 'pve';
  elements['ai-difficulty'].value = '2';
  elements['max-move-select'].value = '40';
  elements['center-rule-select'].value = 'off';
  api.resetGame();
  for (let i = 0; i < 4 && api.getTurn() !== api.CONFIG.P1; i++) api.resetGame();

  let humanPlies = 0;
  while (api.getState() !== api.STATE.GAME_OVER && humanPlies < 50) {
    if (api.getTurn() !== api.CONFIG.P1) {
      if (api.getTurn() === api.CONFIG.P2 && api.getState() === api.STATE.IDLE) api.makeAIMove();
      else break;
      continue;
    }
    if (api.getState() === api.STATE.CHAIN_JUMPING) {
      const moves = api.getAllLegalMoves(api.getBoard(), api.CONFIG.P1).filter((m) => m.captured !== null);
      if (moves.length) api.executeMove(moves[0]);
      else api.completeTurn();
    } else {
      const moves = api.getAllLegalMoves(api.getBoard(), api.CONFIG.P1);
      if (!moves.length) break;
      api.executeMove(moves.find((m) => m.captured !== null) || moves[0]);
    }
    humanPlies++;
  }
  return {
    humanPlies,
    finished: api.getState() === api.STATE.GAME_OVER,
    winnerText: elements['modal-winner'].textContent,
    reason: elements['modal-desc'].textContent,
    modal: elements['win-modal'].style.display,
  };
}

function playOneGame(file, beads) {
  const { api, elements } = loadIndex(file);
  assert(api.BEADS === beads, file + ' BEADS');

  elements['game-mode-select'].value = 'pve';
  elements['ai-difficulty'].value = '2';
  api.resetGame();
  for (let i = 0; i < 3 && api.getTurn() !== api.CONFIG.P1; i++) api.resetGame();
  assert(api.getTurn() === api.CONFIG.P1, 'expected Red to start');

  const board0 = api.getBoard();
  assert(board0.filter((x) => x === 1).length === beads, 'red bead count');
  assert(board0.filter((x) => x === 2).length === beads, 'blue bead count');

  const legal = api.getAllLegalMoves(board0, api.CONFIG.P1);
  assert(legal.length > 0, 'human has moves');
  const step = legal.find((m) => m.captured === null) || legal[0];
  api.executeMove(step);
  assert(api.getBoard().join('') !== board0.join(''), 'board changed after human+AI');

  assert(Number.isFinite(api.evaluateBoard(api.getBoard())), 'eval finite');

  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  assert(!html.includes('Run 100-Game Lab'), 'lab button removed');
  assert(html.includes('REP_HARD'), 'AI upgrades present');

  const fullGame = playFullHumanVsAi(api, elements);
  assert(fullGame.finished, file + ' did not finish Human-vs-AI game');
  assert(fullGame.modal === 'flex', file + ' win modal not shown');

  return { file, beads, ok: true, humanMove: step, fullGame };
}

assert(fs.existsSync(path.join(ROOT, 'GEMINI_INDEX_4.html')), 'gemini 4 missing');
assert(fs.existsSync(path.join(ROOT, 'GEMINI_INDEX_6.html')), 'gemini 6 missing');

const r4 = playOneGame('CURSOR_INDEX_4.html', 4);
const r6 = playOneGame('CURSOR_INDEX_6.html', 6);

const gem4 = fs.readFileSync(path.join(ROOT, 'GEMINI_INDEX_4.html'), 'utf8');
assert(gem4.includes('4 BEADS STRATEGY'), 'gemini 4 title');
assert(gem4.includes('Run 100-Game Lab'), 'gemini 4 still has lab');

console.log(JSON.stringify({ ok: true, r4, r6 }, null, 2));
