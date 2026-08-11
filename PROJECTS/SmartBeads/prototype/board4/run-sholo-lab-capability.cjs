'use strict';
/**
 * Lab capability validation on known-good Sholo Guti calibration harness.
 * Depths 1/2/3 × seeds 101/202/303 × N=50 = 450 games. Plus reproducibility check.
 * Does not modify rules/geometry.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = __dirname;
const FILE = 'SHOLO_GUTI_CALIBRATION.html';

const DEPTHS = [1, 2, 3];
const SEEDS = [101, 202, 303];
const N = 50;
const MOVE_CAP = 120;

function el(id, extra) {
  const o = {
    id, style: {}, value: '', disabled: false, textContent: '',
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 520, height: 360 }),
    width: 520, height: 360,
    getContext: () => ({
      clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
      stroke() {}, fill() {}, arc() {}, setLineDash() {},
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    }),
  };
  return Object.assign(o, extra || {});
}

function loadCalibration() {
  const html = fs.readFileSync(path.join(ROOT, FILE), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('no script');
  const elements = {
    board: el('board'),
    status: el('status'),
    'ai-depth': el('ai-depth', { value: '2' }),
    seed: el('seed', { value: '101' }),
    'move-cap': el('move-cap', { value: '120' }),
    'finish-btn': el('finish-btn', { disabled: true }),
    log: el('log'),
    'geo-ascii': el('geo-ascii'),
  };
  const sandbox = {
    console, Math,
    setTimeout, clearTimeout,
    addEventListener() {},
    requestAnimationFrame(cb) { return setTimeout(() => cb(Date.now()), 0); },
    document: {
      getElementById: (id) => elements[id] || el(id),
      addEventListener() {},
    },
    window: {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(match[1], sandbox, { filename: FILE });
  const api = sandbox.window.SholoGutiCalibration;
  if (!api || !api.playHeadlessGame) throw new Error('SholoGutiCalibration API missing');
  return api;
}

function summarize(games) {
  let elim = 0, stalemate = 0, moveCap = 0, rep = 0;
  let lenSum = 0, capSum = 0;
  for (const g of games) {
    if (g.endReason === 'elimination') elim++;
    else if (g.endReason === 'stalemate') stalemate++;
    else if (g.endReason === 'move_cap_lab_safety') moveCap++;
    else if (g.endReason === 'repetition') rep++;
    else throw new Error('unknown endReason ' + g.endReason);
    lenSum += g.gameLength;
    capSum += g.totalCaptures;
  }
  const n = games.length;
  const forced = elim + stalemate;
  return {
    n,
    eliminationPct: (100 * elim) / n,
    forcedWinPct: (100 * forced) / n,
    elimOnlyPct: (100 * elim) / n,
    stalematePct: (100 * stalemate) / n,
    moveCapPct: (100 * moveCap) / n,
    repetitionPct: (100 * rep) / n,
    avgLength: lenSum / n,
    avgCaptures: capSum / n,
    counts: { elim, stalemate, moveCap, rep },
  };
}

function fingerprint(games) {
  return games.map((g) =>
    [g.seed, g.endReason, g.winner, g.gameLength, g.totalCaptures, g.chainStops, g.maxChain].join(':')
  ).join('|');
}

function runBatch(api, depth, seed, n) {
  const games = [];
  for (let i = 0; i < n; i++) {
    // Per-game seed offset keeps within-seed diversity while remaining deterministic
    const gameSeed = (seed + i * 9973) >>> 0;
    games.push(api.playHeadlessGame(depth, MOVE_CAP, gameSeed, api.P1));
  }
  return games;
}

function main() {
  const t0 = Date.now();
  const api = loadCalibration();

  // --- Code-derived depth semantics (from selectMoveForPlayer / minimax; no UI) ---
  const depthSemantics = {
    note: 'From SHOLO_GUTI_CALIBRATION.html selectMoveForPlayer + minimax. No Math.min cap.',
    1: {
      effective: 'greedy / 0-ply search',
      detail: 'depth<=1 → random among captures if any else legal; minimax not called',
    },
    2: {
      effective: '1 hop-ply after root move (minimax(depth-1) with arg 1)',
      detail: 'Root enumerates legal hops; each scored by minimax(..., 1, ...). Search unit = single hop, not full turn.',
    },
    3: {
      effective: '2 hop-plies after root move (minimax(depth-1) with arg 2)',
      detail: 'Same as depth 2 but minimax arg = 2. Genuinely deeper than depth 2. Still hop-based, not turn-based.',
    },
    chain: 'Chain continuation does not use minimax depth; depth<=1 random hop, else 1-eval greedy; 25% seeded early stop.',
  };

  const byDepth = {};
  const byDepthSeed = {};
  for (const depth of DEPTHS) {
    byDepth[depth] = [];
    byDepthSeed[depth] = {};
    for (const seed of SEEDS) {
      const games = runBatch(api, depth, seed, N);
      byDepthSeed[depth][seed] = { games, summary: summarize(games) };
      byDepth[depth].push(...games);
      process.stderr.write(`done depth=${depth} seed=${seed} n=${N}\n`);
    }
  }

  // Reproducibility: identical setup + seed → identical results
  const repDepth = 2;
  const repSeed = 101;
  const a = runBatch(api, repDepth, repSeed, N);
  const b = runBatch(api, repDepth, repSeed, N);
  const fpA = fingerprint(a);
  const fpB = fingerprint(b);
  const reproducible = fpA === fpB;

  const report = {
    totalGames: DEPTHS.length * SEEDS.length * N,
    expectedTotal: 450,
    moveCap: MOVE_CAP,
    seeds: SEEDS,
    nPerSeedPerDepth: N,
    depthSemantics,
    perDepth: {},
    perDepthPerSeed: {},
    reproducibility: {
      depth: repDepth,
      baseSeed: repSeed,
      n: N,
      identical: reproducible,
      fingerprintMatch: reproducible,
    },
    elapsedMs: Date.now() - t0,
  };

  for (const depth of DEPTHS) {
    report.perDepth[depth] = summarize(byDepth[depth]);
    report.perDepthPerSeed[depth] = {};
    for (const seed of SEEDS) {
      report.perDepthPerSeed[depth][seed] = byDepthSeed[depth][seed].summary;
    }
  }

  const outPath = path.join(ROOT, 'SHOLO_LAB_CAPABILITY_VALIDATION.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.error('wrote ' + outPath);
  if (report.totalGames !== 450) process.exit(2);
  if (!reproducible) process.exit(3);
}

main();
