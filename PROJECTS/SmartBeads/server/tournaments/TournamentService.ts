/**
 * Tournaments (A10 V1). An admin creates an event (board, clocks, when sign-up closes). Signed-in players register.
 * When sign-up closes the bracket is made (seeded by rating) and every pairing gets its own online room with the
 * two players' seats reserved. A winner moves on; a drawn game is replayed with the colours swapped (two draws:
 * the higher seed moves on); a player who has not arrived 5 minutes after the room opens loses by walkover.
 * A disconnect during a game never loses it: the clocks decide, which is why events need a match or tournament timer
 * and the board's fixed shot clock (so every game ends).
 */
import { randomUUID } from 'crypto';
import type { AccountStore } from '../accounts/AccountStore';
import type { Ratings } from '../accounts/Ratings';
import { GameRoom, type GameResult } from '../GameRoom';
import type { RoomManager } from '../RoomManager';
import type { RoomSettings } from '../protocol';
import { firstRoundPairs, nextRoundPairs } from './bracket';
import type { TournamentMatch, TournamentRecord } from './types';

export const NO_SHOW_MS = 5 * 60_000;
export const MAX_ENTRANTS = 64;
export const MIN_ENTRANTS = 2;
const MAX_OPEN_EVENTS = 20;

/** Shot clock of a tournament game, by board (Shekhar, 2026-10-03: 16, 12, 10-bead 120 s; 8, 7-bead 90 s; 6-bead 60 s). */
export const TOURNAMENT_SHOT_CLOCK: Record<string, RoomSettings['shotClock']> = {
  '6x4': '60',
  '8x4x6': '90',
  '16': '120',
};
const MAX_NAME = 60;

export interface CreateInput {
  name?: unknown;
  boardId?: unknown;
  settings?: Partial<RoomSettings>;
  /** Minutes from now until sign-up closes. */
  closesInMinutes?: unknown;
}

export interface MatchView {
  id: string;
  round: number;
  a: string | null;
  b: string | null;
  status: TournamentMatch['status'];
  winner: string | null;
  how: string | null;
}

export interface TournamentView {
  id: string;
  name: string;
  boardId: string;
  settings: RoomSettings;
  status: TournamentRecord['status'];
  registrationCloses: number;
  entrants: number;
  /** Viewer is signed up. */
  registered: boolean;
  /** The viewer's current match, if they are still in. */
  myMatch: {
    id: string;
    round: number;
    opponent: string | null;
    status: 'waiting' | 'ready';
  } | null;
  champion: string | null;
  bracket: MatchView[][];
}

type Result<T> = ({ ok: true } & T) | { ok: false; error: string; status: number };
const fail = (status: number, error: string): { ok: false; error: string; status: number } => ({
  ok: false,
  error,
  status,
});

export class TournamentService {
  constructor(
    private readonly store: AccountStore,
    private readonly rooms: RoomManager,
    private readonly ratings: Ratings | undefined,
    private readonly now: () => number,
    private readonly noShowMs: number = NO_SHOW_MS,
  ) {}

  // ---- events -------------------------------------------------------------------------------------------------

  create(input: CreateInput): Result<{ tournament: TournamentRecord }> {
    const name = typeof input.name === 'string' ? input.name.trim().slice(0, MAX_NAME) : '';
    if (!name) return fail(400, 'Give the event a name.');
    const minutes = Number(input.closesInMinutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 60 * 24 * 60) {
      return fail(400, 'Sign-up must close between 1 minute and 60 days from now.');
    }
    // The shot clock is fixed per board; the organiser picks the match or tournament timer.
    const shot =
      typeof input.boardId === 'string' ? TOURNAMENT_SHOT_CLOCK[input.boardId] : undefined;
    const checked = GameRoom.validate(input.boardId, { ...input.settings, shotClock: shot });
    if (typeof checked === 'string') return fail(400, checked);
    const s = checked.settings;
    if (s.timer === 'off' && s.tournamentTimer === 'off') {
      return fail(400, 'A tournament needs a match or tournament timer, so every game ends.');
    }
    const open = this.store.allTournaments().filter((t) => t.status === 'open').length;
    if (open >= MAX_OPEN_EVENTS) return fail(409, 'Too many events are open at once.');
    const tournament: TournamentRecord = {
      id: randomUUID().slice(0, 8),
      name,
      boardId: checked.boardId,
      settings: s,
      registrationCloses: this.now() + minutes * 60_000,
      createdAt: this.now(),
      status: 'open',
      entries: [],
      seeds: {},
      rounds: [],
      noShowMs: this.noShowMs,
    };
    this.store.putTournament(tournament);
    return { ok: true, tournament };
  }

  cancel(id: string): Result<object> {
    const t = this.store.getTournament(id);
    if (!t) return fail(404, 'No such event.');
    if (t.status === 'finished' || t.status === 'cancelled') return fail(409, 'Already over.');
    t.status = 'cancelled';
    this.store.putTournament(t);
    return { ok: true };
  }

  register(id: string, userId: string): Result<object> {
    const t = this.store.getTournament(id);
    if (!t) return fail(404, 'No such event.');
    if (t.status !== 'open' || this.now() >= t.registrationCloses) {
      return fail(409, 'Sign-up for this event is closed.');
    }
    if (t.entries.includes(userId)) return { ok: true };
    if (t.entries.length >= MAX_ENTRANTS) return fail(409, 'This event is full.');
    t.entries.push(userId);
    this.store.putTournament(t);
    return { ok: true };
  }

  unregister(id: string, userId: string): Result<object> {
    const t = this.store.getTournament(id);
    if (!t) return fail(404, 'No such event.');
    if (t.status !== 'open') return fail(409, 'Sign-up for this event is closed.');
    t.entries = t.entries.filter((e) => e !== userId);
    this.store.putTournament(t);
    return { ok: true };
  }

  // ---- running ------------------------------------------------------------------------------------------------

  /** Called every second: closes sign-up, opens rooms, applies walkovers, restores rooms lost in a restart. */
  tick(): void {
    const t0 = this.now();
    for (const t of this.store.allTournaments()) {
      if (t.status === 'open' && t0 >= t.registrationCloses) this.closeRegistration(t);
      if (t.status !== 'running') continue;
      const round = t.rounds[t.rounds.length - 1];
      if (!round) continue;
      for (const m of round) {
        if (m.status !== 'live') continue;
        const room = m.roomCode ? this.rooms.get(m.roomCode) : undefined;
        if (!room) {
          this.openRoom(t, m); // the server restarted: the game starts afresh in a new room
          continue;
        }
        if (!room.hasStarted && t0 - (m.readyAt ?? t0) >= t.noShowMs) this.walkover(t, m, room);
      }
    }
  }

  private closeRegistration(t: TournamentRecord): void {
    if (t.entries.length < MIN_ENTRANTS) {
      t.status = 'cancelled';
      this.store.putTournament(t);
      return;
    }
    const order = new Map(t.entries.map((id, i) => [id, i]));
    const rating = (id: string): number => {
      const user = this.store.getUser(id);
      return user && this.ratings ? this.ratings.ratingOf(user, t.boardId).elo : 1200;
    };
    const seeded = [...t.entries].sort(
      (x, y) => rating(y) - rating(x) || (order.get(x) ?? 0) - (order.get(y) ?? 0),
    );
    seeded.forEach((id, i) => (t.seeds[id] = i + 1));
    t.status = 'running';
    t.rounds = [];
    this.openRound(
      t,
      firstRoundPairs(seeded).map(([a, b]) => [a, b]),
    );
  }

  private openRound(t: TournamentRecord, pairs: Array<[string | null, string | null]>): void {
    const round = t.rounds.length;
    const matches: TournamentMatch[] = pairs.map(([a, b], i) => ({
      id: `r${round + 1}m${i + 1}`,
      round,
      a,
      b,
      status: 'waiting',
      draws: 0,
      swap: false,
    }));
    t.rounds.push(matches);
    for (const m of matches) {
      if (m.a && m.b) {
        this.openRoom(t, m);
      } else {
        m.status = 'done';
        m.winner = (m.a ?? m.b)!;
        m.how = 'bye';
      }
    }
    this.store.putTournament(t);
    this.advanceIfRoundDone(t);
  }

  /** The better seed plays Cream (first move) unless the colours were swapped after a draw. */
  private openRoom(t: TournamentRecord, m: TournamentMatch): void {
    const better = (t.seeds[m.a!] ?? 0) <= (t.seeds[m.b!] ?? 0) ? m.a! : m.b!;
    const worse = better === m.a ? m.b! : m.a!;
    const [red, blue] = m.swap ? [worse, better] : [better, worse];
    const made = this.rooms.createReserved(t.boardId, t.settings, red, blue);
    if ('error' in made) return; // busy: the next tick tries again
    m.roomCode = made.room.code;
    m.readyAt = this.now();
    m.status = 'live';
    this.store.putTournament(t);
  }

  private walkover(t: TournamentRecord, m: TournamentMatch, room: GameRoom): void {
    const here = room.claimedUserIds();
    if (here.length === 1) this.settle(t, m, here[0]!, 'no-show');
    else this.settle(t, m, this.higherSeed(t, m), 'no-show');
  }

  private higherSeed(t: TournamentRecord, m: TournamentMatch): string {
    return (t.seeds[m.a!] ?? 0) <= (t.seeds[m.b!] ?? 0) ? m.a! : m.b!;
  }

  /** A room reports its finished game. Rooms that are not tournament rooms are ignored. */
  onGameFinished(result: GameResult): void {
    for (const t of this.store.allTournaments()) {
      if (t.status !== 'running') continue;
      const m = t.rounds[t.rounds.length - 1]?.find(
        (x) => x.status === 'live' && x.roomCode === result.code,
      );
      if (!m) continue;
      if (result.winner === 'DRAW') {
        m.draws += 1;
        if (m.draws >= 2) {
          this.settle(t, m, this.higherSeed(t, m), 'draw-seed');
        } else {
          m.swap = !m.swap;
          this.openRoom(t, m);
        }
        return;
      }
      const winner = result.users[result.winner];
      if (winner) this.settle(t, m, winner, 'played');
      return;
    }
  }

  /** The event's organiser decides a stuck match by hand: side 'a' or 'b' of the pairing wins. */
  adminAdvance(id: string, matchId: string, side: unknown): Result<object> {
    const t = this.store.getTournament(id);
    const m = t?.rounds[t.rounds.length - 1]?.find((x) => x.id === matchId);
    if (!t || t.status !== 'running' || !m || m.status === 'done') {
      return fail(404, 'No such open match.');
    }
    const winner = side === 'a' ? m.a : side === 'b' ? m.b : null;
    if (!winner) return fail(400, "Say which side won: 'a' or 'b'.");
    this.settle(t, m, winner, 'admin');
    return { ok: true };
  }

  private settle(t: TournamentRecord, m: TournamentMatch, winner: string, how: string): void {
    m.status = 'done';
    m.winner = winner;
    m.how = how;
    this.store.putTournament(t);
    this.advanceIfRoundDone(t);
  }

  private advanceIfRoundDone(t: TournamentRecord): void {
    const round = t.rounds[t.rounds.length - 1];
    if (!round || round.some((m) => m.status !== 'done')) return;
    const winners = round.map((m) => m.winner!);
    if (winners.length === 1) {
      t.status = 'finished';
      t.champion = winners[0];
      this.store.putTournament(t);
      return;
    }
    this.openRound(t, nextRoundPairs(winners));
  }

  // ---- what players see ---------------------------------------------------------------------------------------

  /** Gives a player in a live match their seat in its room. */
  play(
    id: string,
    userId: string,
  ): Result<{
    code: string;
    token: string;
    seat: 'RED' | 'BLUE';
    boardId: string;
    settings: RoomSettings;
  }> {
    const t = this.store.getTournament(id);
    if (!t) return fail(404, 'No such event.');
    const m = t.rounds[t.rounds.length - 1]?.find(
      (x) => x.status === 'live' && (x.a === userId || x.b === userId),
    );
    const room = m?.roomCode ? this.rooms.get(m.roomCode) : undefined;
    if (t.status !== 'running' || !m || !room) {
      return fail(409, 'You have no match to play right now.');
    }
    const seat = room.claim(userId);
    if (!seat) return fail(409, 'You have no match to play right now.');
    return {
      ok: true,
      code: room.code,
      token: seat.token,
      seat: seat.seat,
      boardId: t.boardId,
      settings: t.settings,
    };
  }

  private nameOf(userId: string | null): string | null {
    if (!userId) return null;
    return this.store.getUser(userId)?.displayName ?? 'Player';
  }

  view(t: TournamentRecord, viewerId?: string): TournamentView {
    const last = t.rounds[t.rounds.length - 1];
    const mine = viewerId
      ? last?.find((m) => m.status !== 'done' && (m.a === viewerId || m.b === viewerId))
      : undefined;
    return {
      id: t.id,
      name: t.name,
      boardId: t.boardId,
      settings: t.settings,
      status: t.status,
      registrationCloses: t.registrationCloses,
      entrants: t.entries.length,
      registered: !!viewerId && t.entries.includes(viewerId),
      myMatch:
        mine && t.status === 'running'
          ? {
              id: mine.id,
              round: mine.round + 1,
              opponent: this.nameOf(mine.a === viewerId ? mine.b : mine.a),
              status: mine.status === 'live' ? 'ready' : 'waiting',
            }
          : null,
      champion: this.nameOf(t.champion ?? null),
      bracket: t.rounds.map((round) =>
        round.map((m) => ({
          id: m.id,
          round: m.round + 1,
          a: this.nameOf(m.a),
          b: this.nameOf(m.b),
          status: m.status,
          winner: this.nameOf(m.winner ?? null),
          how: m.how ?? null,
        })),
      ),
    };
  }

  list(viewerId?: string): TournamentView[] {
    return this.store
      .allTournaments()
      .sort((x, y) => y.createdAt - x.createdAt)
      .slice(0, 30)
      .map((t) => this.view(t, viewerId));
  }

  get(id: string, viewerId?: string): TournamentView | undefined {
    const t = this.store.getTournament(id);
    return t ? this.view(t, viewerId) : undefined;
  }
}
