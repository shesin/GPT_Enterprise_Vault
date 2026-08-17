'use strict';
/**
 * Smoke + parity checks for Baro Guti 12-bead playable vs headless Lab engine.
 * Does not emit KEEP/REJECT.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const eng = require('./sholo-12-bead-baro-fullturn-engine.cjs');

const ROOT = __dirname;
const PLAYABLE = 'SHOLO_GUTI_12_BEAD_BARO_WITH_FEATURE.html';
const API = '__SHOLO_GUTI_12_BARO_FEATURE__';
const OUT = path.join(ROOT, 'SHOLO_12_BARO_FEATURE_SMOKE.json');

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

function loadApi() {
  const html = fs.readFileSync(path.join(ROOT, PLAYABLE), 'utf8');
  assert(/option value="off"/.test(html) && /option value="cumulative"/.test(html) && /option value="endgame"/.test(html), 'centre rule Off/Cumulative/End-Game missing');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert(scriptMatch, 'script missing');
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
  vm.runInContext(scriptMatch[1], sandbox, { filename: PLAYABLE });
  const api = sandbox.window[API];
  assert(api, 'API missing');
  return api;
}

function edgeCount(adj) {
  let e = 0;
  for (let i = 0; i < adj.length; i++) for (const j of adj[i]) if (j > i) e++;
  return e;
}

/** Classic Alquerque 12-bead start on 5×5 (rows 1-indexed in literature). */
const EXPECTED_START = [
  1, 1, 1, 1, 1,
  1, 1, 1, 1, 1,
  2, 2, 0, 1, 1,
  2, 2, 2, 2, 2,
  2, 2, 2, 2, 2,
];

function main() {
  const api = loadApi();
  const checks = [];
  function g(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail });
  }

  g('N_25', api.N === 25, { N: api.N });
  g('beads_12_each', api.getBoard().filter((x) => x === api.P1).length === 12 && api.getBoard().filter((x) => x === api.P2).length === 12, {});
  g('occupancy_24_of_25', api.getBoard().filter((x) => x === 0).length === 1, {});

  const playStart = api.getBoard();
  const labStart = eng.startingBoard();
  g('start_pattern', playStart.every((v, i) => v === labStart[i]), {
    play: playStart,
    lab: labStart,
    expected: EXPECTED_START,
  });
  g('matches_alquerque_reference', playStart.every((v, i) => v === EXPECTED_START[i]), {});

  let coordMatch = true;
  for (let i = 0; i < eng.N; i++) {
    if (
      api.NODES[i].id !== eng.NODES[i].id ||
      api.NODES[i].x !== eng.NODES[i].x ||
      api.NODES[i].y !== eng.NODES[i].y
    ) {
      coordMatch = false;
      break;
    }
  }
  g('node_coords', coordMatch, {});
  g('edge_count', edgeCount(api.ADJ) === edgeCount(eng.ADJ), {
    play: edgeCount(api.ADJ),
    lab: edgeCount(eng.ADJ),
  });

  const centreIdx = api.NODES.findIndex((n) => n.y === 4 && n.x === 4);
  g('centre_A22_empty', centreIdx === 12 && playStart[centreIdx] === 0, { centreIdx });

  const openPlay = api.getAllLegalMoves(playStart, api.P1);
  const openLab = eng.getAllLegalMoves(labStart, eng.P1);
  g('opening_moves_match', openPlay.length === openLab.length, { openPlay: openPlay.length, openLab: openLab.length });
  g('opening_captures_zero', openPlay.every((m) => m.captured == null), {
    captures: openPlay.filter((m) => m.captured != null),
  });

  api.setOptions({ mode: 'pvp', moveHighlight: false, centerRule: 'endgame' });
  g('pvp_mode', api.getMode() === 'pvp', {});
  g('endgame_centre', api.getCenterRule() === 'endgame', {});
  api.setOptions({ mode: 'pve', moveHighlight: true, aiLevel: 2, centerRule: 'cumulative' });
  g('cumulative_centre', api.getCenterRule() === 'cumulative', {});
  const path = api.playAITurnSync(2);
  g('ai_turn', path && path.length >= 1, { pathLen: path ? path.length : 0 });

  g('search_unit', eng.describeSearchSemantics(2).searchUnit === 'complete turn', {});
  g('eval_noise_off', eng.describeSearchSemantics(2).evalNoise === false, {});

  const out = {
    board: 'Baro Guti 12-bead',
    playable: PLAYABLE,
    engine: 'sholo-12-bead-baro-fullturn-engine.cjs',
    geometry: '5×5 Alquerque · classic rank camps · centre A22 empty',
    traditionalSources: ['Murray 1951 / Ludii Bára Guti', 'OMerkel Alquerque README', 'Bead 12 / Baro Guti apps'],
    allOk: checks.every((x) => x.ok),
    checks,
    startPattern: EXPECTED_START,
    verifiedAt: new Date().toISOString(),
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ out: OUT, allOk: out.allOk, failed: checks.filter((x) => !x.ok).map((x) => x.name) }));
  if (!out.allOk) process.exit(1);
}

main();
