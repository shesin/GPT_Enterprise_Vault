/**
 * A player who refreshes, closes the tab, or whose browser is killed rejoins their online room: the secret
 * seat token is kept in sessionStorage (this tab) and in localStorage (the browser profile, for a new tab or a
 * relaunched browser), for as long as the server keeps an idle room. A room that no longer exists (finished long
 * ago, server restarted) is forgotten instead. Leaving the game clears both copies.
 */
import { OnlineClient, type OnlineSession } from './OnlineClient';
import type { OnlineGame } from './onlineLobby';

const KEY = 'sb-online-session';
/** The server drops a room after 3 hours without activity (server/RoomManager ROOM_IDLE_LIMIT_MS). */
const SEAT_LIFETIME_MS = 3 * 60 * 60 * 1000;

function stores(): Storage[] {
  const found: Storage[] = [];
  for (const name of ['sessionStorage', 'localStorage'] as const) {
    try {
      const s = typeof globalThis[name] === 'undefined' ? null : globalThis[name];
      if (s) found.push(s);
    } catch {
      /* storage blocked: that copy simply does not exist */
    }
  }
  return found;
}

export function saveOnlineSession(session: OnlineSession | null): void {
  const value = session ? JSON.stringify({ ...session, savedAt: Date.now() }) : null;
  for (const s of stores()) {
    try {
      if (value) s.setItem(KEY, value);
      else s.removeItem(KEY);
    } catch {
      /* storage blocked: the room simply cannot be resumed from this copy */
    }
  }
}

function parse(raw: string | null): OnlineSession | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<OnlineSession> & { savedAt?: number };
    const fresh = typeof v.savedAt !== 'number' || Date.now() - v.savedAt < SEAT_LIFETIME_MS;
    const ok =
      fresh &&
      typeof v.code === 'string' &&
      /^[A-Z2-9]{5}$/.test(v.code) &&
      typeof v.token === 'string' &&
      v.token.length > 8 &&
      (v.seat === 'RED' || v.seat === 'BLUE') &&
      typeof v.boardId === 'string' &&
      !!v.settings;
    if (!ok) return null;
    return {
      code: v.code!,
      token: v.token!,
      seat: v.seat!,
      boardId: v.boardId!,
      settings: v.settings!,
    };
  } catch {
    return null;
  }
}

export function loadOnlineSession(): OnlineSession | null {
  for (const s of stores()) {
    try {
      const found = parse(s.getItem(KEY));
      if (found) return found;
    } catch {
      /* try the next copy */
    }
  }
  return null;
}

/** Returns the game to re-enter, or null when there is nothing (valid) to resume. */
export async function resumeOnlineGame(
  createClient: () => OnlineClient,
  baseUrl = '',
  fetchFn: typeof fetch = (...a) => fetch(...a),
): Promise<OnlineGame | null> {
  const session = loadOnlineSession();
  if (!session) return null;
  try {
    const r = await fetchFn(
      `${baseUrl}/api/rooms/${session.code}/state?token=${encodeURIComponent(session.token)}&since=0`,
    );
    if (!r.ok && r.status !== 204) {
      saveOnlineSession(null);
      return null;
    }
  } catch {
    // Server unreachable right now: keep the saved room, the player can try again after a reload.
    return null;
  }
  const client = createClient();
  client.resume(session);
  return { client, session };
}
