/**
 * Experimental matrix: 4/6 beads × cumulative/endgame.
 * Compares pre-fidelity-fix (single-step) vs current chain-faithful playHeadlessGame.
 * Data collection only — does not touch WEB_* docs.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const ROOT = __dirname;
const N = 725; // 4 configs × 725 = 2900 (matches architecture-doc sample scale)
const DEPTH = 2;
const MOVE_CAP = 40;
const PRE_FIX_REF = '5acf1db~1'; // parent of chain-fidelity fix

const CONFIGS = [
  { label: '4 beads · cumulative', beadsPerSide: 4, centerRule: 'cumulative' },
  { label: '4 beads · endgame', beadsPerSide: 4, centerRule: 'endgame' },
  { label: '6 beads · cumulative', beadsPerSide: 6, centerRule: 'cumulative' },
  { label: '6 beads · endgame', beadsPerSide: 6, centerRule: 'endgame' },
];

function el(id) {
  return {
    id, style: {}, value: '0', checked: true, disabled: false,
    innerText: '', innerHTML: '', className: '', textContent: '',
    getContext: () => ({
      clearRect() {}, createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
      fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
      arc() {}, fill() {}, setLineDash() {}, fillText() {},
    }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
    addEventListener() {}, width: 360, height: 360,
  };
}

function loadLabFromHtml(html, tag) {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('No script in ' + tag);
  const elements = Object.create(null);
  const getElementById = (id) => {
    if (!elements[id]) elements[id] = el(id);
    return elements[id];
  };
  const sandbox = {
    console, Math, Date, Object, Array, Set, Map, Infinity, parseInt, parseFloat, isFinite,
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestIdleCallback: (cb) => setTimeout(cb, 0),
    window: {},
    document: { getElementById, body: { addEventListener() {} } },
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
  vm.runInNewContext(match[1], sandbox, { filename: tag + '.js' });
  if (!sandbox.window.GeminiLab) throw new Error('GeminiLab missing for ' + tag);
  return sandbox.window.GeminiLab;
}

function emptyStats() {
  return {
    games: 0, red: 0, blue: 0, draw: 0, totalMoves: 0,
    elimination: 0, repetition: 0, stalemate: 0, max_moves: 0,
    max_moves_captures: 0, max_moves_center: 0, max_moves_unresolved: 0,
  };
}

function runConfig(Lab, beadsPerSide, centerRule, n) {
  const geo = Lab.createLabConfig({
    beadsPerSide, rows: 4, cols: 4, centerRule,
    maxMoveLimit: MOVE_CAP, aiDepth: DEPTH,
  });
  const stats = emptyStats();
  for (let i = 0; i < n; i++) {
    const g = Lab.playHeadlessGame(geo, i, DEPTH, MOVE_CAP);
    stats.games++;
    stats.totalMoves += g.gameLength;
    if (g.winner === 'red') stats.red++;
    else if (g.winner === 'blue') stats.blue++;
    else stats.draw++;
    if (g.endReason === 'elimination') stats.elimination++;
    else if (g.endReason === 'repetition') stats.repetition++;
    else if (g.endReason === 'stalemate') stats.stalemate++;
    else if (g.endReason === 'max_moves') {
      stats.max_moves++;
      if (g.maxMovesSubReason === 'captures') stats.max_moves_captures++;
      else if (g.maxMovesSubReason === 'center') stats.max_moves_center++;
      else stats.max_moves_unresolved++;
    }
  }
  const pct = (x) => +((x / n) * 100).toFixed(1);
  return {
    beadsPerSide,
    centerRule,
    games: n,
    redWinPct: pct(stats.red),
    blueWinPct: pct(stats.blue),
    drawPct: pct(stats.draw),
    decisivePct: pct(stats.red + stats.blue),
    eliminationPct: pct(stats.elimination),
    repetitionPct: pct(stats.repetition),
    stalematePct: pct(stats.stalemate),
    maxMovesPct: pct(stats.max_moves),
    maxMovesCapturesPct: pct(stats.max_moves_captures),
    maxMovesCenterPct: pct(stats.max_moves_center),
    maxMovesUnresolvedPct: pct(stats.max_moves_unresolved),
    avgGameLength: +(stats.totalMoves / n).toFixed(2),
    raw: stats,
  };
}

function runMatrix(Lab, tag) {
  const t0 = Date.now();
  const results = CONFIGS.map((c) => {
    const r = runConfig(Lab, c.beadsPerSide, c.centerRule, N);
    r.label = c.label;
    console.error('done', tag, c.label, r.drawPct + '% draw', r.avgGameLength + ' avg');
    return r;
  });
  return { tag, elapsedMs: Date.now() - t0, results };
}

function divergenceFlag(oldR, newR) {
  const flags = [];
  const keys = [
    'redWinPct', 'blueWinPct', 'drawPct', 'decisivePct',
    'eliminationPct', 'repetitionPct', 'stalematePct', 'maxMovesPct', 'avgGameLength',
  ];
  for (const k of keys) {
    const a = oldR[k];
    const b = newR[k];
    const delta = +(b - a).toFixed(2);
    // Meaningful: ≥5 pp for rates, or ≥10% relative for avg length when abs ≥2 moves
    if (k === 'avgGameLength') {
      if (Math.abs(delta) >= 2 && Math.abs(delta) / Math.max(a, 0.01) >= 0.1) {
        flags.push({ metric: k, old: a, new: b, delta });
      }
    } else if (Math.abs(delta) >= 5) {
      flags.push({ metric: k, old: a, new: b, delta });
    }
  }
  return flags;
}

const currentHtml = fs.readFileSync(path.join(ROOT, 'GEMINI_LAB.html'), 'utf8');
let preHtml;
try {
  preHtml = execSync('git show ' + PRE_FIX_REF + ':PROJECTS/SmartBeads/prototype/board4/GEMINI_LAB.html', {
    cwd: path.join(ROOT, '..', '..', '..', '..'),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
} catch (e) {
  console.error('Failed to load pre-fix HTML from git', e.message);
  process.exit(1);
}

console.error('Loading current (chain-faithful) lab…');
const LabNew = loadLabFromHtml(currentHtml, 'current');
console.error('Loading pre-fix lab from', PRE_FIX_REF, '…');
const LabOld = loadLabFromHtml(preHtml, 'pre-fix');

console.error('Running OLD matrix N=', N);
const oldMatrix = runMatrix(LabOld, 'pre-fix-single-step');
console.error('Running NEW matrix N=', N);
const newMatrix = runMatrix(LabNew, 'chain-faithful');

const comparison = CONFIGS.map((c, i) => {
  const oldR = oldMatrix.results[i];
  const newR = newMatrix.results[i];
  return {
    label: c.label,
    old: oldR,
    new: newR,
    meaningfulDivergence: divergenceFlag(oldR, newR),
  };
});

const out = {
  generatedAt: new Date().toISOString(),
  preFixRef: PRE_FIX_REF,
  postFixCommit: '5acf1db',
  sampleSizePerConfig: N,
  totalGamesPerMatrix: N * CONFIGS.length,
  aiDepth: DEPTH,
  moveCap: MOVE_CAP,
  oldMatrix,
  newMatrix,
  comparison,
  architectureDocClaim: {
    note: 'GEMINI_GAME_ARCHITECTURE_05P.md cites 2900+ sims: 6-bead ~52.5% decisive, Red 26.6% Blue 25.8%; 4-bead draw 67–89%. Those claims are treated as prior published summary, not raw per-config tables.',
  },
};

const outPath = path.join(ROOT, 'matrix-run-2026-08-10.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  wrote: outPath,
  oldElapsedMs: oldMatrix.elapsedMs,
  newElapsedMs: newMatrix.elapsedMs,
  comparison: comparison.map((c) => ({
    label: c.label,
    old: {
      red: c.old.redWinPct, blue: c.old.blueWinPct, draw: c.old.drawPct,
      decisive: c.old.decisivePct, elim: c.old.eliminationPct, rep: c.old.repetitionPct,
      stale: c.old.stalematePct, max: c.old.maxMovesPct, avgLen: c.old.avgGameLength,
    },
    new: {
      red: c.new.redWinPct, blue: c.new.blueWinPct, draw: c.new.drawPct,
      decisive: c.new.decisivePct, elim: c.new.eliminationPct, rep: c.new.repetitionPct,
      stale: c.new.stalematePct, max: c.new.maxMovesPct, avgLen: c.new.avgGameLength,
    },
    flags: c.meaningfulDivergence,
  })),
}, null, 2));
