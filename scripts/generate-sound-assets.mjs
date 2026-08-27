import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const assetDir = path.resolve(rootDir, 'PROJECTS/SmartBeads/src/playtest/web/audio/assets');

function getBase64(file, mime) {
  const p = path.join(assetDir, file);
  const buf = fs.readFileSync(p);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

const selectUri = getBase64('sfx_select.wav', 'audio/wav');
const slideUri = getBase64('sfx_slide.wav', 'audio/wav');
const captureUri = getBase64('sfx_capture.wav', 'audio/wav');
const flourishUri = getBase64('sfx_flourish.wav', 'audio/wav');
const startUri = getBase64('sfx_start.ogg', 'audio/ogg');
const victoryUri = getBase64('sfx_victory.ogg', 'audio/ogg');
const defeatUri = getBase64('sfx_defeat.ogg', 'audio/ogg');
const drawUri = getBase64('sfx_draw.ogg', 'audio/ogg');

const tsModule = `/**
 * Pure Real Studio Recorded CC0 Acoustic Instrument Audio Assets.
 * Real recorded wooden tap, slide, acoustic chime pops, harp glissando, and orchestral pizzicato fanfare.
 * 100% CC0 Public Domain.
 */

export const SFX_SELECT_DATA_URI = '${selectUri}';
export const SFX_SLIDE_DATA_URI = '${slideUri}';
export const SFX_CAPTURE_DATA_URI = '${captureUri}';
export const SFX_FLOURISH_DATA_URI = '${flourishUri}';
export const SFX_START_DATA_URI = '${startUri}';
export const SFX_VICTORY_DATA_URI = '${victoryUri}';
export const SFX_DEFEAT_DATA_URI = '${defeatUri}';
export const SFX_DRAW_DATA_URI = '${drawUri}';
`;

fs.writeFileSync(path.resolve(rootDir, 'PROJECTS/SmartBeads/src/playtest/web/audio/SoundAssets.ts'), tsModule);
console.log('Successfully updated SoundAssets.ts with real CC0 recorded acoustic instrument assets!');
