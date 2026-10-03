/**
 * Account data (A7): users, sign-in sessions and pending login links, kept in one JSON file.
 * Only hashes of tokens are stored, so a copy of the file cannot be used to sign in.
 * Every change is written to a temporary file and renamed over the real one, so a crash
 * mid-write cannot leave a half-written file. Without a file path the data lives in memory (tests).
 */
import { existsSync, readFileSync, renameSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import type { TournamentRecord } from '../tournaments/types';

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: number;
  /** Ids from social sign-in, so the same person is recognised even if the e-mail changes. */
  google?: string;
  facebook?: string;
  /** True after a verified ad-removal payment. */
  adsRemoved?: boolean;
  payments?: Array<{ orderId: string; paymentId: string; amount: number; at: number }>;
  /** Elo rating per board id, changed by rated online games. */
  ratings?: Record<string, BoardRating>;
}

export interface BoardRating {
  elo: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface OrderRecord {
  userId: string;
  amount: number;
  at: number;
}

export interface SessionRecord {
  userId: string;
  expiresAt: number;
}

export interface LoginLinkRecord {
  email: string;
  expiresAt: number;
}

interface Data {
  users: Record<string, User>;
  sessions: Record<string, SessionRecord>;
  links: Record<string, LoginLinkRecord>;
  orders: Record<string, OrderRecord>;
  /** When each pair of players finished rated games (limits rating farming between two accounts). */
  pairs: Record<string, number[]>;
  tournaments: Record<string, TournamentRecord>;
}

export class AccountStore {
  private data: Data = {
    users: {},
    sessions: {},
    links: {},
    orders: {},
    pairs: {},
    tournaments: {},
  };

  constructor(private readonly file?: string) {
    if (file && existsSync(file)) {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<Data>;
      this.data = {
        users: parsed.users ?? {},
        sessions: parsed.sessions ?? {},
        links: parsed.links ?? {},
        orders: parsed.orders ?? {},
        pairs: parsed.pairs ?? {},
        tournaments: parsed.tournaments ?? {},
      };
    }
  }

  private save(): void {
    if (!this.file) return;
    mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data), { mode: 0o600 });
    renameSync(tmp, this.file);
  }

  findUserByEmail(email: string): User | undefined {
    return Object.values(this.data.users).find((u) => u.email === email);
  }

  findUserByProvider(provider: 'google' | 'facebook', id: string): User | undefined {
    return Object.values(this.data.users).find((u) => u[provider] === id);
  }

  getUser(id: string): User | undefined {
    return this.data.users[id];
  }

  putUser(user: User): void {
    this.data.users[user.id] = user;
    this.save();
  }

  allTournaments(): TournamentRecord[] {
    return Object.values(this.data.tournaments);
  }

  getTournament(id: string): TournamentRecord | undefined {
    return this.data.tournaments[id];
  }

  putTournament(t: TournamentRecord): void {
    this.data.tournaments[t.id] = t;
    this.save();
  }

  allUsers(): User[] {
    return Object.values(this.data.users);
  }

  pairGames(key: string): number[] {
    return this.data.pairs[key] ?? [];
  }

  putPairGames(key: string, times: number[]): void {
    this.data.pairs[key] = times;
    this.save();
  }

  putOrder(id: string, order: OrderRecord): void {
    this.data.orders[id] = order;
    this.save();
  }

  getOrder(id: string): OrderRecord | undefined {
    return this.data.orders[id];
  }

  deleteOrder(id: string): void {
    if (this.data.orders[id]) {
      delete this.data.orders[id];
      this.save();
    }
  }

  putLink(hash: string, link: LoginLinkRecord): void {
    this.data.links[hash] = link;
    this.save();
  }

  /** Removes and returns the link: a login link works once. */
  takeLink(hash: string): LoginLinkRecord | undefined {
    const link = this.data.links[hash];
    if (!link) return undefined;
    delete this.data.links[hash];
    this.save();
    return link;
  }

  putSession(hash: string, session: SessionRecord): void {
    this.data.sessions[hash] = session;
    this.save();
  }

  getSession(hash: string): SessionRecord | undefined {
    return this.data.sessions[hash];
  }

  deleteSession(hash: string): void {
    if (this.data.sessions[hash]) {
      delete this.data.sessions[hash];
      this.save();
    }
  }

  /** Keeps only the newest `max` sessions of one user. */
  limitSessions(userId: string, max: number): void {
    const mine = Object.entries(this.data.sessions)
      .filter(([, s]) => s.userId === userId)
      .sort((a, b) => b[1].expiresAt - a[1].expiresAt);
    for (const [hash] of mine.slice(max)) delete this.data.sessions[hash];
    if (mine.length > max) this.save();
  }

  /** Drops expired links and sessions. */
  sweep(now: number): void {
    let changed = false;
    for (const [h, l] of Object.entries(this.data.links)) {
      if (l.expiresAt <= now) {
        delete this.data.links[h];
        changed = true;
      }
    }
    for (const [key, times] of Object.entries(this.data.pairs)) {
      if (times.every((t) => now - t >= 24 * 3600_000)) {
        delete this.data.pairs[key];
        changed = true;
      }
    }
    for (const [id, o] of Object.entries(this.data.orders)) {
      if (now - o.at > 7 * 24 * 3600_000) {
        delete this.data.orders[id];
        changed = true;
      }
    }
    for (const [h, s] of Object.entries(this.data.sessions)) {
      if (s.expiresAt <= now) {
        delete this.data.sessions[h];
        changed = true;
      }
    }
    if (changed) this.save();
  }
}
