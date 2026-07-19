import { BoardVariant, resolveBoard } from '../config/BoardConfig';
import { cloneBoardDefinition, GameState } from '../models/GameState';

/**
 * Project gameplay engine.
 * Works with any registered BoardVariant; board geometry comes from config resolution.
 */
export class SmartBeadsEngine {
  private readonly variant: BoardVariant;
  private currentState: GameState;

  constructor(variant: BoardVariant) {
    this.variant = variant;
    this.currentState = this.initializeInitialState(variant);
  }

  getVariant(): BoardVariant {
    return this.variant;
  }

  getState(): GameState {
    return this.currentState;
  }

  private initializeInitialState(variant: BoardVariant): GameState {
    return {
      board: cloneBoardDefinition(resolveBoard(variant)),
      currentPlayer: 'RED',
      moveCount: 0,
      gameOver: false,
      winner: undefined,
    };
  }
}
