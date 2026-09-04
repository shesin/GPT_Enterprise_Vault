/**
 * SmartBeads Jest runner — explicit batches, live stdout, hard timeouts.
 * Avoids broad `jest PROJECTS/SmartBeads` (parallel AI thrash + silent long runs on Windows).
 *
 * Usage:
 *   node PROJECTS/SmartBeads/scripts/run-jest-batched.mjs
 *   node PROJECTS/SmartBeads/scripts/run-jest-batched.mjs --skip-slow
 *   node PROJECTS/SmartBeads/scripts/run-jest-batched.mjs --batch=seven-board
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const JEST = path.join(ROOT, 'node_modules', 'jest', 'bin', 'jest.js');

const BATCHES = [
  {
    id: 'seven-board',
    label: '7-board core (smoke + unit + turn + geometry)',
    timeoutMs: 120_000,
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
    label: 'Feature session, settings, spectate (fast)',
    timeoutMs: 180_000,
    files: [
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/GameFeatureSettings.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/FeatureSession.featureRules.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/FeatureSession.firstMove.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/FeatureSession.resignation.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/clockPolicy.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/aiTurnPath.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/HonestAi.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/spectate.test.ts',
    ],
  },
  {
    id: 'web-shell-layout',
    label: 'Play shell, layout, render, audio',
    timeoutMs: 120_000,
    files: [
      'PROJECTS/SmartBeads/src/playtest/web/__tests__/PlayController.test.ts',
      'PROJECTS/SmartBeads/src/playtest/web/__tests__/playerBarShell.test.ts',
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
    label: 'HonestAi difficulty tiers (slow ~7 min)',
    slow: true,
    timeoutMs: 900_000,
    files: [
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/HonestAi.difficultyTiers.test.ts',
    ],
  },
  {
    id: 'slow-ai-search',
    label: 'HonestAi depth-2 search completion (slow)',
    slow: true,
    timeoutMs: 2_700_000,
    files: [
      'PROJECTS/SmartBeads/src/playtest/web/feature/__tests__/HonestAi.searchCompletion.test.ts',
    ],
  },
];

function parseArgs() {
  const skipSlow = process.argv.includes('--skip-slow');
  const batchArg = process.argv.find((a) => a.startsWith('--batch='));
  const batchId = batchArg ? batchArg.slice('--batch='.length) : null;
  return { skipSlow, batchId };
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
      const elapsedMs = Date.now() - started;
      resolve({
        id: batch.id,
        label: batch.label,
        ok: !killed && code === 0,
        code: killed ? 'TIMEOUT' : code,
        signal,
        elapsedMs,
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
  const { skipSlow, batchId } = parseArgs();
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

  const covered = new Set(BATCHES.flatMap((b) => b.files));
  console.log(`SmartBeads Jest: ${covered.size} test files in ${BATCHES.length} batches`);
  if (skipSlow) console.log('(--skip-slow: omitting HonestAi.difficultyTiers + HonestAi.searchCompletion)');

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
