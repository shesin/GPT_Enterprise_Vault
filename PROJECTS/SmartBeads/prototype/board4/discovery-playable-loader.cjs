'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;

const API_KEYS = {
  'SHOLO_GUTI_5_BEAD_3x5_LR_WITH_FEATURE.html': '__SHOLO_GUTI_C1_5_LR_FEATURE__',
  'SHOLO_GUTI_5_BEAD_4x4_WITH_FEATURE.html': '__SHOLO_GUTI_C2_5_4x4_FEATURE__',
  'SHOLO_GUTI_8_BEAD_5x5_WITH_FEATURE.html': '__SHOLO_GUTI_C3_8_5x5_FEATURE__',
  'SHOLO_GUTI_12_BEAD_MINIWING_WITH_FEATURE.html': '__SHOLO_GUTI_C4_12_MINIWING_FEATURE__',
  'SHOLO_GUTI_12_BEAD_BARO_WITH_FEATURE.html': '__SHOLO_GUTI_12_BARO_FEATURE__',
};

function mockEl(id, extra) {
  return Object.assign({
    id,
    style: {},
    value: '',
    disabled: false,
    textContent: '',
    dataset: {},
    classList: {
      _c: new Set(),
      toggle(n, on) { if (on !== false) this._c.add(n); else this._c.delete(n); },
      add(n) { this._c.add(n); },
      remove(n) { this._c.delete(n); },
    },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 560, height: 560 }),
    width: 560,
    height: 560,
    getContext: () => ({
      clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
      stroke() {}, fill() {}, arc() {}, save() {}, restore() {}, closePath() {},
      createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
    }),
  }, extra || {});
}

function loadDiscoveryPlayable(playableFile) {
  const apiKey = API_KEYS[playableFile];
  if (!apiKey) throw new Error('No API key for ' + playableFile);
  const filePath = path.join(ROOT, playableFile);
  const html = fs.readFileSync(filePath, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('script missing in ' + playableFile);
  const ids = [
    'game-mode-select', 'ai-level-select', 'center-rule-select', 'match-timer-select',
    'shot-clock-select', 'max-move-select', 'move-highlight-select', 'board', 'status',
    'finish-btn', 'undo-btn', 'restart-btn', 'play-again-btn', 'result-modal',
    'result-title', 'result-desc', 'p1-role', 'p2-role', 'p1-pieces', 'p2-pieces',
    'p1-caps', 'p2-caps', 'turn-count', 'starts-label', 'shot-clock-val', 'match-clock-val',
    'p1-clock', 'p2-clock', 'pill-p1', 'pill-p2', 'p1-center', 'p2-center',
    'ai-level-container', 'bgm-audio', 'bgm-select', 'bgm-vol', 'bgm-play', 'bgm-pause',
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, mockEl(id)]));
  elements['game-mode-select'].value = 'pve';
  elements['ai-level-select'].value = '2';
  elements['center-rule-select'].value = 'off';
  elements['match-timer-select'].value = 'off';
  elements['shot-clock-select'].value = 'off';
  elements['move-highlight-select'].value = 'on';
  const sandbox = {
    console, Math, performance: { now: () => Date.now() },
    requestAnimationFrame() { return 0; },
    cancelAnimationFrame() {},
    setTimeout(fn) { if (typeof fn === 'function') fn(); return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    clearInterval() {},
    window: {},
    document: { getElementById: (id) => elements[id] || mockEl(id), addEventListener() {} },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(match[1], sandbox, { filename: playableFile });
  const api = sandbox.window[apiKey];
  if (!api) throw new Error(apiKey + ' missing in ' + playableFile);
  return { api, html, playableFile };
}

module.exports = { ROOT, API_KEYS, loadDiscoveryPlayable };
