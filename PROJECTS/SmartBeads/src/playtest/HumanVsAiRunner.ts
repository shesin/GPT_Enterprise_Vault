import * as readline from 'readline';
import { SmartBeadsEngine } from '../core/SmartBeadsEngine';
import { BoardDefinition, Player } from '../models/GameState';
import { executeAiRandomMove, GameResult, TerminationReason } from '../simulation/SelfPlayRunner';

/**
 * Formats a 4x4 Board4 instance into a readable text grid for CLI playtesting.
 */
export function renderBoard4(board: BoardDefinition): string {
  const lines: string[] = ['\n--- Board4 State ---'];
  for (let row = 0; row < 4; row++) {
    const rowCells: string[] = [];
    for (let col = 0; col < 4; col++) {
      const id = row * 4 + col;
      const intersection = board.intersections.find((p) => p.id === id);
      const symbol = intersection?.occupant === 'RED' ? 'R' : intersection?.occupant === 'BLUE' ? 'B' : '.';
      rowCells.push(`${id.toString().padStart(2, ' ')}:${symbol}`);
    }
    lines.push(rowCells.join(' | '));
  }
  lines.push('-------------------');
  return lines.join('\n');
}

/**
 * Generates a structured GameResult from a finished engine instance.
 */
export function buildGameSummary(engine: SmartBeadsEngine, startingPlayer: Player): GameResult {
  const state = engine.getState();
  const redPieces = engine.countPieces('RED');
  const bluePieces = engine.countPieces('BLUE');

  let terminationReason: TerminationReason = 'Ply limit';
  if (redPieces === 0 || bluePieces === 0) {
    terminationReason = 'Capture victory';
  } else if (engine.getLegalMoves().length === 0 && engine.getChainPieceId() === null) {
    terminationReason = 'No legal moves';
  }

  return {
    startingPlayer,
    winner: state.winner ?? 'DRAW',
    totalPlies: state.moveCount,
    redRemainingPieces: redPieces,
    blueRemainingPieces: bluePieces,
    terminationReason,
  };
}

/**
 * CLI Runner loop for Human vs AI playtesting on Board4.
 */
export function runInteractivePlaytest(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptUser = (query: string): Promise<string> =>
    new Promise((resolve) => rl.question(query, resolve));

  async function startSession(): Promise<void> {
    console.log('\n======================================');
    console.log('   SmartBeads Board4 Playtest CLI');
    console.log('======================================');

    const playerChoice = await promptUser('Choose your color (R for RED / B for BLUE) [default R]: ');
    const humanColor: Player = playerChoice.trim().toUpperCase() === 'B' ? 'BLUE' : 'RED';
    const aiColor: Player = humanColor === 'RED' ? 'BLUE' : 'RED';

    console.log(`\nYou are playing as ${humanColor}. AI is playing as ${aiColor}.`);

    const engine = new SmartBeadsEngine('4');

    while (!engine.getState().gameOver) {
      const state = engine.getState();
      const current = state.currentPlayer;

      console.log(renderBoard4(state.board));
      console.log(`Turn ${state.moveCount + 1}: Current player is ${current}`);
      console.log(`Captures -> RED: ${state.captures.RED} | BLUE: ${state.captures.BLUE}`);
      console.log(`Pieces -> RED: ${engine.countPieces('RED')} | BLUE: ${engine.countPieces('BLUE')}`);

      if (current === humanColor) {
        const legalMoves = engine.getLegalMoves();
        const chainPieceId = engine.getChainPieceId();

        if (legalMoves.length === 0 && chainPieceId === null) {
          console.log('\nNo legal moves available for you.');
          break;
        }

        if (chainPieceId !== null) {
          console.log(`\nMid capture-chain active for bead ${chainPieceId}.`);
          console.log('Options:');
          console.log('  0: End turn voluntarily');
          legalMoves.forEach((m, idx) => {
            console.log(`  ${idx + 1}: Jump ${m.from} -> ${m.to}`);
          });

          const choice = await promptUser('Select option number: ');
          const selectedIndex = parseInt(choice.trim(), 10);

          if (selectedIndex === 0) {
            engine.endTurn();
            console.log('You voluntarily ended your capture turn.');
          } else if (selectedIndex > 0 && selectedIndex <= legalMoves.length) {
            engine.applyMove(legalMoves[selectedIndex - 1]);
          } else {
            console.log('Invalid selection. Retrying turn...');
          }
        } else {
          console.log('\nLegal moves:');
          legalMoves.forEach((m, idx) => {
            console.log(`  ${idx + 1}: Move ${m.from} -> ${m.to}`);
          });

          const choice = await promptUser('Select move number: ');
          const selectedIndex = parseInt(choice.trim(), 10);

          if (selectedIndex > 0 && selectedIndex <= legalMoves.length) {
            engine.applyMove(legalMoves[selectedIndex - 1]);
          } else {
            console.log('Invalid move number. Retrying turn...');
          }
        }
      } else {
        console.log(`\nAI (${aiColor}) is taking its turn...`);
        const moved = executeAiRandomMove(engine);
        if (!moved) {
          console.log('AI has no legal moves available.');
          break;
        }
      }
    }

    const summary = buildGameSummary(engine, 'RED');
    console.log('\n======================================');
    console.log('              GAME OVER               ');
    console.log('======================================');
    console.log(`Winner: ${summary.winner}`);
    console.log(`Total Plies: ${summary.totalPlies}`);
    console.log(`Final Pieces -> RED: ${summary.redRemainingPieces} | BLUE: ${summary.blueRemainingPieces}`);
    console.log(`Termination Reason: ${summary.terminationReason}`);

    const again = await promptUser('\nPlay another game? (y/n) [default n]: ');
    if (again.trim().toLowerCase() === 'y') {
      await startSession();
    } else {
      console.log('Exiting playtest session. Goodbye!');
      rl.close();
    }
  }

  startSession().catch((err) => {
    console.error('Unexpected error in playtest runner:', err);
    rl.close();
  });
}

// `require` does not exist in browser/ESM contexts. `typeof require` is safe
// to evaluate on an undeclared identifier, unlike referencing `require.main`
// directly, which would throw an uncaught ReferenceError if this module were
// ever imported into a browser/ESM module graph.
if (typeof require !== 'undefined' && require.main === module) {
  runInteractivePlaytest();
}

