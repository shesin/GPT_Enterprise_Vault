'use strict';
/**
 * Depth-5 sweep for 6-bead parity check vs prior depth 2/3/4 results.
 * Uses on-disk GEMINI_LAB.html unchanged (chain-faithful playHeadlessGame).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const MOVE_CAP = 40;
const TARGET_N = 725;
const FALLBACK_N = 200;

const PRIOR = require('./matrix-6bead-depth-experiment-2026-08-10.json');
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

function loadLab() {
  const html = fs.readFileSync(path.join(ROOT, 'GEMINI_LAB.html'), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('No script');
  const elements = Object.create(null);
  const sandbox = {
    console, Math, Date, Object, Array, Set, Map, Infinity, parseInt, parseFloat, isFinite,
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestIdleCallback: (cb) => setTimeout(cb, 0),
    window: {},
    document: {
      getElementById: (id) => {
        if (!elements[id]) elements[id] = el(id);
        return elements[id];
      },
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
  vm.runInNewContext(match[1], sandbox, { filename: 'lab.js' });
  return sandbox.window.GeminiLab;
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

function runConfig(Lab, beadsPerSide, centerRule, depth, n) {
  const geo = Lab.createLabConfig({
    beadsPerSide, rows: 4, cols: 4, centerRule,
    maxMoveLimit: MOVE_CAP, aiDepth: depth,
  });
  const stats = emptyStats();
  for (let i = 0; i < n; i++) {
    const g = Lab.playHeadlessGame(geo, i, depth, MOVE_CAP);
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

function priorDepthRow(depth, centerRule) {
  if (depth === 2) {
    const src = BASELINE.newMatrix.results.find(
      (x) => x.beadsPerSide === 6 && x.centerRule === centerRule,
    );
    return {
      aiDepth: 2,
      centerRule,
      games: src.games,
      redWinPct: src.redWinPct,
      blueWinPct: src.blueWinPct,
      drawPct: src.drawPct,
      decisivePct: src.decisivePct,
      repetitionPct: src.repetitionPct,
      eliminationPct: src.eliminationPct,
      maxMovesPct: src.maxMovesPct,
      avgGameLength: src.avgGameLength,
      source: 'matrix-run-2026-08-10.json newMatrix',
    };
  }
  const src = PRIOR.experiments.find(
    (x) => x.aiDepth === depth && x.centerRule === centerRule && !x.repetitionAvoidance,
  );
  return {
    aiDepth: depth,
    centerRule,
    games: src.games,
    redWinPct: src.redWinPct,
    blueWinPct: src.blueWinPct,
    drawPct: src.drawPct,
    decisivePct: src.decisivePct,
    repetitionPct: src.repetitionPct,
    eliminationPct: src.eliminationPct,
    maxMovesPct: src.maxMovesPct,
    avgGameLength: src.avgGameLength,
    source: 'matrix-6bead-depth-experiment-2026-08-10.json',
  };
}

function classifyParityPattern(sequence) {
  // sequence: [{depth, decisivePct}, ...] sorted by depth
  const byParity = { odd: [], even: [] };
  sequence.forEach((s) => {
    (s.depth % 2 === 0 ? byParity.even : byParity.odd).push(s.decisivePct);
  });
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const oddAvg = avg(byParity.odd);
  const evenAvg = avg(byParity.even);
  const oddHighEvenLow = oddAvg != null && evenAvg != null && oddAvg > evenAvg + 15;
  const evenHighOddLow = oddAvg != null && evenAvg != null && evenAvg > oddAvg + 15;
  const last = sequence[sequence.length - 1];
  const prev = sequence[sequence.length - 2];
  const oscillatingAtEnd = prev && Math.abs(last.decisivePct - prev.decisivePct) >= 15
    && (last.depth % 2 !== prev.depth % 2);
  let patternNote;
  if (oddHighEvenLow) {
    patternNote = 'odd_depths_high_even_depths_low';
  } else if (evenHighOddLow) {
    patternNote = 'even_depths_high_odd_depths_low';
  } else {
    patternNote = 'no_clear_parity_split_by_15pp_avg';
  }
  return {
    oddAvgDecisivePct: oddAvg != null ? +oddAvg.toFixed(1) : null,
    evenAvgDecisivePct: evenAvg != null ? +evenAvg.toFixed(1) : null,
    patternNote,
    continuesOscillationVsPriorStep: !!oscillatingAtEnd,
    depth5VsDepth4DeltaPp: prev && last ? +(last.decisivePct - prev.decisivePct).toFixed(1) : null,
  };
}

const Lab = loadLab();

// Timing probe
console.error('Timing depth 5 sample…');
{
  const geo = Lab.createLabConfig({
    beadsPerSide: 6, rows: 4, cols: 4, centerRule: 'cumulative',
    maxMoveLimit: MOVE_CAP, aiDepth: 5,
  });
  const probeN = 5;
  const t0 = Date.now();
  for (let i = 0; i < probeN; i++) Lab.playHeadlessGame(geo, i, 5, MOVE_CAP);
  const ms = Date.now() - t0;
  const estFull = Math.round((ms / probeN) * TARGET_N * 2);
  console.error(JSON.stringify({ probeN, ms, estFullMs: estFull }));
}

// Choose N: if estimated > 25 min, use FALLBACK_N
let N = TARGET_N;
let nReduced = false;
{
  const geo = Lab.createLabConfig({
    beadsPerSide: 6, rows: 4, cols: 4, centerRule: 'cumulative',
    maxMoveLimit: MOVE_CAP, aiDepth: 5,
  });
  const probeN = 5;
  const t0 = Date.now();
  for (let i = 0; i < probeN; i++) Lab.playHeadlessGame(geo, i, 5, MOVE_CAP);
  const ms = Date.now() - t0;
  const estFull = (ms / probeN) * TARGET_N * 2;
  if (estFull > 25 * 60 * 1000) {
    N = FALLBACK_N;
    nReduced = true;
    console.error('Reducing N to', N, 'estFull was', Math.round(estFull), 'ms');
  }
}

const depth5 = [];
const tAll = Date.now();
for (const c of CONFIGS) {
  console.error('depth5', c.label, 'N=', N);
  const t0 = Date.now();
  const row = runConfig(Lab, c.beadsPerSide, c.centerRule, 5, N);
  row.label = c.label + ' · depth 5';
  row.elapsedMs = Date.now() - t0;
  depth5.push(row);
  console.error('  decisive', row.decisivePct, 'draw', row.drawPct, 'rep', row.repetitionPct, 'ms', row.elapsedMs);
}

const comparisonTable = [];
for (const c of CONFIGS) {
  const seq = [];
  for (const d of [2, 3, 4]) {
    const r = priorDepthRow(d, c.centerRule);
    seq.push({ depth: d, decisivePct: r.decisivePct });
    comparisonTable.push({
      beadsPerSide: 6,
      centerRule: c.centerRule,
      aiDepth: d,
      games: r.games,
      redWinPct: r.redWinPct,
      blueWinPct: r.blueWinPct,
      drawPct: r.drawPct,
      decisivePct: r.decisivePct,
      repetitionPct: r.repetitionPct,
      eliminationPct: r.eliminationPct,
      maxMovesPct: r.maxMovesPct,
      avgGameLength: r.avgGameLength,
      source: r.source,
    });
  }
  const d5 = depth5.find((x) => x.centerRule === c.centerRule);
  seq.push({ depth: 5, decisivePct: d5.decisivePct });
  comparisonTable.push({
    beadsPerSide: 6,
    centerRule: c.centerRule,
    aiDepth: 5,
    games: d5.games,
    redWinPct: d5.redWinPct,
    blueWinPct: d5.blueWinPct,
    drawPct: d5.drawPct,
    decisivePct: d5.decisivePct,
    repetitionPct: d5.repetitionPct,
    eliminationPct: d5.eliminationPct,
    maxMovesPct: d5.maxMovesPct,
    avgGameLength: d5.avgGameLength,
    source: 'this run',
    elapsedMs: d5.elapsedMs,
  });

  const parity = classifyParityPattern(seq);
  comparisonTable.push({
    type: 'parity_flag',
    centerRule: c.centerRule,
    decisiveSequence: seq.map((s) => `${s.depth}:${s.decisivePct}`).join(' → '),
    ...parity,
  });
}

const out = {
  generatedAt: new Date().toISOString(),
  purpose: '6-bead depth-5 sweep for minimax odd/even search-parity check',
  sampleSizePerConfig: N,
  nReduced,
  targetN: TARGET_N,
  moveCap: MOVE_CAP,
  depth5Completed: true,
  totalElapsedMs: Date.now() - tAll,
  depth5Results: depth5,
  comparisonTableDepth2to5: comparisonTable,
};

const outPath = path.join(ROOT, 'matrix-6bead-depth5-parity-2026-08-10.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  wrote: outPath,
  N,
  nReduced,
  totalElapsedMs: out.totalElapsedMs,
  depth5: depth5.map((e) => ({
    label: e.label,
    decisive: e.decisivePct,
    draw: e.drawPct,
    rep: e.repetitionPct,
    elim: e.eliminationPct,
    max: e.maxMovesPct,
    avgLen: e.avgGameLength,
    elapsedMs: e.elapsedMs,
  })),
  parityFlags: comparisonTable.filter((x) => x.type === 'parity_flag'),
}, null, 2));
