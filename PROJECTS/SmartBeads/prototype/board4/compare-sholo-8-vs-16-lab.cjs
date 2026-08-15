'use strict';
/**
 * Lab-compare 8-bead (4×5) candidate vs 16-bead standard under the same protocol.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const eng16 = require('./sholo-guti-fullturn-engine.cjs');
const engSlice = require('./sholo-8-bead-fullturn-engine.cjs');
const metrics = require('./sholo-lab-metrics.cjs');
const protocol = require('./sholo-lab-protocol.cjs');

const DEPTHS = protocol.DEPTHS;
const SEEDS = protocol.SEEDS;
const N_GAMES = protocol.N_PER_SEED;
const MOVE_CAP = protocol.MOVE_CAP;
const EXPECTED_TOTAL = protocol.gamesPerCompareRun();
const SLICE = 8;
const HTML_SLICE = path.join(__dirname, 'SHOLO_GUTI_8_BEAD_WITH_FEATURE.html');
const OUT = path.join(__dirname, 'SHOLO_8_VS_16_LAB_COMPARE.json');
const API_NAME = '__SHOLO_GUTI_8_FEATURE__';

function assert(ok, msg) {
  if (!ok) throw new Error(msg);
}

function el() {
  return {
    style: {}, value: '2', textContent: '', disabled: false, dataset: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
    width: 560, height: 560,
    getContext: () => ({
      clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
      stroke() {}, fill() {}, arc() {}, save() {}, restore() {}, closePath() {},
      strokeRect() {},
      globalAlpha: 1,
      lineWidth: 1,
      strokeStyle: '',
      fillStyle: '',
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    }),
  };
}

function loadPlayableSliceApi() {
  if (!fs.existsSync(HTML_SLICE)) {
    return {
      N: engSlice.N,
      NODES: engSlice.NODES,
      ADJ: engSlice.ADJ,
      P1: engSlice.P1,
      P2: engSlice.P2,
      getBoard: () => engSlice.startingBoard(),
      getAllLegalMoves: (b, p) => engSlice.getAllLegalMoves(b, p),
    };
  }
  const html = fs.readFileSync(HTML_SLICE, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert(match, SLICE + '-bead HTML script missing');
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
  elements['match-timer-select'].value = 'off';
  elements['shot-clock-select'].value = 'off';
  elements['move-highlight-select'].value = 'on';
  const sandbox = {
    console, Math,
    performance: { now: () => Date.now() },
    requestAnimationFrame(fn) { return setTimeout(() => fn(Date.now()), 0); },
    cancelAnimationFrame() {},
    setTimeout(fn) { fn(); return 1; },
    clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    document: { getElementById: (id) => elements[id] || el(), addEventListener() {} },
    window: {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(match[1], sandbox);
  return sandbox.window[API_NAME];
}

function edgeCount(adj) {
  let e = 0;
  for (let i = 0; i < adj.length; i++) for (const j of adj[i]) if (j > i) e++;
  return e;
}

function runBatch(engine, depth, seed, n) {
  const games = [];
  for (let i = 0; i < n; i++) {
    games.push(engine.playHeadlessGame(depth, MOVE_CAP, (seed + i) >>> 0, engine.P1));
  }
  return games;
}

function fingerprint(games) {
  return games
    .map((g) => [g.seed, g.endReason, g.winner, g.gameLength, g.totalCaptures].join(':'))
    .join('|');
}

function main() {
  const t0 = Date.now();
  const play = loadPlayableSliceApi();

  // --- Geometry guards: prove Lab is NOT silently using 16-bead ---
  const geo = { checks: [] };
  function gcheck(name, ok, detail) {
    geo.checks.push({ name, ok: !!ok, detail });
  }
  gcheck('labSlice_N_20', engSlice.N === 20, { N: engSlice.N });
  gcheck('lab16_N_37', eng16.N === 37, { N: eng16.N });
  gcheck('labs_differ', engSlice.N !== eng16.N, { nSlice: engSlice.N, n16: eng16.N });
  gcheck('playableSlice_N_20', play.N === 20, { N: play.N });
  gcheck('playable_matches_labSlice_N', play.N === engSlice.N, {});
  gcheck('no_triangle_ids_labSlice', !engSlice.NODES.some((n) => n.id.startsWith('L') || n.id.startsWith('R')), {
    sampleIds: engSlice.NODES.slice(0, 3).map((n) => n.id),
  });
  gcheck('lab16_has_triangles', eng16.NODES.some((n) => n.id === 'LT') && eng16.NODES.some((n) => n.id === 'RT'), {});

  let coordMatch = true;
  for (let i = 0; i < engSlice.N; i++) {
    if (
      play.NODES[i].id !== engSlice.NODES[i].id ||
      play.NODES[i].x !== engSlice.NODES[i].x ||
      play.NODES[i].y !== engSlice.NODES[i].y
    ) {
      coordMatch = false;
      break;
    }
  }
  gcheck('playable_labSlice_node_coords', coordMatch, {});
  gcheck('edge_count_match', edgeCount(play.ADJ) === edgeCount(engSlice.ADJ), {
    play: edgeCount(play.ADJ), lab: edgeCount(engSlice.ADJ),
  });

  const sbSlice = engSlice.startingBoard();
  const sb16 = eng16.startingBoard();
  gcheck('start_counts_slice', engSlice.count(sbSlice, engSlice.P1) === SLICE && engSlice.count(sbSlice, engSlice.P2) === SLICE, {
    p1: engSlice.count(sbSlice, engSlice.P1), p2: engSlice.count(sbSlice, engSlice.P2),
  });
  gcheck('start_counts_16', eng16.count(sb16, eng16.P1) === 16 && eng16.count(sb16, eng16.P2) === 16, {
    p1: eng16.count(sb16, eng16.P1), p2: eng16.count(sb16, eng16.P2),
  });
  gcheck('start_board_len_not_37', sbSlice.length === 20, { len: sbSlice.length });

  const openPlay = play.getAllLegalMoves(play.getBoard(), play.P1).length;
  const openLab = engSlice.getAllLegalMoves(sbSlice, engSlice.P1).length;
  gcheck('opening_moves_match', openPlay === openLab, { openPlay, openLab });
  gcheck('start_fingerprint_differs_from_16', sbSlice.join('') !== sb16.join(''), {
    lenSlice: sbSlice.length, len16: sb16.length,
  });
  gcheck('node_count_differs_from_16', engSlice.NODES.length !== eng16.NODES.length, {
    nSlice: engSlice.NODES.length, n16: eng16.NODES.length,
  });

  const geoOk = geo.checks.every((c) => c.ok);
  assert(geoOk, 'Geometry guard failed: ' + geo.checks.filter((c) => !c.ok).map((c) => c.name).join(','));

  // --- Same protocol batches ---
  const perDepthSlice = {};
  const perDepth16 = {};
  const perDepthPerSeedSlice = {};
  const perDepthPerSeed16 = {};
  let totalGames = 0;

  for (const depth of DEPTHS) {
    perDepthSlice[depth] = [];
    perDepth16[depth] = [];
    perDepthPerSeedSlice[depth] = {};
    perDepthPerSeed16[depth] = {};
    for (const seed of SEEDS) {
      process.stderr.write(SLICE + '-bead depth=' + depth + ' seed=' + seed + '\n');
      const gSlice = runBatch(engSlice, depth, seed, N_GAMES);
      process.stderr.write('16-bead depth=' + depth + ' seed=' + seed + '\n');
      const g16 = runBatch(eng16, depth, seed, N_GAMES);
      perDepthPerSeedSlice[depth][seed] = metrics.summarizeGames(gSlice);
      perDepthPerSeed16[depth][seed] = metrics.summarizeGames(g16);
      perDepthSlice[depth].push(...gSlice);
      perDepth16[depth].push(...g16);
      totalGames += gSlice.length + g16.length;
    }
  }

  const sumSlice = {};
  const sum16 = {};
  for (const d of DEPTHS) {
    sumSlice[d] = metrics.summarizeGames(perDepthSlice[d]);
    sum16[d] = metrics.summarizeGames(perDepth16[d]);
  }

  const primaryKeys = metrics.allowedCompareMetrics(2);
  const secondaryKeys = metrics.allowedCompareMetrics(3);
  const diffsD2 = metrics.diffSummaries(2, sum16[2], sumSlice[2], primaryKeys);
  const diffsD3 = metrics.diffSummaries(3, sum16[3], sumSlice[3], secondaryKeys);
  const diffsD1 = metrics.diffSummaries(1, sum16[1], sumSlice[1], metrics.allowedCompareMetrics(1));

  const a = runBatch(engSlice, 2, 101, N_GAMES);
  const b = runBatch(engSlice, 2, 101, N_GAMES);
  const reproducibleSlice = fingerprint(a) === fingerprint(b);

  const report = {
    purpose: 'Compare candidate vs 16-bead standard — metrics and evidence only (no board verdict)',
    authoritativeEvaluator: 'evaluate-ladder-lab.cjs',
    candidateFile: '(removed — Web REJECT; was SHOLO_GUTI_8_BEAD_WITH_FEATURE.html)',
    candidateEngine: 'sholo-8-bead-fullturn-engine.cjs',
    baselineEngine: 'sholo-guti-fullturn-engine.cjs',
    protocol: protocol.protocolMeta({
      totalGames,
      expectedTotal: EXPECTED_TOTAL,
      searchSemantics: {
        1: engSlice.describeSearchSemantics(1),
        2: engSlice.describeSearchSemantics(2),
        3: engSlice.describeSearchSemantics(3),
      },
    }),
    geometryGuards: geo,
    geometryVerifiedNotSilent16Bead: geoOk,
    perDepthSlice: sumSlice,
    perDepth16: sum16,
    perDepthPerSeedSlice,
    perDepthPerSeed16,
    diffs: { depth1: diffsD1, depth2: diffsD2, depth3: diffsD3 },
    reproducibilitySlice: { depth: 2, baseSeed: 101, n: N_GAMES, identical: reproducibleSlice },
    elapsedMs: Date.now() - t0,
  };

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    slice: SLICE,
    geometryVerifiedNotSilent16Bead: geoOk,
    totalGames,
    expectedTotal: EXPECTED_TOTAL,
    reproducibleSlice,
    d2_slice: sumSlice[2],
    d2_16: sum16[2],
    diffsD2,
    elapsedMs: report.elapsedMs,
    out: OUT,
    note: 'Board verdict: run evaluate-ladder-lab.cjs',
  }, null, 2));
  process.stderr.write('metrics-only compare wrote ' + OUT + ' totalGames=' + totalGames + '\n');
  if (totalGames !== EXPECTED_TOTAL) process.exit(2);
  if (!reproducibleSlice) process.exit(3);
  if (!geoOk) process.exit(4);
}

main();
