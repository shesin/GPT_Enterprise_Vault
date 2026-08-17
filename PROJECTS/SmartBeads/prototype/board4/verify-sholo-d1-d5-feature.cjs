'use strict';
/**
 * Smoke + engine parity for discovery round-2 playables D1–D5.
 * Does not emit KEEP/REJECT or run G1–G9.
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
  assert(/option value="off"/.test(html) && /option value="cumulative"/.test(html) && /option value="endgame"/.test(html), file + ': centre rule Off/Cumulative/End-Game missing');
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
  return { html, api };
}

function openingCaptures(api) {
  const moves = api.getAllLegalMoves(api.getBoard(), api.P1);
  return moves.filter((m) => m.captured !== null);
}

function parityCheck(api, eng, label) {
  assert(api.N === eng.N, label + ' N mismatch playable=' + api.N + ' engine=' + eng.N);
  const ps = api.getBoard();
  const es = eng.startingBoard();
  assert(ps.length === es.length, label + ' start length mismatch');
  for (let i = 0; i < ps.length; i++) {
    assert(ps[i] === es[i], label + ' start mismatch at ' + i + ': playable=' + ps[i] + ' engine=' + es[i]);
  }
  const pLegal = api.getAllLegalMoves(ps, api.P1).length;
  const eLegal = eng.getAllLegalMoves(es, eng.P1).length;
  assert(pLegal === eLegal, label + ' opening legal count mismatch ' + pLegal + ' vs ' + eLegal);
}

function reportBoard(spec) {
  const eng = require(path.join(ROOT, spec.engine));
  const { html, api } = loadApi(spec.file, spec.api);
  assert(api.N === spec.n, spec.file + ' N expected ' + spec.n + ' got ' + api.N);
  const start = api.getBoard();
  const p1 = start.filter((x) => x === api.P1).length;
  const p2 = start.filter((x) => x === api.P2).length;
  assert(p1 === spec.beads && p2 === spec.beads, spec.file + ' start not ' + spec.beads + '/' + spec.beads + ': ' + p1 + '/' + p2);

  parityCheck(api, eng, spec.id);

  const centerIdx = [];
  for (let i = 0; i < api.N; i++) {
    if (api.NODES[i] && spec.isCenter(api.NODES[i], i)) centerIdx.push(i);
  }
  assert(centerIdx.length === spec.centerCount, spec.file + ' centre count expected ' + spec.centerCount + ' got ' + centerIdx.length);
  for (const i of centerIdx) {
    assert(start[i] === 0, spec.file + ' centre node ' + i + ' must start empty');
  }

  const legal = api.getAllLegalMoves().length;
  assert(legal > 0, spec.file + ' no opening moves');
  const caps = openingCaptures(api);
  assert(caps.length === 0, spec.file + ' opening captures exist: ' + JSON.stringify(caps));

  api.setOptions({ mode: 'pvp', moveHighlight: false, centerRule: 'endgame' });
  assert(api.getMode() === 'pvp', spec.file + ' pvp not set');
  assert(api.getCenterRule() === 'endgame', spec.file + ' endgame centre rule not set');
  api.setOptions({ mode: 'pve', moveHighlight: true, aiLevel: 2, centerRule: 'cumulative' });
  assert(api.getCenterRule() === 'cumulative', spec.file + ' cumulative centre rule not set');
  const pathMoves = api.playAITurnSync(2);
  assert(pathMoves && pathMoves.length >= 1, spec.file + ' AI failed');

  spec.extra && spec.extra(api, start, html, eng);

  return {
    id: spec.id,
    file: spec.file,
    engine: spec.engine,
    n: api.N,
    start: { p1, p2 },
    centerNodeIndices: centerIdx,
    openingLegal: legal,
    openingCaptures: caps.length,
    aiPathLen: pathMoves.length,
    engineParity: true,
    centreRules: ['off', 'cumulative', 'endgame'],
    ok: true,
  };
}

const boards = [
  {
    id: 'D1',
    file: 'SHOLO_GUTI_9_BEAD_5x5_WITH_FEATURE.html',
    engine: 'sholo-d1-9-5x5-fullturn-engine.cjs',
    api: '__SHOLO_GUTI_D1_9_5x5_FEATURE__',
    n: 25,
    beads: 9,
    centerCount: 1,
    isCenter: (node) => node.y === 4 && node.x === 4,
    extra(api, start) {
      assert(start[api.NODE_INDEX.A00] === 0, 'D1 A00 must be empty');
      assert(start[api.NODE_INDEX.A44] === 0, 'D1 A44 must be empty');
      assert(start[api.NODE_INDEX.A01] === api.P1, 'D1 A01 must be P1');
      assert(start[api.NODE_INDEX.A43] === api.P2, 'D1 A43 must be P2');
    },
  },
  {
    id: 'D2',
    file: 'SHOLO_GUTI_7_BEAD_5x5_WITH_FEATURE.html',
    engine: 'sholo-d2-7-5x5-fullturn-engine.cjs',
    api: '__SHOLO_GUTI_D2_7_5x5_FEATURE__',
    n: 25,
    beads: 7,
    centerCount: 1,
    isCenter: (node) => node.y === 4 && node.x === 4,
    extra(api, start) {
      const p1Outer = api.NODES.filter((n) => n.x === 0);
      const p2Outer = api.NODES.filter((n) => n.x === 8);
      assert(p1Outer.filter((n) => start[api.NODE_INDEX[n.id]] === api.P1).length === 2, 'D2 P1 outer file should have 2');
      assert(p2Outer.filter((n) => start[api.NODE_INDEX[n.id]] === api.P2).length === 2, 'D2 P2 outer file should have 2');
      assert(api.NODES.filter((n) => n.x === 2 && start[api.NODE_INDEX[n.id]] === api.P1).length === 5, 'D2 P1 inner full');
      assert(api.NODES.filter((n) => n.x === 6 && start[api.NODE_INDEX[n.id]] === api.P2).length === 5, 'D2 P2 inner full');
    },
  },
  {
    id: 'D3',
    file: 'SHOLO_GUTI_5_BEAD_3x5_REAR_THIN_WITH_FEATURE.html',
    engine: 'sholo-d3-5-3x5-fullturn-engine.cjs',
    api: '__SHOLO_GUTI_D3_5_3x5_FEATURE__',
    n: 15,
    beads: 5,
    centerCount: 1,
    isCenter: (node) => node.y === 4 && node.x === 2,
    extra(api, start) {
      assert(start[api.NODE_INDEX.A02] === 0, 'D3 A02 must be empty');
      assert(start[api.NODE_INDEX.A40] === 0, 'D3 A40 must be empty');
      assert(start[api.NODE_INDEX.A41] === api.P1 && start[api.NODE_INDEX.A42] === api.P1, 'D3 rear P1 thin');
    },
  },
  {
    id: 'D4',
    file: 'SHOLO_GUTI_12_BEAD_6x5_WITH_FEATURE.html',
    engine: 'sholo-d4-12-6x5-fullturn-engine.cjs',
    api: '__SHOLO_GUTI_D4_12_6x5_FEATURE__',
    n: 30,
    beads: 12,
    centerCount: 2,
    isCenter: (node) => node.x === 4 && (node.y === 4 || node.y === 6),
    extra(api, start) {
      const centreFile = api.NODES.filter((n) => n.x === 4);
      assert(centreFile.length === 6, 'D4 centre file should have 6 nodes');
      assert(centreFile.every((n) => start[api.NODE_INDEX[n.id]] === 0), 'D4 centre file must start empty');
      assert(api.NODES.filter((n) => (n.x === 0 || n.x === 2) && start[api.NODE_INDEX[n.id]] === api.P1).length === 12, 'D4 P1 count');
      assert(api.NODES.filter((n) => (n.x === 6 || n.x === 8) && start[api.NODE_INDEX[n.id]] === api.P2).length === 12, 'D4 P2 count');
    },
  },
  {
    id: 'D5',
    file: 'SHOLO_GUTI_4_BEAD_3x5_REAR_WITH_FEATURE.html',
    engine: 'sholo-d5-4-3x5-fullturn-engine.cjs',
    api: '__SHOLO_GUTI_D5_4_3x5_FEATURE__',
    n: 15,
    beads: 4,
    centerCount: 1,
    isCenter: (node) => node.y === 4 && node.x === 2,
    extra(api, start) {
      assert(start[api.NODE_INDEX.A01] === api.P2, 'D5 A01 P2');
      assert(start[api.NODE_INDEX.A41] === api.P1, 'D5 A41 P1');
      assert(start[api.NODE_INDEX.A00] === 0 && start[api.NODE_INDEX.A02] === 0, 'D5 top corners empty');
      assert(start[api.NODE_INDEX.A40] === 0 && start[api.NODE_INDEX.A42] === 0, 'D5 bottom corners empty');
    },
  },
];

function main() {
  const results = boards.map((spec) => reportBoard(spec));
  const out = {
    purpose: 'D1–D5 discovery round-2 playable smoke — not a G1–G9 verdict',
    evaluatedAt: new Date().toISOString(),
    boards: results,
    allOk: results.every((r) => r.ok),
  };
  fs.writeFileSync(path.join(ROOT, 'SHOLO_D1_D5_FEATURE_SMOKE.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  if (!out.allOk) process.exit(1);
}

main();
