/** All live rooms: create, find, join by code, expire abandoned ones. */
import { randomInt } from 'crypto';
import { GameRoom } from './GameRoom';
import type { RoomSettings } from './protocol';

/** No 0/O/1/I/L: codes are read aloud and typed on phones. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;

export const ROOM_IDLE_LIMIT_MS = 3 * 60 * 60 * 1000;
export const MAX_ROOMS = 2000;

export class RoomManager {
  private rooms = new Map<string, GameRoom>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  get size(): number {
    return this.rooms.size;
  }

  private newCode(): string {
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('Could not find a free room code.');
  }

  create(
    boardId: unknown,
    settings: Partial<RoomSettings> | undefined,
  ): { room: GameRoom; seat: 'RED' | 'BLUE'; token: string } | { error: string } {
    this.sweep();
    if (this.rooms.size >= MAX_ROOMS)
      return { error: 'The server is busy. Try again in a moment.' };
    const checked = GameRoom.validate(boardId, settings);
    if (typeof checked === 'string') return { error: checked };
    const room = new GameRoom(this.newCode(), checked.boardId, checked.settings, this.now);
    this.rooms.set(room.code, room);
    const seat = room.join()!;
    return { room, seat: seat.seat, token: seat.token };
  }

  get(code: string): GameRoom | undefined {
    return this.rooms.get(String(code).toUpperCase());
  }

  join(code: string): { room: GameRoom; seat: 'RED' | 'BLUE'; token: string } | { error: string } {
    const room = this.get(code);
    if (!room) return { error: 'No room with that code.' };
    const seat = room.join();
    if (!seat) return { error: 'That room is already full.' };
    return { room, seat: seat.seat, token: seat.token };
  }

  /** Advance every clock once; returns the rooms that changed (so the transport can broadcast them). */
  tickAll(): GameRoom[] {
    const changed: GameRoom[] = [];
    for (const room of this.rooms.values()) if (room.tick()) changed.push(room);
    return changed;
  }

  /** Drop rooms nobody has touched for ROOM_IDLE_LIMIT_MS. */
  sweep(): number {
    const cutoff = this.now() - ROOM_IDLE_LIMIT_MS;
    let removed = 0;
    for (const [code, room] of this.rooms) {
      if (room.lastActivityMs < cutoff) {
        this.rooms.delete(code);
        removed += 1;
      }
    }
    return removed;
  }
}
