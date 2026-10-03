/**
 * A refreshed page rejoins its online room (the secret seat token is kept in sessionStorage, per tab).
 * A room that no longer exists (finished long ago, server restarted) is forgotten instead.
 */
import { OnlineClient, type OnlineSession } from './OnlineClient';
import type { OnlineGame } from './onlineLobby';

const KEY = 'sb-online-session';

function store(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function saveOnlineSession(session: OnlineSession | null): void {
  const s = store();
  if (!s) return;
  try {
    if (session) s.setItem(KEY, JSON.stringify(session));
    else s.removeItem(KEY);
  } catch {
    /* storage blocked: the room simply cannot be resumed after a reload */
  }
}

export function loadOnlineSession(): OnlineSession | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<OnlineSession>;
    const ok =
      typeof v.code === 'string' &&
      /^[A-Z2-9]{5}$/.test(v.code) &&
      typeof v.token === 'string' &&
      v.token.length > 8 &&
      (v.seat === 'RED' || v.seat === 'BLUE') &&
      typeof v.boardId === 'string' &&
      !!v.settings;
    return ok ? (v as OnlineSession) : null;
  } catch {
    return null;
  }
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
