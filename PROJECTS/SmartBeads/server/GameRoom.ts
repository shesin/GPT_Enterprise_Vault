/**
 * One online game (A9). The server holds the only copy of the game: clients send intents, the room checks them
 * against the engine, applies them, and owns every clock (clocks follow real time, never client timers).
 */
import { randomBytes } from 'crypto';
import type { Player } from '../src/models/GameState';
import {
  getPlayConfig,
  resolveEngineVariant,
  type ProductBoardId,
} from '../src/config/BoardCatalog';
import { FeatureSession } from '../src/playtest/web/feature/FeatureSession';
import type { GameFeatureSettings } from '../src/playtest/web/feature/GameFeatureSettings';
import { wallClockTicks } from '../src/playtest/web/feature/clockPolicy';
import { ONLINE_BOARDS, type Intent, type RoomSettings, type RoomView } from './protocol';

/** A resignation offer nobody answers lapses after this long, so a silent opponent cannot freeze a game. */
export const RESIGN_OFFER_LAPSE_MS = 2 * 60 * 1000;

export type ActResult = { ok: true } | { ok: false; error: string };

export class GameRoom {
  readonly code: string;
  readonly boardId: ProductBoardId;
  readonly settings: RoomSettings;
  private session: FeatureSession;
  private tokens: Partial<Record<Player, string>> = {};
  private version = 1;
  private started = false;
  private lastMove: { from: number; to: number; by: Player } | null = null;
  private pendingResign: Player | null = null;
  private resignOfferedAtMs = 0;
  private lastTickMs: number;
  private carryMs = 0;
  /** Last time anyone touched the room (cleanup of abandoned rooms). */
  lastActivityMs: number;

  constructor(
    code: string,
    boardId: ProductBoardId,
    settings: RoomSettings,
    private readonly now: () => number,
  ) {
    this.code = code;
    this.boardId = boardId;
    this.settings = settings;
    const base = getPlayConfig(boardId).defaultSettings;
    const featureSettings: GameFeatureSettings = { ...base, mode: 'pvp', ...settings };
    this.session = new FeatureSession(resolveEngineVariant(boardId), featureSettings);
    this.session.reset();
    this.session.setStartingPlayer('RED');
    this.lastTickMs = this.now();
    this.lastActivityMs = this.lastTickMs;
  }

  /** Validate what a creator asked for; returns the settings to use, or an error message. */
  static validate(
    boardId: unknown,
    settings: Partial<RoomSettings> | undefined,
  ): { boardId: ProductBoardId; settings: RoomSettings } | string {
    if (typeof boardId !== 'string' || !(ONLINE_BOARDS as readonly string[]).includes(boardId)) {
      return `Online play is open on these boards only: ${ONLINE_BOARDS.join(', ')}.`;
    }
    const id = boardId as ProductBoardId;
    const play = getPlayConfig(id);
    const d = play.defaultSettings;
    const s: RoomSettings = {
      timer: settings?.timer ?? d.timer,
      tournamentTimer: settings?.tournamentTimer ?? d.tournamentTimer,
      shotClock: settings?.shotClock ?? d.shotClock,
      centerRule: settings?.centerRule ?? d.centerRule,
    };
    if (!play.timerOptions.includes(s.timer))
      return 'That match timer is not offered on this board.';
    if (!(play.tournamentTimerOptions ?? play.timerOptions).includes(s.tournamentTimer)) {
      return 'That tournament timer is not offered on this board.';
    }
    if (!play.shotClockOptions.includes(s.shotClock)) {
      return 'That shot clock is not offered on this board.';
    }
    if (!play.centerRuleOptions.includes(s.centerRule)) {
      return 'That centre rule is not offered on this board.';
    }
    if (s.timer !== 'off' && s.tournamentTimer !== 'off') {
      return 'Choose either the match timer or the tournament timer, not both.';
    }
    if (s.centerRule !== 'off' && s.timer === 'off')
      return 'The centre rule needs the match timer.';
    return { boardId: id, settings: s };
  }

  /** Takes the next free seat (RED first). Returns the seat and its secret token. */
  join(): { seat: Player; token: string } | null {
    const seat: Player | null = !this.tokens.RED ? 'RED' : !this.tokens.BLUE ? 'BLUE' : null;
    if (!seat) return null;
    const token = randomBytes(18).toString('base64url');
    this.tokens[seat] = token;
    if (this.tokens.RED && this.tokens.BLUE && !this.started) {
      this.started = true;
      this.lastTickMs = this.now();
      this.carryMs = 0;
      this.session.resetTurnClock();
    }
    this.touch();
    return { seat, token };
  }

  seatFor(token: string | null | undefined): Player | null {
    if (!token) return null;
    if (this.tokens.RED === token) return 'RED';
    if (this.tokens.BLUE === token) return 'BLUE';
    return null;
  }

  getVersion(): number {
    return this.version;
  }

  private touch(): void {
    this.lastActivityMs = this.now();
    this.version += 1;
  }

  act(seat: Player, intent: Intent): ActResult {
    if (!this.started) return { ok: false, error: 'Waiting for the second player.' };
    this.tick(); // settle the clocks up to now before judging the action
    if (this.session.isGameOver()) return { ok: false, error: 'The game is over.' };
    const engine = this.session.getEngine();
    const current = engine.getState().currentPlayer;

    if (intent.type === 'resignRespond') {
      if (this.pendingResign === null || this.pendingResign === seat) {
        return { ok: false, error: 'There is no resignation offer for you to answer.' };
      }
      const resigning = this.pendingResign;
      this.pendingResign = null;
      this.session.resolveResignation(resigning, intent.acceptDraw);
      this.touch();
      return { ok: true };
    }
    if (this.pendingResign !== null) {
      return { ok: false, error: 'A resignation offer is waiting for an answer.' };
    }

    if (intent.type === 'resign') {
      if (seat !== current) return { ok: false, error: 'You can resign only on your own turn.' };
      this.pendingResign = seat;
      this.resignOfferedAtMs = this.now();
      this.touch();
      return { ok: true };
    }

    if (seat !== current) return { ok: false, error: 'It is not your turn.' };

    if (intent.type === 'finishChain') {
      if (engine.getChainPieceId() === null) {
        return { ok: false, error: 'There is no capture to finish.' };
      }
      this.session.finishChain();
      this.touch();
      return { ok: true };
    }

    if (intent.type === 'move') {
      if (!Number.isInteger(intent.from) || !Number.isInteger(intent.to)) {
        return { ok: false, error: 'Bad move.' };
      }
      const legal = engine
        .getLegalMoves()
        .find((m) => m.from === intent.from && m.to === intent.to);
      if (!legal) return { ok: false, error: 'That move is not legal.' };
      this.session.applyMove(legal);
      this.lastMove = { from: legal.from, to: legal.to, by: seat };
      this.touch();
      return { ok: true };
    }
    return { ok: false, error: 'Unknown action.' };
  }

  /** Clock authority: apply the whole seconds of real time that passed. Returns true when anything changed. */
  tick(): boolean {
    if (!this.started || this.session.isGameOver()) {
      this.lastTickMs = this.now();
      return false;
    }
    const nowMs = this.now();
    let lapsed = false;
    if (this.pendingResign !== null && nowMs - this.resignOfferedAtMs >= RESIGN_OFFER_LAPSE_MS) {
      this.pendingResign = null; // nobody answered: the offer is withdrawn and play goes on
      lapsed = true;
    }
    const owed = wallClockTicks(nowMs - this.lastTickMs, this.carryMs);
    this.lastTickMs = nowMs;
    this.carryMs = owed.carryMs;
    if (owed.ticks === 0) {
      if (lapsed) this.version += 1;
      return lapsed;
    }
    // A pending resignation offer pauses nothing: the clocks keep running while it waits.
    for (let i = 0; i < owed.ticks && !this.session.isGameOver(); i++) this.session.timerTick();
    this.version += 1;
    return true;
  }

  view(viewer: Player): RoomView {
    const engine = this.session.getEngine();
    const state = engine.getState();
    const over = this.session.isGameOver();
    return {
      code: this.code,
      version: this.version,
      boardId: this.boardId,
      settings: this.settings,
      seats: { RED: !!this.tokens.RED, BLUE: !!this.tokens.BLUE },
      you: viewer,
      started: this.started,
      currentPlayer: state.currentPlayer,
      moveCount: this.session.getMoveCount(),
      captures: { ...state.captures },
      occupants: state.board.intersections.map((n) => n.occupant ?? null),
      chainPieceId: engine.getChainPieceId(),
      legalMoves:
        over || !this.started
          ? []
          : engine.getLegalMoves().map((m) => ({ from: m.from, to: m.to })),
      lastMove: this.lastMove,
      clocks: {
        shotRemaining: this.session.getShotRemaining(),
        shotLimit: this.session.getShotLimit(),
        matchRemaining: this.session.getGlobalMatchRemaining(),
        p1: this.session.getP1Clock(),
        p2: this.session.getP2Clock(),
      },
      gameOver: over,
      winner: over ? (this.session.getDisplayedWinner() ?? null) : null,
      reason: over ? (this.session.getDisplayedReason() ?? null) : null,
      pendingResign: this.pendingResign,
    };
  }
}
