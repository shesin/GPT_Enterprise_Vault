import { BoardVariant } from '../config/BoardConfig';
import { Player } from '../models/GameState';
import { SmartBeadsEngine } from '../core/SmartBeadsEngine';

export type TerminationReason = 'Capture victory' | 'No legal moves' | 'Ply limit';

export interface GameResult {
  startingPlayer: Player;
  winner: Player | 'DRAW';
  totalPlies: number;
  redRemainingPieces: number;
  blueRemainingPieces: number;
  redCaptures: number;
  blueCaptures: number;
  terminationReason: TerminationReason;
}

export interface BatchSimulationReport {
  variant: BoardVariant;
  totalGamesPlayed: number;
  redWins: number;
  blueWins: number;
  draws: number;
  averageGameLength: number;
  minGameLength: number;
  maxGameLength: number;
  averageCapturesPerGame: number;
  gamesEndingByNoLegalMoves: number;
  gamesEndingByPlyLimit: number;
  gamesEndingByCaptureVictory: number;
  timestamp: string;
}

/**
 * Selects and applies a single random legal move for the current player on the engine instance.
 * Handles mid-chain capture continuation decisions (50% endTurn vs continuing jump).
 * Returns true if a move or endTurn was applied; false if game is over or no legal moves exist.
 */
export function executeAiRandomMove(engine: SmartBeadsEngine): boolean {
  if (engine.getState().gameOver) {
    return false;
  }

  const legalMoves = engine.getLegalMoves();
  const chainPieceId = engine.getChainPieceId();

  if (legalMoves.length === 0) {
    if (chainPieceId !== null) {
      engine.endTurn();
      return true;
    }
    return false;
  }

  if (chainPieceId !== null) {
    const shouldEndTurn = Math.random() < 0.5;
    if (shouldEndTurn) {
      engine.endTurn();
      return true;
    }
  }

  const randomIndex = Math.floor(Math.random() * legalMoves.length);
  const chosenMove = legalMoves[randomIndex];

  try {
    engine.applyMove(chosenMove);
    return true;
  } catch (err) {
    throw new Error(`Unexpected engine exception applying move: ${(err as Error).message}`);
  }
}

/**
 * Executes a single automated game using random legal move selection.
 *
 * @param variant Board variant to play (e.g. '4', '5', '6', '7')
 * @param startingPlayer Player who moves first ('RED' or 'BLUE')
 * @param maxSafetyPlies Safety threshold to prevent infinite loops (default: 500)
 */
export function playSingleGame(
  variant: BoardVariant,
  startingPlayer: Player = 'RED',
  maxSafetyPlies = 500,
): GameResult {
  const engine = new SmartBeadsEngine(variant);

  // Set initial starting player if non-default
  if (startingPlayer !== 'RED') {
    engine.getState().currentPlayer = startingPlayer;
  }

  let terminationReason: TerminationReason | null = null;

  while (!engine.getState().gameOver) {
    const state = engine.getState();

    // Runner-level safety guard: non-terminating simulation detection
    if (state.moveCount >= maxSafetyPlies) {
      throw new Error(
        `Non-terminating simulation detected: moveCount (${state.moveCount}) exceeded maxSafetyPlies (${maxSafetyPlies}).`,
      );
    }

    const moved = executeAiRandomMove(engine);

    if (!moved) {
      // No legal moves available for current player -> terminate game
      state.gameOver = true;
      const redPieces = engine.countPieces('RED');
      const bluePieces = engine.countPieces('BLUE');

      if (redPieces === 0 || bluePieces === 0) {
        terminationReason = 'Capture victory';
      } else {
        terminationReason = 'No legal moves';
      }

      // Determine winner based on captures or piece count
      if (state.captures.RED !== state.captures.BLUE) {
        state.winner = state.captures.RED > state.captures.BLUE ? 'RED' : 'BLUE';
      } else if (redPieces !== bluePieces) {
        state.winner = redPieces > bluePieces ? 'RED' : 'BLUE';
      } else {
        state.winner = 'DRAW';
      }
      break;
    }
  }

  const finalState = engine.getState();
  const redRemainingPieces = engine.countPieces('RED');
  const blueRemainingPieces = engine.countPieces('BLUE');

  // Determine termination reason if not already set
  if (!terminationReason) {
    if (redRemainingPieces === 0 || blueRemainingPieces === 0) {
      terminationReason = 'Capture victory';
    } else {
      terminationReason = 'Ply limit';
    }
  }

  // Safety validations
  if (!finalState.winner || !['RED', 'BLUE', 'DRAW'].includes(finalState.winner)) {
    throw new Error(`Invalid winner reported: ${String(finalState.winner)}`);
  }

  if (redRemainingPieces < 0 || blueRemainingPieces < 0) {
    throw new Error(
      `Illegal piece counts detected: RED=${redRemainingPieces}, BLUE=${blueRemainingPieces}`,
    );
  }

  return {
    startingPlayer,
    winner: finalState.winner,
    totalPlies: finalState.moveCount,
    redRemainingPieces,
    blueRemainingPieces,
    redCaptures: finalState.captures.RED,
    blueCaptures: finalState.captures.BLUE,
    terminationReason,
  };
}

/**
 * Runs a batch of automated self-play games, alternating the starting player.
 *
 * @param variant Board variant to simulate
 * @param numberOfGames Total games to simulate
 */
export function runSelfPlayBatch(variant: BoardVariant, numberOfGames: number): GameResult[] {
  if (numberOfGames <= 0) {
    throw new Error(`Invalid numberOfGames: ${numberOfGames}. Must be greater than 0.`);
  }

  const results: GameResult[] = [];

  for (let i = 0; i < numberOfGames; i++) {
    // Alternate starting player: Game 1 (i=0) -> RED, Game 2 (i=1) -> BLUE, etc.
    const startingPlayer: Player = i % 2 === 0 ? 'RED' : 'BLUE';
    const result = playSingleGame(variant, startingPlayer);
    results.push(result);
  }

  return results;
}

/**
 * Executes a batch simulation and generates a comprehensive, machine-readable JSON report.
 *
 * @param variant Board variant to simulate
 * @param numberOfGames Total games to simulate
 */
export function generateBatchReport(
  variant: BoardVariant,
  numberOfGames: number,
): BatchSimulationReport {
  const results = runSelfPlayBatch(variant, numberOfGames);

  let redWins = 0;
  let blueWins = 0;
  let draws = 0;
  let totalPlies = 0;
  let minGameLength = Infinity;
  let maxGameLength = 0;
  let totalCaptures = 0;
  let noLegalMovesCount = 0;
  let plyLimitCount = 0;
  let captureVictoryCount = 0;

  for (const res of results) {
    if (res.winner === 'RED') redWins++;
    else if (res.winner === 'BLUE') blueWins++;
    else draws++;

    totalPlies += res.totalPlies;
    if (res.totalPlies < minGameLength) minGameLength = res.totalPlies;
    if (res.totalPlies > maxGameLength) maxGameLength = res.totalPlies;

    totalCaptures += res.redCaptures + res.blueCaptures;

    if (res.terminationReason === 'No legal moves') noLegalMovesCount++;
    else if (res.terminationReason === 'Ply limit') plyLimitCount++;
    else if (res.terminationReason === 'Capture victory') captureVictoryCount++;
  }

  return {
    variant,
    totalGamesPlayed: numberOfGames,
    redWins,
    blueWins,
    draws,
    averageGameLength: Number((totalPlies / numberOfGames).toFixed(2)),
    minGameLength: minGameLength === Infinity ? 0 : minGameLength,
    maxGameLength,
    averageCapturesPerGame: Number((totalCaptures / numberOfGames).toFixed(2)),
    gamesEndingByNoLegalMoves: noLegalMovesCount,
    gamesEndingByPlyLimit: plyLimitCount,
    gamesEndingByCaptureVictory: captureVictoryCount,
    timestamp: new Date().toISOString(),
  };
}

// `require` does not exist in browser/ESM contexts (e.g. when this module is
// imported by the Vite web playtest). `typeof require` is safe to evaluate on
// an undeclared identifier, unlike referencing `require.main` directly, which
// would throw an uncaught ReferenceError and abort the entire module graph.
if (typeof require !== 'undefined' && require.main === module) {
  const report = generateBatchReport('4', 100);
  console.log(JSON.stringify(report, null, 2));
}
