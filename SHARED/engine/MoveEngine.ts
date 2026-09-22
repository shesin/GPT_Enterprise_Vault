/**
 * Responsible for executing moves within the game.
 */
export interface MoveEngine {
  executeMove(move: unknown, gameState: unknown): void;
  undoMove(move: unknown, gameState: unknown): void;
  redoMove(move: unknown, gameState: unknown): void;
}
