import { startApp, type RunningApp } from '../app';
import { AccountStore, type User } from '../accounts/AccountStore';
import { AuthService } from '../accounts/AuthService';
import {
  MAX_GAMES_PER_PAIR_PER_DAY,
  MIN_GAMES_FOR_LIST,
  Ratings,
  START_ELO,
  type FinishedGame,
} from '../accounts/Ratings';
import type { Mailer } from '../accounts/Mailer';
import type { RoomView } from '../protocol';

const clock = { t: 40_000_000_000 };

function user(id: string, name = id): User {
  return { id, email: `${id}@example.com`, displayName: name, createdAt: 0 };
}

function setup() {
  const store = new AccountStore();
  store.putUser(user('ann'));
  store.putUser(user('bob'));
  store.putUser(user('cy'));
  return { store, ratings: new Ratings(store, () => clock.t) };
}

const game = (over: Partial<FinishedGame> = {}): FinishedGame => ({
  boardId: '6x4',
  redUserId: 'ann',
  blueUserId: 'bob',
  winner: 'RED',
  moveCount: 20,
  ...over,
});

describe('Ratings (Elo per board)', () => {
  it('two new players: the winner gains 20 and the loser drops 20', () => {
    const { store, ratings } = setup();
    const change = ratings.apply(game())!;
    expect(change.RED).toEqual({ before: START_ELO, after: START_ELO + 20 });
    expect(change.BLUE).toEqual({ before: START_ELO, after: START_ELO - 20 });
    const a = store.getUser('ann')!.ratings!['6x4']!;
    expect(a).toMatchObject({ games: 1, wins: 1, losses: 0, draws: 0 });
    expect(store.getUser('bob')!.ratings!['6x4']).toMatchObject({ games: 1, wins: 0, losses: 1 });
  });

  it('a draw between equals changes nothing but counts as a game', () => {
    const { store, ratings } = setup();
    ratings.apply(game({ winner: 'DRAW' }));
    expect(store.getUser('ann')!.ratings!['6x4']).toMatchObject({
      elo: START_ELO,
      games: 1,
      draws: 1,
    });
  });

  it('beating a stronger player gains more than beating a weaker one', () => {
    const { store, ratings } = setup();
    store.getUser('bob')!.ratings = {
      '6x4': { elo: 1400, games: 30, wins: 0, losses: 0, draws: 0 },
    };
    store.getUser('cy')!.ratings = {
      '6x4': { elo: 1000, games: 30, wins: 0, losses: 0, draws: 0 },
    };
    const strong = ratings.apply(game({ blueUserId: 'bob' }))!;
    const weak = ratings.apply(game({ blueUserId: 'cy' }))!;
    expect(strong.RED.after - strong.RED.before).toBeGreaterThan(weak.RED.after - weak.RED.before);
  });

  it('each board has its own rating', () => {
    const { store, ratings } = setup();
    ratings.apply(game({ boardId: '16' }));
    expect(store.getUser('ann')!.ratings!['16']).toBeDefined();
    expect(store.getUser('ann')!.ratings!['6x4']).toBeUndefined();
  });

  it('does not rate a game of fewer than 6 moves', () => {
    const { store, ratings } = setup();
    expect(ratings.apply(game({ moveCount: 5 }))).toBeUndefined();
    expect(store.getUser('ann')!.ratings).toBeUndefined();
    expect(ratings.apply(game({ moveCount: 6 }))).toBeDefined();
  });

  it('does not rate a game unless both seats are different signed-in players', () => {
    const { ratings } = setup();
    expect(ratings.apply(game({ blueUserId: undefined }))).toBeUndefined();
    expect(ratings.apply(game({ redUserId: undefined }))).toBeUndefined();
    expect(ratings.apply(game({ blueUserId: 'ann' }))).toBeUndefined();
    expect(ratings.apply(game({ blueUserId: 'ghost' }))).toBeUndefined();
  });

  it('stops rating the same two players after 5 games in 24 hours, and resumes after', () => {
    const { ratings } = setup();
    for (let i = 0; i < MAX_GAMES_PER_PAIR_PER_DAY; i++)
      expect(ratings.apply(game())).toBeDefined();
    expect(ratings.apply(game())).toBeUndefined();
    expect(ratings.apply(game({ redUserId: 'bob', blueUserId: 'ann' }))).toBeUndefined(); // either colour
    expect(ratings.apply(game({ blueUserId: 'cy' }))).toBeDefined(); // another opponent is fine
    clock.t += 25 * 3600_000;
    expect(ratings.apply(game())).toBeDefined();
  });

  it('never drops below 100', () => {
    const { store, ratings } = setup();
    store.getUser('ann')!.ratings = {
      '6x4': { elo: 100, games: 50, wins: 0, losses: 50, draws: 0 },
    };
    store.getUser('bob')!.ratings = {
      '6x4': { elo: 100, games: 50, wins: 50, losses: 0, draws: 0 },
    };
    ratings.apply(game({ winner: 'BLUE' }));
    expect(store.getUser('ann')!.ratings!['6x4']!.elo).toBe(100);
  });

  it('the top list needs a few games, is sorted by rating, and shows names only', () => {
    const { store, ratings } = setup();
    const set = (id: string, elo: number, games: number) => {
      store.getUser(id)!.ratings = { '6x4': { elo, games, wins: 0, losses: 0, draws: 0 } };
    };
    set('ann', 1300, MIN_GAMES_FOR_LIST);
    set('bob', 1500, MIN_GAMES_FOR_LIST - 1); // too few games to list
    set('cy', 1400, 10);
    const top = ratings.top('6x4');
    expect(top.map((t) => t.displayName)).toEqual(['cy', 'ann']);
    expect(Object.keys(top[0]!).sort()).toEqual(['displayName', 'elo', 'games']);
  });
});

describe('ratings over the wire (two signed-in players, a real game)', () => {
  const sent: string[] = [];
  const mailer: Mailer = {
    async sendLoginLink(_to, link) {
      sent.push(link);
    },
  };
  let app: RunningApp;
  let base: string;
  let store: AccountStore;

  beforeEach(async () => {
    sent.length = 0;
    store = new AccountStore();
    const auth = new AuthService(store, mailer, 'https://example.test', () => clock.t);
    app = await startApp({
      port: 0,
      now: () => clock.t,
      tickMs: 100000,
      auth,
      ratings: new Ratings(store, () => clock.t),
    });
    base = `http://127.0.0.1:${app.port}`;
  });
  afterEach(async () => {
    await app.close();
  });

  async function api(method: string, p: string, body?: unknown, cookie?: string) {
    const r = await fetch(base + p, {
      method,
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
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

  async function playMoves(code: string, tokens: Record<string, string>, count: number) {
    for (let i = 0; i < count; i++) {
      const probe = (await api('GET', `/api/rooms/${code}/state?token=${tokens.RED}&since=0`))
        .json as unknown as RoomView;
      const seat = probe.currentPlayer;
      const view = (await api('GET', `/api/rooms/${code}/state?token=${tokens[seat]}&since=0`))
        .json as unknown as RoomView;
      const intent =
        view.chainPieceId !== null
          ? { type: 'finishChain' }
          : { type: 'move', from: view.legalMoves[0]!.from, to: view.legalMoves[0]!.to };
      const r = await api('POST', `/api/rooms/${code}/action`, { token: tokens[seat], intent });
      expect(r.status).toBe(200);
    }
  }

  async function finishedGame(
    cookieRed: string | undefined,
    cookieBlue: string | undefined,
    moves: number,
  ) {
    const made = await api('POST', '/api/rooms', { boardId: '6x4' }, cookieRed);
    const code = made.json.code as string;
    const joined = await api('POST', `/api/rooms/${code}/join`, {}, cookieBlue);
    const tokens: Record<string, string> = {
      RED: made.json.token as string,
      BLUE: joined.json.token as string,
    };
    await playMoves(code, tokens, moves);
    const view = (await api('GET', `/api/rooms/${code}/state?token=${tokens.RED}&since=0`))
      .json as unknown as RoomView;
    const loser = view.currentPlayer;
    const winner = loser === 'RED' ? 'BLUE' : 'RED';
    await api('POST', `/api/rooms/${code}/action`, {
      token: tokens[loser],
      intent: { type: 'resign' },
    });
    await api('POST', `/api/rooms/${code}/action`, {
      token: tokens[winner],
      intent: { type: 'resignRespond', acceptDraw: false },
    });
    return { code, winner, loser, tokens };
  }

  it('a rated game changes both ratings, the winner up and the loser down, and /me shows it', async () => {
    const ann = await signIn('ann@example.com');
    const bob = await signIn('bob@example.com');
    const g = await finishedGame(ann, bob, 6);
    const annUser = store.findUserByEmail('ann@example.com')!;
    const bobUser = store.findUserByEmail('bob@example.com')!;
    const [w, l] = g.winner === 'RED' ? [annUser, bobUser] : [bobUser, annUser];
    expect(w.ratings!['6x4']!.elo).toBe(START_ELO + 20);
    expect(l.ratings!['6x4']!.elo).toBe(START_ELO - 20);
    const me = await api('GET', '/api/auth/me', undefined, ann);
    expect(
      (me.json.user as { ratings: Record<string, { games: number }> }).ratings['6x4']!.games,
    ).toBe(1);
  });

  it('a finished game is rated exactly once, however many clock ticks follow', async () => {
    const ann = await signIn('ann@example.com');
    const bob = await signIn('bob@example.com');
    await finishedGame(ann, bob, 6);
    for (let i = 0; i < 5; i++) {
      clock.t += 1000;
      app.manager.tickAll();
    }
    expect(store.findUserByEmail('ann@example.com')!.ratings!['6x4']!.games).toBe(1);
    expect(store.findUserByEmail('bob@example.com')!.ratings!['6x4']!.games).toBe(1);
  });

  it('the room says it is rated only when both players are signed in', async () => {
    const ann = await signIn('ann@example.com');
    const bob = await signIn('bob@example.com');
    const rated = await api('POST', '/api/rooms', { boardId: '6x4' }, ann);
    await api('POST', `/api/rooms/${rated.json.code}/join`, {}, bob);
    const v1 = (
      await api('GET', `/api/rooms/${rated.json.code}/state?token=${rated.json.token}&since=0`)
    ).json as unknown as RoomView;
    expect(v1.rated).toBe(true);
    const casual = await api('POST', '/api/rooms', { boardId: '6x4' }, ann);
    await api('POST', `/api/rooms/${casual.json.code}/join`, {});
    const v2 = (
      await api('GET', `/api/rooms/${casual.json.code}/state?token=${casual.json.token}&since=0`)
    ).json as unknown as RoomView;
    expect(v2.rated).toBe(false);
  });

  it('a game with a guest is not rated', async () => {
    const ann = await signIn('ann@example.com');
    await finishedGame(ann, undefined, 6);
    expect(store.findUserByEmail('ann@example.com')!.ratings).toBeUndefined();
  });

  it('a game that ends before 6 moves is not rated', async () => {
    const ann = await signIn('ann@example.com');
    const bob = await signIn('bob@example.com');
    await finishedGame(ann, bob, 2);
    expect(store.findUserByEmail('ann@example.com')!.ratings).toBeUndefined();
  });

  it('the top list is public and has names and ratings only', async () => {
    const r = await api('GET', '/api/ratings/top?board=6x4');
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ board: '6x4', top: [] });
    expect((await api('GET', '/api/ratings/top?board=%3Cb%3E')).status).toBe(400);
  });
});
