/** @jest-environment jsdom */
import { describeEvent, wireTournamentPanel, type TournamentView } from '../tournamentPanel';
import type { OnlineClient } from '../../online/OnlineClient';

const DOM = `
<button id="hub-tournament-btn">Tournament</button>
<div id="tournament-dialog" style="display:none">
  <div id="tournament-list"></div>
  <div id="tournament-admin" hidden>
    <input id="tournament-name"><select id="tournament-board"></select>
    <select id="tournament-timer"></select>
    <input id="tournament-minutes" value="60"><button id="tournament-create-btn"></button>
  </div>
  <p id="tournament-message"></p>
  <button id="tournament-close-btn"></button>
</div>`;

const SETTINGS = {
  timer: '5',
  tournamentTimer: 'off',
  shotClock: '60',
  centerRule: 'off',
} as const;

function event(over: Partial<TournamentView> = {}): TournamentView {
  return {
    id: 'ev1',
    name: 'Friday Cup',
    boardId: '6x4',
    settings: { ...SETTINGS },
    status: 'open',
    registrationCloses: Date.now() + 10 * 60_000,
    entrants: 3,
    registered: false,
    myMatch: null,
    champion: null,
    bracket: [],
    ...over,
  };
}

interface World {
  me: { user: { displayName: string } | null; admin?: boolean };
  events: TournamentView[];
  posts: Array<{ path: string; body: unknown }>;
  playReply: { ok: boolean; body: Record<string, unknown> };
}

function fakeFetch(w: World): typeof fetch {
  return (async (input: string, init?: { method?: string; body?: string }) => {
    const path = String(input);
    if (init?.method === 'POST') w.posts.push({ path, body: JSON.parse(init.body ?? '{}') });
    const reply = (ok: boolean, body: unknown) => ({ ok, json: async () => body });
    if (path === '/api/auth/me') return reply(true, w.me);
    if (path === '/api/tournaments' && init?.method !== 'POST') {
      return reply(true, { tournaments: w.events });
    }
    if (path.endsWith('/play')) return reply(w.playReply.ok, w.playReply.body);
    return reply(true, { ok: true });
  }) as unknown as typeof fetch;
}

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const buttons = (): string[] =>
  [...document.querySelectorAll('#tournament-list button')].map((b) => b.textContent ?? '');
const click = (label: string): void =>
  ([...document.querySelectorAll('#tournament-list button')] as HTMLButtonElement[])
    .find((b) => b.textContent?.startsWith(label))!
    .click();

let w: World;
let entered: unknown[];
const fakeClient = { resume: jest.fn() } as unknown as OnlineClient;

function start() {
  const panel = wireTournamentPanel(
    (g) => entered.push(g),
    fakeFetch(w),
    () => fakeClient,
  );
  el('hub-tournament-btn').click();
  return panel;
}

beforeEach(() => {
  document.body.innerHTML = DOM;
  entered = [];
  localStorage.clear();
  sessionStorage.clear();
  (fakeClient.resume as jest.Mock).mockClear();
  w = {
    me: { user: { displayName: 'ann' } },
    events: [event()],
    posts: [],
    playReply: { ok: true, body: {} },
  };
});

describe('tournament dialog', () => {
  it('opens and lists the events with their details', async () => {
    start();
    await flush();
    expect(el('tournament-dialog').style.display).toBe('flex');
    const text = el('tournament-list').textContent!;
    expect(text).toContain('Friday Cup');
    expect(text).toContain('3 players');
    expect(text).toContain('sign-up closes in');
  });

  it('says so when there are no events', async () => {
    w.events = [];
    start();
    await flush();
    expect(el('tournament-list').textContent).toContain('No tournaments yet');
  });

  it('a signed-out visitor is told to sign in and gets no register button', async () => {
    w.me = { user: null };
    start();
    await flush();
    expect(el('tournament-list').textContent).toContain('Sign in to register');
    expect(buttons()).toEqual([]);
  });

  it('registers and leaves through the server', async () => {
    start();
    await flush();
    click('Register');
    await flush();
    await flush();
    expect(w.posts.map((p) => p.path)).toContain('/api/tournaments/ev1/register');
    w.events = [event({ registered: true })];
    el('tournament-close-btn').click();
    el('hub-tournament-btn').click();
    await flush();
    await flush();
    expect(buttons()).toContain('Leave this event');
    click('Leave');
    await flush();
    expect(w.posts.map((p) => p.path)).toContain('/api/tournaments/ev1/unregister');
  });

  it('shows a play button for a ready match and enters the room with the seat the server gave', async () => {
    w.events = [
      event({
        status: 'running',
        registered: true,
        myMatch: { id: 'r1m1', round: 1, opponent: 'bob', status: 'ready' },
      }),
    ];
    w.playReply = {
      ok: true,
      body: {
        code: 'ABCDE',
        token: 'secret-token-123',
        seat: 'RED',
        boardId: '6x4',
        settings: SETTINGS,
      },
    };
    start();
    await flush();
    expect(buttons()).toContain('Play your match vs bob');
    click('Play your match');
    await flush();
    expect(entered).toHaveLength(1);
    expect((fakeClient.resume as jest.Mock).mock.calls[0][0]).toMatchObject({
      code: 'ABCDE',
      seat: 'RED',
    });
    expect(JSON.parse(localStorage.getItem('sb-online-session')!)).toMatchObject({ code: 'ABCDE' });
    expect(el('tournament-dialog').style.display).toBe('none');
  });

  it('a refused play shows the reason and does not enter a game', async () => {
    w.events = [
      event({
        status: 'running',
        registered: true,
        myMatch: { id: 'r1m1', round: 1, opponent: 'bob', status: 'ready' },
      }),
    ];
    w.playReply = { ok: false, body: { error: 'You have no match to play right now.' } };
    start();
    await flush();
    click('Play your match');
    await flush();
    expect(entered).toHaveLength(0);
    expect(el('tournament-message').textContent).toContain('no match');
  });

  it('a player who is through is told to wait; a finished event shows its champion', async () => {
    w.events = [
      event({
        status: 'running',
        myMatch: { id: 'r2m1', round: 2, opponent: null, status: 'waiting' },
      }),
      event({ id: 'ev2', name: 'Old Cup', status: 'finished', champion: 'cy' }),
    ];
    start();
    await flush();
    expect(el('tournament-list').textContent).toContain('Waiting for the other matches');
    expect(el('tournament-list').textContent).toContain('champion cy');
  });

  it('the organiser form and cancel button show only for the organiser', async () => {
    start();
    await flush();
    expect(el('tournament-admin').hidden).toBe(true);
    expect(buttons()).not.toContain('Cancel event');
    w.me = { user: { displayName: 'boss' }, admin: true };
    el('tournament-close-btn').click();
    el('hub-tournament-btn').click();
    await flush();
    await flush();
    expect(el('tournament-admin').hidden).toBe(false);
    expect(buttons()).toContain('Cancel event');
  });

  it('the organiser creates an event with the chosen clocks', async () => {
    w.me = { user: { displayName: 'boss' }, admin: true };
    start();
    await flush();
    el<HTMLInputElement>('tournament-name').value = 'Sunday Cup';
    el<HTMLInputElement>('tournament-minutes').value = '30';
    el('tournament-create-btn').click();
    await flush();
    const post = w.posts.find((p) => p.path === '/api/tournaments')!;
    const body = post.body as { settings: Record<string, string> };
    expect(post.body).toMatchObject({ name: 'Sunday Cup', closesInMinutes: 30 });
    expect(body.settings.timer).not.toBe('off');
    expect(body.settings.shotClock).toBeUndefined(); // the server fixes the shot clock per board
  });

  it('shows the bracket with byes and winners', async () => {
    w.events = [
      event({
        status: 'running',
        bracket: [
          [
            { id: 'r1m1', round: 1, a: 'ann', b: null, status: 'done', winner: 'ann', how: 'bye' },
            {
              id: 'r1m2',
              round: 1,
              a: 'bob',
              b: 'cy',
              status: 'done',
              winner: 'bob',
              how: 'played',
            },
          ],
        ],
      }),
    ];
    start();
    await flush();
    const text = el('tournament-list').textContent!;
    expect(text).toContain('ann (bye)');
    expect(text).toContain('bob vs cy — bob won');
  });
});

describe('describeEvent', () => {
  it('names the board, clocks, players and state', () => {
    const now = 1_000_000;
    const text = describeEvent(event({ registrationCloses: now + 5 * 60_000, entrants: 1 }), now);
    expect(text).toContain('6-bead');
    expect(text).toContain('5 min');
    expect(text).toContain('60 s per move');
    expect(text).toContain('1 player ');
    expect(text).toContain('closes in 5 min');
  });
});
