'use strict';
/**
 * Final trust gate for Sholo full-turn Lab before SmartBeads candidate testing.
 * Small targeted tests only. Draws/reps/move-cap are legitimate outcomes.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const engine = require('./sholo-guti-fullturn-engine.cjs');
const metrics = require('./sholo-lab-metrics.cjs');

const MOVE_CAP = 120;

function check(checks, name, ok, detail) {
  checks.push({ name, ok: !!ok, detail });
}

function el() {
  return {
    style: {}, value: '2', textContent: '', disabled: false,
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 520 }),
    width: 500, height: 680,
    getContext: () => ({
      clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
      stroke() {}, fill() {}, arc() {}, setLineDash() {},
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    }),
  };
}

function loadPlayableApi() {
  const html = fs.readFileSync(path.join(__dirname, 'SHOLO_GUTI.html'), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('no script in SHOLO_GUTI.html');
  const ids = [
    'board', 'board-frame', 'status', 'finish-btn', 'ai-level', 'level-note',
    'human-count', 'ai-count', 'human-caps', 'ai-caps', 'turn-count',
    'pill-human', 'pill-ai', 'win-modal', 'modal-title', 'modal-desc',
    'restart-btn', 'play-again-btn', 'bgm-audio', 'bgm-select', 'bgm-vol',
    'bgm-play', 'bgm-pause',
  ];
  const elements = Object.fromEntries(ids.map((i) => [i, el()]));
  elements['ai-level'].value = '2';
  const sandbox = {
    console, Math,
    performance: { now: () => Date.now() },
    requestAnimationFrame: (cb) => setTimeout(() => cb(Date.now()), 0),
    setTimeout, clearTimeout, addEventListener() {},
    document: { getElementById: (id) => elements[id] || el(), addEventListener() {} },
    window: {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(match[1], sandbox);
  return sandbox.window.__SHOLO_GUTI__;
}

function edgeCount(adj) {
  let e = 0;
  for (let i = 0; i < adj.length; i++) for (const j of adj[i]) if (j > i) e++;
  return e;
}

function runBatch(depth, seed, n, first, moveCap) {
  const games = [];
  for (let i = 0; i < n; i++) {
    games.push(engine.playHeadlessGame(depth, moveCap || MOVE_CAP, (seed + i) >>> 0, first));
  }
  return games;
}

function fingerprint(games) {
  return games
    .map((g) => [g.seed, g.endReason, g.winner, g.gameLength, g.totalCaptures].join(':'))
    .join('|');
}

function buildCaptureChainBoard() {
  // Find collinear capture that may continue; pad pieces without blocking landings.
  const board = new Array(engine.N).fill(0);
  let from = -1; let over = -1; let land = -1;
  for (let i = 0; i < engine.N && from < 0; i++) {
    for (const o of engine.ADJ[i]) {
      const l = engine.continueCollinear(i, o);
      if (l >= 0) { from = i; over = o; land = l; break; }
    }
  }
  board[from] = engine.P1;
  board[over] = engine.P2;
  const reserved = new Set([from, over, land]);
  // Try to place a second enemy for a possible chain from land if geometry allows
  let chainExtra = false;
  let land2 = -1;
  for (const o2 of engine.ADJ[land]) {
    if (board[o2] || reserved.has(o2)) continue;
    const l2 = engine.continueCollinear(land, o2);
    if (l2 >= 0 && !board[l2] && !reserved.has(l2)) {
      board[o2] = engine.P2;
      reserved.add(o2);
      reserved.add(l2);
      land2 = l2;
      chainExtra = true;
      break;
    }
  }
  let filled = 0;
  for (let k = 0; k < engine.N && filled < 8; k++) {
    if (!board[k] && !reserved.has(k)) { board[k] = engine.P1; filled++; }
  }
  filled = 0;
  for (let k = 0; k < engine.N && filled < 8; k++) {
    if (!board[k] && !reserved.has(k)) { board[k] = engine.P2; filled++; }
  }
  return { board, from, chainExtra, land, land2 };
}

function main() {
  const t0 = Date.now();
  const checks = [];

  // --- A. Playable parity (rules/geometry) ---
  const play = loadPlayableApi();
  check(checks, 'parity_N', play.N === engine.N && engine.N === 37, { play: play.N, lab: engine.N });
  check(checks, 'parity_edges', edgeCount(play.ADJ) === edgeCount(engine.ADJ), {
    play: edgeCount(play.ADJ), lab: edgeCount(engine.ADJ),
  });
  const pb = play.getBoard();
  const lb = engine.startingBoard();
  check(checks, 'parity_start_counts', play.count(play.P1) === 16 && engine.count(lb, engine.P1) === 16 && engine.count(lb, engine.P2) === 16, {
    playP1: play.count(play.P1), labP1: engine.count(lb, engine.P1), labP2: engine.count(lb, engine.P2),
  });
  // Same node ids / lattice coords
  let coordMatch = true;
  for (let i = 0; i < engine.N; i++) {
    if (play.NODES[i].id !== engine.NODES[i].id || play.NODES[i].x !== engine.NODES[i].x || play.NODES[i].y !== engine.NODES[i].y) {
      coordMatch = false; break;
    }
  }
  check(checks, 'parity_node_coords', coordMatch, {});
  const playMoves = play.getAllLegalMoves(pb, play.P1).length;
  const labMoves = engine.getAllLegalMoves(lb, engine.P1).length;
  check(checks, 'parity_opening_move_count', playMoves === labMoves, { playMoves, labMoves });

  // --- B. Full-turn / chain optionality ---
  const { board: chainBoard, from, chainExtra } = buildCaptureChainBoard();
  const ends = engine.generateTurnEnds(chainBoard, engine.P1, 200);
  const fromEnds = ends.filter((e) => e.path[0].from === from && e.path[0].captured !== null);
  const hasStopAfterOne = fromEnds.some((e) => e.path.length === 1);
  const hasContinue = fromEnds.some((e) => e.path.length >= 2);
  check(checks, 'chain_optional_early_stop', hasStopAfterOne, { fromEnds: fromEnds.length, chainExtra });
  if (chainExtra) {
    check(checks, 'chain_optional_continue_enumerated', hasContinue, { fromEnds: fromEnds.length });
  } else {
    check(checks, 'chain_optional_continue_enumerated', true, { skipped: 'no second jump on this geometry sample' });
  }
  const det = engine.generateTurnEndsDetailed(lb, engine.P1, 5);
  check(checks, 'truncation_flag_works', det.truncated === true && det.ends.length === 5, {
    truncated: det.truncated, n: det.ends.length,
  });

  // --- C. Depth / perspective ---
  check(checks, 'depth1_reply', engine.opponentReplyPlies(1) === -1, {});
  check(checks, 'depth2_reply', engine.opponentReplyPlies(2) === 0, {});
  check(checks, 'depth3_reply', engine.opponentReplyPlies(3) === 1, {});
  check(checks, 'no_depth_math_min_cap', engine.describeSearchSemantics(3).depthCapMathMin === false, {});

  // P1 and P2 capture preference
  function preferCap(player) {
    const b = new Array(engine.N).fill(0);
    let f = -1; let o = -1; let l = -1;
    for (let i = 0; i < engine.N && f < 0; i++) {
      for (const ov of engine.ADJ[i]) {
        const ld = engine.continueCollinear(i, ov);
        if (ld >= 0) { f = i; o = ov; l = ld; break; }
      }
    }
    b[f] = player;
    b[o] = player === engine.P1 ? engine.P2 : engine.P1;
    let filled = 0;
    for (let k = 0; k < engine.N && filled < 10; k++) if (!b[k] && k !== l) { b[k] = player; filled++; }
    filled = 0;
    const enemy = player === engine.P1 ? engine.P2 : engine.P1;
    for (let k = 0; k < engine.N && filled < 10; k++) if (!b[k] && k !== l) { b[k] = enemy; filled++; }
    engine.setAiTestSeed(11);
    const path = engine.selectAITurn(2, b, player, {});
    engine.clearAiTestSeed();
    return engine.pathCaptureCount(path) >= 1;
  }
  check(checks, 'p1_perspective_capture', preferCap(engine.P1), {});
  check(checks, 'p2_perspective_capture', preferCap(engine.P2), {});

  // --- D. Reproducibility ---
  const a = runBatch(2, 101, 25, engine.P1);
  const b = runBatch(2, 101, 25, engine.P1);
  check(checks, 'repro_D2', fingerprint(a) === fingerprint(b), { n: 25 });

  // --- E. Metrics split + aggregation ---
  const sum = metrics.summarizeGames(a);
  check(checks, 'metrics_partition', Math.abs(sum.p1WinPct + sum.p2WinPct + sum.drawPct - 100) < 1e-9, sum);
  check(checks, 'draw_split_fields', sum.repetitionDrawPct != null && sum.moveCapDrawPct != null, {
    rep: sum.repetitionDrawPct, cap: sum.moveCapDrawPct,
  });
  check(checks, 'primary_D2_decisive', sum.forcedWinPct >= 30 && sum.avgCaptures >= 12, sum);

  // Guard: comparing D3 elim must throw
  let guardOk = false;
  try {
    metrics.assertSafeCompare(3, ['eliminationPct']);
  } catch (e) {
    guardOk = /Unsafe|misleading/i.test(String(e.message));
  }
  check(checks, 'guard_blocks_D3_elim_rank', guardOk, {});
  check(checks, 'guard_allows_D2_elim', metrics.assertSafeCompare(2, ['eliminationPct', 'avgCaptures']) === true, {});

  // --- F. Move-cap metric sensitivity (D3) ---
  const shortCap = metrics.summarizeGames(runBatch(3, 303, 15, engine.P1, 40));
  const longCap = metrics.summarizeGames(runBatch(3, 303, 15, engine.P1, 80));
  check(checks, 'move_cap_affects_length', longCap.avgLength > shortCap.avgLength + 5, {
    short: shortCap.avgLength, long: longCap.avgLength,
  });

  // --- G. First-player / symmetry (small) ---
  const fp1 = metrics.summarizeGames(runBatch(2, 7000, 20, engine.P1));
  const fp2 = metrics.summarizeGames(runBatch(2, 8000, 20, engine.P2));
  check(checks, 'fpa_measurable', fp1.firstPlayerWinPctAmongDecisive != null && fp2.firstPlayerWinPctAmongDecisive != null, {
    fp1: fp1.firstPlayerWinPctAmongDecisive, fp2: fp2.firstPlayerWinPctAmongDecisive,
  });
  const fpaDelta = Math.abs(fp1.firstPlayerWinPctAmongDecisive - fp2.firstPlayerWinPctAmongDecisive);
  check(checks, 'ai_symmetry_fpa', fpaDelta <= 30, { fpaDelta });

  // --- H. Depth character differs (instrument responds) ---
  const d2 = metrics.summarizeGames(runBatch(2, 202, 20, engine.P1));
  const d3 = metrics.summarizeGames(runBatch(3, 202, 20, engine.P1));
  check(checks, 'D2_vs_D3_regime_differs', Math.abs(d2.forcedWinPct - d3.forcedWinPct) >= 20 || Math.abs(d2.avgLength - d3.avgLength) >= 15, {
    d2: { elim: d2.forcedWinPct, len: d2.avgLength, caps: d2.avgCaptures },
    d3: { elim: d3.forcedWinPct, len: d3.avgLength, caps: d3.avgCaptures, moveCap: d3.moveCapDrawPct },
  });

  // Branch limits explicit
  check(checks, 'branch_limits_documented', engine.SEARCH_LIMITS.chainDepthMax === 8 && engine.rootBranch(3) === 120, {
    root3: engine.rootBranch(3), reply3: engine.replyBranch(3),
  });

  const failed = checks.filter((c) => !c.ok);
  const ready = failed.length === 0;
  const report = {
    verdict: ready ? 'READY' : 'NOT READY',
    purpose: 'Final trust gate before SmartBeads candidate testing',
    comparisonProtocol: metrics.COMPARISON_PROTOCOL,
    checks,
    failed: failed.map((f) => f.name),
    samples: { primaryD2: sum, fpa: { fp1, fp2 }, d2, d3, moveCapSens: { shortCap, longCap } },
    searchSemantics: {
      1: engine.describeSearchSemantics(1),
      2: engine.describeSearchSemantics(2),
      3: engine.describeSearchSemantics(3),
    },
    searchLimits: engine.SEARCH_LIMITS,
    elapsedMs: Date.now() - t0,
    note: 'READY means Lab+methodology are trustworthy for future config compares under comparisonProtocol. Not a claim about SmartBeads boards.',
  };
  const out = path.join(__dirname, 'SHOLO_LAB_FINAL_TRUST.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, failed: report.failed, checks: checks.length, elapsedMs: report.elapsedMs }, null, 2));
  process.stderr.write('verdict=' + report.verdict + ' failed=' + report.failed.join(',') + '\n');
  process.exit(ready ? 0 : 5);
}

main();
