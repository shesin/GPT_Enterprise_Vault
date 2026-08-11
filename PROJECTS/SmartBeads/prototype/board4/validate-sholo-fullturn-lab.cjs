'use strict';
/**
 * Small validation suite: is the full-turn Sholo Lab ready for future
 * SmartBeads config comparison? Draws/repetitions are legitimate outcomes.
 */
const fs = require('fs');
const path = require('path');
const engine = require('./sholo-guti-fullturn-engine.cjs');

const MOVE_CAP = 120;
const DEPTHS = [1, 2, 3];
const SEEDS = [101, 202, 303];
const N = 30; // small validation, not large experiment

function summarize(games) {
  let elim = 0;
  let stalemate = 0;
  let moveCap = 0;
  let rep = 0;
  let p1Wins = 0;
  let p2Wins = 0;
  let draws = 0;
  let firstWins = 0;
  let decisive = 0;
  let lenSum = 0;
  let capSum = 0;
  for (const g of games) {
    if (g.endReason === 'elimination') elim++;
    else if (g.endReason === 'stalemate') stalemate++;
    else if (g.endReason === 'move_cap_lab_safety') moveCap++;
    else if (g.endReason === 'repetition') rep++;
    if (g.winner === 'P1') p1Wins++;
    else if (g.winner === 'P2') p2Wins++;
    else draws++;
    if (g.winner !== 'draw') {
      decisive++;
      if (g.firstPlayerWon) firstWins++;
    }
    lenSum += g.gameLength;
    capSum += g.totalCaptures;
  }
  const n = games.length;
  return {
    n,
    eliminationPct: (100 * elim) / n,
    forcedWinPct: (100 * (elim + stalemate)) / n,
    moveCapPct: (100 * moveCap) / n,
    repetitionPct: (100 * rep) / n,
    drawPct: (100 * draws) / n,
    p1WinPct: (100 * p1Wins) / n,
    p2WinPct: (100 * p2Wins) / n,
    firstPlayerWinPctAmongDecisive: decisive ? (100 * firstWins) / decisive : null,
    firstPlayerAdvantagePp: decisive ? (100 * firstWins) / decisive - 50 : null,
    avgLength: lenSum / n,
    avgCaptures: capSum / n,
    counts: { elim, stalemate, moveCap, rep, p1Wins, p2Wins, draws, decisive },
  };
}

function fingerprint(games) {
  return games
    .map((g) =>
      [g.seed, g.endReason, g.winner, g.gameLength, g.totalCaptures, g.p1Captures, g.p2Captures].join(':')
    )
    .join('|');
}

function runBatch(depth, seed, n, firstPlayer) {
  const games = [];
  for (let i = 0; i < n; i++) {
    games.push(engine.playHeadlessGame(depth, MOVE_CAP, (seed + i) >>> 0, firstPlayer));
  }
  return games;
}

function testPerspectiveCapture() {
  // Construct: P1 can capture or slide; P1 at L2 must prefer capture.
  const board = new Array(engine.N).fill(0);
  let from = -1;
  let over = -1;
  let land = -1;
  for (let i = 0; i < engine.N && from < 0; i++) {
    for (const o of engine.ADJ[i]) {
      const l = engine.continueCollinear(i, o);
      if (l >= 0) {
        from = i;
        over = o;
        land = l;
        break;
      }
    }
  }
  board[from] = engine.P1;
  board[over] = engine.P2;
  // Pad so game isn't instantly over
  let filled = 0;
  for (let k = 0; k < engine.N && filled < 10; k++) {
    if (!board[k] && k !== land) {
      board[k] = engine.P1;
      filled++;
    }
  }
  filled = 0;
  for (let k = 0; k < engine.N && filled < 10; k++) {
    if (!board[k] && k !== land) {
      board[k] = engine.P2;
      filled++;
    }
  }
  engine.setAiTestSeed(7);
  const path = engine.selectAITurn(2, board, engine.P1, {});
  engine.clearAiTestSeed();
  const caps = path ? engine.pathCaptureCount(path) : 0;
  const legalCaps = engine.getMovesForNode(board, from, engine.P1).filter((m) => m.captured !== null);
  return {
    ok: caps >= 1 && legalCaps.length >= 1,
    caps,
    legalCaps: legalCaps.length,
    pathLen: path && path.length,
  };
}

function testP2AlsoCaptures() {
  const board = new Array(engine.N).fill(0);
  let from = -1;
  let over = -1;
  let land = -1;
  for (let i = 0; i < engine.N && from < 0; i++) {
    for (const o of engine.ADJ[i]) {
      const l = engine.continueCollinear(i, o);
      if (l >= 0) {
        from = i;
        over = o;
        land = l;
        break;
      }
    }
  }
  board[from] = engine.P2;
  board[over] = engine.P1;
  let filled = 0;
  for (let k = 0; k < engine.N && filled < 10; k++) {
    if (!board[k] && k !== land) {
      board[k] = engine.P2;
      filled++;
    }
  }
  filled = 0;
  for (let k = 0; k < engine.N && filled < 10; k++) {
    if (!board[k] && k !== land) {
      board[k] = engine.P1;
      filled++;
    }
  }
  engine.setAiTestSeed(9);
  const path = engine.selectAITurn(2, board, engine.P2, {});
  engine.clearAiTestSeed();
  return { ok: engine.pathCaptureCount(path) >= 1, caps: engine.pathCaptureCount(path) };
}

function depthOk(depth, summary) {
  if (summary.avgLength < 8) return false;
  if (summary.avgCaptures < 5) return false;
  if (depth <= 2) {
    // Primary W/L protocol depths: need decisive games with material exchange
    return summary.forcedWinPct >= 30 && summary.avgCaptures >= 12;
  }
  // Depth 3 is long-horizon attrition: captures under long games matter;
  // high move-cap / draw rates are allowed (legitimate non-decisive outcomes).
  return summary.avgCaptures >= 8 && summary.avgLength >= 40;
}

function main() {
  const t0 = Date.now();
  const checks = [];
  function check(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail });
  }

  // 1) Depths explicit
  for (const d of DEPTHS) {
    const s = engine.describeSearchSemantics(d);
    check('depth_' + d + '_defined', !!s.actualEffectiveDepth, s.actualEffectiveDepth);
  }

  // 2) Perspective
  const p1cap = testPerspectiveCapture();
  const p2cap = testP2AlsoCaptures();
  check('p1_prefers_capture_L2', p1cap.ok, p1cap);
  check('p2_prefers_capture_L2', p2cap.ok, p2cap);

  // 3) Reproducibility
  const a = runBatch(2, 101, N, engine.P1);
  const b = runBatch(2, 101, N, engine.P1);
  check('reproducibility_D2_seed101', fingerprint(a) === fingerprint(b), { n: N });

  // 4) Batches per depth + first-player swap symmetry sample
  const perDepth = {};
  for (const depth of DEPTHS) {
    const games = [];
    for (const seed of SEEDS) {
      games.push(...runBatch(depth, seed, N, engine.P1));
      process.stderr.write('depth=' + depth + ' seed=' + seed + ' first=P1 done\n');
    }
    perDepth[depth] = summarize(games);
    check('metrics_sum_D' + depth, Math.abs(perDepth[depth].p1WinPct + perDepth[depth].p2WinPct + perDepth[depth].drawPct - 100) < 0.01, perDepth[depth]);
    check('depth_regime_ok_D' + depth, depthOk(depth, perDepth[depth]), perDepth[depth]);
  }

  // First-player advantage / symmetry: D2 with first=P1 vs first=P2
  const firstP1 = [];
  const firstP2 = [];
  for (const seed of SEEDS) {
    firstP1.push(...runBatch(2, seed + 5000, 20, engine.P1));
    firstP2.push(...runBatch(2, seed + 6000, 20, engine.P2));
  }
  const sP1 = summarize(firstP1);
  const sP2 = summarize(firstP2);
  const fpa1 = sP1.firstPlayerWinPctAmongDecisive;
  const fpa2 = sP2.firstPlayerWinPctAmongDecisive;
  check(
    'first_player_measurable',
    fpa1 != null && fpa2 != null,
    { firstP1: fpa1, firstP2: fpa2, n: firstP1.length }
  );
  // Symmetry: first-mover win rates should be in the same ballpark (within 25pp) if AI is side-symmetric
  const fpaDelta = fpa1 != null && fpa2 != null ? Math.abs(fpa1 - fpa2) : 999;
  check('ai_symmetry_first_mover', fpaDelta <= 25, { fpa1, fpa2, fpaDelta });

  // Chain legality: generateTurnEnds includes early stop + continue when capture exists midgame-ish
  const startEnds = engine.generateTurnEnds(engine.startingBoard(), engine.P1, 160);
  check('turn_ends_at_start', startEnds.length >= 10, { n: startEnds.length });

  const failed = checks.filter((c) => !c.ok);
  const ready = failed.length === 0;

  const report = {
    verdict: ready ? 'READY' : 'NOT READY',
    purpose: 'Lab readiness for future SmartBeads config comparison (Sholo reference only)',
    comparisonProtocol: {
      primaryDepth: 2,
      primaryUse: 'Wins/losses, legitimate draws, first-player advantage, captures, length, side symmetry',
      secondaryDepth: 3,
      secondaryUse: 'Long-horizon attrition (avg captures / length under move-cap). Do not rank configs by D3 elimination% alone.',
      depth1Use: 'Greedy baseline / sanity',
      drawsAreLegitimate: true,
    },
    totalValidationGames:
      DEPTHS.length * SEEDS.length * N + firstP1.length + firstP2.length + a.length,
    moveCap: MOVE_CAP,
    searchSemantics: {
      1: engine.describeSearchSemantics(1),
      2: engine.describeSearchSemantics(2),
      3: engine.describeSearchSemantics(3),
    },
    searchLimits: engine.SEARCH_LIMITS,
    checks,
    perDepth,
    firstPlayer: { whenFirstP1: sP1, whenFirstP2: sP2 },
    failed: failed.map((f) => f.name),
    elapsedMs: Date.now() - t0,
    note: 'Draws/repetitions/move-cap draws are legitimate outcomes. READY means instrument is trustworthy enough for comparative research under comparisonProtocol, not that Sholo elim% should be maximized.',
  };

  const out = path.join(__dirname, 'SHOLO_FULLTURN_LAB_READY.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.stderr.write('verdict=' + report.verdict + ' wrote ' + out + '\n');
  process.exit(ready ? 0 : 4);
}

main();
