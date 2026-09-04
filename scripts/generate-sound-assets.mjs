/**
 * @deprecated Use `node scripts/generate-sfx-wavs.mjs` — writes WAV files to public/audio/.
 * Runtime loads via SoundManifest.ts (no base64 embed in JS bundle).
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(rootDir, 'scripts', 'generate-sfx-wavs.mjs');
console.log('Redirecting to generate-sfx-wavs.mjs (public/audio/ + SoundManifest.ts)...');
const r = spawnSync(process.execPath, [target], { stdio: 'inherit', cwd: rootDir });
process.exit(r.status ?? 1);
