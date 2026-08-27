import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Creates a standard uncompressed 16-bit Mono PCM WAV Buffer with Peak Normalization
 */
function createWavBuffer(samples, sampleRate = 44100) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  const normFactor = peak > 1e-6 ? 0.90 / peak : 1.0;

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Soft peak limiter with warm analog saturation
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    let s = samples[i] * normFactor;
    s = Math.tanh(s); // Warm analog curve
    const intVal = Math.max(-32768, Math.min(32767, Math.floor(s * 32767)));
    buffer.writeInt16LE(intVal, offset);
    offset += 2;
  }

  return buffer;
}

/**
 * Candy Crush Style Audio Suite:
 * Pure sweet acoustic physical modeling (Marimba, Rosewood Bar, Concert Harp, Kalimba).
 * Zero white noise, zero harshness, zero synthetic buzz.
 */

// 1. Select: Juicy sweet wooden bubble-tap (35ms)
function generateSelectWav() {
  const sampleRate = 44100;
  const duration = 0.038;
  const length = Math.floor(sampleRate * duration);
  const samples = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 110);
    // Smooth downward pitch drop (280 Hz -> 190 Hz)
    const f = 280 - 90 * (1 - Math.exp(-t * 120));
    const body = Math.sin(2 * Math.PI * f * t) * 0.85;
    const mallet = Math.sin(2 * Math.PI * 380 * t) * 0.20 * Math.exp(-t * 260);
    samples[i] = (body + mallet) * env;
  }
  return createWavBuffer(samples, sampleRate);
}

// 2. Slide / Move: Soft wooden piece settling on felt (45ms)
function generateSlideWav() {
  const sampleRate = 44100;
  const duration = 0.045;
  const length = Math.floor(sampleRate * duration);
  const samples = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 90);
    const sub = Math.sin(2 * Math.PI * 130 * t) * 0.40;
    const wood = Math.sin(2 * Math.PI * 180 * t) * 0.75;
    const tap = Math.sin(2 * Math.PI * 260 * t) * 0.15 * Math.exp(-t * 180);
    samples[i] = (sub + wood + tap) * env;
  }
  return createWavBuffer(samples, sampleRate);
}

// 3. Capture: Luscious rosewood Marimba strike (C5, 523.25 Hz) (180ms)
function generateCaptureWav() {
  const sampleRate = 44100;
  const duration = 0.18;
  const length = Math.floor(sampleRate * duration);
  const samples = new Float32Array(length);
  const f = 523.25; // C5

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Marimba acoustic envelope (quick attack, warm musical decay)
    const env = Math.exp(-t * 18);
    // Fundamental + 2nd overtone + soft wooden strike knock
    const h1 = Math.sin(2 * Math.PI * f * t) * 0.80;
    const h2 = Math.sin(2 * Math.PI * (f * 2) * t) * 0.25 * Math.exp(-t * 35);
    const h3 = Math.sin(2 * Math.PI * (f * 3) * t) * 0.08 * Math.exp(-t * 60);
    const knock = Math.sin(2 * Math.PI * 220 * t) * 0.35 * Math.exp(-t * 80);
    samples[i] = (h1 + h2 + h3 + knock) * env;
  }
  return createWavBuffer(samples, sampleRate);
}

// 4. 3+ Multi-Jump Flourish: Sweet 4-note ascending Marimba & Celesta arpeggio (C5 -> E5 -> G5 -> C6) (380ms)
function generateFlourishWav() {
  const sampleRate = 44100;
  const duration = 0.38;
  const length = Math.floor(sampleRate * duration);
  const samples = new Float32Array(length);

  const notes = [
    { f: 523.25, start: 0.00, amp: 0.70 }, // C5
    { f: 659.25, start: 0.06, amp: 0.75 }, // E5
    { f: 783.99, start: 0.12, amp: 0.80 }, // G5
    { f: 1046.50, start: 0.18, amp: 0.95 }, // C6
  ];

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let val = 0;
    for (const n of notes) {
      if (t >= n.start) {
        const lt = t - n.start;
        const env = Math.exp(-lt * 15);
        const h1 = Math.sin(2 * Math.PI * n.f * lt) * 0.80;
        const h2 = Math.sin(2 * Math.PI * (n.f * 2) * lt) * 0.20 * Math.exp(-lt * 25);
        val += (h1 + h2) * env * n.amp;
      }
    }
    const sub = Math.sin(2 * Math.PI * 130 * t) * Math.exp(-t * 20) * 0.25;
    samples[i] = val + sub;
  }
  return createWavBuffer(samples, sampleRate);
}

// 5. Game Start: Sweet Concert Harp & Celesta Glissando (C4 -> E4 -> G4 -> C5 -> E5 -> G5 -> C6) (1.6s)
// 100% Pure sweet acoustic music - ZERO noise, ZERO claps, ZERO harshness
function generateStartWav() {
  const sampleRate = 44100;
  const duration = 1.60;
  const length = Math.floor(sampleRate * duration);
  const samples = new Float32Array(length);

  const harpNotes = [
    { f: 261.63, start: 0.00, amp: 0.60 }, // C4
    { f: 329.63, start: 0.10, amp: 0.65 }, // E4
    { f: 392.00, start: 0.20, amp: 0.70 }, // G4
    { f: 523.25, start: 0.30, amp: 0.80 }, // C5
    { f: 659.25, start: 0.40, amp: 0.85 }, // E5
    { f: 783.99, start: 0.50, amp: 0.90 }, // G5
    { f: 1046.50, start: 0.62, amp: 0.95 }, // C6
  ];

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let val = 0;
    for (const n of harpNotes) {
      if (t >= n.start) {
        const lt = t - n.start;
        const env = Math.exp(-lt * 4.2); // Warm harp string sustain
        const string1 = Math.sin(2 * Math.PI * n.f * lt) * 0.78;
        const string2 = Math.sin(2 * Math.PI * (n.f * 2.0) * lt) * 0.18 * Math.exp(-lt * 8);
        const string3 = Math.sin(2 * Math.PI * (n.f * 3.0) * lt) * 0.06 * Math.exp(-lt * 15);
        val += (string1 + string2 + string3) * env * n.amp;
      }
    }
    samples[i] = val * 0.75;
  }
  return createWavBuffer(samples, sampleRate);
}

// 6. Victory: Triumphant, warm sweet Marimba celebration (C4 -> G4 -> C5 -> E5 -> G5 -> C6) (1.2s)
function generateVictoryWav() {
  const sampleRate = 44100;
  const duration = 1.20;
  const length = Math.floor(sampleRate * duration);
  const samples = new Float32Array(length);

  const notes = [
    { f: 261.63, start: 0.00, amp: 0.60 }, // C4
    { f: 392.00, start: 0.12, amp: 0.65 }, // G4
    { f: 523.25, start: 0.24, amp: 0.75 }, // C5
    { f: 659.25, start: 0.36, amp: 0.85 }, // E5
    { f: 783.99, start: 0.48, amp: 0.90 }, // G5
    { f: 1046.50, start: 0.60, amp: 0.95 }, // C6
  ];

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let val = 0;
    for (const n of notes) {
      if (t >= n.start) {
        const lt = t - n.start;
        const env = Math.exp(-lt * 6.0);
        const h1 = Math.sin(2 * Math.PI * n.f * lt) * 0.80;
        const h2 = Math.sin(2 * Math.PI * (n.f * 2) * lt) * 0.20;
        val += (h1 + h2) * env * n.amp;
      }
    }
    samples[i] = val * 0.75;
  }
  return createWavBuffer(samples, sampleRate);
}

// 7. Defeat: Gentle comforting Kalimba resolution (G4 -> E4 -> C4) (600ms)
function generateDefeatWav() {
  const sampleRate = 44100;
  const duration = 0.60;
  const length = Math.floor(sampleRate * duration);
  const samples = new Float32Array(length);

  const notes = [
    { f: 392.00, start: 0.00, amp: 0.70 }, // G4
    { f: 329.63, start: 0.16, amp: 0.75 }, // E4
    { f: 261.63, start: 0.32, amp: 0.80 }, // C4
  ];

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let val = 0;
    for (const n of notes) {
      if (t >= n.start) {
        const lt = t - n.start;
        const env = Math.exp(-lt * 8.0);
        const h1 = Math.sin(2 * Math.PI * n.f * lt) * 0.85;
        const h2 = Math.sin(2 * Math.PI * (n.f * 1.5) * lt) * 0.10;
        val += (h1 + h2) * env * n.amp;
      }
    }
    samples[i] = val;
  }
  return createWavBuffer(samples, sampleRate);
}

// 8. Draw: Peaceful twin chime (G4 -> C5) (450ms)
function generateDrawWav() {
  const sampleRate = 44100;
  const duration = 0.45;
  const length = Math.floor(sampleRate * duration);
  const samples = new Float32Array(length);

  const notes = [
    { f: 392.00, start: 0.00, amp: 0.70 }, // G4
    { f: 523.25, start: 0.15, amp: 0.80 }, // C5
  ];

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let val = 0;
    for (const n of notes) {
      if (t >= n.start) {
        const lt = t - n.start;
        const env = Math.exp(-lt * 9.0);
        const h1 = Math.sin(2 * Math.PI * n.f * lt) * 0.85;
        val += h1 * env * n.amp;
      }
    }
    samples[i] = val;
  }
  return createWavBuffer(samples, sampleRate);
}

const selectWav = generateSelectWav();
const slideWav = generateSlideWav();
const captureWav = generateCaptureWav();
const flourishWav = generateFlourishWav();
const startWav = generateStartWav();
const victoryWav = generateVictoryWav();
const defeatWav = generateDefeatWav();
const drawWav = generateDrawWav();

const assetDir = path.resolve(rootDir, 'PROJECTS/SmartBeads/src/playtest/web/audio/assets');
const publicDir = path.resolve(rootDir, 'public/audio');

fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(assetDir, 'sfx_select.wav'), selectWav);
fs.writeFileSync(path.join(assetDir, 'sfx_slide.wav'), slideWav);
fs.writeFileSync(path.join(assetDir, 'sfx_capture.wav'), captureWav);
fs.writeFileSync(path.join(assetDir, 'sfx_flourish.wav'), flourishWav);
fs.writeFileSync(path.join(assetDir, 'sfx_start.wav'), startWav);
fs.writeFileSync(path.join(assetDir, 'sfx_victory.wav'), victoryWav);
fs.writeFileSync(path.join(assetDir, 'sfx_defeat.wav'), defeatWav);
fs.writeFileSync(path.join(assetDir, 'sfx_draw.wav'), drawWav);

fs.writeFileSync(path.join(publicDir, 'sfx_select.wav'), selectWav);
fs.writeFileSync(path.join(publicDir, 'sfx_slide.wav'), slideWav);
fs.writeFileSync(path.join(publicDir, 'sfx_capture.wav'), captureWav);
fs.writeFileSync(path.join(publicDir, 'sfx_flourish.wav'), flourishWav);
fs.writeFileSync(path.join(publicDir, 'sfx_start.wav'), startWav);
fs.writeFileSync(path.join(publicDir, 'sfx_victory.wav'), victoryWav);
fs.writeFileSync(path.join(publicDir, 'sfx_defeat.wav'), defeatWav);
fs.writeFileSync(path.join(publicDir, 'sfx_draw.wav'), drawWav);

// Generate SoundAssets.ts
const tsModule = `/**
 * Pure Sweet Acoustic Sound Assets (Candy Crush Style Reference).
 * Handcrafted acoustic Marimba, Rosewood Bar, Concert Harp, and Kalimba.
 * 100% royalty-free CC0 Public Domain.
 */

export const SFX_SELECT_DATA_URI = 'data:audio/wav;base64,${selectWav.toString('base64')}';
export const SFX_SLIDE_DATA_URI = 'data:audio/wav;base64,${slideWav.toString('base64')}';
export const SFX_CAPTURE_DATA_URI = 'data:audio/wav;base64,${captureWav.toString('base64')}';
export const SFX_FLOURISH_DATA_URI = 'data:audio/wav;base64,${flourishWav.toString('base64')}';
export const SFX_START_DATA_URI = 'data:audio/wav;base64,${startWav.toString('base64')}';
export const SFX_VICTORY_DATA_URI = 'data:audio/wav;base64,${victoryWav.toString('base64')}';
export const SFX_DEFEAT_DATA_URI = 'data:audio/wav;base64,${defeatWav.toString('base64')}';
export const SFX_DRAW_DATA_URI = 'data:audio/wav;base64,${drawWav.toString('base64')}';
`;

fs.writeFileSync(path.resolve(rootDir, 'PROJECTS/SmartBeads/src/playtest/web/audio/SoundAssets.ts'), tsModule);

console.log('Successfully generated pure sweet Candy Crush style acoustic WAV audio assets and SoundAssets.ts');
