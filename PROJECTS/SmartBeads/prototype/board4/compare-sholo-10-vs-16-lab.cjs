'use strict';
/**
 * Lab-compare 10-bead (5×5) candidate vs 16-bead standard under the same protocol.
 * Verifies Lab geometry is the 10-bead board (not silently the 37-point standard).
 * Does not change playable rules/boards. Does not build the next slice.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const eng16 = require('./sholo-guti-fullturn-engine.cjs');
const eng10 = require('./sholo-10-bead-fullturn-engine.cjs');
const metrics = require('./sholo-lab-metrics.cjs');
const protocol = require('./sholo-lab-protocol.cjs');

const DEPTHS = protocol.DEPTHS;
const SEEDS = protocol.SEEDS;
const N_GAMES = protocol.N_PER_SEED;
const MOVE_CAP = protocol.MOVE_CAP;
const EXPECTED_TOTAL = protocol.gamesPerCompareRun();
const { playablePath } = require('./playable-dir.cjs');
const HTML_10 = playablePath('SHOLO_GUTI_10_BEAD_WITH_FEATURE.html');
const OUT = path.join(__dirname, 'SHOLO_10_VS_16_LAB_COMPARE.json');

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
      stroke() {}, fill() {}, arc() {}, save() {}, restore() {},
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    }),
  };
}

function loadPlayable10Api() {
  const html = fs.readFileSync(HTML_10, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert(match, '10-bead HTML script missing');
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
  return sandbox.window.__SHOLO_GUTI_10_FEATURE__;
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
  const play = loadPlayable10Api();

  // --- Geometry guards: prove Lab is NOT silently using 16-bead ---
  const geo = { checks: [] };
  function gcheck(name, ok, detail) {
    geo.checks.push({ name, ok: !!ok, detail });
  }
  gcheck('lab10_N_25', eng10.N === 25, { N: eng10.N });
  gcheck('lab16_N_37', eng16.N === 37, { N: eng16.N });
  gcheck('labs_differ', eng10.N !== eng16.N, { n10: eng10.N, n16: eng16.N });
  gcheck('playable10_N_25', play.N === 25, { N: play.N });
  gcheck('playable_matches_lab10_N', play.N === eng10.N, {});
  gcheck('no_triangle_ids_lab10', !eng10.NODES.some((n) => n.id.startsWith('L') || n.id.startsWith('R')), {
    sampleIds: eng10.NODES.slice(0, 3).map((n) => n.id),
  });
  gcheck('lab16_has_triangles', eng16.NODES.some((n) => n.id === 'LT') && eng16.NODES.some((n) => n.id === 'RT'), {});

  let coordMatch = true;
  for (let i = 0; i < eng10.N; i++) {
    if (
      play.NODES[i].id !== eng10.NODES[i].id ||
      play.NODES[i].x !== eng10.NODES[i].x ||
      play.NODES[i].y !== eng10.NODES[i].y
    ) {
      coordMatch = false;
      break;
    }
  }
  gcheck('playable_lab10_node_coords', coordMatch, {});
  gcheck('edge_count_match', edgeCount(play.ADJ) === edgeCount(eng10.ADJ), {
    play: edgeCount(play.ADJ), lab: edgeCount(eng10.ADJ),
  });

  const sb10 = eng10.startingBoard();
  const sb16 = eng16.startingBoard();
  gcheck('start_counts_10', eng10.count(sb10, eng10.P1) === 10 && eng10.count(sb10, eng10.P2) === 10, {
    p1: eng10.count(sb10, eng10.P1), p2: eng10.count(sb10, eng10.P2),
  });
  gcheck('start_counts_16', eng16.count(sb16, eng16.P1) === 16 && eng16.count(sb16, eng16.P2) === 16, {
    p1: eng16.count(sb16, eng16.P1), p2: eng16.count(sb16, eng16.P2),
  });
  gcheck('start_board_len_not_37', sb10.length === 25, { len: sb10.length });

  const openPlay = play.getAllLegalMoves(play.getBoard(), play.P1).length;
  const openLab = eng10.getAllLegalMoves(sb10, eng10.P1).length;
  gcheck('opening_moves_match', openPlay === openLab, { openPlay, openLab });
  gcheck('start_fingerprint_differs_from_16', sb10.join('') !== sb16.join(''), {
    len10: sb10.length, len16: sb16.length,
  });
  gcheck('node_count_differs_from_16', eng10.NODES.length !== eng16.NODES.length, {
    n10: eng10.NODES.length, n16: eng16.NODES.length,
  });

  const geoOk = geo.checks.every((c) => c.ok);
  assert(geoOk, 'Geometry guard failed: ' + geo.checks.filter((c) => !c.ok).map((c) => c.name).join(','));

  // --- Same protocol batches ---
  const perDepth10 = {};
  const perDepth16 = {};
  const perDepthPerSeed10 = {};
  const perDepthPerSeed16 = {};
  let totalGames = 0;

  for (const depth of DEPTHS) {
    perDepth10[depth] = [];
    perDepth16[depth] = [];
    perDepthPerSeed10[depth] = {};
    perDepthPerSeed16[depth] = {};
    for (const seed of SEEDS) {
      process.stderr.write('10-bead depth=' + depth + ' seed=' + seed + '\n');
      const g10 = runBatch(eng10, depth, seed, N_GAMES);
      process.stderr.write('16-bead depth=' + depth + ' seed=' + seed + '\n');
      const g16 = runBatch(eng16, depth, seed, N_GAMES);
      perDepthPerSeed10[depth][seed] = metrics.summarizeGames(g10);
      perDepthPerSeed16[depth][seed] = metrics.summarizeGames(g16);
      perDepth10[depth].push(...g10);
      perDepth16[depth].push(...g16);
      totalGames += g10.length + g16.length;
    }
  }

  const sum10 = {};
  const sum16 = {};
  for (const d of DEPTHS) {
    sum10[d] = metrics.summarizeGames(perDepth10[d]);
    sum16[d] = metrics.summarizeGames(perDepth16[d]);
  }

  const primaryKeys = metrics.allowedCompareMetrics(2);
  const secondaryKeys = metrics.allowedCompareMetrics(3);
  const diffsD2 = metrics.diffSummaries(2, sum16[2], sum10[2], primaryKeys);
  const diffsD3 = metrics.diffSummaries(3, sum16[3], sum10[3], secondaryKeys);
  const diffsD1 = metrics.diffSummaries(1, sum16[1], sum10[1], metrics.allowedCompareMetrics(1));

  // Reproducibility on 10-bead D2
  const a = runBatch(eng10, 2, 101, N_GAMES);
  const b = runBatch(eng10, 2, 101, N_GAMES);
  const reproducible10 = fingerprint(a) === fingerprint(b);

  const report = {
    purpose: 'Compare 10-bead/5×5 candidate vs 16-bead standard — metrics and evidence only (no board verdict)',
    authoritativeEvaluator: 'evaluate-ladder-lab.cjs',
    candidateFile: 'SHOLO_GUTI_10_BEAD_WITH_FEATURE.html',
    candidateEngine: 'sholo-10-bead-fullturn-engine.cjs',
    baselineEngine: 'sholo-guti-fullturn-engine.cjs',
    protocol: protocol.protocolMeta({
      totalGames,
      expectedTotal: EXPECTED_TOTAL,
      searchSemantics: {
        1: eng10.describeSearchSemantics(1),
        2: eng10.describeSearchSemantics(2),
        3: eng10.describeSearchSemantics(3),
      },
    }),
    geometryGuards: geo,
    geometryVerifiedNotSilent16Bead: geoOk,
    perDepth10: sum10,
    perDepth16: sum16,
    perDepthPerSeed10,
    perDepthPerSeed16,
    diffs: { depth1: diffsD1, depth2: diffsD2, depth3: diffsD3 },
    reproducibility10: { depth: 2, baseSeed: 101, n: N_GAMES, identical: reproducible10 },
    elapsedMs: Date.now() - t0,
  };

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    geometryVerifiedNotSilent16Bead: geoOk,
    totalGames,
    expectedTotal: EXPECTED_TOTAL,
    reproducible10,
    d2_10: sum10[2],
    d2_16: sum16[2],
    diffsD2,
    elapsedMs: report.elapsedMs,
    out: OUT,
    note: 'Board verdict: run evaluate-ladder-lab.cjs',
  }, null, 2));
  process.stderr.write('metrics-only compare wrote ' + OUT + ' totalGames=' + totalGames + '\n');
  if (totalGames !== EXPECTED_TOTAL) process.exit(2);
  if (!reproducible10) process.exit(3);
  if (!geoOk) process.exit(4);
}

main();
