import { BoardVariant } from '../../../config/BoardConfig';
import { SmartBeadsEngine } from '../../../core/SmartBeadsEngine';
import { GameState, Move, Player } from '../../../models/GameState';
import { countCenterOccupancy } from './centerScoring';
import {
  GameFeatureSettings,
  parseMatchSeconds,
  parseShotLimit,
} from './GameFeatureSettings';

export type UiInteractionState = 'idle' | 'selected' | 'chain' | 'game_over';

export interface SessionSnapshot {
  boardVariant: BoardVariant;
  engineSnap: { state: GameState; chainPieceId: number | null };
  settings: GameFeatureSettings;
  uiState: UiInteractionState;
  selectedId: number | null;
  p1Clock: number;
  p2Clock: number;
  globalMatchRemaining: number;
  shotRemaining: number;
  p1CenterScore: number;
  p2CenterScore: number;
  featureOver?: FeatureGameOver | null;
}

export interface FeatureGameOver {
  winner: Player | 'DRAW';
  reason: string;
}

function opponentOf(player: Player): Player {
  return player === 'RED' ? 'BLUE' : 'RED';
}

/**
 * Feature-layer session wrapping M1 SmartBeadsEngine.
 * Timers, center tiebreak, and undo live here — not in core rules.
 * 3-fold repetition was removed by product decision (never approved for V1).
 */
export class FeatureSession {
  private boardVariant: BoardVariant;
  private engine: SmartBeadsEngine;
  private settings: GameFeatureSettings;
  private uiState: UiInteractionState = 'idle';
  private selectedId: number | null = null;
  private p1Clock = 0;
  private p2Clock = 0;
  private globalMatchRemaining = 0;
  private shotLimit = 0;
  private shotRemaining = 0;
  private p1CenterScore = 0;
  private p2CenterScore = 0;
  private featureOver: FeatureGameOver | null = null;

  constructor(boardVariant: BoardVariant, settings: GameFeatureSettings) {
    this.boardVariant = boardVariant;
    this.settings = { ...settings };
    this.engine = new SmartBeadsEngine(boardVariant);
    this.applyTimerSettings();
  }

  getBoardVariant(): BoardVariant {
    return this.boardVariant;
  }

  getSettings(): GameFeatureSettings {
    return { ...this.settings };
  }

  updateSettings(settings: GameFeatureSettings): void {
    this.settings = { ...settings };
    this.applyTimerSettings();
  }

  reset(): void {
    this.engine = new SmartBeadsEngine(this.boardVariant);
    this.uiState = 'idle';
    this.selectedId = null;
    this.p1CenterScore = 0;
    this.p2CenterScore = 0;
    this.featureOver = null;
    this.applyTimerSettings();
  }

  exportSnapshot(): SessionSnapshot {
    return {
      boardVariant: this.boardVariant,
      engineSnap: this.engine.exportSnapshot(),
      settings: { ...this.settings },
      uiState: this.uiState,
      selectedId: this.selectedId,
      p1Clock: this.p1Clock,
      p2Clock: this.p2Clock,
      globalMatchRemaining: this.globalMatchRemaining,
      shotRemaining: this.shotRemaining,
      p1CenterScore: this.p1CenterScore,
      p2CenterScore: this.p2CenterScore,
      featureOver: this.featureOver,
    };
  }

  loadSnapshot(snap: SessionSnapshot): void {
    this.boardVariant = snap.boardVariant;
    this.engine.loadSnapshot(snap.engineSnap);
    this.settings = { ...snap.settings };
    this.uiState = snap.uiState;
    this.selectedId = snap.selectedId;
    this.p1Clock = snap.p1Clock;
    this.p2Clock = snap.p2Clock;
    this.globalMatchRemaining = snap.globalMatchRemaining;
    this.shotRemaining = snap.shotRemaining;
    this.p1CenterScore = snap.p1CenterScore ?? 0;
    this.p2CenterScore = snap.p2CenterScore ?? 0;
    this.featureOver = snap.featureOver ?? null;
    this.shotLimit = parseShotLimit(this.settings.shotClock);
  }

  getEngine(): SmartBeadsEngine {
    return this.engine;
  }

  getUiState(): UiInteractionState {
    return this.uiState;
  }

  getSelectedId(): number | null {
    return this.selectedId;
  }

  getMoveCount(): number {
    return this.engine.getState().moveCount;
  }

  getHumanPlayer(): Player {
    return 'RED';
  }

  getAiPlayer(): Player {
    return 'BLUE';
  }

  isGameOver(): boolean {
    return this.engine.getState().gameOver || this.featureOver !== null;
  }

  getDisplayedWinner(): Player | 'DRAW' | undefined {
    if (this.featureOver) return this.featureOver.winner;
    return this.engine.getState().winner;
  }

  getDisplayedReason(): string | undefined {
    if (this.featureOver) return this.featureOver.reason;
    return this.engine.getState().endReason;
  }

  getP1Clock(): number {
    return this.p1Clock;
  }

  getP2Clock(): number {
    return this.p2Clock;
  }

  getGlobalMatchRemaining(): number {
    return this.globalMatchRemaining;
  }

  getShotRemaining(): number {
    return this.shotRemaining;
  }

  getShotLimit(): number {
    return this.shotLimit;
  }

  getCenterDisplayScores(): { red: number; blue: number } {
    const state = this.engine.getState();
    if (this.settings.centerRule === 'cumulative') {
      return { red: this.p1CenterScore, blue: this.p2CenterScore };
    }
    if (this.settings.centerRule === 'endgame') {
      return {
        red: countCenterOccupancy(state.board, 'RED'),
        blue: countCenterOccupancy(state.board, 'BLUE'),
      };
    }
    return { red: 0, blue: 0 };
  }

  getLegalMovesForSelection(): Move[] {
    if (this.isGameOver()) return [];
    const chain = this.engine.getChainPieceId();
    if (chain !== null) {
      return this.engine.getLegalMoves();
    }
    if (this.selectedId === null) return [];
    return this.engine.getLegalMoves().filter((m) => m.from === this.selectedId);
  }

  /**
   * Landing squares for the active piece selection.
   * Opponent beads are inert and not included in target highlights.
   */
  getLegalTargetIds(): number[] {
    const moves = this.getLegalMovesForSelection();
    return [...new Set(moves.map((m) => m.to))];
  }

  /**
   * Map a board click to the legal hop: empty landing intersection.
   * Returns null when the click is not a legal landing for the selection.
   */
  resolveClickMove(nodeId: number): Move | null {
    const moves = this.getLegalMovesForSelection();
    const landings = moves.filter((m) => m.to === nodeId);
    if (landings.length === 1) return landings[0];
    return null;
  }

  /**
   * Two-click / chain interaction used by the play shell.
   * Only current player's beads can be selected; opponent beads are inert.
   * Destination must be an empty legal landing square.
   */
  interpretClick(nodeId: number):
    | { kind: 'select'; nodeId: number }
    | { kind: 'move'; move: Move }
    | { kind: 'ignore' } {
    if (this.isGameOver() || !this.canHumanAct()) return { kind: 'ignore' };
    const state = this.engine.getState();
    const occupant = state.board.intersections[nodeId]?.occupant;

    if (this.engine.getChainPieceId() !== null) {
      const move = this.resolveClickMove(nodeId);
      return move ? { kind: 'move', move } : { kind: 'ignore' };
    }

    if (occupant === state.currentPlayer) {
      return { kind: 'select', nodeId };
    }

    if (this.uiState === 'selected') {
      const move = this.resolveClickMove(nodeId);
      return move ? { kind: 'move', move } : { kind: 'ignore' };
    }

    return { kind: 'ignore' };
  }

  selectNode(nodeId: number): boolean {
    if (this.isGameOver()) return false;
    const state = this.engine.getState();
    if (this.engine.getChainPieceId() !== null) return false;

    const node = state.board.intersections.find((p) => p.id === nodeId);
    if (node?.occupant !== state.currentPlayer) return false;

    // Clicking an own bead that cannot move must not leave a different bead armed,
    // or the next click would move a piece the player did not choose.
    const hasMoves = this.engine.getLegalMoves().some((m) => m.from === nodeId);
    if (!hasMoves) {
      this.selectedId = null;
      this.uiState = 'idle';
      return false;
    }

    this.selectedId = nodeId;
    this.uiState = 'selected';
    return true;
  }

  canHumanAct(): boolean {
    if (this.isGameOver()) return false;
    if (this.settings.mode === 'pvp') return true;
    return this.engine.getState().currentPlayer === 'RED';
  }

  applyMove(move: Move): void {
    const stateBefore = this.engine.getState();
    const mover = stateBefore.currentPlayer;

    this.engine.applyMove(move);

    const chain = this.engine.getChainPieceId();
    if (chain !== null) {
      this.selectedId = chain;
      this.uiState = 'chain';
      return;
    }

    this.afterTurnCompleted(mover);
  }

  finishChain(): void {
    if (this.isGameOver()) return;
    if (this.engine.getChainPieceId() === null) return;
    const mover = this.engine.getState().currentPlayer;
    this.engine.endTurn();
    this.afterTurnCompleted(mover);
  }

  private afterTurnCompleted(mover: Player): void {
    this.selectedId = null;
    this.uiState = 'idle';

    // FIX: Accumulate center occupancy per completed turn
    if (this.settings.centerRule === 'cumulative') {
      const board = this.engine.getState().board;
      this.p1CenterScore += countCenterOccupancy(board, 'RED');
      this.p2CenterScore += countCenterOccupancy(board, 'BLUE');
    }

    const engState = this.engine.getState();
    if (engState.gameOver) {
      this.maybeApplyCenterTiebreakAfterEngineEnd();
      this.uiState = 'game_over';
      return;
    }

    this.shotRemaining = this.shotLimit;
  }

  /**
   * When the engine ends with tied captures and center rule is on, apply center tiebreak
   * (independent of match timer — user-selected center rule always affects outcome here).
   */
  private maybeApplyCenterTiebreakAfterEngineEnd(): void {
    if (this.featureOver) return;
    const state = this.engine.getState();
    if (!state.gameOver || this.settings.centerRule === 'off') return;
    if (state.captures.RED !== state.captures.BLUE) return;

    let c1 = 0;
    let c2 = 0;
    if (this.settings.centerRule === 'cumulative') {
      c1 = this.p1CenterScore;
      c2 = this.p2CenterScore;
    } else {
      c1 = countCenterOccupancy(state.board, 'RED');
      c2 = countCenterOccupancy(state.board, 'BLUE');
    }

    const prefix = state.endReason ? `${state.endReason} — ` : '';
    if (c1 > c2) {
      this.endGameByFeature('RED', `${prefix}captures tied — P1 won on center.`);
      return;
    }
    if (c2 > c1) {
      this.endGameByFeature('BLUE', `${prefix}captures tied — P2 won on center.`);
    }
  }

  endGameByFeature(winner: Player | 'DRAW', reason: string): void {
    this.featureOver = { winner, reason };
    this.uiState = 'game_over';
    this.selectedId = null;
  }

  /** Resignation: opponent accepts draw, or declines and wins. */
  resolveResignation(resigningPlayer: Player, acceptDraw: boolean): void {
    if (this.isGameOver()) return;
    const resignLabel = resigningPlayer === 'RED' ? 'P1' : 'P2';
    const oppLabel = resigningPlayer === 'RED' ? 'P2' : 'P1';
    if (acceptDraw) {
      this.endGameByFeature('DRAW', `${resignLabel} resigned — ${oppLabel} agreed to a draw.`);
      return;
    }
    const winner = resigningPlayer === 'RED' ? 'BLUE' : 'RED';
    this.endGameByFeature(winner, `${resignLabel} resigned — ${oppLabel} declined the draw.`);
  }

  evaluateScoreAndEnd(prefixReason: string): void {
    const state = this.engine.getState();
    const redCaps = state.captures.RED;
    const blueCaps = state.captures.BLUE;

    if (redCaps > blueCaps) {
      this.endGameByFeature('RED', `${prefixReason} P1 won on captures.`);
      return;
    }
    if (blueCaps > redCaps) {
      this.endGameByFeature('BLUE', `${prefixReason} P2 won on captures.`);
      return;
    }

    if (this.settings.centerRule !== 'off') {
      let c1 = 0;
      let c2 = 0;
      if (this.settings.centerRule === 'cumulative') {
        c1 = this.p1CenterScore;
        c2 = this.p2CenterScore;
      } else {
        c1 = countCenterOccupancy(state.board, 'RED');
        c2 = countCenterOccupancy(state.board, 'BLUE');
      }
      if (c1 > c2) {
        this.endGameByFeature('RED', `${prefixReason} captures tied — P1 won on center.`);
        return;
      }
      if (c2 > c1) {
        this.endGameByFeature('BLUE', `${prefixReason} captures tied — P2 won on center.`);
        return;
      }
    }

    const redPieces = this.engine.countPieces('RED');
    const bluePieces = this.engine.countPieces('BLUE');
    if (redPieces === bluePieces) {
      this.endGameByFeature('DRAW', `${prefixReason} draw.`);
      return;
    }
    this.endGameByFeature(
      redPieces > bluePieces ? 'RED' : 'BLUE',
      `${prefixReason} piece-count tiebreak.`,
    );
  }

  timerTick(): void {
    if (this.isGameOver()) return;

    if (this.shotLimit > 0) {
      this.shotRemaining -= 1;
      if (this.shotRemaining <= 0) {
        const loser = this.engine.getState().currentPlayer;
        this.endGameByFeature(opponentOf(loser), 'Shot clock expired.');
      }
    }

    const matchSecs = parseMatchSeconds(this.settings.matchTimer);
    if (matchSecs <= 0) return;

    if (this.settings.mode === 'pvp') {
      if (this.engine.getState().currentPlayer === 'RED') this.p1Clock -= 1;
      else this.p2Clock -= 1;
      if (this.p1Clock <= 0) this.endGameByFeature('BLUE', 'P1 ran out of match time.');
      else if (this.p2Clock <= 0) this.endGameByFeature('RED', 'P2 ran out of match time.');
    } else {
      this.globalMatchRemaining -= 1;
      if (this.globalMatchRemaining <= 0) {
        this.evaluateScoreAndEnd('Match timer expired.');
      }
    }
  }

  resetTurnClock(): void {
    this.shotRemaining = this.shotLimit;
  }

  private applyTimerSettings(): void {
    this.shotLimit = parseShotLimit(this.settings.shotClock);
    this.shotRemaining = this.shotLimit;
    const matchSecs = parseMatchSeconds(this.settings.matchTimer);

    if (matchSecs <= 0) {
      this.globalMatchRemaining = 0;
      this.p1Clock = 0;
      this.p2Clock = 0;
      return;
    }

    if (this.settings.mode === 'pvp') {
      this.p1Clock = matchSecs;
      this.p2Clock = matchSecs;
      this.globalMatchRemaining = 0;
    } else {
      this.globalMatchRemaining = matchSecs;
      this.p1Clock = 0;
      this.p2Clock = 0;
    }
  }
}
