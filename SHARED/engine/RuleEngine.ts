/** 
     * Manages game configuration, board size, legal moves, and turn order.
     */
    export interface RuleEngine {
      getBoardSize(): { width: number, height: number };
      getLegalMoves(gameState: any): any[];
      determineTurnOrder(players: any[]): any[];
      loadGameConfiguration(config: any): void;
    }