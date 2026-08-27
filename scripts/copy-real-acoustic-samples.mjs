import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const samplesDir = path.resolve(rootDir, 'public/audio/samples');
const jinglesDir = path.resolve(rootDir, 'public/audio/jingles');
const publicAudioDir = path.resolve(rootDir, 'public/audio');
const assetAudioDir = path.resolve(rootDir, 'PROJECTS/SmartBeads/src/playtest/web/audio/assets');

fs.mkdirSync(publicAudioDir, { recursive: true });
fs.mkdirSync(assetAudioDir, { recursive: true });

function copy(src, name) {
  const data = fs.readFileSync(src);
  fs.writeFileSync(path.join(publicAudioDir, name), data);
  fs.writeFileSync(path.join(assetAudioDir, name), data);
  console.log(`Copied ${name}: ${data.length} bytes`);
}

// Map real CC0 studio recorded audio samples
copy(path.join(samplesDir, 'pluck_001.wav'), 'sfx_select.wav');
copy(path.join(samplesDir, 'drop_001.wav'), 'sfx_slide.wav');
copy(path.join(samplesDir, 'confirmation_002.wav'), 'sfx_capture.wav');
copy(path.join(samplesDir, 'confirmation_001.wav'), 'sfx_flourish.wav');
copy(path.join(jinglesDir, 'jingles_STEEL00.ogg'), 'sfx_start.ogg');
copy(path.join(jinglesDir, 'jingles_PIZZI10.ogg'), 'sfx_victory.ogg');
copy(path.join(jinglesDir, 'jingles_STEEL14.ogg'), 'sfx_defeat.ogg');
copy(path.join(jinglesDir, 'jingles_PIZZI14.ogg'), 'sfx_draw.ogg');

console.log('Real CC0 recorded studio acoustic samples copied successfully!');
