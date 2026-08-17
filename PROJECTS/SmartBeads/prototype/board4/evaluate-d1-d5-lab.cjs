'use strict';
/**
 * Authoritative G1–G9 Lab evaluation for discovery round-2 candidates D1–D5.
 * Protocol: D1/D2/D3 · seeds 101/202/303 · N=30/seed · move-cap 120 · 16-bead anchor.
 */
const fs = require('fs');
const path = require('path');
const eng16 = require('./sholo-guti-fullturn-engine.cjs');
const engD1 = require('./sholo-d1-9-5x5-fullturn-engine.cjs');
const engD2 = require('./sholo-d2-7-5x5-fullturn-engine.cjs');
const engD3 = require('./sholo-d3-5-3x5-fullturn-engine.cjs');
const engD4 = require('./sholo-d4-12-6x5-fullturn-engine.cjs');
const engD5 = require('./sholo-d5-4-3x5-fullturn-engine.cjs');
const { loadDiscoveryPlayable, ROOT } = require('./discovery-playable-loader.cjs');
const metrics = require('./sholo-lab-metrics.cjs');
const gates = require('./sholo-lab-gates.cjs');
const protocol = require('./sholo-lab-protocol.cjs');

const REF_PATH = path.join(ROOT, 'LAB_16_BEAD_REFERENCE_VALIDATION.json');
const OUT_PATH = path.join(ROOT, 'D1_D5_LAB_EVALUATION.json');

const CANDIDATES = [
  {
    id: 'D1',
    label: '9-bead 5×5 one-corner thin (KEEP-10 −1/side 180°)',
    playable: 'SHOLO_GUTI_9_BEAD_5x5_WITH_FEATURE.html',
    engine: engD1,
    engineFile: 'sholo-d1-9-5x5-fullturn-engine.cjs',
    beads: 9,
    expectedN: 25,
  },
  {
    id: 'D2',
    label: '7-bead 5×5 thin hourglass',
    playable: 'SHOLO_GUTI_7_BEAD_5x5_WITH_FEATURE.html',
    engine: engD2,
    engineFile: 'sholo-d2-7-5x5-fullturn-engine.cjs',
    beads: 7,
    expectedN: 25,
  },
  {
    id: 'D3',
    label: '5-bead 3×5 rear-wing thin',
    playable: 'SHOLO_GUTI_5_BEAD_3x5_REAR_THIN_WITH_FEATURE.html',
    engine: engD3,
    engineFile: 'sholo-d3-5-3x5-fullturn-engine.cjs',
    beads: 5,
    expectedN: 15,
  },
  {
    id: 'D4',
    label: '12-bead 6×5 two-file rank camps',
    playable: 'SHOLO_GUTI_12_BEAD_6x5_WITH_FEATURE.html',
    engine: engD4,
    engineFile: 'sholo-d4-12-6x5-fullturn-engine.cjs',
    beads: 12,
    expectedN: 30,
  },
  {
    id: 'D5',
    label: '4-bead 3×5 rear corners',
    playable: 'SHOLO_GUTI_4_BEAD_3x5_REAR_WITH_FEATURE.html',
    engine: engD5,
    engineFile: 'sholo-d5-4-3x5-fullturn-engine.cjs',
    beads: 4,
    expectedN: 15,
  },
];

function runBatch(engine, depth, seed, n, first) {
  const games = [];
  for (let i = 0; i < n; i++) {
    games.push(engine.playHeadlessGame(depth, protocol.MOVE_CAP, (seed + i) >>> 0, first));
  }
  return games;
}

function fingerprint(games) {
  return games.map((g) => [g.seed, g.endReason, g.winner, g.gameLength, g.totalCaptures].join(':')).join('|');
}

function edgeCount(adj) {
  let e = 0;
  for (let i = 0; i < adj.length; i++) for (const j of adj[i]) if (j > i) e++;
  return e;
}

function parityCheck(c, engine) {
  const checks = [];
  function g(name, ok, detail) { checks.push({ name, ok: !!ok, detail }); }
  const { api } = loadDiscoveryPlayable(c.playable);
  const playStart = api.getBoard();
  const labStart = engine.startingBoard();
  g('lab_not_16_bead', engine.N !== eng16.N, { labN: engine.N, refN: eng16.N });
  g('expected_node_count', engine.N === c.expectedN, { expected: c.expectedN, got: engine.N });
  g('playable_node_count', api.N === c.expectedN, { expected: c.expectedN, got: api.N });
  g('start_fingerprint', playStart.join('') === labStart.join(''), {
    play: playStart.join(''),
    lab: labStart.join(''),
  });
  g('bead_count', playStart.filter((x) => x === 1).length === c.beads && playStart.filter((x) => x === 2).length === c.beads, {
    beads: c.beads,
  });
  let coordMatch = true;
  for (let i = 0; i < engine.N; i++) {
    if (
      api.NODES[i].id !== engine.NODES[i].id ||
      api.NODES[i].x !== engine.NODES[i].x ||
      api.NODES[i].y !== engine.NODES[i].y
    ) {
      coordMatch = false;
      break;
    }
  }
  g('node_coords', coordMatch, {});
  g('edge_count_match', edgeCount(api.ADJ) === edgeCount(engine.ADJ), {
    play: edgeCount(api.ADJ),
    lab: edgeCount(engine.ADJ),
  });
  const openPlay = api.getAllLegalMoves(playStart, api.P1).length;
  const openLab = engine.getAllLegalMoves(labStart, engine.P1).length;
  g('opening_moves', openPlay === openLab, { openPlay, openLab });
  g('opening_captures_zero', api.getAllLegalMoves(playStart, api.P1).every((m) => m.captured == null), {});
  g('search_unit_complete_turn', engine.describeSearchSemantics(2).searchUnit === 'complete turn', {});
  g('eval_noise_off', engine.describeSearchSemantics(2).evalNoise === false, {});
  return { allOk: checks.every((x) => x.ok), checks };
}

function firstPlayerSwap(engine) {
  const whenFirstP1 = [];
  const whenFirstP2 = [];
  for (const seed of protocol.SWAP_SEEDS) {
    whenFirstP1.push(...runBatch(engine, 2, seed, protocol.SWAP_N, engine.P1));
    whenFirstP2.push(...runBatch(engine, 2, seed + 1000, protocol.SWAP_N, engine.P2));
  }
  return { whenFirstP1: metrics.summarizeGames(whenFirstP1), whenFirstP2: metrics.summarizeGames(whenFirstP2) };
}

function crashFree(engine) {
  try {
    const g = runBatch(engine, 2, 99000, 40, engine.P1);
    const ok = g.every(
      (x) =>
        ['elimination', 'stalemate', 'move_cap_lab_safety', 'repetition'].includes(x.endReason) &&
        ['P1', 'P2', 'draw'].includes(x.winner)
    );
    return { ok, n: g.length };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

function compareDepths(candidateEngine, refEngine) {
  const perDepthCandidate = {};
  const perDepth16 = {};
  let totalGames = 0;
  for (const depth of protocol.DEPTHS) {
    perDepthCandidate[depth] = [];
    perDepth16[depth] = [];
    for (const seed of protocol.SEEDS) {
      perDepthCandidate[depth].push(...runBatch(candidateEngine, depth, seed, protocol.N_PER_SEED, candidateEngine.P1));
      perDepth16[depth].push(...runBatch(refEngine, depth, seed, protocol.N_PER_SEED, refEngine.P1));
      totalGames += protocol.N_PER_SEED * 2;
    }
  }
  const sumCandidate = {};
  const sum16 = {};
  for (const d of protocol.DEPTHS) {
    sumCandidate[d] = metrics.summarizeGames(perDepthCandidate[d]);
    sum16[d] = metrics.summarizeGames(perDepth16[d]);
  }
  return { perDepthCandidate: sumCandidate, perDepth16: sum16, totalGames };
}

function capturePerBead(summary, beads) {
  if (!summary || !beads) return null;
  return Math.round((1000 * summary.avgCaptures) / (2 * beads)) / 1000;
}

function rankBoards(boardResults) {
  const scored = Object.entries(boardResults).map(([id, b]) => {
    const d2 = b.perDepth[2];
    const reject = b.selectionVerdict === 'REJECT';
    const score =
      (reject ? -1000 : 0) +
      (b.gates.filter((g) => g.pass).length * 10) +
      (100 - Math.abs(d2.firstPlayerAdvantagePp || 0)) +
      d2.avgCaptures * 2 +
      d2.avgLength * 0.5 -
      d2.moveCapDrawPct * 0.3;
    return { id, score, selectionVerdict: b.selectionVerdict, d2Fpa: d2.firstPlayerAdvantagePp };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((x, i) => ({ rank: i + 1, ...x }));
}

function main() {
  const t0 = Date.now();
  const ref = JSON.parse(fs.readFileSync(REF_PATH, 'utf8'));
  const batchProtocol = protocol.protocolMeta();
  const out = {
    purpose: 'Authoritative D1–D5 discovery round-2 G1–G9 evaluation with 16-bead reference anchor',
    authoritativeEvaluator: 'evaluate-d1-d5-lab.cjs',
    protocol: batchProtocol,
    reference16: {
      role: 'REFERENCE ANCHOR',
      perDepth: ref.perDepth,
      firstPlayerSwap: ref.firstPlayerSwap,
    },
    boards: {},
    evaluatedAt: new Date().toISOString(),
  };

  for (const c of CANDIDATES) {
    process.stderr.write('\n=== ' + c.id + ' ' + c.label + ' ===\n');
    const engine = c.engine;
    const parity = parityCheck(c, engine);
    if (!parity.allOk) {
      process.stderr.write(c.id + ' parity FAIL: ' + parity.checks.filter((x) => !x.ok).map((x) => x.name).join(', ') + '\n');
    }
    const compare = compareDepths(engine, eng16);
    const crash = crashFree(engine);
    const swap = firstPlayerSwap(engine);
    const a = runBatch(engine, 2, 101, protocol.N_PER_SEED, engine.P1);
    const b = runBatch(engine, 2, 101, protocol.N_PER_SEED, engine.P1);
    const reproducible = fingerprint(a) === fingerprint(b);
    const protocolCheck = protocol.matchesCanonical(batchProtocol);
    const d1 = compare.perDepthCandidate[1];
    const d2 = compare.perDepthCandidate[2];
    const d3 = compare.perDepthCandidate[3];
    const ev = gates.applyGates(d1, d2, d3, parity.allOk, crash, swap, reproducible, protocolCheck);
    const selection = gates.ladderVerdict(ev.allPass, ev.rejectTriggers, ev.failed);
    out.boards[c.id] = {
      id: c.id,
      label: c.label,
      playable: c.playable,
      engine: c.engineFile,
      beadsPerSide: c.beads,
      nodeCount: engine.N,
      parity,
      geometryVerified: parity.allOk,
      reproducibleD2: reproducible,
      perDepth: compare.perDepthCandidate,
      perDepth16: compare.perDepth16,
      compareDiffs: {
        depth1: metrics.diffSummaries(1, compare.perDepth16[1], d1, metrics.allowedCompareMetrics(1)),
        depth2: metrics.diffSummaries(2, compare.perDepth16[2], d2, metrics.allowedCompareMetrics(2)),
        depth3: metrics.diffSummaries(3, compare.perDepth16[3], d3, metrics.allowedCompareMetrics(3)),
      },
      capturePerBeadD2: {
        candidate: capturePerBead(d2, c.beads),
        reference16: capturePerBead(ref.perDepth[2], 16),
      },
      firstPlayerSwap: swap,
      gates: ev.gates,
      failedGates: ev.failed,
      rejectTriggers: ev.rejectTriggers,
      selectionVerdict: selection,
      totalGamesCompared: compare.totalGames,
    };
    fs.writeFileSync(path.join(ROOT, c.id + '_LAB_EVAL.json'), JSON.stringify(out.boards[c.id], null, 2));
    process.stderr.write(
      c.id +
        ' selection=' +
        selection +
        ' failed=' +
        ev.failed.join(',') +
        ' D1 FPA=' +
        d1.firstPlayerAdvantagePp +
        'pp D2 FPA=' +
        d2.firstPlayerAdvantagePp +
        'pp\n'
    );
  }

  out.ranking = rankBoards(out.boards);
  out.elapsedMs = Date.now() - t0;
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(
    JSON.stringify(
      {
        out: OUT_PATH,
        authoritativeEvaluator: 'evaluate-d1-d5-lab.cjs',
        protocol: batchProtocol,
        boards: Object.fromEntries(
          Object.entries(out.boards).map(([k, v]) => [
            k,
            {
              selectionVerdict: v.selectionVerdict,
              failedGates: v.failedGates,
              rejectTriggers: v.rejectTriggers,
              gates: Object.fromEntries(v.gates.map((g) => [g.id, g.pass ? 'PASS' : 'FAIL'])),
              d1: {
                p1: v.perDepth[1].p1WinPct,
                p2: v.perDepth[1].p2WinPct,
                fpa: v.perDepth[1].firstPlayerAdvantagePp,
                avgCapt: v.perDepth[1].avgCaptures,
                avgLen: v.perDepth[1].avgLength,
                elimPct: v.perDepth[1].eliminationPct,
              },
              d2: {
                p1: v.perDepth[2].p1WinPct,
                p2: v.perDepth[2].p2WinPct,
                fpa: v.perDepth[2].firstPlayerAdvantagePp,
                avgCapt: v.perDepth[2].avgCaptures,
                avgLen: v.perDepth[2].avgLength,
                elimPct: v.perDepth[2].eliminationPct,
                moveCapDrawPct: v.perDepth[2].moveCapDrawPct,
              },
              d3: {
                p1: v.perDepth[3].p1WinPct,
                p2: v.perDepth[3].p2WinPct,
                fpa: v.perDepth[3].firstPlayerAdvantagePp,
                avgCapt: v.perDepth[3].avgCaptures,
                avgLen: v.perDepth[3].avgLength,
                elimPct: v.perDepth[3].eliminationPct,
              },
              swap: {
                p1FirstFpaAmongWins: v.firstPlayerSwap.whenFirstP1.firstPlayerWinPctAmongWins,
                p2FirstFpaAmongWins: v.firstPlayerSwap.whenFirstP2.firstPlayerWinPctAmongWins,
              },
            },
          ])
        ),
        ranking: out.ranking,
        reference16D2: {
          p1: ref.perDepth[2].p1WinPct,
          p2: ref.perDepth[2].p2WinPct,
          fpa: ref.perDepth[2].firstPlayerAdvantagePp,
          avgCapt: ref.perDepth[2].avgCaptures,
          avgLen: ref.perDepth[2].avgLength,
          moveCapDrawPct: ref.perDepth[2].moveCapDrawPct,
        },
        elapsedMs: out.elapsedMs,
      },
      null,
      2
    )
  );
}

main();
