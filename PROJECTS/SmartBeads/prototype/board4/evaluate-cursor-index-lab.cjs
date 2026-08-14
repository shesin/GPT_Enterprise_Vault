'use strict';
/**
 * Authoritative G1-G9 verdict evaluator for Cursor Index 4×4 (GEMINI_LAB).
 * Separate instrument family — not Sholo ladder protocol.
 */
const fs = require('fs');
const path = require('path');
const { loadGeminiLab, loadCursorIndex, geminiLogToSholo, ROOT } = require('./gemini-lab-loader.cjs');
const metrics = require('./sholo-lab-metrics.cjs');
const gates = require('./sholo-lab-gates.cjs');
const indexProtocol = require('./cursor-index-lab-protocol.cjs');

const CANDIDATES = [
  { id: 'INDEX_4', beads: 4, html: 'CURSOR_INDEX_4.html', smokeOut: 'CURSOR_INDEX_4_LAB_EVAL.json' },
  { id: 'INDEX_6', beads: 6, html: 'CURSOR_INDEX_6.html', smokeOut: 'CURSOR_INDEX_6_LAB_EVAL.json' },
];

function runBatch(Lab, geo, depth, seed, n, redFirst) {
  const games = [];
  for (let i = 0; i < n; i++) {
    const gameIndex = redFirst ? i * 2 : i * 2 + 1;
    const raw = Lab.playHeadlessGame(geo, gameIndex, depth, indexProtocol.MOVE_CAP, (seed + i) >>> 0);
    games.push(geminiLogToSholo(raw));
  }
  return games;
}

function parseStartBoard(html) {
  const m = html.match(/const START_BOARD = \[([^\]]+)\]/);
  if (!m) throw new Error('START_BOARD missing in playable HTML');
  return m[1].split(',').map((x) => parseInt(x.trim(), 10));
}

function parityCheck(Lab, html, beads) {
  const checks = [];
  function g(name, ok, detail) { checks.push({ name, ok: !!ok, detail }); }
  const labStart = Lab.createStartingBoard(beads, 4, 4);
  const playStart = parseStartBoard(html);
  g('start_fingerprint', playStart.join('') === labStart.join(''), { play: playStart.join(''), lab: labStart.join('') });
  g('bead_count', playStart.filter((x) => x === 1).length === beads && playStart.filter((x) => x === 2).length === beads, { beads });
  const geo = Lab.createLabConfig({
    beadsPerSide: beads, rows: 4, cols: 4, centerRule: 'off', maxMoveLimit: indexProtocol.MOVE_CAP, aiDepth: 2,
  });
  const openPlay = Lab.getAllLegalMoves(playStart, Lab.P1, geo).length;
  const openLab = Lab.getAllLegalMoves(labStart, Lab.P1, geo).length;
  g('opening_moves', openPlay === openLab, { play: openPlay, lab: openLab });
  g('center_nodes', JSON.stringify(Lab.deriveCenterNodes(4, 4)) === JSON.stringify([5, 6, 9, 10]), {
    lab: Lab.deriveCenterNodes(4, 4),
  });
  return { allOk: checks.every((c) => c.ok), checks };
}

function fingerprint(games) {
  return games.map((g) => [g.seed, g.endReason, g.winner, g.gameLength, g.totalCaptures].join(':')).join('|');
}

function firstPlayerSwap(Lab, geo) {
  const whenFirstRed = [];
  const whenFirstBlue = [];
  for (const seed of indexProtocol.SWAP_SEEDS) {
    whenFirstRed.push(...runBatch(Lab, geo, 2, seed, indexProtocol.SWAP_N, true));
    whenFirstBlue.push(...runBatch(Lab, geo, 2, seed + 1000, indexProtocol.SWAP_N, false));
  }
  return { whenFirstRed: metrics.summarizeGames(whenFirstRed), whenFirstBlue: metrics.summarizeGames(whenFirstBlue) };
}

function crashFree(Lab, geo) {
  try {
    const g = runBatch(Lab, geo, 2, 99000, 40, true);
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
  const Lab = loadGeminiLab();
  const batchProtocol = indexProtocol.protocolMeta();
  const out = {
    purpose: 'Authoritative Cursor Index G1-G9 evaluation — GEMINI_LAB headless',
    authoritativeEvaluator: 'evaluate-cursor-index-lab.cjs',
    protocol: batchProtocol,
    boards: {},
  };

  for (const c of CANDIDATES) {
    const html = fs.readFileSync(path.join(ROOT, c.html), 'utf8');
    loadCursorIndex(c.html);
    const parity = parityCheck(Lab, html, c.beads);
    const geo = Lab.createLabConfig({
      beadsPerSide: c.beads, rows: 4, cols: 4, centerRule: 'off', maxMoveLimit: indexProtocol.MOVE_CAP, aiDepth: 2,
    });
    const perDepth = {};
    for (const depth of indexProtocol.DEPTHS) {
      const batch = [];
      for (const seed of indexProtocol.SEEDS) batch.push(...runBatch(Lab, geo, depth, seed, indexProtocol.N_PER_SEED, true));
      perDepth[depth] = metrics.summarizeGames(batch);
    }
    const crash = crashFree(Lab, geo);
    const swap = firstPlayerSwap(Lab, geo);
    const a = runBatch(Lab, geo, 2, 101, indexProtocol.N_PER_SEED, true);
    const b = runBatch(Lab, geo, 2, 101, indexProtocol.N_PER_SEED, true);
    const reproducible = fingerprint(a) === fingerprint(b);
    const protocolCheck = indexProtocol.matchesCanonical(batchProtocol);
    const ev = gates.applyGates(
      perDepth[1], perDepth[2], perDepth[3], parity.allOk, crash, swap, reproducible, protocolCheck,
      { first: 'whenFirstRed', second: 'whenFirstBlue' }
    );
    const selection = gates.ladderVerdict(ev.allPass, ev.rejectTriggers, ev.failed);
    out.boards[c.id] = {
      playable: c.html,
      headless: 'GEMINI_LAB.html',
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
