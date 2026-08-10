/**
 * 6-bead depth / repetition-avoidance experiment (data collection only).
 * Does not modify GEMINI_LAB.html on disk — patches a copy in memory for the
 * rep-avoidance variant only. Capture Optionality / chain logic unchanged.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const N = 725;
const MOVE_CAP = 40;
const BASELINE = require('./matrix-run-2026-08-10.json');

const CONFIGS = [
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
  if (!match) throw new Error('No script');
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
  if (!sandbox.window.GeminiLab) throw new Error('GeminiLab missing');
  return sandbox.window.GeminiLab;
}

/** Inject experiment-only playHeadlessGameRepAvoid without changing on-disk LAB. */
function injectRepAvoid(html) {
  const injection = `
  function playHeadlessGameRepAvoid(geo, gameIndex, aiDepth, moveCap) {
    let simBoard = createStartingBoard(geo.beadsPerSide, geo.rows, geo.cols);
    let simTurn = (gameIndex % 2 === 0) ? P1 : P2;
    let simMoves = 0;
    let simHistory = {};
    let redCenterPts = 0, blueCenterPts = 0;
    const centerRuleMode = geo.centerRule;

    while (simMoves < moveCap) {
      const legalMoves = getAllLegalMoves(simBoard, simTurn, geo);
      if (legalMoves.length === 0) {
        const winner = simTurn === P1 ? 'blue' : 'red';
        return {
          winner, endReason: 'stalemate', maxMovesSubReason: null,
          gameLength: simMoves, firstPlayer: (gameIndex % 2 === 0) ? 'red' : 'blue',
        };
      }

      let bestScore = simTurn === P2 ? -Infinity : Infinity;
      const scored = [];
      if (aiDepth === 1) {
        const caps = legalMoves.filter((m) => m.captured !== null);
        const pool = caps.length ? caps : legalMoves;
        pool.forEach((m) => scored.push({ move: m, score: m.captured !== null ? 1 : 0 }));
        bestScore = 1;
      } else {
        legalMoves.forEach((m) => {
          const nb = simBoard.slice();
          nb[m.to] = nb[m.from]; nb[m.from] = 0;
          if (m.captured !== null) nb[m.captured] = 0;
          const score = minimax(nb, aiDepth - 1, simTurn === P1, -Infinity, Infinity, geo);
          scored.push({ move: m, score: score });
          if (simTurn === P2 && score > bestScore) bestScore = score;
          else if (simTurn === P1 && score < bestScore) bestScore = score;
        });
      }

      let candidates = scored.filter((s) => s.score === bestScore).map((s) => s.move);
      if (!candidates.length) candidates = [legalMoves[0]];

      // Tiebreak only: among equal-score moves, prefer ones that do not increase a known position key
      const nonRepeat = [];
      for (let ci = 0; ci < candidates.length; ci++) {
        const m = candidates[ci];
        const probe = executeTurnWithCaptureChain(simBoard, m, simTurn, geo);
        const key = probe.board.join('') + '_' + simTurn;
        if (!simHistory[key]) nonRepeat.push(m);
      }
      const bestMove = (nonRepeat.length ? nonRepeat : candidates)[0];

      const turnResult = executeTurnWithCaptureChain(simBoard, bestMove, simTurn, geo);
      simBoard = turnResult.board;
      simMoves++;

      if (centerRuleMode === 'cumulative') {
        geo.centerNodes.forEach((idx) => {
          if (simBoard[idx] === P1) redCenterPts++;
          if (simBoard[idx] === P2) blueCenterPts++;
        });
      }

      const rCount = simBoard.filter((p) => p === P1).length;
      const bCount = simBoard.filter((p) => p === P2).length;
      if (rCount === 0) {
        return { winner: 'blue', endReason: 'elimination', maxMovesSubReason: null, gameLength: simMoves, firstPlayer: (gameIndex % 2 === 0) ? 'red' : 'blue' };
      }
      if (bCount === 0) {
        return { winner: 'red', endReason: 'elimination', maxMovesSubReason: null, gameLength: simMoves, firstPlayer: (gameIndex % 2 === 0) ? 'red' : 'blue' };
      }

      const key = simBoard.join('') + '_' + simTurn;
      simHistory[key] = (simHistory[key] || 0) + 1;
      if (simHistory[key] >= 3) {
        return { winner: 'draw', endReason: 'repetition', maxMovesSubReason: null, gameLength: simMoves, firstPlayer: (gameIndex % 2 === 0) ? 'red' : 'blue' };
      }

      simTurn = simTurn === P1 ? P2 : P1;
    }

    const resolved = resolveMaxMovesOutcome(simBoard, geo, centerRuleMode, redCenterPts, blueCenterPts);
    return {
      winner: resolved.winner,
      endReason: 'max_moves',
      maxMovesSubReason: resolved.maxMovesSubReason,
      gameLength: simMoves,
      firstPlayer: (gameIndex % 2 === 0) ? 'red' : 'blue',
    };
  }
`;
  if (!html.includes('window.GeminiLab = {')) throw new Error('export marker missing');
  return html.replace(
    'window.GeminiLab = {',
    injection + '\n  window.GeminiLab = {\n    playHeadlessGameRepAvoid,\n',
  );
}

function emptyStats() {
  return {
    games: 0, red: 0, blue: 0, draw: 0, totalMoves: 0,
    elimination: 0, repetition: 0, stalemate: 0, max_moves: 0,
    max_moves_captures: 0, max_moves_center: 0, max_moves_unresolved: 0,
  };
}

function summarize(stats, n, meta) {
  const pct = (x) => +((x / n) * 100).toFixed(1);
  return {
    ...meta,
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

function runConfig(playFn, Lab, beadsPerSide, centerRule, depth, n) {
  const geo = Lab.createLabConfig({
    beadsPerSide, rows: 4, cols: 4, centerRule,
    maxMoveLimit: MOVE_CAP, aiDepth: depth,
  });
  const stats = emptyStats();
  for (let i = 0; i < n; i++) {
    const g = playFn.call(null, geo, i, depth, MOVE_CAP);
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
  return summarize(stats, n, { beadsPerSide, centerRule, aiDepth: depth });
}

function baselineRow(centerRule) {
  const r = BASELINE.newMatrix.results.find(
    (x) => x.beadsPerSide === 6 && x.centerRule === centerRule,
  );
  return r;
}

function flagsVsBaseline(row, baseline) {
  const out = [];
  ['decisivePct', 'drawPct', 'repetitionPct', 'redWinPct', 'blueWinPct'].forEach((k) => {
    const delta = +(row[k] - baseline[k]).toFixed(1);
    if (Math.abs(delta) >= 5) out.push({ metric: k, baseline: baseline[k], value: row[k], delta });
  });
  return out;
}

const html = fs.readFileSync(path.join(ROOT, 'GEMINI_LAB.html'), 'utf8');
console.error('Loading standard LAB…');
const Lab = loadLabFromHtml(html, 'lab-std');
console.error('Loading LAB with in-memory rep-avoid patch…');
const LabRep = loadLabFromHtml(injectRepAvoid(html), 'lab-rep');

const experiments = [];
const tAll = Date.now();

// Depth 3
for (const c of CONFIGS) {
  console.error('depth3', c.label);
  const t0 = Date.now();
  const row = runConfig(Lab.playHeadlessGame, Lab, c.beadsPerSide, c.centerRule, 3, N);
  row.label = c.label + ' · depth 3';
  row.elapsedMs = Date.now() - t0;
  row.vsDepth2Baseline = flagsVsBaseline(row, baselineRow(c.centerRule));
  experiments.push(row);
  console.error('  decisive', row.decisivePct, 'draw', row.drawPct, 'rep', row.repetitionPct, 'ms', row.elapsedMs);
}

// Depth 4 — attempt full N; may be slow
let depth4Completed = true;
for (const c of CONFIGS) {
  console.error('depth4', c.label);
  const t0 = Date.now();
  try {
    const row = runConfig(Lab.playHeadlessGame, Lab, c.beadsPerSide, c.centerRule, 4, N);
    row.label = c.label + ' · depth 4';
    row.elapsedMs = Date.now() - t0;
    row.vsDepth2Baseline = flagsVsBaseline(row, baselineRow(c.centerRule));
    experiments.push(row);
    console.error('  decisive', row.decisivePct, 'draw', row.drawPct, 'rep', row.repetitionPct, 'ms', row.elapsedMs);
    if (row.elapsedMs > 20 * 60 * 1000) depth4Completed = false;
  } catch (e) {
    depth4Completed = false;
    experiments.push({ label: c.label + ' · depth 4', error: String(e), skipped: true });
  }
}

// Depth 2 + repetition-avoidance tiebreak
for (const c of CONFIGS) {
  console.error('depth2-repAvoid', c.label);
  const t0 = Date.now();
  const row = runConfig(LabRep.playHeadlessGameRepAvoid, LabRep, c.beadsPerSide, c.centerRule, 2, N);
  row.label = c.label + ' · depth 2 · rep-avoid tiebreak';
  row.elapsedMs = Date.now() - t0;
  row.repetitionAvoidance = true;
  row.vsDepth2Baseline = flagsVsBaseline(row, baselineRow(c.centerRule));
  experiments.push(row);
  console.error('  decisive', row.decisivePct, 'draw', row.drawPct, 'rep', row.repetitionPct, 'ms', row.elapsedMs);
}

const out = {
  generatedAt: new Date().toISOString(),
  purpose: '6-bead depth vs structural repetition investigation',
  sampleSizePerConfig: N,
  moveCap: MOVE_CAP,
  baselineSource: 'matrix-run-2026-08-10.json newMatrix 6-bead depth-2',
  baseline: {
    cumulative: baselineRow('cumulative'),
    endgame: baselineRow('endgame'),
  },
  depth4Completed,
  totalElapsedMs: Date.now() - tAll,
  experiments,
};

const outPath = path.join(ROOT, 'matrix-6bead-depth-experiment-2026-08-10.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  wrote: outPath,
  totalElapsedMs: out.totalElapsedMs,
  depth4Completed,
  summary: experiments.map((e) => ({
    label: e.label,
    decisive: e.decisivePct,
    draw: e.drawPct,
    rep: e.repetitionPct,
    elim: e.eliminationPct,
    max: e.maxMovesPct,
    avgLen: e.avgGameLength,
    flags: e.vsDepth2Baseline,
    elapsedMs: e.elapsedMs,
    error: e.error || null,
  })),
}, null, 2));
