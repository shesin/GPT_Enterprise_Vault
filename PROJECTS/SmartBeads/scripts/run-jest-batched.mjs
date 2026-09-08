/**
 * SmartBeads Jest runner — explicit batches, live stdout, hard timeouts.
 * Every __tests__/*.test.ts under PROJECTS/SmartBeads must appear in exactly one batch.
 *
 * Usage:
 *   node PROJECTS/SmartBeads/scripts/run-jest-batched.mjs
 *   node PROJECTS/SmartBeads/scripts/run-jest-batched.mjs --skip-slow
 *   node PROJECTS/SmartBeads/scripts/run-jest-batched.mjs --batch=seven-board
 *   node PROJECTS/SmartBeads/scripts/run-jest-batched.mjs --audit-only
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SMARTBEADS = path.join(ROOT, 'PROJECTS', 'SmartBeads');
const JEST = path.join(ROOT, 'node_modules', 'jest', 'bin', 'jest.js');

const BATCHES = [
  {
    id: 'seven-board',
    label: '7-board core (smoke + unit + turn + geometry)',
    timeoutMs: 120_000,
    testTimeoutMs: 30_000,
    files: [
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/allBoards.smoke.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/FeatureSession.turnControl.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/__tests__/v1GeometryCaptureAudit.test.ts',
      'PROJECTS/SmartBeads/src/boards/__tests__/Board16Sholo.test.ts',
      'PROJECTS/SmartBeads/src/boards/__tests__/Board12x6x5.test.ts',
      'PROJECTS/SmartBeads/src/boards/__tests__/Board10x5.test.ts',
      'PROJECTS/SmartBeads/src/boards/__tests__/Board8x4x6.test.ts',
      'PROJECTS/SmartBeads/src/boards/__tests__/Board7.test.ts',
      'PROJECTS/SmartBeads/src/boards/__tests__/Board6.test.ts',
      'PROJECTS/SmartBeads/src/boards/__tests__/Board6x3x5.test.ts',
    ],
  },
  {
    id: 'engine-parity',
    label: 'Engine, catalog, simulation, prototype parity',
    timeoutMs: 120_000,
    testTimeoutMs: 30_000,
    files: [
      'PROJECTS/SmartBeads/src/config/__tests__/BoardCatalog.test.ts',
      'PROJECTS/SmartBeads/src/core/__tests__/SmartBeadsEngine.test.ts',
      'PROJECTS/SmartBeads/src/core/__tests__/SmartBeadsEngine16.test.ts',
      'PROJECTS/SmartBeads/src/playtest/__tests__/HumanVsAiRunner.test.ts',
      'PROJECTS/SmartBeads/src/simulation/__tests__/SelfPlayRunner.test.ts',
      'PROJECTS/SmartBeads/src/boards/__tests__/Board16PrototypeParity.test.ts',
      'PROJECTS/SmartBeads/src/boards/__tests__/Board12x6x5PrototypeParity.test.ts',
      'PROJECTS/SmartBeads/src/boards/__tests__/Board10x5PrototypeParity.test.ts',
      'PROJECTS/SmartBeads/src/boards/__tests__/Board8x4x6PrototypeParity.test.ts',
      'PROJECTS/SmartBeads/src/boards/__tests__/Board7PrototypeParity.test.ts',
      'PROJECTS/SmartBeads/src/boards/__tests__/Board6PrototypeParity.test.ts',
      'PROJECTS/SmartBeads/src/boards/__tests__/Board6x3x5PrototypeParity.test.ts',
    ],
  },
  {
    id: 'feature-session',
    label: 'Feature session, settings, spectate, coach',
    timeoutMs: 180_000,
    testTimeoutMs: 60_000,
    files: [
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/GameFeatureSettings.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/FeatureSession.featureRules.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/FeatureSession.firstMove.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/FeatureSession.resignation.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/FeatureSession.coach.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/clockPolicy.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/aiTurnPath.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/HonestAi.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/spectate.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/CoachVideoPlayer.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/CoachVideoScript.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/CoachVoice.test.ts',
    ],
  },
  {
    id: 'web-shell-layout',
    label: 'Play shell, layout, render, audio, process guards',
    timeoutMs: 120_000,
    testTimeoutMs: 30_000,
    files: [
      'PROJECTS/SmartBeads/src/playtest/web/__tests__/PlayController.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/__tests__/playerBarShell.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/__tests__/processRegressionGuards.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/__tests__/hubShell.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/__tests__/viewportFit.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/__tests__/chromeScreenshotPositions.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/__tests__/v1ProductionSanity.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/__tests__/productionPve16.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/layout/__tests__/creamCampRendersLower.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/layout/__tests__/prototypeVisualParity.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/layout/__tests__/boardProjection.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/render/__tests__/CanvasBoardRenderer.moveFeedback.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/audio/__tests__/SoundEffects.test.ts',
    ],
  },
  {
    id: 'slow-ai-tiers',
    label: 'HonestAi difficulty tiers (slow ~5 min)',
    slow: true,
    timeoutMs: 900_000,
    testTimeoutMs: 120_000,
    files: [
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/HonestAi.difficultyTiers.test.ts',
    ],
  },
  {
    id: 'slow-ai-search',
    label: 'HonestAi depth-2 search completion (slow)',
    slow: true,
    timeoutMs: 600_000,
    testTimeoutMs: 120_000,
    files: [
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/HonestAi.searchCompletion.test.ts',
    ],
  },
];

function discoverAllTestFiles(dir = SMARTBEADS, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      discoverAllTestFiles(full, acc);
    } else if (entry.name.endsWith('.test.ts')) {
      acc.push(path.relative(ROOT, full).replace(/\\/g, '/'));
    }
  }
  return acc.sort();
}

function auditBatchCoverage() {
  const onDisk = new Set(discoverAllTestFiles());
  const batched = new Set(BATCHES.flatMap((b) => b.files));
  const uncovered = [...onDisk].filter((f) => !batched.has(f));
  const stale = [...batched].filter((f) => !onDisk.has(f));
  const dupes = BATCHES.flatMap((b) => b.files).filter((f, i, a) => a.indexOf(f) !== i);
  return { onDisk, batched, uncovered, stale, dupes };
}

function parseArgs() {
  const skipSlow = process.argv.includes('--skip-slow');
  const auditOnly = process.argv.includes('--audit-only');
  const batchArg = process.argv.find((a) => a.startsWith('--batch='));
  const batchId = batchArg ? batchArg.slice('--batch='.length) : null;
  return { skipSlow, auditOnly, batchId };
}

function runBatch(batch) {
  return new Promise((resolve) => {
    const started = Date.now();
    console.log(`\n=== BATCH: ${batch.label} (${batch.files.length} files, timeout ${Math.round(batch.timeoutMs / 1000)}s) ===\n`);

    const args = [
      ...batch.files,
      '--runInBand',
      '--no-coverage',
      '--forceExit',
      '--verbose',
      `--testTimeout=${batch.testTimeoutMs ?? 30_000}`,
    ];

    const child = spawn(process.execPath, [JEST, ...args], {
      cwd: ROOT,
      env: { ...process.env, CI: '1' },
      stdio: 'inherit',
      windowsHide: true,
    });

    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      console.error(`\n*** TIMEOUT: ${batch.id} exceeded ${batch.timeoutMs}ms — killing ***\n`);
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        child.kill('SIGKILL');
      }
    }, batch.timeoutMs);

    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({
        id: batch.id,
        label: batch.label,
        ok: !killed && code === 0,
        code: killed ? 'TIMEOUT' : code,
        signal,
        elapsedMs: Date.now() - started,
        fileCount: batch.files.length,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      console.error(`Spawn error (${batch.id}):`, err.message);
      resolve({
        id: batch.id,
        label: batch.label,
        ok: false,
        code: 'SPAWN_ERROR',
        signal: null,
        elapsedMs: Date.now() - started,
        fileCount: batch.files.length,
      });
    });
  });
}

async function main() {
  const { skipSlow, auditOnly, batchId } = parseArgs();
  const audit = auditBatchCoverage();

  console.log(`SmartBeads Jest: ${audit.onDisk.size} test files on disk, ${audit.batched.size} in batches`);

  if (audit.dupes.length) {
    console.error('\n*** AUDIT FAIL: duplicate batch entries ***');
    for (const f of audit.dupes) console.error(`  ${f}`);
    process.exit(1);
  }
  if (audit.stale.length) {
    console.error('\n*** AUDIT FAIL: batch lists missing files ***');
    for (const f of audit.stale) console.error(`  ${f}`);
    process.exit(1);
  }
  if (audit.uncovered.length) {
    console.error('\n*** AUDIT FAIL: test files not in any batch ***');
    for (const f of audit.uncovered) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log('Audit: all test files covered exactly once.');

  if (auditOnly) {
    process.exit(0);
  }

  let batches = BATCHES;
  if (skipSlow) batches = batches.filter((b) => !b.slow);
  if (batchId) {
    batches = batches.filter((b) => b.id === batchId);
    if (!batches.length) {
      console.error(`Unknown batch: ${batchId}`);
      console.error(`Known: ${BATCHES.map((b) => b.id).join(', ')}`);
      process.exit(1);
    }
  }

  if (skipSlow) console.log('(--skip-slow: omitting slow HonestAi batches)');

  const results = [];
  for (const batch of batches) {
    results.push(await runBatch(batch));
  }

  console.log('\n=== SUMMARY ===');
  let totalOk = true;
  for (const r of results) {
    const status = r.ok ? 'PASS' : 'FAIL';
    if (!r.ok) totalOk = false;
    console.log(
      `${status}  ${r.id}  code=${r.code}  ${(r.elapsedMs / 1000).toFixed(1)}s  (${r.fileCount} files)`,
    );
  }

  process.exit(totalOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
