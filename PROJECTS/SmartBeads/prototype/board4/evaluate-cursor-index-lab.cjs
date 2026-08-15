'use strict';
/**
 * Authoritative G1-G9 verdict evaluator for Cursor Index 4×4.
 * Uses certified complete-turn engine + sholo-lab-protocol.cjs (same as 16-bead reference).
 */
const fs = require('fs');
const path = require('path');
const { loadCursorIndex, ROOT } = require('./gemini-lab-loader.cjs');
const { createEngine } = require('./cursor-index-fullturn-engine.cjs');
const metrics = require('./sholo-lab-metrics.cjs');
const gates = require('./sholo-lab-gates.cjs');
const protocol = require('./sholo-lab-protocol.cjs');

const CANDIDATES = [
  { id: 'INDEX_6', beads: 6, html: 'CURSOR_INDEX_6.html', smokeOut: 'CURSOR_INDEX_6_LAB_EVAL.json' },
];

function runBatch(engine, depth, seed, n, first) {
  const games = [];
  for (let i = 0; i < n; i++) {
    games.push(engine.playHeadlessGame(depth, protocol.MOVE_CAP, (seed + i) >>> 0, first));
  }
  return games;
}

function parseStartBoard(html) {
  const m = html.match(/const START_BOARD = \[([^\]]+)\]/);
  if (!m) throw new Error('START_BOARD missing in playable HTML');
  return m[1].split(',').map((x) => parseInt(x.trim(), 10));
}

function parityCheck(engine, html, beads) {
  const checks = [];
  function g(name, ok, detail) { checks.push({ name, ok: !!ok, detail }); }
  const labStart = engine.startingBoard();
  const playStart = parseStartBoard(html);
  g('start_fingerprint', playStart.join('') === labStart.join(''), { play: playStart.join(''), lab: labStart.join('') });
  g('bead_count', playStart.filter((x) => x === 1).length === beads && playStart.filter((x) => x === 2).length === beads, { beads });
  const openPlay = engine.getAllLegalMoves(playStart, engine.P1).length;
  const openLab = engine.getAllLegalMoves(labStart, engine.P1).length;
  g('opening_moves', openPlay === openLab, { play: openPlay, lab: openLab });
  g('search_unit_complete_turn', engine.describeSearchSemantics(2).searchUnit === 'complete turn', {
    d2: engine.describeSearchSemantics(2),
  });
  g('eval_noise_off', engine.describeSearchSemantics(2).evalNoise === false, {});
  return { allOk: checks.every((c) => c.ok), checks };
}

function fingerprint(games) {
  return games.map((g) => [g.seed, g.endReason, g.winner, g.gameLength, g.totalCaptures].join(':')).join('|');
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

function main() {
  const combinedPath = path.join(ROOT, 'CURSOR_INDEX_LAB_EVALUATION.json');
  let prior = {};
  if (fs.existsSync(combinedPath)) {
    prior = JSON.parse(fs.readFileSync(combinedPath, 'utf8'));
  }
  const batchProtocol = protocol.protocolMeta();
  const out = {
    purpose: 'Authoritative Cursor Index G1-G9 — certified complete-turn protocol',
    authoritativeEvaluator: 'evaluate-cursor-index-lab.cjs',
    headlessEngine: 'cursor-index-fullturn-engine.cjs',
    protocol: batchProtocol,
    boards: prior.boards ? { ...prior.boards } : {},
  };
  if (out.boards.INDEX_4) {
    out.boards.INDEX_4.playable = '(removed — Web REJECT; was CURSOR_INDEX_4.html)';
  }

  for (const c of CANDIDATES) {
    const html = fs.readFileSync(path.join(ROOT, c.html), 'utf8');
    loadCursorIndex(c.html);
    const engine = createEngine(c.beads);
    const parity = parityCheck(engine, html, c.beads);
    const perDepth = {};
    for (const depth of protocol.DEPTHS) {
      const batch = [];
      for (const seed of protocol.SEEDS) {
        batch.push(...runBatch(engine, depth, seed, protocol.N_PER_SEED, engine.P1));
      }
      perDepth[depth] = metrics.summarizeGames(batch);
    }
    const crash = crashFree(engine);
    const swap = firstPlayerSwap(engine);
    const a = runBatch(engine, 2, 101, protocol.N_PER_SEED, engine.P1);
    const b = runBatch(engine, 2, 101, protocol.N_PER_SEED, engine.P1);
    const reproducible = fingerprint(a) === fingerprint(b);
    const protocolCheck = protocol.matchesCanonical(batchProtocol);
    const ev = gates.applyGates(
      perDepth[1], perDepth[2], perDepth[3], parity.allOk, crash, swap, reproducible, protocolCheck
    );
    const selection = gates.ladderVerdict(ev.allPass, ev.rejectTriggers, ev.failed);
    out.boards[c.id] = {
      playable: c.html,
      headless: 'cursor-index-fullturn-engine.cjs',
      beadsPerSide: c.beads,
      board: '4x4',
      parity,
      geometryVerified: parity.allOk,
      reproducibleD2: reproducible,
      perDepth,
      firstPlayerSwap: swap,
      gates: ev.gates,
      failedGates: ev.failed,
      rejectTriggers: ev.rejectTriggers,
      selectionVerdict: selection,
    };
    fs.writeFileSync(path.join(ROOT, c.smokeOut), JSON.stringify(out.boards[c.id], null, 2));
    process.stderr.write(c.id + ' selection=' + selection + '\n');
  }

  const combined = path.join(ROOT, 'CURSOR_INDEX_LAB_EVALUATION.json');
  fs.writeFileSync(combined, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({
    out: combined,
    authoritativeEvaluator: 'evaluate-cursor-index-lab.cjs',
    boards: Object.fromEntries(Object.entries(out.boards).map(([k, v]) => [k, v.selectionVerdict])),
  }, null, 2));
  process.exit(0);
}

main();
