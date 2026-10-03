import { startApp, type RunningApp } from '../app';
import { AccountStore } from '../accounts/AccountStore';
import { AuthService } from '../accounts/AuthService';
import { Ratings } from '../accounts/Ratings';
import type { Mailer } from '../accounts/Mailer';
import { RoomManager } from '../RoomManager';
import { TournamentService, type TournamentView } from '../tournaments/TournamentService';

const clock = { t: 60_000_000_000 };
const sent: string[] = [];
const mailer: Mailer = {
  async sendLoginLink(_to, link) {
    sent.push(link);
  },
};

let app: RunningApp;
let base: string;
let svc: TournamentService;

beforeEach(async () => {
  sent.length = 0;
  const store = new AccountStore();
  const manager = new RoomManager(() => clock.t);
  const ratings = new Ratings(store, () => clock.t);
  svc = new TournamentService(store, manager, ratings, () => clock.t);
  app = await startApp({
    port: 0,
    now: () => clock.t,
    tickMs: 100000,
    auth: new AuthService(store, mailer, 'https://example.test', () => clock.t),
    manager,
    ratings,
    tournaments: svc,
    adminEmails: ['admin@example.com'],
  });
  base = `http://127.0.0.1:${app.port}`;
});
afterEach(async () => {
  await app.close();
});

async function api(
  method: string,
  p: string,
  body?: unknown,
  cookie?: string,
  extra: Record<string, string> = {},
) {
  const r = await fetch(base + p, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...extra },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  return {
    status: r.status,
    json: (text && r.status !== 204 ? JSON.parse(text) : {}) as Record<string, unknown>,
    cookie: r.headers.get('set-cookie')?.split(';')[0] ?? '',
  };
}

async function signIn(email: string): Promise<string> {
  await api('POST', '/api/auth/request', { email });
  const token = new URL(sent[sent.length - 1]!).searchParams.get('login');
  return (await api('POST', '/api/auth/verify', { token })).cookie;
}

const EVENT = {
  name: 'Friday Cup',
  boardId: '6x4',
  settings: { timer: '5', shotClock: '60' },
  closesInMinutes: 10,
};

describe('tournament routes', () => {
  it('anyone can read the list; creating needs sign-in and the organiser role', async () => {
    expect((await api('GET', '/api/tournaments')).json).toEqual({ tournaments: [] });
    expect((await api('POST', '/api/tournaments', EVENT)).status).toBe(401);
    const ann = await signIn('ann@example.com');
    expect((await api('POST', '/api/tournaments', EVENT, ann)).status).toBe(403);
    const admin = await signIn('admin@example.com');
    const made = await api('POST', '/api/tournaments', EVENT, admin);
    expect(made.status).toBe(200);
    expect(made.json.name).toBe('Friday Cup');
    expect((await api('POST', '/api/tournaments', { ...EVENT, name: '' }, admin)).status).toBe(400);
  });

  it('/me tells the organiser they are one, and nobody else', async () => {
    const admin = await signIn('admin@example.com');
    const ann = await signIn('ann@example.com');
    expect((await api('GET', '/api/auth/me', undefined, admin)).json.admin).toBe(true);
    expect((await api('GET', '/api/auth/me', undefined, ann)).json.admin).toBe(false);
    expect((await api('GET', '/api/auth/me')).json.admin).toBe(false);
  });

  it('refuses a POST from another site', async () => {
    const admin = await signIn('admin@example.com');
    const r = await api('POST', '/api/tournaments', EVENT, admin, { origin: 'https://evil.test' });
    expect(r.status).toBe(403);
  });

  it('only the organiser can cancel or decide a match', async () => {
    const admin = await signIn('admin@example.com');
    const ann = await signIn('ann@example.com');
    const id = (await api('POST', '/api/tournaments', EVENT, admin)).json.id as string;
    expect((await api('POST', `/api/tournaments/${id}/cancel`, {}, ann)).status).toBe(403);
    expect(
      (await api('POST', `/api/tournaments/${id}/advance`, { matchId: 'r1m1', side: 'a' }, ann))
        .status,
    ).toBe(403);
    expect((await api('POST', `/api/tournaments/${id}/cancel`, {}, admin)).status).toBe(200);
  });

  it('a whole event over HTTP: sign up, bracket, play, champion', async () => {
    const admin = await signIn('admin@example.com');
    const ann = await signIn('ann@example.com');
    const bob = await signIn('bob@example.com');
    const id = (await api('POST', '/api/tournaments', EVENT, admin)).json.id as string;

    expect((await api('POST', `/api/tournaments/${id}/register`, {})).status).toBe(401);
    expect((await api('POST', `/api/tournaments/${id}/register`, {}, ann)).status).toBe(200);
    expect((await api('POST', `/api/tournaments/${id}/register`, {}, bob)).status).toBe(200);
    const listed = (await api('GET', '/api/tournaments', undefined, ann)).json
      .tournaments as TournamentView[];
    expect(listed[0]).toMatchObject({ entrants: 2, registered: true, status: 'open' });

    expect((await api('POST', `/api/tournaments/${id}/play`, {}, ann)).status).toBe(409); // not started yet

    clock.t += 11 * 60_000;
    svc.tick();
    const running = (await api('GET', `/api/tournaments/${id}`, undefined, ann))
      .json as unknown as TournamentView;
    expect(running.status).toBe('running');
    expect(running.myMatch).toMatchObject({ opponent: 'bob', status: 'ready' });

    const a = (await api('POST', `/api/tournaments/${id}/play`, {}, ann)).json;
    const b = (await api('POST', `/api/tournaments/${id}/play`, {}, bob)).json;
    expect(a.code).toBe(b.code);
    expect([a.seat, b.seat].sort()).toEqual(['BLUE', 'RED']);
    expect(a.boardId).toBe('6x4');
    const stranger = await signIn('eve@example.com');
    expect((await api('POST', `/api/tournaments/${id}/play`, {}, stranger)).status).toBe(409);

    // the game is played in the ordinary room API with the seat tokens
    const code = a.code as string;
    const view = (await api('GET', `/api/rooms/${code}/state?token=${a.token}&since=0`)).json as {
      currentPlayer: string;
      started: boolean;
    };
    expect(view.started).toBe(true);
    const mover = view.currentPlayer === a.seat ? a : b;
    const other = mover === a ? b : a;
    await api('POST', `/api/rooms/${code}/action`, {
      token: mover.token,
      intent: { type: 'resign' },
    });
    await api('POST', `/api/rooms/${code}/action`, {
      token: other.token,
      intent: { type: 'resignRespond', acceptDraw: false },
    });

    const done = (await api('GET', `/api/tournaments/${id}`, undefined, ann))
      .json as unknown as TournamentView;
    expect(done.status).toBe('finished');
    expect(done.champion).toBe(other === a ? 'ann' : 'bob');
    expect(JSON.stringify(done)).not.toContain('@example.com');
  });

  it('is switched off without a tournament service', async () => {
    await app.close();
    app = await startApp({ port: 0 });
    base = `http://127.0.0.1:${app.port}`;
    expect((await api('GET', '/api/tournaments')).status).toBe(404);
  });
});
