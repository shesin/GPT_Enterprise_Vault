/** 
     * Responsible for executing moves within the game.
     */
    export interface MoveEngine {
      executeMove(move: any, gameState: any): void;
      undoMove(move: any, gameState: any): void;
      redoMove(move: any, gameState: any): void;
    }