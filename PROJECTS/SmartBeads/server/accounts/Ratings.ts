/**
 * Player ratings (A21): an Elo rating per board, changed only by online games between two different signed-in
 * players. Not rated: a game of fewer than 6 moves (so resigning at once cannot be farmed), a game against
 * yourself, and the 6th and later rated game between the same two players inside 24 hours.
 */
import type { AccountStore, BoardRating, User } from './AccountStore';

export const START_ELO = 1200;
export const MIN_RATED_MOVES = 6;
export const MAX_GAMES_PER_PAIR_PER_DAY = 5;
const DAY_MS = 24 * 3600_000;
/** Listed on the board's top list once a player has played this many rated games. */
export const MIN_GAMES_FOR_LIST = 3;

export interface FinishedGame {
  boardId: string;
  redUserId: string | undefined;
  blueUserId: string | undefined;
  winner: 'RED' | 'BLUE' | 'DRAW';
  moveCount: number;
}

export interface RatingChange {
  RED: { before: number; after: number };
  BLUE: { before: number; after: number };
}

export interface TopEntry {
  displayName: string;
  elo: number;
  games: number;
}

const fresh = (): BoardRating => ({ elo: START_ELO, games: 0, wins: 0, losses: 0, draws: 0 });
const kFactor = (games: number): number => (games < 20 ? 40 : 24);

export class Ratings {
  constructor(
    private readonly store: AccountStore,
    private readonly now: () => number,
  ) {}

  ratingOf(user: User, boardId: string): BoardRating {
    return user.ratings?.[boardId] ?? fresh();
  }

  /** Applies one finished game. Returns the change, or undefined when the game is not rated. */
  apply(game: FinishedGame): RatingChange | undefined {
    const { redUserId, blueUserId } = game;
    if (!redUserId || !blueUserId || redUserId === blueUserId) return undefined;
    if (game.moveCount < MIN_RATED_MOVES) return undefined;
    const red = this.store.getUser(redUserId);
    const blue = this.store.getUser(blueUserId);
    if (!red || !blue) return undefined;

    const t = this.now();
    const pairKey = [redUserId, blueUserId].sort().join('|');
    const recent = this.store.pairGames(pairKey).filter((x) => t - x < DAY_MS);
    if (recent.length >= MAX_GAMES_PER_PAIR_PER_DAY) return undefined;
    this.store.putPairGames(pairKey, [...recent, t]);

    const a = this.ratingOf(red, game.boardId);
    const b = this.ratingOf(blue, game.boardId);
    const expectedRed = 1 / (1 + 10 ** ((b.elo - a.elo) / 400));
    const scoreRed = game.winner === 'RED' ? 1 : game.winner === 'BLUE' ? 0 : 0.5;
    const before = { RED: a.elo, BLUE: b.elo };
    a.elo = Math.max(100, Math.round(a.elo + kFactor(a.games) * (scoreRed - expectedRed)));
    b.elo = Math.max(
      100,
      Math.round(b.elo + kFactor(b.games) * (1 - scoreRed - (1 - expectedRed))),
    );
    for (const [r, own] of [
      [a, scoreRed],
      [b, 1 - scoreRed],
    ] as const) {
      r.games += 1;
      if (own === 1) r.wins += 1;
      else if (own === 0) r.losses += 1;
      else r.draws += 1;
    }
    red.ratings = { ...(red.ratings ?? {}), [game.boardId]: a };
    blue.ratings = { ...(blue.ratings ?? {}), [game.boardId]: b };
    this.store.putUser(red);
    this.store.putUser(blue);
    return {
      RED: { before: before.RED, after: a.elo },
      BLUE: { before: before.BLUE, after: b.elo },
    };
  }

  top(boardId: string, limit = 20): TopEntry[] {
    return this.store
      .allUsers()
      .map((u) => ({ u, r: u.ratings?.[boardId] }))
      .filter((x): x is { u: User; r: BoardRating } => !!x.r && x.r.games >= MIN_GAMES_FOR_LIST)
      .sort((x, y) => y.r.elo - x.r.elo || y.r.games - x.r.games)
      .slice(0, limit)
      .map(({ u, r }) => ({ displayName: u.displayName, elo: r.elo, games: r.games }));
  }
}
