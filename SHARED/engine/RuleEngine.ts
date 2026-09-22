/**
 * Manages game configuration, board size, legal moves, and turn order.
 */
export interface RuleEngine {
  getBoardSize(): { width: number; height: number };
  getLegalMoves(gameState: unknown): unknown[];
  determineTurnOrder(players: unknown[]): unknown[];
  loadGameConfiguration(config: unknown): void;
}
