import { BoardVariant, resolveBoard } from '../config/BoardConfig';
import {
  cloneBoardDefinition,
  getConnectedIds,
  GameState,
  hasReachedPlyLimit,
  Move,
  Player,
  requireIntersection,
} from '../models/GameState';

/**
 * Project gameplay engine.
 * Board geometry, centers, and ply limits come from BoardDefinition — not hard-coded sizes.
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

  /**
   * Legal non-capturing slides for the current player:
   * move a bead along a connection onto an empty intersection.
   */
  getLegalMoves(): Move[] {
    if (this.currentState.gameOver) {
      return [];
    }

    const { board, currentPlayer } = this.currentState;
    const moves: Move[] = [];

    for (const intersection of board.intersections) {
      if (intersection.occupant !== currentPlayer) {
        continue;
      }

      for (const to of getConnectedIds(board, intersection.id)) {
        const target = requireIntersection(board, to);
        if (target.occupant === undefined) {
          moves.push({ from: intersection.id, to });
        }
      }
    }

    return moves;
  }

  applyMove(move: Move): void {
    if (this.currentState.gameOver) {
      throw new Error('Game is already over.');
    }

    const isLegal = this.getLegalMoves().some(
      (legal) => legal.from === move.from && legal.to === move.to,
    );
    if (!isLegal) {
      throw new Error(`Illegal move: ${move.from} -> ${move.to}`);
    }

    const board = this.currentState.board;
    const fromPoint = requireIntersection(board, move.from);
    const toPoint = requireIntersection(board, move.to);

    toPoint.occupant = fromPoint.occupant;
    fromPoint.occupant = undefined;
    this.currentState.moveCount += 1;

    if (hasReachedPlyLimit(board.maxPlies, this.currentState.moveCount)) {
      this.currentState.gameOver = true;
      this.evaluateWinner();
      return;
    }

    this.currentState.currentPlayer = this.opponentOf(this.currentState.currentPlayer);
  }

  private evaluateWinner(): void {
    const { captures, board } = this.currentState;

    if (captures.RED !== captures.BLUE) {
      this.currentState.winner = captures.RED > captures.BLUE ? 'RED' : 'BLUE';
      return;
    }

    const centerIds = board.centerNodeIds ?? [];
    if (centerIds.length > 0) {
      let redCenter = 0;
      let blueCenter = 0;

      for (const id of centerIds) {
        const occupant = requireIntersection(board, id).occupant;
        if (occupant === 'RED') {
          redCenter += 1;
        } else if (occupant === 'BLUE') {
          blueCenter += 1;
        }
      }

      if (redCenter !== blueCenter) {
        this.currentState.winner = redCenter > blueCenter ? 'RED' : 'BLUE';
        return;
      }
    }

    this.currentState.winner = 'DRAW';
  }

  private opponentOf(player: Player): Player {
    return player === 'RED' ? 'BLUE' : 'RED';
  }

  private initializeInitialState(variant: BoardVariant): GameState {
    return {
      board: cloneBoardDefinition(resolveBoard(variant)),
      currentPlayer: 'RED',
      moveCount: 0,
      captures: { RED: 0, BLUE: 0 },
      gameOver: false,
      winner: undefined,
    };
  }
}
