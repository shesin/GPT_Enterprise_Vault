'use strict';
/**
 * Smoke checks for discovery playables C1–C4.
 * Does not emit KEEP/REJECT. Geometry + feature-shell + no opening captures.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
  const html = fs.readFileSync(path.join(__dirname, file), 'utf8');
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

function reportBoard(spec) {
  const { html, api } = loadApi(spec.file, spec.api);
  assert(api.N === spec.n, spec.file + ' N expected ' + spec.n + ' got ' + api.N);
  const start = api.getBoard();
  const p1 = start.filter((x) => x === api.P1).length;
  const p2 = start.filter((x) => x === api.P2).length;
  assert(p1 === spec.beads && p2 === spec.beads, spec.file + ' start not ' + spec.beads + '/' + spec.beads + ': ' + p1 + '/' + p2);

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
  const path = api.playAITurnSync(2);
  assert(path && path.length >= 1, spec.file + ' AI failed');

  spec.extra && spec.extra(api, start, html);

  return {
    file: spec.file,
    n: api.N,
    start: { p1, p2 },
    centerNodeIndices: centerIdx,
    openingLegal: legal,
    openingCaptures: caps.length,
    aiPathLen: path.length,
    centreRules: ['off', 'cumulative', 'endgame'],
    ok: true,
  };
}

const boards = [
  {
    id: 'C1',
    file: 'SHOLO_GUTI_5_BEAD_3x5_LR_WITH_FEATURE.html',
    api: '__SHOLO_GUTI_C1_5_LR_FEATURE__',
    n: 15,
    beads: 5,
    centerCount: 1,
    isCenter: (node) => node.y === 4 && node.x === 2,
    extra(api, start) {
      const left = api.NODES.filter((n) => n.x === 0);
      const mid = api.NODES.filter((n) => n.x === 2);
      const right = api.NODES.filter((n) => n.x === 4);
      assert(left.length === 5 && mid.length === 5 && right.length === 5, 'C1 files not 5/5/5');
      assert(left.every((n) => start[api.NODE_INDEX[n.id]] === api.P1), 'C1 left file must be P1');
      assert(mid.every((n) => start[api.NODE_INDEX[n.id]] === 0), 'C1 centre file must start empty');
      assert(right.every((n) => start[api.NODE_INDEX[n.id]] === api.P2), 'C1 right file must be P2');
    },
  },
  {
    id: 'C2',
    file: 'SHOLO_GUTI_5_BEAD_4x4_WITH_FEATURE.html',
    api: '__SHOLO_GUTI_C2_5_4x4_FEATURE__',
    n: 16,
    beads: 5,
    centerCount: 4,
    isCenter: (_node, i) => [5, 6, 9, 10].includes(i),
    extra(api, start) {
      const expected = [1, 0, 1, 1, 1, 0, 0, 1, 2, 0, 0, 2, 2, 2, 0, 2];
      assert(start.length === 16 && start.every((v, i) => v === expected[i]), 'C2 start mismatch');
      for (let i = 0; i < 16; i++) {
        if (start[i] !== api.P1) continue;
        const j = 15 - i;
        assert(start[j] === api.P2, 'C2 180° symmetry fail at ' + i);
      }
    },
  },
  {
    id: 'C3',
    file: 'SHOLO_GUTI_8_BEAD_5x5_WITH_FEATURE.html',
    api: '__SHOLO_GUTI_C3_8_5x5_FEATURE__',
    n: 25,
    beads: 8,
    centerCount: 1,
    isCenter: (node) => node.y === 4 && node.x === 4,
    extra(api, start, html) {
      assert(!/addNode\('LT'/.test(html), 'C3 must not include 16-bead LT wing');
      const p1OuterCorners = api.NODES.filter((n) => n.x === 0 && (n.y === 0 || n.y === 8));
      const p2OuterCorners = api.NODES.filter((n) => n.x === 8 && (n.y === 0 || n.y === 8));
      assert(p1OuterCorners.every((n) => start[api.NODE_INDEX[n.id]] === 0), 'C3 P1 outer corners must be empty');
      assert(p2OuterCorners.every((n) => start[api.NODE_INDEX[n.id]] === 0), 'C3 P2 outer corners must be empty');
      const centreFile = api.NODES.filter((n) => n.x === 4);
      assert(centreFile.length === 5 && centreFile.every((n) => start[api.NODE_INDEX[n.id]] === 0), 'C3 centre file must start empty');
    },
  },
  {
    id: 'C4',
    file: 'SHOLO_GUTI_12_BEAD_MINIWING_WITH_FEATURE.html',
    api: '__SHOLO_GUTI_C4_12_MINIWING_FEATURE__',
    n: 29,
    beads: 12,
    centerCount: 1,
    isCenter: (node) => node.y === 4 && node.x === 4,
    extra(api, start, html) {
      assert(!/addNode\('LT'/.test(html) && !/addNode\('LM'/.test(html), 'C4 must not include outer 16-bead wing tips');
      ['LIT', 'LIM', 'RIT', 'RIM'].forEach((id) => {
        assert(api.NODE_INDEX[id] != null, 'C4 missing wing node ' + id);
      });
      assert(start[api.NODE_INDEX.LIT] === api.P1 && start[api.NODE_INDEX.LIM] === api.P1, 'C4 left wings must be P1');
      assert(start[api.NODE_INDEX.RIT] === api.P2 && start[api.NODE_INDEX.RIM] === api.P2, 'C4 right wings must be P2');
      const litDeg = api.ADJ[api.NODE_INDEX.LIT].length;
      const limDeg = api.ADJ[api.NODE_INDEX.LIM].length;
      assert(litDeg === 2 && limDeg === 2, 'C4 inner-wing degrees should be 2/2, got ' + litDeg + '/' + limDeg);
    },
  },
];

function main() {
  const results = boards.map((spec) => {
    const r = reportBoard(spec);
    r.id = spec.id;
    return r;
  });
  const out = {
    purpose: 'C1–C4 discovery playable smoke — not a G1–G9 verdict',
    evaluatedAt: new Date().toISOString(),
    boards: results,
    allOk: results.every((r) => r.ok),
  };
  fs.writeFileSync(path.join(__dirname, 'SHOLO_C1_C4_FEATURE_SMOKE.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  if (!out.allOk) process.exit(1);
}

main();
