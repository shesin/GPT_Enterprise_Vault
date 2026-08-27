/**
 * Production HonestAi difficulty Lab — TypeScript HonestAi only (not prototype .cjs).
 *
 * Usage:
 *   npx tsx PROJECTS/SmartBeads/scripts/lab-ai-difficulty-eval.mjs
 */
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

const { SmartBeadsEngine } = await import(
  pathToFileURL(path.join(root, 'PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts')).href
);
const {
  selectAiTurnPath,
  EASY_SOFT_MISS_RATE,
  MEDIUM_SOFT_MISS_RATE,
  aiOpponentReplyPlies,
} = await import(
  pathToFileURL(path.join(root, 'PROJECTS/SmartBeads/src/playtest/web/feature/HonestAi.ts')).href
);

function applyPath(engine, pathMoves) {
  for (const move of pathMoves) {
    if (engine.getState().gameOver) return;
    const legal = engine.getLegalMoves().some((m) => m.from === move.from && m.to === move.to);
    if (!legal) {
      if (engine.getChainPieceId() !== null) engine.endTurn();
      return;
    }
    engine.applyMove(move);
  }
  if (engine.getChainPieceId() !== null) engine.endTurn();
}

function playMatch(blueLevel, seed, maxPlies = 50) {
  const engine = new SmartBeadsEngine('6x3x5');
  let ply = 0;
  let rngState = seed + 1;
  const rng = () => {
    rngState = (rngState * 1103515245 + 12345) % 0x100000000;
    return (rngState >>> 0) / 0x100000000;
  };

  while (!engine.getState().gameOver && ply < maxPlies) {
    const player = engine.getState().currentPlayer;
    const level = player === 'BLUE' ? blueLevel : 1;
    const turnPath = selectAiTurnPath('6x3x5', level, engine.exportSnapshot(), player, {
      budgetMs: level >= 3 ? 2500 : level === 2 ? 700 : 200,
      easySoftMissRate: level === 1 ? EASY_SOFT_MISS_RATE : 0,
      mediumSoftMissRate: level === 2 ? MEDIUM_SOFT_MISS_RATE : 0,
      rng,
      center: { centerRule: 'off' },
    });
    if (!turnPath?.length) break;
    applyPath(engine, turnPath);
    ply += 1;
  }

  if (engine.getState().gameOver) return engine.getState().winner ?? 'DRAW';
  const red = engine.countPieces('RED');
  const blue = engine.countPieces('BLUE');
  if (red === blue) return 'DRAW';
  return red > blue ? 'RED' : 'BLUE';
}

console.log('Production HonestAi Lab — depth contract', {
  easy: aiOpponentReplyPlies(1),
  medium: aiOpponentReplyPlies(2),
  hard: aiOpponentReplyPlies(3),
});

const GAMES = 16;
let easyWins = 0;
let mediumWins = 0;
for (let i = 0; i < GAMES; i++) {
  if (playMatch(1, 3 + i * 17) === 'BLUE') easyWins += 1;
  if (playMatch(2, 3 + i * 17) === 'BLUE') mediumWins += 1;
}

let mediumPair = 0;
let hardPair = 0;
for (let i = 0; i < 12; i++) {
  if (playMatch(2, 5 + i * 31) === 'BLUE') mediumPair += 1;
  if (playMatch(3, 5 + i * 31) === 'BLUE') hardPair += 1;
}

console.log(`Easy BLUE wins:          ${easyWins}/${GAMES}`);
console.log(`Medium BLUE wins:        ${mediumWins}/${GAMES}`);
console.log(`Paired Medium/Hard wins: ${mediumPair}/${hardPair} (12 games)`);

let failed = 0;
if (mediumWins <= easyWins) {
  console.error('FAIL  Medium must beat Easy more often on 6x3x5');
  failed += 1;
} else {
  console.log('CONFIRMED  Medium > Easy win rate');
}

if (hardPair < mediumPair) {
  console.error('FAIL  Hard must win at least as often as Medium');
  failed += 1;
} else {
  console.log('CONFIRMED  Hard >= Medium win rate');
}

if (failed) process.exit(1);
console.log('LAB PASS — production HonestAi difficulty gates');
