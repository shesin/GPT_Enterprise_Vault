'use strict';
/**
 * Authoritative 16-bead reference validation for SmartBeads Lab trust.
 * Does NOT test candidate boards. Produces LAB_16_BEAD_REFERENCE_VALIDATION.json
 * for WEB_REPORT_16_BEAD_05P.md.
 *
 * Uses final-validate-sholo-lab.cjs trust gate + crash-free batches + baseline metrics.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const engine = require('./sholo-guti-fullturn-engine.cjs');
const metrics = require('./sholo-lab-metrics.cjs');
const protocol = require('./sholo-lab-protocol.cjs');

const MOVE_CAP = protocol.MOVE_CAP;
const BASELINE_DEPTHS = protocol.DEPTHS;
const BASELINE_SEEDS = protocol.SEEDS;
const BASELINE_N = protocol.N_PER_SEED;

function runBatch(depth, seed, n, first, moveCap) {
  const games = [];
  for (let i = 0; i < n; i++) {
    games.push(engine.playHeadlessGame(depth, moveCap || MOVE_CAP, (seed + i) >>> 0, first));
  }
  return games;
}

function validEndReason(r) {
  return ['elimination', 'stalemate', 'move_cap_lab_safety', 'repetition'].includes(r);
}

function main() {
  const t0 = Date.now();
  const checks = [];
  function check(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail });
  }

  // --- Trust gate (final-validate) ---
  let trustExit = 1;
  let trustReport = null;
  try {
    execSync('"' + process.execPath + '" final-validate-sholo-lab.cjs', {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    trustExit = 0;
  } catch (e) {
    trustExit = e.status || 1;
  }
  const trustPath = path.join(__dirname, 'SHOLO_LAB_FINAL_TRUST.json');
  if (fs.existsSync(trustPath)) {
    trustReport = JSON.parse(fs.readFileSync(trustPath, 'utf8'));
  }
  check('final_trust_gate_pass', trustExit === 0 && trustReport && trustReport.verdict === 'READY', {
    exitCode: trustExit,
    verdict: trustReport && trustReport.verdict,
    failed: trustReport && trustReport.failed,
  });

  // --- Crash-free / legal termination batches ---
  const crashChecks = [];
  for (const depth of BASELINE_DEPTHS) {
    let threw = false;
    let games = [];
    try {
      games = runBatch(depth, 9001 + depth * 100, 40, engine.P1);
    } catch (err) {
      threw = true;
      crashChecks.push({ depth, error: String(err.message || err) });
    }
    if (!threw) {
      const allLegal = games.every(
        (g) => validEndReason(g.endReason) && ['P1', 'P2', 'draw'].includes(g.winner)
      );
      const noStuck = games.every((g) => g.gameLength >= 1 || g.endReason === 'stalemate');
      check('crash_free_D' + depth, true, { n: games.length });
      check('legal_endings_D' + depth, allLegal, { sample: games.slice(0, 2).map((g) => g.endReason) });
      check('no_zero_turn_stuck_D' + depth, noStuck, {});
    } else {
      check('crash_free_D' + depth, false, crashChecks[crashChecks.length - 1]);
    }
  }

  // --- Baseline metrics (modest N) ---
  const perDepth = {};
  const perDepthPerSeed = {};
  let totalBaselineGames = 0;
  for (const depth of BASELINE_DEPTHS) {
    perDepth[depth] = [];
    perDepthPerSeed[depth] = {};
    for (const seed of BASELINE_SEEDS) {
      const games = runBatch(depth, seed, BASELINE_N, engine.P1);
      perDepthPerSeed[depth][seed] = metrics.summarizeGames(games);
      perDepth[depth].push(...games);
      totalBaselineGames += games.length;
    }
    perDepth[depth] = metrics.summarizeGames(perDepth[depth]);
  }

  // First-player swap sample (D2, modest)
  const fp1Games = runBatch(2, 7000, 20, engine.P1);
  const fp2Games = runBatch(2, 8000, 20, engine.P2);
  const whenFirstP1 = metrics.summarizeGames(fp1Games);
  const whenFirstP2 = metrics.summarizeGames(fp2Games);

  check(
    'baseline_metrics_partition_D2',
    Math.abs(perDepth[2].p1WinPct + perDepth[2].p2WinPct + perDepth[2].drawPct - 100) < 1e-6,
    { d2: perDepth[2] }
  );
  check(
    'first_player_capture_symmetry',
    Math.abs(whenFirstP1.avgCaptures - whenFirstP2.avgCaptures) <= 3,
    { p1Caps: whenFirstP1.avgCaptures, p2Caps: whenFirstP2.avgCaptures }
  );

  const failed = checks.filter((c) => !c.ok);
  const instrumentValid = failed.length === 0;

  const report = {
    purpose: '16-bead Sholo Guti reference validation for SmartBeads Lab board-quality system',
    board: 'standard 16-bead / 37-node Sholo Guti (SHOLO_GUTI.html + sholo-guti-fullturn-engine.cjs)',
    instrumentValid,
    verdict: instrumentValid ? 'INSTRUMENT_VALID' : 'INSTRUMENT_INVALID',
    trustGate: trustReport
      ? { verdict: trustReport.verdict, failed: trustReport.failed, checks: trustReport.checks.length }
      : null,
    checks,
    failed: failed.map((f) => f.name),
    baselineProtocol: protocol.protocolMeta({ totalBaselineGames }),
    playableVsLabDepth: protocol.PLAYABLE_VS_LAB_DEPTH,
    perDepth,
    perDepthPerSeed,
    firstPlayerSwap: { whenFirstP1, whenFirstP2 },
    searchSemantics: {
      1: engine.describeSearchSemantics(1),
      2: engine.describeSearchSemantics(2),
      3: engine.describeSearchSemantics(3),
    },
    comparisonProtocol: metrics.COMPARISON_PROTOCOL,
    elapsedMs: Date.now() - t0,
    note:
      'INSTRUMENT_VALID means Lab parity, honest depths, reproducibility, and crash-free batches passed. ' +
      'High move-cap % at D2 on 16-bead is expected under honest search — not instrument failure.',
  };

  const out = path.join(__dirname, 'LAB_16_BEAD_REFERENCE_VALIDATION.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        instrumentValid,
        failed: report.failed,
        totalBaselineGames,
        d2: perDepth[2],
        out,
        elapsedMs: report.elapsedMs,
      },
      null,
      2
    )
  );
  process.stderr.write('instrumentValid=' + instrumentValid + ' wrote ' + out + '\n');
  process.exit(instrumentValid ? 0 : 6);
}

main();
