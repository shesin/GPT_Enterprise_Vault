import { BoardVariant, resolveBoard } from '../config/BoardConfig';
import {
  cloneBoardDefinition,
  findJumpPath,
  getConnectedIds,
  GameState,
  hasReachedPlyLimit,
  JumpPath,
  Move,
  Player,
  requireIntersection,
  TerminationProfile,
} from '../models/GameState';

/**
 * Project gameplay engine.
 * Board geometry, jump routes, centers, and ply limits come from BoardDefinition.
 *
 * Capture rules (project):
 * - Jumps are optional (slides remain legal when not mid-chain).
 * - Multi-jump chaining is allowed via sequential Move applications.
 * - After a capture, further jumps from the same bead are optional; call endTurn() to stop.
 */
export class SmartBeadsEngine {
  private readonly variant: BoardVariant;
  private currentState: GameState;
  /** When set, the current player must continue or end a capture chain with this bead. */
  private chainPieceId: number | null = null;

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

  /** Deep snapshot for undo, AI search, and feature-layer restore. */
  exportSnapshot(): { state: GameState; chainPieceId: number | null } {
    return {
      state: {
        ...this.currentState,
        board: cloneBoardDefinition(this.currentState.board),
        captures: { ...this.currentState.captures },
      },
      chainPieceId: this.chainPieceId,
    };
  }

  /** Restore a prior snapshot without changing match rules. */
  loadSnapshot(snapshot: { state: GameState; chainPieceId: number | null }): void {
    this.currentState = {
      ...snapshot.state,
      board: cloneBoardDefinition(snapshot.state.board),
      captures: { ...snapshot.state.captures },
    };
    this.chainPieceId = snapshot.chainPieceId;
  }

  /** Counts remaining pieces on the board for the specified player. */
  countPieces(playerId: Player): number {
    return this.currentState.board.intersections.filter(
      (point) => point.occupant === playerId,
    ).length;
  }

  /** Bead id that must continue a multi-jump, if any. */
  getChainPieceId(): number | null {
    return this.chainPieceId;
  }

  /**
   * Legal moves for the current player.
   * - Normal turn: optional slides and optional jumps.
   * - Mid multi-jump: only continuing jumps from the chaining bead.
   */
  getLegalMoves(): Move[] {
    if (this.currentState.gameOver) {
      return [];
    }

    if (this.chainPieceId !== null) {
      return this.getJumpMovesFrom(this.chainPieceId);
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

      moves.push(...this.getJumpMovesFrom(intersection.id));
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
    const jump = this.resolveLegalJump(move);
    const fromPoint = requireIntersection(board, move.from);
    const toPoint = requireIntersection(board, move.to);
    const mover = fromPoint.occupant!;

    if (jump) {
      requireIntersection(board, jump.over).occupant = undefined;
      this.currentState.captures[mover] += 1;
    }

    toPoint.occupant = mover;
    fromPoint.occupant = undefined;

    if (jump && this.getJumpMovesFrom(move.to).length > 0) {
      this.chainPieceId = move.to;
      return;
    }

    this.chainPieceId = null;
    this.completeTurn(mover);
  }

  /**
   * Voluntarily end a multi-jump after one or more captures.
   * Illegal when not mid-chain.
   */
  endTurn(): void {
    if (this.currentState.gameOver) {
      throw new Error('Game is already over.');
    }
    if (this.chainPieceId === null) {
      throw new Error('Cannot end turn: no capture chain in progress.');
    }

    const mover = this.currentState.currentPlayer;
    this.chainPieceId = null;
    this.completeTurn(mover);
  }

  private completeTurn(mover: Player): void {
    const profile = this.terminationProfile();

    if (profile === 'sholo_guti') {
      this.completeSholoTurn(mover);
      return;
    }

    this.currentState.moveCount += 1;

    if (hasReachedPlyLimit(this.currentState.board.maxPlies, this.currentState.moveCount)) {
      this.currentState.gameOver = true;
      this.evaluatePlyLimitWinner();
      return;
    }

    this.currentState.currentPlayer = this.opponentOf(mover);
  }

  /** SHOLO_GUTI.html completeTurn semantics — elimination then stalemate. */
  private completeSholoTurn(mover: Player): void {
    this.currentState.moveCount += 1;

    const redRemaining = this.countPieces('RED');
    const blueRemaining = this.countPieces('BLUE');

    if (redRemaining === 0) {
      this.endGame('BLUE', 'elimination');
      return;
    }
    if (blueRemaining === 0) {
      this.endGame('RED', 'elimination');
      return;
    }

    if (hasReachedPlyLimit(this.currentState.board.maxPlies, this.currentState.moveCount)) {
      this.currentState.gameOver = true;
      this.evaluatePlyLimitWinner();
      return;
    }

    this.currentState.currentPlayer = this.opponentOf(mover);

    if (this.getLegalMoves().length === 0) {
      this.endGame(mover, 'stalemate');
    }
  }

  private endGame(winner: Player, reason: string): void {
    this.currentState.gameOver = true;
    this.currentState.winner = winner;
    this.currentState.endReason = reason;
    this.chainPieceId = null;
  }

  private getJumpMovesFrom(pieceId: number): Move[] {
    const { board, currentPlayer } = this.currentState;
    const piece = requireIntersection(board, pieceId);
    if (piece.occupant !== currentPlayer) {
      return [];
    }

    const moves: Move[] = [];
    for (const path of board.jumpPaths ?? []) {
      if (path.from !== pieceId) {
        continue;
      }
      if (this.isJumpCurrentlyLegal(path, currentPlayer)) {
        moves.push({ from: path.from, to: path.to });
      }
    }
    return moves;
  }

  private isJumpCurrentlyLegal(path: JumpPath, currentPlayer: Player): boolean {
    const board = this.currentState.board;
    const over = requireIntersection(board, path.over);
    const landing = requireIntersection(board, path.to);
    const opponent = this.opponentOf(currentPlayer);
    return over.occupant === opponent && landing.occupant === undefined;
  }

  private resolveLegalJump(move: Move): JumpPath | undefined {
    const path = findJumpPath(this.currentState.board, move.from, move.to);
    if (!path) {
      return undefined;
    }
    if (!this.isJumpCurrentlyLegal(path, this.currentState.currentPlayer)) {
      return undefined;
    }
    return path;
  }

  private evaluatePlyLimitWinner(): void {
    const { captures, board } = this.currentState;

    if (captures.RED !== captures.BLUE) {
      this.currentState.winner = captures.RED > captures.BLUE ? 'RED' : 'BLUE';
      this.currentState.endReason = 'ply_limit_captures';
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
        this.currentState.endReason = 'ply_limit_center';
        return;
      }
    }

    this.currentState.winner = 'DRAW';
    this.currentState.endReason = 'ply_limit_draw';
  }

  private terminationProfile(): TerminationProfile {
    return this.currentState.board.terminationProfile ?? 'ply_limit';
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
      endReason: undefined,
    };
  }
}
