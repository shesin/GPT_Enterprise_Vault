/**
 * Checks for win conditions at the end of each turn.
 */
export interface VictoryEngine {
  checkForVictory(gameState: unknown): { victory: boolean; winner: unknown | null };
}
