'use strict';
/**
 * Smoke + engine parity for final-round playables F1b–F5b (7 boards).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
    classList: {
      _c: new Set(),
      toggle(n, on) {
        if (on === false) this._c.delete(n);
        else this._c.add(n);
      },
      add(n) {
        this._c.add(n);
      },
      remove(n) {
        this._c.delete(n);
      },
    },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
    getContext: () => ({
      clearRect() {},
      fillRect() {},
      strokeRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      fill() {},
      arc() {},
      save() {},
      restore() {},
      closePath() {},
      createLinearGradient() {
        return { addColorStop() {} };
      },
      createRadialGradient() {
        return { addColorStop() {} };
      },
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
    console,
    Math,
    performance: { now: () => Date.now() },
    requestAnimationFrame() {
      return 0;
    },
    cancelAnimationFrame() {},
    setTimeout(fn) {
      fn();
      return 1;
    },
    clearTimeout() {},
    setInterval() {
      return 1;
    },
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
  vm.runInContext(scriptMatch[1], sandbox, { filename: file });
  const api = sandbox.window[apiName];
  assert(api, file + ': API ' + apiName + ' missing');
  return { api };
}

function parityCheck(api, eng, label) {
  assert(api.N === eng.N, label + ' N mismatch');
  const ps = api.getBoard();
  const es = eng.startingBoard();
  assert(ps.join('') === es.join(''), label + ' start fingerprint mismatch');
  const pLegal = api.getAllLegalMoves(ps, api.P1).length;
  const eLegal = eng.getAllLegalMoves(es, eng.P1).length;
  assert(pLegal === eLegal, label + ' opening legal mismatch ' + pLegal + ' vs ' + eLegal);
}

function reportBoard(spec) {
  const eng = require(path.join(ROOT, spec.engine));
  const { api } = loadApi(spec.file, spec.api);
  assert(api.N === spec.n, spec.id + ' N expected ' + spec.n);
  const start = api.getBoard();
  const p1 = start.filter((x) => x === api.P1).length;
  const p2 = start.filter((x) => x === api.P2).length;
  assert(p1 === spec.beads && p2 === spec.beads, spec.id + ' bead count ' + p1 + '/' + p2);

  parityCheck(api, eng, spec.id);

  const centerIdx = [];
  for (let i = 0; i < api.N; i++) {
    if (spec.isCenter(api.NODES[i], i)) centerIdx.push(i);
  }
  assert(centerIdx.length === spec.centerCount, spec.id + ' centre count');
  const mustEmpty = spec.emptyCenterIndices || centerIdx;
  for (const i of mustEmpty) assert(start[i] === 0, spec.id + ' centre ' + i + ' not empty');

  const caps = api.getAllLegalMoves(start, api.P1).filter((m) => m.captured != null);
  assert(caps.length === 0, spec.id + ' opening captures');

  api.setOptions({ mode: 'pvp', centerRule: 'endgame' });
  api.setOptions({ mode: 'pve', aiLevel: 2, centerRule: 'cumulative' });
  const pathMoves = api.playAITurnSync(2);
  assert(pathMoves && pathMoves.length >= 1, spec.id + ' AI failed');

  return {
    id: spec.id,
    file: spec.file,
    engine: spec.engine,
    n: api.N,
    start: { p1, p2 },
    openingCaptures: caps.length,
    aiPathLen: pathMoves.length,
    ok: true,
  };
}

const boards = [
  {
    id: 'F1b',
    file: 'SHOLO_GUTI_5_BEAD_4x3_HOURGLASS_WITH_FEATURE.html',
    engine: 'sholo-f1b-5-4x3-fullturn-engine.cjs',
    api: '__SHOLO_GUTI_F1b_5_4x3_FEATURE__',
    n: 12,
    beads: 5,
    centerCount: 2,
    isCenter: (node) => node.y === 2 && (node.x === 2 || node.x === 4),
  },
  {
    id: 'F2b',
    file: 'SHOLO_GUTI_7_BEAD_4x4_DENSE_WITH_FEATURE.html',
    engine: 'sholo-f2b-7-4x4-fullturn-engine.cjs',
    api: '__SHOLO_GUTI_F2b_7_4x4_FEATURE__',
    n: 16,
    beads: 7,
    centerCount: 4,
    isCenter: (node, i) => [5, 6, 9, 10].includes(i),
    emptyCenterIndices: [6, 9],
  },
  {
    id: 'F3b',
    file: 'SHOLO_GUTI_8_BEAD_5x4_WITH_FEATURE.html',
    engine: 'sholo-f3b-8-5x4-fullturn-engine.cjs',
    api: '__SHOLO_GUTI_F3b_8_5x4_FEATURE__',
    n: 20,
    beads: 8,
    centerCount: 2,
    isCenter: (node) => node.x === 4 && (node.y === 2 || node.y === 4),
  },
  {
    id: 'F1a',
    file: 'SHOLO_GUTI_8_BEAD_4x6_HOURGLASS_WITH_FEATURE.html',
    engine: 'sholo-f1a-8-4x6-fullturn-engine.cjs',
    api: '__SHOLO_GUTI_F1a_8_4x6_FEATURE__',
    n: 24,
    beads: 8,
    centerCount: 4,
    isCenter: (node) => (node.x === 2 || node.x === 4) && (node.y === 4 || node.y === 6),
  },
  {
    id: 'F2a',
    file: 'SHOLO_GUTI_12_BEAD_5x7_WITH_FEATURE.html',
    engine: 'sholo-f2a-12-5x7-fullturn-engine.cjs',
    api: '__SHOLO_GUTI_F2a_12_5x7_FEATURE__',
    n: 35,
    beads: 12,
    centerCount: 1,
    isCenter: (node) => node.y === 8 && node.x === 4,
  },
  {
    id: 'F4b',
    file: 'SHOLO_GUTI_10_BEAD_4x6_HOURGLASS_WITH_FEATURE.html',
    engine: 'sholo-f4b-10-4x6-fullturn-engine.cjs',
    api: '__SHOLO_GUTI_F4b_10_4x6_FEATURE__',
    n: 24,
    beads: 10,
    centerCount: 4,
    isCenter: (node) => (node.x === 2 || node.x === 4) && (node.y === 4 || node.y === 6),
  },
  {
    id: 'F5b',
    file: 'SHOLO_GUTI_12_BEAD_4x7_HOURGLASS_WITH_FEATURE.html',
    engine: 'sholo-f5b-12-4x7-fullturn-engine.cjs',
    api: '__SHOLO_GUTI_F5b_12_4x7_FEATURE__',
    n: 28,
    beads: 12,
    centerCount: 4,
    isCenter: (node) => (node.x === 2 || node.x === 4) && (node.y === 4 || node.y === 8),
  },
];

function main() {
  const results = boards.map((spec) => reportBoard(spec));
  const out = {
    purpose: 'Final-round playable smoke — not G1–G9 verdict',
    dropped: ['C5', 'F3a', 'F5a', 'F4a'],
    evaluatedAt: new Date().toISOString(),
    boards: results,
    allOk: results.every((r) => r.ok),
  };
  fs.writeFileSync(path.join(ROOT, 'SHOLO_FINAL_ROUND_FEATURE_SMOKE.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  if (!out.allOk) process.exit(1);
}

main();
