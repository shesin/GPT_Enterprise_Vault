'use strict';
/**
 * 4-bead depth sweep matched to existing 6-bead Board4 evidence methodology.
 * Uses on-disk GEMINI_LAB.html unchanged. Does NOT regenerate 6-bead games.
 *
 * Methodology (matched to 6-bead experiments):
 * - Board 4×4 via createLabConfig({ beadsPerSide, rows:4, cols:4, centerRule })
 * - Depths 2/3/4: N=725; depth 5: N=725 unless est runtime >25min → N=200
 * - Move cap 40; playHeadlessGame (chain-faithful); no rep-avoid; no AI changes
 * - First player: gameIndex % 2 (same as LAB)
 * - Depth>1 move pick: strict better score only (no tie random among equals)
 * - evaluateBoard still has LAB's built-in Math.random noise (unchanged)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const MOVE_CAP = 40;
const TARGET_N = 725;
const FALLBACK_N = 200;
const RUNTIME_THRESHOLD_MS = 25 * 60 * 1000;

const MATRIX_D2 = require('./matrix-run-2026-08-10.json');
const MATRIX_D34 = require('./matrix-6bead-depth-experiment-2026-08-10.json');
const MATRIX_D5 = require('./matrix-6bead-depth5-parity-2026-08-10.json');

const CONFIGS = [
  { label: '4 beads · cumulative', beadsPerSide: 4, centerRule: 'cumulative' },
  { label: '4 beads · endgame', beadsPerSide: 4, centerRule: 'endgame' },
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
  if (!sandbox.window.GeminiLab) throw new Error('GeminiLab missing');
  return sandbox.window.GeminiLab;
}

function emptyStats() {
  return {
    games: 0, red: 0, blue: 0, draw: 0, totalMoves: 0,
    lengths: [],
    elimination: 0, repetition: 0, stalemate: 0, max_moves: 0,
    max_moves_captures: 0, max_moves_center: 0, max_moves_unresolved: 0,
  };
}

function median(arr) {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : +(((s[mid - 1] + s[mid]) / 2).toFixed(2));
}

function summarize(stats, n, meta) {
  const pct = (x) => +((x / n) * 100).toFixed(1);
  const red = stats.red;
  const blue = stats.blue;
  const draw = stats.draw;
  const sumOutcomes = red + blue + draw;
  const sumReasons = stats.elimination + stats.repetition + stats.stalemate + stats.max_moves;
  return {
    ...meta,
    board: '4x4',
    games: n,
    N: n,
    redWinPct: pct(red),
    blueWinPct: pct(blue),
    drawPct: pct(draw),
    decisivePct: pct(red + blue),
    eliminationPct: pct(stats.elimination),
    repetitionPct: pct(stats.repetition),
    stalematePct: pct(stats.stalemate),
    maxMovesPct: pct(stats.max_moves),
    maxMovesCapturesPct: pct(stats.max_moves_captures),
    maxMovesCenterPct: pct(stats.max_moves_center),
    maxMovesUnresolvedPct: pct(stats.max_moves_unresolved),
    avgGameLength: +(stats.totalMoves / n).toFixed(2),
    medianGameLength: median(stats.lengths),
    consistencyCheck: {
      outcomesSumEqualsN: sumOutcomes === n,
      reasonsSumEqualsN: sumReasons === n,
      decisiveEqualsRedPlusBlue:
        Math.abs(pct(red + blue) - +(pct(red) + pct(blue)).toFixed(1)) < 0.2
        || pct(red + blue) === +((pct(red) + pct(blue)).toFixed(1)),
    },
    raw: {
      games: stats.games,
      red, blue, draw,
      totalMoves: stats.totalMoves,
      elimination: stats.elimination,
      repetition: stats.repetition,
      stalemate: stats.stalemate,
      max_moves: stats.max_moves,
      max_moves_captures: stats.max_moves_captures,
      max_moves_center: stats.max_moves_center,
      max_moves_unresolved: stats.max_moves_unresolved,
    },
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
    stats.lengths.push(g.gameLength);
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
  return summarize(stats, n, {
    beadsPerSide, centerRule, aiDepth: depth, dataOrigin: 'newly_collected_4bead',
  });
}

function estimateDepth5FullMs(Lab) {
  const geo = Lab.createLabConfig({
    beadsPerSide: 4, rows: 4, cols: 4, centerRule: 'cumulative',
    maxMoveLimit: MOVE_CAP, aiDepth: 5,
  });
  const probeN = 5;
  const t0 = Date.now();
  for (let i = 0; i < probeN; i++) Lab.playHeadlessGame(geo, i, 5, MOVE_CAP);
  const ms = Date.now() - t0;
  return { probeN, probeMs: ms, estFullMs: Math.round((ms / probeN) * TARGET_N * 2) };
}

function cellFromPrior6(depth, centerRule) {
  if (depth === 2) {
    const src = MATRIX_D2.newMatrix.results.find(
      (x) => x.beadsPerSide === 6 && x.centerRule === centerRule,
    );
    return {
      beadsPerSide: 6, board: '4x4', centerRule, aiDepth: 2,
      N: src.games, games: src.games,
      redWinPct: src.redWinPct, blueWinPct: src.blueWinPct,
      drawPct: src.drawPct, decisivePct: src.decisivePct,
      eliminationPct: src.eliminationPct, repetitionPct: src.repetitionPct,
      stalematePct: src.stalematePct, maxMovesPct: src.maxMovesPct,
      avgGameLength: src.avgGameLength, medianGameLength: null,
      dataOrigin: 'existing_6bead',
      sourceFile: 'matrix-run-2026-08-10.json#newMatrix',
      raw: src.raw,
    };
  }
  if (depth === 3 || depth === 4) {
    const src = MATRIX_D34.experiments.find(
      (x) => x.aiDepth === depth && x.centerRule === centerRule && !x.repetitionAvoidance,
    );
    return {
      beadsPerSide: 6, board: '4x4', centerRule, aiDepth: depth,
      N: src.games, games: src.games,
      redWinPct: src.redWinPct, blueWinPct: src.blueWinPct,
      drawPct: src.drawPct, decisivePct: src.decisivePct,
      eliminationPct: src.eliminationPct, repetitionPct: src.repetitionPct,
      stalematePct: src.stalematePct, maxMovesPct: src.maxMovesPct,
      avgGameLength: src.avgGameLength, medianGameLength: null,
      dataOrigin: 'existing_6bead',
      sourceFile: 'matrix-6bead-depth-experiment-2026-08-10.json',
      raw: src.raw,
    };
  }
  if (depth === 5) {
    const src = MATRIX_D5.depth5Results.find((x) => x.centerRule === centerRule);
    return {
      beadsPerSide: 6, board: '4x4', centerRule, aiDepth: 5,
      N: src.games, games: src.games,
      redWinPct: src.redWinPct, blueWinPct: src.blueWinPct,
      drawPct: src.drawPct, decisivePct: src.decisivePct,
      eliminationPct: src.eliminationPct, repetitionPct: src.repetitionPct,
      stalematePct: src.stalematePct, maxMovesPct: src.maxMovesPct,
      avgGameLength: src.avgGameLength, medianGameLength: null,
      dataOrigin: 'existing_6bead',
      sourceFile: 'matrix-6bead-depth5-parity-2026-08-10.json',
      sampleSizeNote: 'N=200 (reduced; same rule as depth-5 runtime threshold)',
      raw: src.raw,
    };
  }
  throw new Error('bad depth');
}

function stabilityFor(beads, cells) {
  const byRule = {};
  for (const rule of ['cumulative', 'endgame']) {
    const seq = [2, 3, 4, 5].map((d) => {
      const c = cells.find((x) => x.beadsPerSide === beads && x.centerRule === rule && x.aiDepth === d);
      return {
        depth: d,
        decisivePct: c.decisivePct,
        repetitionPct: c.repetitionPct,
        N: c.N,
      };
    });
    const deltas = [];
    for (let i = 1; i < seq.length; i++) {
      deltas.push(+(seq[i].decisivePct - seq[i - 1].decisivePct).toFixed(1));
    }
    const odd = seq.filter((s) => s.depth % 2 === 1).map((s) => s.decisivePct);
    const even = seq.filter((s) => s.depth % 2 === 0).map((s) => s.decisivePct);
    const avg = (a) => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
    const oddAvg = avg(odd);
    const evenAvg = avg(even);
    const largeSwing = deltas.some((d) => Math.abs(d) >= 15);
    let observation;
    if (oddAvg > evenAvg + 15) {
      observation = 'observed oscillation: odd depths higher decisive rate than even (pattern is not yet causally established)';
    } else if (evenAvg > oddAvg + 15) {
      observation = 'observed oscillation: even depths higher decisive rate than odd (pattern is not yet causally established)';
    } else if (largeSwing) {
      observation = 'observed instability: large step-to-step decisive swings (≥15pp) without clear odd/even average split';
    } else {
      observation = 'no strong oscillation flag under the ≥15pp odd/even-average rule; residual depth sensitivity may still exist';
    }
    byRule[rule] = {
      decisiveSequence: seq.map((s) => s.decisivePct).join(' → '),
      repetitionSequence: seq.map((s) => s.repetitionPct).join(' → '),
      NSequence: seq.map((s) => s.N).join(' → '),
      decisiveDeltasPp: deltas,
      oddAvgDecisivePct: oddAvg,
      evenAvgDecisivePct: evenAvg,
      observation,
    };
  }
  return byRule;
}

console.error('Loading LAB (read-only)…');
const Lab = loadLab();

// Sanity: 4-bead config path works
{
  const g = Lab.createLabConfig({ beadsPerSide: 4, rows: 4, cols: 4, centerRule: 'cumulative' });
  const one = Lab.playHeadlessGame(g, 0, 2, MOVE_CAP);
  if (!one || typeof one.gameLength !== 'number') throw new Error('4-bead path failed');
  console.error('Verified 4-bead createLabConfig + playHeadlessGame OK');
}

const fourBeadResults = [];
const tAll = Date.now();

for (const depth of [2, 3, 4]) {
  for (const c of CONFIGS) {
    console.error('4-bead depth', depth, c.centerRule, 'N=', TARGET_N);
    const t0 = Date.now();
    const row = runConfig(Lab, c.beadsPerSide, c.centerRule, depth, TARGET_N);
    row.label = `${c.label} · depth ${depth}`;
    row.elapsedMs = Date.now() - t0;
    fourBeadResults.push(row);
    console.error('  decisive', row.decisivePct, 'draw', row.drawPct, 'rep', row.repetitionPct,
      'avgLen', row.avgGameLength, 'median', row.medianGameLength, 'ms', row.elapsedMs);
  }
}

const depth5Est = estimateDepth5FullMs(Lab);
let depth5N = TARGET_N;
let depth5Reduced = false;
if (depth5Est.estFullMs > RUNTIME_THRESHOLD_MS) {
  depth5N = FALLBACK_N;
  depth5Reduced = true;
}
console.error('Depth5 estimate', depth5Est, 'using N=', depth5N, 'reduced=', depth5Reduced);

for (const c of CONFIGS) {
  console.error('4-bead depth 5', c.centerRule, 'N=', depth5N);
  const t0 = Date.now();
  const row = runConfig(Lab, c.beadsPerSide, c.centerRule, 5, depth5N);
  row.label = `${c.label} · depth 5`;
  row.elapsedMs = Date.now() - t0;
  row.sampleSizeNote = depth5Reduced
    ? `N=${depth5N} (reduced; est full N=725×2 ≈ ${depth5Est.estFullMs}ms > ${RUNTIME_THRESHOLD_MS}ms threshold)`
    : `N=${depth5N} (full target)`;
  fourBeadResults.push(row);
  console.error('  decisive', row.decisivePct, 'draw', row.drawPct, 'rep', row.repetitionPct,
    'avgLen', row.avgGameLength, 'median', row.medianGameLength, 'ms', row.elapsedMs);
}

const sixBeadCells = [];
for (const depth of [2, 3, 4, 5]) {
  for (const rule of ['cumulative', 'endgame']) {
    sixBeadCells.push(cellFromPrior6(depth, rule));
  }
}

const matrix16 = [];
for (const beads of [4, 6]) {
  for (const depth of [2, 3, 4, 5]) {
    for (const rule of ['cumulative', 'endgame']) {
      if (beads === 4) {
        const src = fourBeadResults.find(
          (x) => x.aiDepth === depth && x.centerRule === rule,
        );
        matrix16.push({
          beadsPerSide: 4,
          board: '4x4',
          aiDepth: depth,
          centerRule: rule,
          N: src.N,
          redWinPct: src.redWinPct,
          blueWinPct: src.blueWinPct,
          decisivePct: src.decisivePct,
          drawPct: src.drawPct,
          repetitionPct: src.repetitionPct,
          eliminationPct: src.eliminationPct,
          maxMovesPct: src.maxMovesPct,
          avgGameLength: src.avgGameLength,
          medianGameLength: src.medianGameLength,
          dataOrigin: 'newly_collected_4bead',
          sampleSizeNote: src.sampleSizeNote || `N=${src.N}`,
        });
      } else {
        const src = sixBeadCells.find(
          (x) => x.aiDepth === depth && x.centerRule === rule,
        );
        matrix16.push({
          beadsPerSide: 6,
          board: '4x4',
          aiDepth: depth,
          centerRule: rule,
          N: src.N,
          redWinPct: src.redWinPct,
          blueWinPct: src.blueWinPct,
          decisivePct: src.decisivePct,
          drawPct: src.drawPct,
          repetitionPct: src.repetitionPct,
          eliminationPct: src.eliminationPct,
          maxMovesPct: src.maxMovesPct,
          avgGameLength: src.avgGameLength,
          medianGameLength: src.medianGameLength,
          dataOrigin: 'existing_6bead',
          sampleSizeNote: src.sampleSizeNote || `N=${src.N}`,
          sourceFile: src.sourceFile,
        });
      }
    }
  }
}

const stability = {
  fourBead: stabilityFor(4, matrix16),
  sixBead: stabilityFor(6, matrix16),
};

const out = {
  generatedAt: new Date().toISOString(),
  purpose: 'Complete matched 4×4 4-bead vs 6-bead evidence matrix (data collection only)',
  methodology: {
    board: '4x4',
    moveCap: MOVE_CAP,
    labFile: 'GEMINI_LAB.html (on-disk, unmodified)',
    playFn: 'playHeadlessGame (chain-faithful)',
    centerRules: ['cumulative', 'endgame'],
    depths: [2, 3, 4, 5],
    nRule: {
      depths234: TARGET_N,
      depth5: 'N=725 unless estimated wall time for 2 configs exceeds 25 minutes → N=200',
      depth5DecisionThisRun: { estimate: depth5Est, N: depth5N, reduced: depth5Reduced },
    },
    randomization: 'LAB evaluateBoard includes Math.random()*2-1 noise; depth>1 root move uses strict score improvement (first best). First player alternates by gameIndex%2. No external seed.',
    sixBeadNotRegenerated: true,
    unavoidableDifferences: [
      '4-bead depth 2 freshly re-collected in this run (not copied from matrix-run-2026-08-10.json) so all eight 4-bead cells share one runner; 6-bead depth 2 remains the prior committed chain-faithful matrix cell.',
      'Median game length available for newly collected 4-bead cells only; prior 6-bead JSON did not store per-game lengths.',
      'Depth-5 N may differ from 725 for either bead count under the shared runtime threshold rule.',
    ],
  },
  fourBeadResults,
  sixBeadCellsImported: sixBeadCells,
  matrix16,
  stabilityObservations: stability,
  totalElapsedMs: Date.now() - tAll,
};

const outPath = path.join(ROOT, 'matrix-4x4-4vs6-complete-2026-08-10.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

console.log(JSON.stringify({
  wrote: outPath,
  totalElapsedMs: out.totalElapsedMs,
  depth5N,
  depth5Reduced,
  fourBeadSummary: fourBeadResults.map((r) => ({
    depth: r.aiDepth,
    rule: r.centerRule,
    N: r.N,
    decisive: r.decisivePct,
    draw: r.drawPct,
    rep: r.repetitionPct,
    elim: r.eliminationPct,
    max: r.maxMovesPct,
    avgLen: r.avgGameLength,
    medianLen: r.medianGameLength,
    ok: r.consistencyCheck,
  })),
  stability,
}, null, 2));
