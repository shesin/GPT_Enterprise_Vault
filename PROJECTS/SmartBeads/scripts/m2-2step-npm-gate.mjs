/**
 * npm-test live gate: 16-bead A41→A42 two-click occupancy.
 * Starts Vite only if http://localhost:5173/ is not already up.
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const URL = process.env.SMARTBEADS_URL || 'http://localhost:5173/';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OBSERVE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'm2-2step-observe.mjs');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function isUp() {
  try {
    const res = await fetch(URL);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureVite() {
  if (await isUp()) return null;
  const child = spawn('npm', ['run', 'web:smartbeads'], {
    cwd: ROOT,
    shell: true,
    stdio: 'pipe',
    windowsHide: true,
  });
  for (let i = 0; i < 60; i++) {
    await sleep(250);
    if (await isUp()) return child;
  }
  child.kill();
  throw new Error('Vite did not start at ' + URL);
}

async function runObserve() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [OBSERVE], {
      cwd: path.join(ROOT, 'PROJECTS', 'SmartBeads'),
      env: { ...process.env, SMARTBEADS_URL: URL },
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error('m2-2step-observe exited ' + code));
    });
    child.on('error', reject);
  });
}

async function main() {
  const started = await ensureVite();
  try {
    await runObserve();
  } finally {
    if (started) started.kill();
  }
}

main().catch((err) => {
  console.error('UNCONFIRMED  live two-click gate:', err.message || err);
  process.exit(1);
});
