/** The hub's Tournament dialog (A10): see events, sign up, play your match; the organiser can create events. */
import { getCatalogEntry, getPlayConfig, type ProductBoardId } from '../../../config/BoardCatalog';
import { formatTimerOptionLabel } from '../feature/GameFeatureSettings';
import { ONLINE_BOARDS } from '../../../../server/protocol';
import type { RoomSettings } from '../../../../server/protocol';
import { installModalFocus } from '../layout/modalFocus';
import { OnlineClient, type OnlineSession } from '../online/OnlineClient';
import { createBrowserOnlineClient, type OnlineGame } from '../online/onlineLobby';
import { saveOnlineSession } from '../online/onlineResume';

export interface TournamentView {
  id: string;
  name: string;
  boardId: string;
  settings: RoomSettings;
  status: 'open' | 'running' | 'finished' | 'cancelled';
  registrationCloses: number;
  entrants: number;
  registered: boolean;
  myMatch: {
    id: string;
    round: number;
    opponent: string | null;
    status: 'waiting' | 'ready';
  } | null;
  champion: string | null;
  bracket: Array<
    Array<{
      id: string;
      round: number;
      a: string | null;
      b: string | null;
      status: string;
      winner: string | null;
      how: string | null;
    }>
  >;
}

interface Me {
  user: { displayName: string } | null;
  admin?: boolean;
  tournaments?: boolean;
}

const POLL_MS = 5000;
const byId = <T extends HTMLElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

async function json<T>(
  doFetch: typeof fetch,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; data: T }> {
  try {
    const r = await doFetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { ok: r.ok, data: (await r.json().catch(() => ({}))) as T };
  } catch {
    return { ok: false, data: { error: 'Could not reach the server.' } as T };
  }
}

export function describeEvent(t: TournamentView, now: number): string {
  const board = getCatalogEntry(t.boardId as ProductBoardId)?.displayName ?? t.boardId;
  const clocks = [
    t.settings.timer !== 'off' ? `${t.settings.timer} min` : null,
    t.settings.tournamentTimer !== 'off' ? `${t.settings.tournamentTimer} min each` : null,
    t.settings.shotClock !== 'off' ? `${t.settings.shotClock} s per move` : null,
  ]
    .filter(Boolean)
    .join(', ');
  const players = `${t.entrants} ${t.entrants === 1 ? 'player' : 'players'}`;
  let state: string;
  if (t.status === 'open') {
    const mins = Math.max(0, Math.ceil((t.registrationCloses - now) / 60000));
    state = `sign-up closes in ${mins} min`;
  } else if (t.status === 'running') state = 'under way';
  else if (t.status === 'finished') state = `finished, champion ${t.champion ?? '?'}`;
  else state = 'cancelled';
  return `${board} · ${clocks} · ${players} · ${state}`;
}

export function wireTournamentPanel(
  onEnter: (game: OnlineGame) => void,
  doFetch: typeof fetch = (...a) => fetch(...a),
  makeClient: () => OnlineClient = createBrowserOnlineClient,
): { open: () => void } {
  const btn = byId<HTMLButtonElement>('hub-tournament-btn');
  const modal = byId<HTMLDivElement>('tournament-dialog');
  const list = byId('tournament-list');
  const msg = byId('tournament-message');
  const closeBtn = byId<HTMLButtonElement>('tournament-close-btn');
  const admin = byId('tournament-admin');
  const nameIn = byId<HTMLInputElement>('tournament-name');
  const boardSel = byId<HTMLSelectElement>('tournament-board');
  const timerSel = byId<HTMLSelectElement>('tournament-timer');
  const minsIn = byId<HTMLInputElement>('tournament-minutes');
  const createBtn = byId<HTMLButtonElement>('tournament-create-btn');
  if (
    !btn ||
    !modal ||
    !list ||
    !msg ||
    !closeBtn ||
    !admin ||
    !nameIn ||
    !boardSel ||
    !timerSel ||
    !minsIn ||
    !createBtn
  ) {
    return { open: () => {} };
  }

  let timer: ReturnType<typeof setInterval> | null = null;
  let me: Me = { user: null };

  const setMessage = (text: string): void => {
    msg.textContent = text;
  };

  function option(value: string, label: string): HTMLOptionElement {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    return o;
  }

  function fillClocks(): void {
    const play = getPlayConfig(boardSel!.value as ProductBoardId);
    timerSel!.replaceChildren(
      ...play.timerOptions
        .filter((t) => t !== 'off')
        .map((t) => option(t, formatTimerOptionLabel(t, play.timerBest))),
    );
    if (play.timerBest) timerSel!.value = play.timerBest;
  }
  boardSel.replaceChildren(
    ...ONLINE_BOARDS.map((id) => option(id, getCatalogEntry(id)?.displayName ?? id)),
  );
  boardSel.addEventListener('change', fillClocks);
  fillClocks();

  async function act(path: string, body: unknown = {}): Promise<void> {
    setMessage('');
    const r = await json<{ error?: string }>(doFetch, path, body);
    if (!r.ok) setMessage(r.data.error ?? 'That did not work.');
    await refresh();
  }

  async function play(t: TournamentView): Promise<void> {
    setMessage('');
    const r = await json<OnlineSession & { error?: string }>(
      doFetch,
      `/api/tournaments/${t.id}/play`,
      {},
    );
    if (!r.ok) {
      setMessage(r.data.error ?? 'You have no match to play right now.');
      return;
    }
    const session: OnlineSession = {
      code: r.data.code,
      token: r.data.token,
      seat: r.data.seat,
      boardId: r.data.boardId,
      settings: r.data.settings,
    };
    saveOnlineSession(session); // a reload or a closed tab rejoins the same game
    const client = makeClient();
    client.resume(session);
    close();
    onEnter({ client, session });
  }

  function button(label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'play-again-btn';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function bracketText(t: TournamentView): HTMLElement | null {
    if (t.bracket.length === 0) return null;
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Bracket';
    details.append(summary);
    t.bracket.forEach((round, i) => {
      const h = document.createElement('p');
      h.textContent = i === t.bracket.length - 1 && round.length === 1 ? 'Final' : `Round ${i + 1}`;
      h.style.margin = '6px 0 2px';
      details.append(h);
      const ul = document.createElement('ul');
      ul.style.margin = '0';
      for (const m of round) {
        const li = document.createElement('li');
        const pair = m.b === null ? `${m.a} (bye)` : `${m.a} vs ${m.b}`;
        li.textContent = m.winner ? `${pair} — ${m.winner} won` : pair;
        ul.append(li);
      }
      details.append(ul);
    });
    return details;
  }

  function render(events: TournamentView[]): void {
    if (events.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'No tournaments yet. Check back soon.';
      list!.replaceChildren(p);
      return;
    }
    list!.replaceChildren(
      ...events.map((t) => {
        const box = document.createElement('div');
        box.className = 'online-lobby-section';
        const title = document.createElement('h4');
        title.textContent = t.name;
        const info = document.createElement('p');
        info.textContent = describeEvent(t, Date.now());
        info.style.margin = '0';
        box.append(title, info);
        if (t.status === 'open') {
          if (!me.user) {
            const p = document.createElement('p');
            p.textContent = 'Sign in to register.';
            box.append(p);
          } else if (t.registered) {
            box.append(
              button('Leave this event', () => void act(`/api/tournaments/${t.id}/unregister`)),
            );
          } else {
            box.append(button('Register', () => void act(`/api/tournaments/${t.id}/register`)));
          }
        } else if (t.status === 'running' && t.myMatch) {
          if (t.myMatch.status === 'ready') {
            box.append(
              button(
                `Play your match vs ${t.myMatch.opponent ?? 'your opponent'}`,
                () => void play(t),
              ),
            );
          } else {
            const p = document.createElement('p');
            p.textContent = 'You are through. Waiting for the other matches to finish.';
            box.append(p);
          }
        }
        if (me.admin && (t.status === 'open' || t.status === 'running')) {
          const cancel = button('Cancel event', () => void act(`/api/tournaments/${t.id}/cancel`));
          cancel.className = 'result-view-board-btn';
          box.append(cancel);
        }
        const b = bracketText(t);
        if (b) box.append(b);
        return box;
      }),
    );
  }

  async function refresh(): Promise<void> {
    const [m, l] = await Promise.all([
      json<Me>(doFetch, '/api/auth/me'),
      json<{ tournaments?: TournamentView[]; error?: string }>(doFetch, '/api/tournaments'),
    ]);
    me = m.ok ? m.data : { user: null };
    admin!.hidden = !(me.admin && me.user);
    if (!l.ok) {
      list!.replaceChildren();
      setMessage('Tournaments are not available right now.');
      return;
    }
    render(l.data.tournaments ?? []);
  }

  function close(): void {
    modal!.style.display = 'none';
    setMessage('');
    if (timer) clearInterval(timer);
    timer = null;
  }

  function open(): void {
    modal!.style.display = 'flex';
    void refresh();
    if (!timer) timer = setInterval(() => void refresh(), POLL_MS);
  }

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  installModalFocus(modal, { onEscape: close });

  createBtn.addEventListener('click', async () => {
    setMessage('');
    createBtn.disabled = true;
    const r = await json<{ error?: string }>(doFetch, '/api/tournaments', {
      name: nameIn.value,
      boardId: boardSel.value,
      settings: { timer: timerSel.value },
      closesInMinutes: Number(minsIn.value),
    });
    createBtn.disabled = false;
    if (!r.ok) {
      setMessage(r.data.error ?? 'Could not create the event.');
      return;
    }
    nameIn.value = '';
    await refresh();
  });

  return { open };
}
