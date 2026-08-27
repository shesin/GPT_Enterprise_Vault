import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const publicAudioDir = path.resolve(rootDir, 'public/audio');
const assetAudioDir = path.resolve(rootDir, 'PROJECTS/SmartBeads/src/playtest/web/audio/assets');

const lines = [
  // American Warm Baritone (Christopher)
  { file: 'voice_start.mp3', text: "Let's play!", voice: 'en-US-ChristopherNeural' },
  { file: 'voice_good.mp3', text: 'Good!', voice: 'en-US-ChristopherNeural' },
  { file: 'voice_best.mp3', text: 'Best!', voice: 'en-US-ChristopherNeural' },
  { file: 'voice_excellent.mp3', text: 'Excellent!', voice: 'en-US-ChristopherNeural' },
  { file: 'voice_victory.mp3', text: 'Victory!', voice: 'en-US-ChristopherNeural' },

  // British Warm Host (Ryan)
  { file: 'voice_start_uk.mp3', text: "Let's play!", voice: 'en-GB-RyanNeural' },
  { file: 'voice_good_uk.mp3', text: 'Good!', voice: 'en-GB-RyanNeural' },
  { file: 'voice_best_uk.mp3', text: 'Best!', voice: 'en-GB-RyanNeural' },
  { file: 'voice_excellent_uk.mp3', text: 'Excellent!', voice: 'en-GB-RyanNeural' },
  { file: 'voice_victory_uk.mp3', text: 'Victory!', voice: 'en-GB-RyanNeural' },
];

async function generateVoice(voiceName, text, outputFile) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const stream = tts.toStream(text);
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.audioStream.on('data', chunk => chunks.push(chunk));
    stream.audioStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(path.join(publicAudioDir, outputFile), buffer);
      fs.writeFileSync(path.join(assetAudioDir, outputFile), buffer);
      console.log(`Generated ${outputFile} (${voiceName}): ${buffer.length} bytes`);
      resolve(buffer);
    });
    stream.audioStream.on('error', reject);
  });
}

async function main() {
  for (const item of lines) {
    await generateVoice(item.voice, item.text, item.file);
  }
  console.log('All American & British neural studio voices generated!');
}

main().catch(console.error);
