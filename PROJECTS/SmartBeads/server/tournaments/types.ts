/** Tournament data (A10 V1: single elimination, one board and one preset per event). */
import type { RoomSettings } from '../protocol';

export interface TournamentMatch {
  id: string;
  round: number;
  /** User ids. null on one side means a bye: the other player advances without playing. */
  a: string | null;
  b: string | null;
  status: 'waiting' | 'live' | 'done';
  roomCode?: string;
  /** When the current room was opened (no-show clock). */
  readyAt?: number;
  winner?: string;
  draws: number;
  /** Colours swap after a drawn game. */
  swap: boolean;
  /** How it ended, for the bracket page: 'played', 'bye', 'no-show', 'draw-seed', 'admin'. */
  how?: string;
}

export interface TournamentRecord {
  id: string;
  name: string;
  boardId: string;
  settings: RoomSettings;
  registrationCloses: number;
  createdAt: number;
  status: 'open' | 'running' | 'finished' | 'cancelled';
  entries: string[];
  /** 1 = best. Set when registration closes (by rating on this board, ties by sign-up order). */
  seeds: Record<string, number>;
  rounds: TournamentMatch[][];
  champion?: string;
  /** A player who has not arrived this long after their room opens loses by walkover. */
  noShowMs: number;
}
