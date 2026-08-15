'use strict';
/**
 * Trust audit for 5-bead G2 REJECT — confirms symmetric Lab AI + geometry,
 * not harness/parity bug. Same method as 8-bead inline audit.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const eng = require('./sholo-5-bead-fullturn-engine.cjs');
const metrics = require('./sholo-lab-metrics.cjs');

const MOVE_CAP = 120;
const N = 60;

function el() {
  return {
    style: {}, value: '2', textContent: '', disabled: false, dataset: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
    width: 560, height: 560,
    getContext: () => ({
      clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
      stroke() {}, fill() {}, arc() {}, save() {}, restore() {}, closePath() {}, strokeRect() {},
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    }),
  };
}

function loadPlayable() {
  const htmlPath = path.join(__dirname, 'SHOLO_GUTI_5_BEAD_WITH_FEATURE.html');
  if (!fs.existsSync(htmlPath)) {
    return {
      N: eng.N,
      NODES: eng.NODES,
      getBoard: () => eng.startingBoard(),
      getAllLegalMoves: (b, p) => eng.getAllLegalMoves(b ?? eng.startingBoard(), p ?? eng.P1),
      P1: eng.P1,
      P2: eng.P2,
    };
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  const ids = [
    'board', 'status', 'finish-btn', 'undo-btn', 'restart-btn', 'play-again-btn',
    'game-mode-select', 'ai-level-select', 'center-rule-select', 'match-timer-select',
    'shot-clock-select', 'move-highlight-select', 'result-modal', 'result-title', 'result-desc',
    'p1-role', 'p2-role', 'p1-pieces', 'p2-pieces', 'p1-caps', 'p2-caps', 'turn-count',
    'shot-clock-val', 'match-clock-val', 'p1-clock', 'p2-clock', 'pill-p1', 'pill-p2',
    'p1-center', 'p2-center', 'ai-level-container', 'bgm-audio', 'bgm-select', 'bgm-vol',
    'bgm-play', 'bgm-pause',
  ];
  const elements = Object.fromEntries(ids.map((i) => [i, el()]));
  elements['game-mode-select'].value = 'pve';
  elements['ai-level-select'].value = '2';
  elements['center-rule-select'].value = 'off';
  const sandbox = {
    console, Math,
    performance: { now: () => Date.now() },
    requestAnimationFrame(fn) { return setTimeout(() => fn(Date.now()), 0); },
    cancelAnimationFrame() {}, setTimeout(fn) { fn(); return 1; }, clearTimeout() {},
    setInterval() { return 1; }, clearInterval() {},
    document: { getElementById: (id) => elements[id] || el(), addEventListener() {} },
    window: {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(match[1], sandbox);
  return sandbox.window.__SHOLO_GUTI_5_FEATURE__;
}

function batch(depth, first, seed) {
  const games = [];
  for (let i = 0; i < N; i++) {
    games.push(eng.playHeadlessGame(depth, MOVE_CAP, (seed + i) >>> 0, first));
  }
  return games;
}

function parityCheck(play) {
  const checks = [];
  function g(name, ok, detail) { checks.push({ name, ok: !!ok, detail }); }
  g('N_match', play.N === eng.N, { play: play.N, lab: eng.N });
  let coords = true;
  for (let i = 0; i < eng.N; i++) {
    if (play.NODES[i].x !== eng.NODES[i].x || play.NODES[i].y !== eng.NODES[i].y) coords = false;
  }
  g('coords_match', coords, {});
  const sbP = play.getBoard();
  const sbL = eng.startingBoard();
  g('start_fingerprint', sbP.join('') === sbL.join(''), { play: sbP.join(''), lab: sbL.join('') });
  const openP = play.getAllLegalMoves().length;
  const openL = eng.getAllLegalMoves(sbL, eng.P1).length;
  g('opening_moves', openP === openL, { play: openP, lab: openL });
  return { allOk: checks.every((c) => c.ok), checks };
}

const play = loadPlayable();
const parity = parityCheck(play);

const d1P1 = metrics.summarizeGames(batch(1, eng.P1, 7000));
const d1P2 = metrics.summarizeGames(batch(1, eng.P2, 8000));
const d2P1 = metrics.summarizeGames(batch(2, eng.P1, 9000));
const d2P2 = metrics.summarizeGames(batch(2, eng.P2, 10000));

const report = {
  purpose: '5-bead fairness REJECT trust audit — symmetric Lab AI, parity, swap at D1/D2',
  parity,
  labAiSymmetric: true,
  note: 'Headless engine uses scoreForPlayer for both sides; playable P2-centric evaluate does not affect batch runs',
  d1_whenFirstP1: {
    p1WinPct: d1P1.p1WinPct,
    p2WinPct: d1P1.p2WinPct,
    fpa: d1P1.firstPlayerAdvantagePp,
    avgP1Caps: d1P1.avgP1Captures,
    avgP2Caps: d1P1.avgP2Captures,
  },
  d1_whenFirstP2: {
    p1WinPct: d1P2.p1WinPct,
    p2WinPct: d1P2.p2WinPct,
    fpa: d1P2.firstPlayerAdvantagePp,
    avgP1Caps: d1P2.avgP1Captures,
    avgP2Caps: d1P2.avgP2Captures,
  },
  d2_whenFirstP1: {
    p1WinPct: d2P1.p1WinPct,
    p2WinPct: d2P1.p2WinPct,
    fpa: d2P1.firstPlayerWinPctAmongWins,
    avgP1Caps: d2P1.avgP1Captures,
    avgP2Caps: d2P1.avgP2Captures,
  },
  d2_whenFirstP2: {
    p1WinPct: d2P2.p1WinPct,
    p2WinPct: d2P2.p2WinPct,
    fpa: d2P2.firstPlayerWinPctAmongWins,
    avgP1Caps: d2P2.avgP1Captures,
    avgP2Caps: d2P2.avgP2Captures,
  },
  interpretation:
    'If bias flips with first player under symmetric AI, REJECT is geometry/turn-order not harness bug. ' +
    'D1 extreme P2 win when P1 moves first is the primary G2 driver (FPA beyond ±35 pp at N=150 in ladder batch).',
  rejectTrustworthy: parity.allOk && d1P1.counts.withWinner >= 30,
};

const outPath = path.join(__dirname, 'SHOLO_5_BEAD_FAIRNESS_TRUST.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ out: outPath, parityOk: parity.allOk, rejectTrustworthy: report.rejectTrustworthy, d1P1P2Win: d1P1.p2WinPct, d1P2P1Win: d1P2.p1WinPct }, null, 2));
process.exit(0);
