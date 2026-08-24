/**
 * npm-test live gates, run against one Vite boot:
 *  - m2-2step-observe: 16-bead A41→A42 two-click occupancy.
 *  - m2-capture-geometry-browser: real-click captures, junction, chain, optional stop.
 * Starts Vite only if http://localhost:5173/ is not already up.
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const URL = process.env.SMARTBEADS_URL || 'http://localhost:5173/';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GATES = [
  path.join(SCRIPT_DIR, 'm2-2step-observe.mjs'),
  path.join(SCRIPT_DIR, 'm2-capture-geometry-browser.mjs'),
];

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

async function runGate(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: path.join(ROOT, 'PROJECTS', 'SmartBeads'),
      env: { ...process.env, SMARTBEADS_URL: URL },
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(path.basename(script) + ' exited ' + code));
    });
    child.on('error', reject);
  });
}

async function main() {
  const started = await ensureVite();
  try {
    for (const gate of GATES) {
      await runGate(gate);
    }
  } finally {
    if (started?.pid) {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(started.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        started.kill();
      }
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('UNCONFIRMED  live two-click gate:', err.message || err);
  process.exit(1);
});
