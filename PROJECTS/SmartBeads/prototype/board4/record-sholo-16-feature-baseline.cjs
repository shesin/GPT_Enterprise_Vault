'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { ROOT, playablePath } = require('./playable-dir.cjs');
const FEATURE_FILE = playablePath('SHOLO_GUTI_WITH_FEATURE.html');
const TRUST_FILE = path.join(ROOT, 'SHOLO_LAB_FINAL_TRUST.json');
const CAL_FILE = path.join(ROOT, 'SHOLO_FULLTURN_LAB_CALIBRATION.json');
const OUT_FILE = path.join(ROOT, 'SHOLO_16_BEAD_FEATURE_BASELINE.json');

function assert(ok, msg) {
  if (!ok) throw new Error(msg);
}

function el(id, extra) {
  const o = {
    id,
    style: {},
    value: '',
    disabled: false,
    textContent: '',
    innerText: '',
    className: '',
    classList: {
      _c: new Set(),
      toggle(n, on) { if (on === false) this._c.delete(n); else this._c.add(n); },
      add(n) { this._c.add(n); },
      remove(n) { this._c.delete(n); },
    },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 520 }),
    getContext: () => ({
      clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc() {},
      save() {}, restore() {},
      createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
    }),
    width: 500,
    height: 680,
  };
  return Object.assign(o, extra || {});
}

function parseSelectValues(html, id) {
  const rg = new RegExp(`<select id="${id}"[\\s\\S]*?<\\/select>`);
  const m = html.match(rg);
  if (!m) return [];
  const vals = [];
  const opt = /<option value="([^"]+)"/g;
  let mm;
  while ((mm = opt.exec(m[0]))) vals.push(mm[1]);
  return vals;
}

function loadFeatureApi(html) {
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error('script block not found');

  const elements = {
    'game-mode-select': el('game-mode-select', { value: 'pve' }),
    'ai-level-select': el('ai-level-select', { value: '2' }),
    'center-rule-select': el('center-rule-select', { value: 'off' }),
    'match-timer-select': el('match-timer-select', { value: 'off' }),
    'shot-clock-select': el('shot-clock-select', { value: 'off' }),
    'max-move-select': el('max-move-select', { value: '0', disabled: true }),
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
    'mode-val': el('mode-val'),
    'center-val': el('center-val'),
    'p1-pieces': el('p1-pieces'),
    'p2-pieces': el('p2-pieces'),
    'p1-caps': el('p1-caps'),
    'p2-caps': el('p2-caps'),
    'turn-count': el('turn-count'),
    'shot-clock-val': el('shot-clock-val'),
    'match-clock-val': el('match-clock-val'),
    'p1-clock': el('p1-clock'),
    'p2-clock': el('p2-clock'),
    'pill-p1': el('pill-p1'),
    'pill-p2': el('pill-p2'),
    'p1-center': el('p1-center'),
    'p2-center': el('p2-center'),
  };

  const sandbox = {
    console,
    Math,
    performance: { now: () => Date.now() },
    requestAnimationFrame(fn) { return setTimeout(() => fn(Date.now()), 0); },
    cancelAnimationFrame(id) { clearTimeout(id); },
    setTimeout(fn) { fn(); return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
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
  vm.runInContext(scriptMatch[1], sandbox, { filename: 'SHOLO_GUTI_WITH_FEATURE.html' });
  return { api: sandbox.window.__SHOLO_GUTI_FEATURE__, elements };
}

function main() {
  const html = fs.readFileSync(FEATURE_FILE, 'utf8');
  const { api, elements } = loadFeatureApi(html);
  assert(api, 'feature API missing');

  const report = {
    file: 'SHOLO_GUTI_WITH_FEATURE.html',
    board: 'Standard Sholo Guti 16-bead / 37-point',
    checks: {},
    labComparison: {},
    baselineVerdict: 'PASS',
  };

  const matchVals = parseSelectValues(html, 'match-timer-select');
  const shotVals = parseSelectValues(html, 'shot-clock-select');
  const centerVals = parseSelectValues(html, 'center-rule-select');
  report.checks.uiOptions = { matchVals, shotVals, centerVals, maxMoves: 'unlimited (option removed per UI request)' };
  assert(JSON.stringify(matchVals) === JSON.stringify(['off', '15', '30', '40']), 'match timer options mismatch');
  assert(JSON.stringify(shotVals) === JSON.stringify(['off', '60', '120']), 'shot clock options mismatch');
  assert(JSON.stringify(centerVals) === JSON.stringify(['off', 'endgame']), 'center options mismatch');

  // Human vs AI baseline
  api.setOptions({ mode: 'pve', matchTimer: 'off', shotClock: 'off', centerRule: 'off', aiLevel: 2 });
  const pveSnap = { mode: api.getMode(), turn: api.getTurn(), legal: api.getAllLegalMoves().length };
  assert(pveSnap.mode === 'pve', 'pve mode not set');
  assert(pveSnap.legal > 0, 'no legal moves in pve start');
  report.checks.pveStart = pveSnap;

  // PVP chess timer semantics
  api.setOptions({ mode: 'pvp', matchTimer: '15', shotClock: '60', centerRule: 'off' });
  const start = api.getMatch();
  assert(start.p1 === 900 && start.p2 === 900, 'pvp match clocks not 15 min each');
  assert(api.getShot() === 60, 'shot clock not initialized 60');
  api.timerTick();
  const t1 = api.getMatch();
  assert(t1.p1 === 899 && t1.p2 === 900, 'p1 clock did not tick on p1 turn');
  api.completeTurn();
  assert(api.getShot() === 60, 'shot clock did not reset on turn end');
  api.timerTick();
  const t2 = api.getMatch();
  assert(t2.p1 === 899 && t2.p2 === 899, 'p2 clock did not tick on p2 turn');
  report.checks.pvpTimer = { start, afterP1Tick: t1, afterP2Tick: t2, shotAfterTurnSwap: api.getShot() };

  // PVE global timer semantics
  api.setOptions({ mode: 'pve', matchTimer: '30', shotClock: 'off' });
  const g0 = api.getMatch();
  api.timerTick();
  const g1 = api.getMatch();
  assert(g0.global === 1800 && g1.global === 1799, 'pve global timer not ticking');
  report.checks.pveGlobalTimer = { before: g0.global, after: g1.global };

  // Center rule option wired
  api.setOptions({ mode: 'pvp', centerRule: 'endgame', matchTimer: 'off', shotClock: 'off' });
  assert(api.getCenterRule() === 'endgame', 'center endgame not set');
  report.checks.centerRuleSwitching = 'ok';

  // Basic AI response path + honest depth semantics
  api.setOptions({ mode: 'pve', matchTimer: 'off', shotClock: 'off', aiLevel: 2 });
  const sem2 = api.getAiSemantics(2);
  const sem3 = api.getAiSemantics(3);
  assert(sem2.opponentReplyPlies === 1, 'Medium must search 1 opponent reply');
  assert(sem3.opponentReplyPlies === 2, 'Hard must search 2 opponent replies');
  report.checks.aiSemantics = { medium: sem2, hard: sem3 };
  const startBoard = api.getBoard().join(',');
  api.completeTurn(); // hand over to P2 in this test harness
  const aiPath = api.playAITurnSync(2);
  assert(aiPath && aiPath.length >= 1, 'AI path missing');
  const endBoard = api.getBoard().join(',');
  assert(startBoard !== endBoard, 'board unchanged after AI path');
  report.checks.aiPlayable = { pathLen: aiPath.length };

  // Existing methodology artifacts
  const trust = JSON.parse(fs.readFileSync(TRUST_FILE, 'utf8'));
  const cal = JSON.parse(fs.readFileSync(CAL_FILE, 'utf8'));
  assert(trust.verdict === 'READY', 'existing lab trust verdict is not READY');
  report.labComparison = {
    methodologyVerdict: trust.verdict,
    protocol: trust.comparisonProtocol || null,
    perDepth: cal.perDepth,
    reproducibility: cal.reproducibility,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, out: OUT_FILE }, null, 2));
}

main();
