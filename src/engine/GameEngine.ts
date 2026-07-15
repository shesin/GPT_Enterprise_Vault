/**
     * Central coordinator for the game.
     */
    export interface GameEngine {
      initialize(): void;
      startGame(): void;
      makeMove(move: any): void;
      validateMove(move: any): boolean;
      checkVictory(): boolean;
      endGame(): void;
    }