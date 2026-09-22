/**
 * Central coordinator for the game.
 */
export interface GameEngine {
  initialize(): void;
  startGame(): void;
  makeMove(move: unknown): void;
  validateMove(move: unknown): boolean;
  checkVictory(): boolean;
  endGame(): void;
}
