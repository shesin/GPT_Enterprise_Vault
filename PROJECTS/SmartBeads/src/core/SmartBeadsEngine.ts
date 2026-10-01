import { BoardVariant, resolveBoard } from '../config/BoardConfig';
import {
  cloneBoardDefinition,
  findJumpPath,
  getConnectedIds,
  getJumpPathsFrom,
  GameState,
  hasReachedPlyLimit,
  Intersection,
  JumpPath,
  Move,
  Player,
  requireIntersection,
  TerminationProfile,
} from '../models/GameState';
import { buildPositionKey, isThreefoldRepetition } from './positionKey';

/**
 * Last-resort end for unlimited boards (`maxPlies: null`) after this many completed turns.
 * Small boards (6-bead x2, 7-bead): 120 turns total. Larger boards: 120 per side = 240 total.
 * At the cap the side with more captures wins; only tied captures draw (centre rule, when on,
 * breaks that tie in FeatureSession).
 */
export const ENGINE_SAFETY_MAX_PLIES = 120;
export const ENGINE_SAFETY_MAX_PLIES_LARGE = 240;

const SMALL_BOARD_VARIANTS: readonly BoardVariant[] = ['4', '5', '6', '6x3x5', '7'];

export function engineSafetyCapForVariant(variant: BoardVariant): number {
  return SMALL_BOARD_VARIANTS.includes(variant)
    ? ENGINE_SAFETY_MAX_PLIES
    : ENGINE_SAFETY_MAX_PLIES_LARGE;
}

export type EngineSnapshot = {
  state: GameState;
  chainPieceId: number | null;
  positionHistory?: Record<string, number>;
};

/**
 * AI-search snapshot. Repetition history is the shared, never-mutated `searchBase` plus the positions
 * played along this search line (`searchPath`, each position encoded as `positionStride` numbers), so
 * cloning a node never copies the whole game history. Counts are identical to a full history:
 * base count + occurrences in the path.
 */
export type SearchSnapshot = {
  state: GameState;
  chainPieceId: number | null;
  searchBase: Record<string, number>;
  searchPath: readonly number[];
};

/** Occupancy is packed 15 intersections (2 bits each) per number; one more number holds side + chain. */
const NODES_PER_WORD = 15;

function positionStride(nodeCount: number): number {
  return Math.ceil(nodeCount / NODES_PER_WORD) + 1;
}

function mixWords(words: ArrayLike<number>, length: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < length; i += 1) h = Math.imul(h ^ words[i]!, 0x01000193) ^ (h >>> 13);
  return h | 0;
}

/** Encode a buildPositionKey() string as the same words the search computes from a live board. */
function wordsFromPositionKey(key: string): number[] {
  const [occ, player, chain] = key.split('|') as [string, string, string];
  const words: number[] = [];
  let word = 0;
  let inWord = 0;
  for (let i = 0; i < occ.length;) {
    let code = 0;
    if (occ[i] === 'R') {
      code = 1;
      i += 3;
    } else if (occ[i] === 'B') {
      code = 2;
      i += 4;
    } else {
      i += 1;
    }
    word = word * 4 + code;
    inWord += 1;
    if (inWord === NODES_PER_WORD) {
      words.push(word);
      word = 0;
      inWord = 0;
    }
  }
  if (inWord > 0) words.push(word);
  words.push((chain === 'none' ? 0 : Number(chain) + 1) * 2 + (player === 'BLUE' ? 1 : 0));
  return words;
}

// Hashes of every position in a game history, built once per history object (it is never mutated).
const baseHashCache = new WeakMap<object, Set<number>>();

function baseHashesFor(base: Record<string, number>): Set<number> {
  let hashes = baseHashCache.get(base);
  if (!hashes) {
    hashes = new Set();
    for (const key of Object.keys(base)) {
      const words = wordsFromPositionKey(key);
      hashes.add(mixWords(words, words.length));
    }
    baseHashCache.set(base, hashes);
  }
  return hashes;
}

/** What applyLegalMoveWithUndo changed, so undoLastMove can restore it without copying the board. */
interface MoveUndo {
  from: Intersection;
  to: Intersection;
  over: Intersection | undefined;
  fromOcc: Player | undefined;
  toOcc: Player | undefined;
  overOcc: Player | undefined;
  red: number;
  blue: number;
  moveCount: number;
  currentPlayer: Player;
  gameOver: boolean;
  winner: Player | 'DRAW' | undefined;
  endReason: string | undefined;
  chainPieceId: number | null;
  pathLength: number;
}

/**
 * Project gameplay engine.
 * Board geometry, jump routes, centers, and ply limits come from BoardDefinition.
 *
 * Capture rules (project):
 * - Jumps are optional (slides remain legal when not mid-chain).
 * - Multi-jump chaining is allowed via sequential Move applications.
 * - After a capture, further jumps from the same bead are optional; call endTurn() or abandonChain().
 */
export class SmartBeadsEngine {
  private readonly variant: BoardVariant;
  private currentState: GameState;
  /** When set, the chaining bead may continue capturing; stop only via endTurn (Finish capture). */
  private chainPieceId: number | null = null;
  private positionHistory: Record<string, number> = {};
  /** Search mode (loadForSearch): history = searchBase (shared, read-only) + searchPath. */
  private searchBase: Record<string, number> | null = null;
  private searchBaseHashes: Set<number> | null = null;
  private searchPath: number[] = [];
  private wordsScratch: number[] = [];
  private lastUndo: MoveUndo | null = null;

  constructor(variant: BoardVariant) {
    this.variant = variant;
    this.currentState = this.initializeInitialState(variant);
    this.recordPositionCount();
  }

  getVariant(): BoardVariant {
    return this.variant;
  }

  getState(): GameState {
    return this.currentState;
  }

  /** Deep snapshot for undo, AI search, and feature-layer restore. */
  exportSnapshot(): EngineSnapshot {
    if (this.searchBase) throw new Error('exportSnapshot is not available in search mode.');
    return {
      state: {
        ...this.currentState,
        board: cloneBoardDefinition(this.currentState.board),
        captures: { ...this.currentState.captures },
      },
      chainPieceId: this.chainPieceId,
      positionHistory: { ...this.positionHistory },
    };
  }

  /** Search-mode snapshot of the current position (engine must be in search mode). */
  exportSearchSnapshot(): SearchSnapshot {
    if (!this.searchBase) throw new Error('exportSearchSnapshot requires loadForSearch first.');
    return {
      state: {
        ...this.currentState,
        board: cloneBoardDefinition(this.currentState.board),
        captures: { ...this.currentState.captures },
      },
      chainPieceId: this.chainPieceId,
      searchBase: this.searchBase,
      searchPath: this.searchPath.slice(),
    };
  }

  /**
   * Load a position for AI search. A full snapshot is converted once (its history becomes the shared
   * base); a search snapshot is restored without copying any history.
   */
  loadForSearch(snapshot: EngineSnapshot | SearchSnapshot): void {
    if ('searchBase' in snapshot) {
      this.currentState = {
        ...snapshot.state,
        board: cloneBoardDefinition(snapshot.state.board),
        captures: { ...snapshot.state.captures },
      };
      this.chainPieceId = snapshot.chainPieceId;
      this.searchBase = snapshot.searchBase;
      this.searchBaseHashes = baseHashesFor(snapshot.searchBase);
      this.searchPath = snapshot.searchPath.slice();
      return;
    }
    this.loadSnapshot(snapshot);
    this.searchBase = this.positionHistory;
    this.searchBaseHashes = baseHashesFor(this.searchBase);
    this.searchPath = [];
  }

  /**
   * applyLegalMove that remembers what it changed; undoLastMove() then restores the exact prior position
   * without copying the board (AI search tries thousands of moves from one position). One level only.
   */
  applyLegalMoveWithUndo(move: Move): void {
    const st = this.currentState;
    const board = st.board;
    const jump = this.resolveLegalJump(move);
    const from = requireIntersection(board, move.from);
    const to = requireIntersection(board, move.to);
    const over = jump ? requireIntersection(board, jump.over) : undefined;
    this.lastUndo = {
      from,
      to,
      over,
      fromOcc: from.occupant,
      toOcc: to.occupant,
      overOcc: over?.occupant,
      red: st.captures.RED,
      blue: st.captures.BLUE,
      moveCount: st.moveCount,
      currentPlayer: st.currentPlayer,
      gameOver: st.gameOver,
      winner: st.winner,
      endReason: st.endReason,
      chainPieceId: this.chainPieceId,
      pathLength: this.searchPath.length,
    };
    this.applyLegalMove(move);
  }

  undoLastMove(): void {
    const u = this.lastUndo;
    if (!u) throw new Error('Nothing to undo.');
    const st = this.currentState;
    u.from.occupant = u.fromOcc;
    u.to.occupant = u.toOcc;
    if (u.over) u.over.occupant = u.overOcc;
    st.captures.RED = u.red;
    st.captures.BLUE = u.blue;
    st.moveCount = u.moveCount;
    st.currentPlayer = u.currentPlayer;
    st.gameOver = u.gameOver;
    st.winner = u.winner;
    st.endReason = u.endReason;
    this.chainPieceId = u.chainPieceId;
    this.searchPath.length = u.pathLength;
    this.lastUndo = null;
  }

  /** Restore a prior snapshot without changing match rules. */
  loadSnapshot(snapshot: EngineSnapshot): void {
    this.currentState = {
      ...snapshot.state,
      board: cloneBoardDefinition(snapshot.state.board),
      captures: { ...snapshot.state.captures },
    };
    this.chainPieceId = snapshot.chainPieceId;
    this.searchBase = null;
    this.searchBaseHashes = null;
    this.searchPath = [];
    if (snapshot.positionHistory) {
      this.positionHistory = { ...snapshot.positionHistory };
    } else {
      this.rebaselineRepetitionHistory();
    }
  }

  /** Re-seed repetition counts after scripted board setup that bypasses applyMove. */
  rebaselineRepetitionHistory(): void {
    this.searchBase = null;
    this.searchBaseHashes = null;
    this.searchPath = [];
    this.positionHistory = {};
    this.recordPositionCount();
  }

  /** Counts remaining pieces on the board for the specified player. */
  countPieces(playerId: Player): number {
    let n = 0;
    for (const point of this.currentState.board.intersections) {
      if (point.occupant === playerId) n += 1;
    }
    return n;
  }

  /** Bead id that must continue a multi-jump, if any. */
  getChainPieceId(): number | null {
    return this.chainPieceId;
  }

  /**
   * Legal moves for the current player.
   * - Normal turn: optional slides and optional jumps.
   * - Mid multi-jump: only continuing jumps from the chaining bead (stop via endTurn / Finish capture).
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

  /** Follow-up capture jumps from the chaining bead, if any. */
  getChainContinuationMoves(): Move[] {
    if (this.chainPieceId === null || this.currentState.gameOver) {
      return [];
    }
    return this.getJumpMovesFrom(this.chainPieceId);
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
    this.applyLegalMove(move);
  }

  /**
   * applyMove without the legality re-check, for callers that took `move` from getLegalMoves() on this
   * exact position (AI search, thousands of calls per turn). Behaviour is identical for legal moves.
   */
  applyLegalMove(move: Move): void {
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

  /** Stop continuing jumps but keep the same turn (optional capture — play another bead). */
  abandonChain(): void {
    if (this.currentState.gameOver) {
      throw new Error('Game is already over.');
    }
    this.chainPieceId = null;
  }

  private completeTurn(mover: Player): void {
    const profile = this.terminationProfile();

    if (profile === 'sholo_guti') {
      this.completeSholoTurn(mover);
      return;
    }

    // ply_limit profile: still end immediately on wipeout / stalemate (not only at maxPlies).
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

    if (this.tryEndAtPlyOrSafetyLimit()) return;

    this.currentState.currentPlayer = this.opponentOf(mover);
    this.resolveTurnEnd(mover);
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

    if (this.tryEndAtPlyOrSafetyLimit()) return;

    this.currentState.currentPlayer = this.opponentOf(mover);
    this.resolveTurnEnd(mover);
  }

  /** Board maxPlies (product move-limit) or engine safety cap on unlimited boards. */
  private tryEndAtPlyOrSafetyLimit(): boolean {
    if (hasReachedPlyLimit(this.currentState.board.maxPlies, this.currentState.moveCount)) {
      this.currentState.gameOver = true;
      this.evaluatePlyLimitWinner();
      return true;
    }
    if (
      this.currentState.board.maxPlies == null &&
      this.currentState.moveCount >= engineSafetyCapForVariant(this.variant)
    ) {
      const { RED, BLUE } = this.currentState.captures;
      if (RED !== BLUE) {
        this.endGame(RED > BLUE ? 'RED' : 'BLUE', 'safety_cap_captures');
      } else {
        this.endGame('DRAW', 'safety_cap');
      }
      return true;
    }
    return false;
  }

  private resolveTurnEnd(mover: Player): void {
    if (this.recordPositionCount()) {
      this.endGame('DRAW', 'repetition');
      return;
    }
    if (!this.hasLegalMove()) {
      this.endGame(mover, 'stalemate');
    }
  }

  /** Same truth value as getLegalMoves().length > 0 (no open chain), without building the list. */
  private hasLegalMove(): boolean {
    const { board, currentPlayer } = this.currentState;
    for (const intersection of board.intersections) {
      if (intersection.occupant !== currentPlayer) continue;
      for (const to of getConnectedIds(board, intersection.id)) {
        if (requireIntersection(board, to).occupant === undefined) return true;
      }
      for (const path of getJumpPathsFrom(board, intersection.id)) {
        if (this.isJumpCurrentlyLegal(path, currentPlayer)) return true;
      }
    }
    return false;
  }

  private recordPositionCount(): boolean {
    if (this.searchBase) return this.recordSearchPosition(this.searchBase);
    const key = buildPositionKey(this.currentState, this.chainPieceId);
    const count = (this.positionHistory[key] ?? 0) + 1;
    this.positionHistory[key] = count;
    return isThreefoldRepetition(count);
  }

  /**
   * Search-mode repetition count. Same number as the string-keyed history gives: occurrences on this
   * search line (exact word comparison) + the game-history count, which is looked up by string key
   * only when a cheap hash says the position can possibly be in that history.
   */
  private recordSearchPosition(base: Record<string, number>): boolean {
    const nodes = this.currentState.board.intersections;
    const stride = positionStride(nodes.length);
    const words = this.wordsScratch;
    let idx = 0;
    for (let w = 0; w < stride - 1; w += 1) {
      let word = 0;
      for (let k = 0; k < NODES_PER_WORD && idx < nodes.length; k += 1, idx += 1) {
        const occupant = nodes[idx]!.occupant;
        word = word * 4 + (occupant === undefined ? 0 : occupant === 'RED' ? 1 : 2);
      }
      words[w] = word;
    }
    words[stride - 1] =
      ((this.chainPieceId ?? -1) + 1) * 2 + (this.currentState.currentPlayer === 'BLUE' ? 1 : 0);

    const path = this.searchPath;
    let count = 1;
    for (let i = 0; i < path.length; i += stride) {
      let same = true;
      for (let j = 0; j < stride; j += 1) {
        if (path[i + j] !== words[j]) {
          same = false;
          break;
        }
      }
      if (same) count += 1;
    }
    if (this.searchBaseHashes!.has(mixWords(words, stride))) {
      count += base[buildPositionKey(this.currentState, this.chainPieceId)] ?? 0;
    }
    for (let j = 0; j < stride; j += 1) path.push(words[j]!);
    return isThreefoldRepetition(count);
  }

  private endGame(winner: Player | 'DRAW', reason: string): void {
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
    for (const path of getJumpPathsFrom(board, pieceId)) {
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
    // Shipped V1 boards use maxPlies: null — match-timer + center tiebreak lives in FeatureSession.evaluateScoreAndEnd().
    // This path runs only when a board sets maxPlies (e.g. lab Board4).
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
