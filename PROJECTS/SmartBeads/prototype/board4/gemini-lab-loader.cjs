'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;

function mockEl(id, extra) {
  const o = {
    id, style: {}, value: '', disabled: false, textContent: '', innerText: '', innerHTML: '',
    className: '', options: [], selectedIndex: 0, dataset: {},
    classList: { _c: new Set(), toggle(n, on) { if (on !== false) this._c.add(n); else this._c.delete(n); }, add(n) { this._c.add(n); }, remove(n) { this._c.delete(n); } },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
    width: 360, height: 360,
    getContext: () => ({
      setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
      stroke() {}, fill() {}, arc() {}, setLineDash() {}, closePath() {}, strokeRect() {},
      save() {}, restore() {},
      createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
    }),
  };
  return Object.assign(o, extra || {});
}

function loadGeminiLab() {
  const html = fs.readFileSync(path.join(ROOT, 'GEMINI_LAB.html'), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('GEMINI_LAB script missing');
  const elements = Object.create(null);
  const sandbox = {
    console, Math, Date, Object, Array, Set, Map, Infinity, parseInt, parseFloat, isFinite,
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestIdleCallback: (cb) => setTimeout(cb, 0),
    window: {},
    document: {
      getElementById: (id) => {
        if (!elements[id]) elements[id] = mockEl(id);
        return elements[id];
      },
      body: { addEventListener() {} },
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
  vm.runInNewContext(match[1], sandbox, { filename: 'GEMINI_LAB.js', timeout: 180000 });
  if (!sandbox.window.GeminiLab) throw new Error('GeminiLab export missing');
  return sandbox.window.GeminiLab;
}

function loadCursorIndex(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('no script in ' + file);
  const elements = {
    'audio-toggle': mockEl('audio-toggle'),
    'game-mode-select': mockEl('game-mode-select', { value: 'pve' }),
    'ai-level-select': mockEl('ai-level-select', { value: '2', options: [{ text: 'Easy' }, { text: 'Medium' }, { text: 'Hard' }], selectedIndex: 1 }),
    'move-highlight-select': mockEl('move-highlight-select', { value: 'on', dataset: {} }),
    'match-timer-select': mockEl('match-timer-select', { value: 'off' }),
    'shot-clock-select': mockEl('shot-clock-select', { value: 'off' }),
    'ai-level-container': mockEl('ai-level-container'),
    'turn-timer-select': mockEl('turn-timer-select', { value: '0' }),
    'timer-mode-select': mockEl('timer-mode-select', { value: 'off' }),
    'max-move-select': mockEl('max-move-select', { value: '40' }),
    'center-rule-select': mockEl('center-rule-select', { value: 'off' }),
    'match-timer': mockEl('match-timer'), 'moves-left': mockEl('moves-left'), 'starts-label': mockEl('starts-label'),
    'red-beads': mockEl('red-beads'), 'blue-beads': mockEl('blue-beads'),
    'red-captures': mockEl('red-captures'), 'blue-captures': mockEl('blue-captures'),
    'red-center-steps': mockEl('red-center-steps'), 'blue-center-steps': mockEl('blue-center-steps'),
    'red-shot-clock': mockEl('red-shot-clock'), 'blue-shot-clock': mockEl('blue-shot-clock'),
    'red-clock': mockEl('red-clock'), 'blue-clock': mockEl('blue-clock'),
    'red-role': mockEl('red-role'), 'blue-role': mockEl('blue-role'),
    'card-red': mockEl('card-red'), 'card-blue': mockEl('card-blue'),
    'status-badge': mockEl('status-badge'), 'finish-btn': mockEl('finish-btn'),
    'restart-btn': mockEl('restart-btn'), 'play-again-btn': mockEl('play-again-btn'),
    'win-modal': mockEl('win-modal'), 'modal-winner': mockEl('modal-winner'), 'modal-desc': mockEl('modal-desc'),
    board: mockEl('board'),
  };
  const listeners = {};
  const sandbox = {
    console, Math, Date, Object, Array, Map, Set, Infinity, parseInt, parseFloat, isFinite,
    performance: { now: () => Date.now() },
    setTimeout: (fn) => { fn(); return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    window: {},
    document: {
      getElementById: (id) => elements[id] || mockEl(id),
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
  vm.runInNewContext(match[1], sandbox, { filename: file });
  if (typeof listeners['window:load'] === 'function') listeners['window:load']();
  const api = sandbox.window.__CURSOR_INDEX__;
  if (!api) throw new Error('__CURSOR_INDEX__ missing in ' + file);
  return { api, file };
}

function geminiLogToSholo(g) {
  const winner = g.winner === 'red' ? 'P1' : g.winner === 'blue' ? 'P2' : 'draw';
  let endReason = g.endReason;
  if (endReason === 'max_moves') endReason = 'move_cap_lab_safety';
  return {
    seed: g.seed,
    endReason,
    winner,
    gameLength: g.gameLength,
    totalCaptures: g.totalCaptures,
    p1Captures: g.p1Captures,
    p2Captures: g.p2Captures,
    firstPlayerWon: g.firstPlayerWon,
    maxMovesSubReason: g.maxMovesSubReason || null,
  };
}

module.exports = { loadGeminiLab, loadCursorIndex, geminiLogToSholo, ROOT };
