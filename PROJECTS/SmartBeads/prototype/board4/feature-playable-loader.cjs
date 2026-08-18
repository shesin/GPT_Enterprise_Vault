'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { ROOT, playablePath } = require('./playable-dir.cjs');

const API_KEYS = {
  'SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html': '__SHOLO_GUTI_6_FEATURE__',
  'SHOLO_GUTI_10_BEAD_WITH_FEATURE.html': '__SHOLO_GUTI_10_FEATURE__',
  'SHOLO_GUTI_7_BEAD_WITH_FEATURE.html': '__SHOLO_GUTI_7_FEATURE__',
  'SHOLO_GUTI_6_BEAD_WITH_FEATURE.html': '__SHOLO_GUTI_6_FEATURE__',
};

function mockEl(id, extra) {
  const o = {
    id, style: {}, value: '', disabled: false, textContent: '', innerText: '', innerHTML: '',
    className: '', options: [], selectedIndex: 0, dataset: {},
    classList: {
      _c: new Set(),
      toggle(n, on) { if (on !== false) this._c.add(n); else this._c.delete(n); },
      add(n) { this._c.add(n); },
      remove(n) { this._c.delete(n); },
    },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 560, height: 560 }),
    width: 560, height: 560,
    getContext: () => ({
      setTransform() {}, clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {},
      moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc() {}, setLineDash() {},
      closePath() {}, fillText() {}, save() {}, restore() {},
      createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
    }),
  };
  return Object.assign(o, extra || {});
}

function parseSelectValues(html, id) {
  const rg = new RegExp(`<select id="${id}"[\\s\\S]*?<\\/select>`);
  const m = html.match(rg);
  if (!m) return null;
  const vals = [];
  const opt = /<option value="([^"]+)"/g;
  let mm;
  while ((mm = opt.exec(m[0]))) vals.push(mm[1]);
  return vals;
}

function initDefaultElements(elements) {
  const defaults = {
    'game-mode-select': 'pvp',
    'center-rule-select': 'off',
    'match-timer-select': 'off',
    'shot-clock-select': 'off',
    'max-move-select': '0',
    'ai-level-select': '2',
    'move-highlight-select': 'off',
  };
  for (const [id, value] of Object.entries(defaults)) {
    if (!elements[id]) elements[id] = mockEl(id, { value });
    else elements[id].value = value;
  }
}

function loadFeaturePlayable(playableFile) {
  const apiKey = API_KEYS[playableFile];
  if (!apiKey) throw new Error('No API key for ' + playableFile);
  const filePath = playablePath(playableFile);
  const html = fs.readFileSync(filePath, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('script missing in ' + playableFile);

  const elements = Object.create(null);
  const getElementById = (id) => {
    if (!elements[id]) elements[id] = mockEl(id);
    return elements[id];
  };

  const sandbox = {
    console, Math, Date, Object, Array, Set, Map, Infinity, parseInt, parseFloat, isFinite,
    performance: { now: () => Date.now() },
    setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    clearInterval() {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    window: {},
    document: {
      getElementById,
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

  vm.runInNewContext(match[1], sandbox, { filename: playableFile, timeout: 300000 });
  initDefaultElements(elements);
  const api = sandbox.window[apiKey];
  if (!api) throw new Error(apiKey + ' missing in ' + playableFile);

  return {
    api,
    elements,
    html,
    playableFile,
    uiOptions: {
      centerRules: parseSelectValues(html, 'center-rule-select'),
      maxMoves: parseSelectValues(html, 'max-move-select'),
      matchTimer: parseSelectValues(html, 'match-timer-select'),
      shotClock: parseSelectValues(html, 'shot-clock-select'),
    },
  };
}

function applySettings(ctx, settings) {
  const { api, elements } = ctx;
  initDefaultElements(elements);
  if (settings.centerRule) elements['center-rule-select'].value = settings.centerRule;
  if (settings.maxMoveLimit != null && elements['max-move-select']) {
    elements['max-move-select'].value = String(settings.maxMoveLimit);
  }
  if (settings.aiLevel != null) elements['ai-level-select'].value = String(settings.aiLevel);
  elements['game-mode-select'].value = 'pvp';
  elements['match-timer-select'].value = 'off';
  elements['shot-clock-select'].value = 'off';
  api.setOptions({
    mode: 'pvp',
    aiLevel: settings.aiLevel != null ? settings.aiLevel : 2,
    centerRule: settings.centerRule || 'off',
    matchTimer: 'off',
    shotClock: 'off',
  });
}

function countSide(board, side) {
  let n = 0;
  for (let i = 0; i < board.length; i++) if (board[i] === side) n++;
  return n;
}

function runOneGame(ctx, settings, labMoveCap) {
  const { api } = ctx;
  const GO = api.STATE.GAME_OVER;
  const P1 = api.P1;
  const P2 = api.P2;
  const aiLevel = settings.aiLevel != null ? settings.aiLevel : 2;

  applySettings(ctx, settings);
  api.resetGame();

  let moves = 0;
  let totalCaptures = 0;
  let p1Captures = 0;
  let p2Captures = 0;
  let endReason = 'move_cap_lab_safety';
  let winner = 'draw';

  while (api.getState() !== GO && moves < labMoveCap) {
    const turn = api.getTurn();
    const beforeCaps = api.getMetrics();
    const path = api.playAITurnSync(aiLevel);
    if (!path || !path.length) {
      endReason = 'stalemate';
      winner = turn === P1 ? 'P2' : 'P1';
      break;
    }
    moves++;
    const after = api.getMetrics();
    const dc = (after.p1Captures + after.p2Captures) - (beforeCaps.p1Captures + beforeCaps.p2Captures);
    totalCaptures += dc;
    p1Captures = after.p1Captures;
    p2Captures = after.p2Captures;

    const b = api.getBoard();
    if (countSide(b, P1) === 0) {
      endReason = 'elimination';
      winner = 'P2';
      break;
    }
    if (countSide(b, P2) === 0) {
      endReason = 'elimination';
      winner = 'P1';
      break;
    }
    if (api.getState() === GO) {
      if (settings.maxMoveLimit > 0 && after.moveCount >= settings.maxMoveLimit) {
        endReason = 'max_moves';
      } else {
        endReason = 'score_decision';
      }
      const p1Left = countSide(b, P1);
      const p2Left = countSide(b, P2);
      if (p1Left > p2Left) winner = 'P1';
      else if (p2Left > p1Left) winner = 'P2';
      else winner = 'draw';
      break;
    }
  }

  if (moves >= labMoveCap && api.getState() !== GO) {
    endReason = 'move_cap_lab_safety';
    winner = 'draw';
  }

  return {
    seed: settings.seed,
    winner,
    endReason,
    gameLength: moves,
    totalCaptures,
    p1Captures,
    p2Captures,
    firstPlayerWon: winner === 'P1',
    maxMovesSubReason: endReason === 'max_moves' ? 'max_moves_limit' : null,
  };
}

function runBatch(ctx, settings, depth, seeds, nPerSeed, labMoveCap) {
  const games = [];
  for (const seed of seeds) {
    for (let i = 0; i < nPerSeed; i++) {
      games.push(runOneGame(ctx, { ...settings, aiLevel: depth, seed: (seed + i) >>> 0 }, labMoveCap));
    }
  }
  return games;
}

function measureTurnBudget(ctx, aiLevel, samples) {
  const { api } = ctx;
  applySettings(ctx, { aiLevel, centerRule: 'off' });
  const times = [];
  for (let i = 0; i < samples; i++) {
    api.resetGame();
    const t0 = performance.now();
    api.selectAITurn(aiLevel, api.getBoard());
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const p95 = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];
  const median = times[Math.floor(times.length / 2)];
  const max = times[times.length - 1];
  return { samples: times.length, medianMs: median, p95Ms: p95, maxMs: max };
}

module.exports = {
  loadFeaturePlayable,
  runBatch,
  runOneGame,
  measureTurnBudget,
  parseSelectValues,
  API_KEYS,
};
