import { WebSocket } from 'ws';
import { startApp, type RunningApp } from '../../../../../server/app';
import type { RoomView } from '../../../../../server/protocol';
import { resolveEngineVariant } from '../../../../config/BoardCatalog';
import { FeatureSession } from '../../feature/FeatureSession';
import { OnlineClient, type SocketLike } from '../OnlineClient';
import { snapshotFromView } from '../applyOnlineView';
import { loadOnlineSession, resumeOnlineGame, saveOnlineSession } from '../onlineResume';

let app: RunningApp;
let base: string;
const clock = { t: 9_000_000 };

beforeAll(async () => {
  app = await startApp({ port: 0, now: () => clock.t, tickMs: 50 });
  base = `http://127.0.0.1:${app.port}`;
});
afterAll(async () => {
  await app.close();
});

const wsFactory = (url: string): SocketLike => new WebSocket(url) as unknown as SocketLike;
const failingSocket = (): SocketLike => {
  throw new Error('no websockets on this host');
};

async function waitFor<T>(get: () => T | undefined, ms = 4000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = get();
    if (v !== undefined) return v;
    if (Date.now() > end) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 25));
  }
}

function pair(createSocket?: (u: string) => SocketLike) {
  const opts = { baseUrl: base, createSocket, pollMs: 40, socketTimeoutMs: 400 };
  const a = new OnlineClient(opts);
  const b = new OnlineClient(opts);
  const viewsA: RoomView[] = [];
  const viewsB: RoomView[] = [];
  a.onView = (v) => viewsA.push(v);
  b.onView = (v) => viewsB.push(v);
  return { a, b, viewsA, viewsB };
}

async function setup(createSocket?: (u: string) => SocketLike, settings?: object) {
  const p = pair(createSocket);
  const made = await p.a.createRoom('6x4', settings);
  if ('error' in made) throw new Error(made.error);
  const joined = await p.b.joinRoom(made.session.code);
  if ('error' in joined) throw new Error(joined.error);
  p.a.connect();
  p.b.connect();
  return { ...p, code: made.session.code };
}

describe('OnlineClient over a WebSocket', () => {
  it('both clients go live and a move by one arrives at the other', async () => {
    const { a, b, viewsA, viewsB } = await setup(wsFactory);
    const first = await waitFor(() => viewsA.find((v) => v.started));
    await waitFor(() => viewsB.find((v) => v.started));
    expect(a.getStatus()).toBe('live');
    expect(first.you).toBe('RED');
    const mv = first.legalMoves[0]!;
    expect(await a.sendIntent({ type: 'move', ...mv })).toEqual({ ok: true });
    const seen = await waitFor(() => viewsB.find((v) => v.moveCount === 1));
    expect(seen.you).toBe('BLUE');
    expect(seen.occupants[mv.to]).toBe('RED');
    a.close();
    b.close();
  });

  it('a refused intent comes back as an error message', async () => {
    const { a, b, viewsB } = await setup(wsFactory);
    const errors: string[] = [];
    b.onError = (m) => errors.push(m);
    const v = await waitFor(() => viewsB.find((x) => x.started));
    const mv = v.legalMoves[0]!;
    await b.sendIntent({ type: 'move', ...mv }); // BLUE tries to open: not its turn
    await waitFor(() => errors[0]);
    expect(errors[0]).toBe('It is not your turn.');
    a.close();
    b.close();
  });
});

describe('OnlineClient falls back to polling', () => {
  it('works when WebSockets are impossible (constructor throws)', async () => {
    const { a, b, viewsA, viewsB } = await setup(failingSocket);
    await waitFor(() => viewsA.find((v) => v.started));
    expect(a.getStatus()).toBe('polling');
    const mv = (await waitFor(() => viewsA.find((v) => v.started)))!.legalMoves[0]!;
    expect(await a.sendIntent({ type: 'move', ...mv })).toEqual({ ok: true });
    const seen = await waitFor(() => viewsB.find((v) => v.moveCount === 1));
    expect(seen.currentPlayer).toBe('BLUE');
    a.close();
    b.close();
  });

  it('works when the socket never opens (timeout), and when no socket factory is given', async () => {
    const hang = (): SocketLike => ({
      readyState: 0,
      send() {},
      close() {},
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
    });
    for (const factory of [hang, undefined]) {
      const { a, b, viewsA } = await setup(factory);
      await waitFor(() => viewsA.find((v) => v.started));
      expect(['polling', 'connecting']).toContain(a.getStatus());
      a.close();
      b.close();
    }
  });

  it('a refused polling action returns the server reason', async () => {
    const { a, b, viewsB } = await setup(failingSocket);
    const v = await waitFor(() => viewsB.find((x) => x.started));
    const r = await b.sendIntent({ type: 'move', ...v.legalMoves[0]! });
    expect(r).toEqual({ error: 'It is not your turn.' });
    a.close();
    b.close();
  });

  it('create/join report server errors', async () => {
    const c = new OnlineClient({ baseUrl: base });
    expect(await c.createRoom('10x5')).toMatchObject({
      error: expect.stringMatching(/open on these boards/),
    });
    expect(await c.joinRoom('ZZZZZ')).toEqual({ error: 'No room with that code.' });
    const unreachable = new OnlineClient({ baseUrl: 'http://127.0.0.1:1' });
    expect(await unreachable.createRoom('6x4')).toEqual({ error: 'Cannot reach the game server.' });
  });

  it('a dropped connection is closed cleanly when the room is gone', async () => {
    const { a, b } = await setup(failingSocket);
    const errors: string[] = [];
    a.onError = (m) => errors.push(m);
    a.resume({
      code: 'ZZZZZ',
      token: 'x',
      seat: 'RED',
      boardId: '6x4',
      settings: { timer: 'off', tournamentTimer: 'off', shotClock: 'off', centerRule: 'off' },
    });
    a.close();
    a.connect();
    await waitFor(() => errors[0]);
    expect(errors[0]).toBe('This game is no longer available.');
    expect(a.getStatus()).toBe('closed');
    b.close();
  });
});

describe('snapshotFromView (server state mirrored into the local session)', () => {
  function viewOf(overrides: Partial<RoomView> = {}): RoomView {
    const s = new FeatureSession(resolveEngineVariant('6x4'), {
      mode: 'pvp',
      aiLevel: 2,
      timer: 'off',
      tournamentTimer: 'off',
      shotClock: 'off',
      centerRule: 'off',
    });
    s.reset();
    const snap = s.exportSnapshot();
    return {
      code: 'ABCDE',
      version: 3,
      boardId: '6x4',
      settings: { timer: 'off', tournamentTimer: 'off', shotClock: 'off', centerRule: 'off' },
      seats: { RED: true, BLUE: true },
      you: 'RED',
      started: true,
      currentPlayer: 'RED',
      moveCount: 0,
      captures: { RED: 0, BLUE: 0 },
      occupants: snap.engineSnap.state.board.intersections.map((n) => n.occupant ?? null),
      chainPieceId: null,
      legalMoves: [],
      lastMove: null,
      clocks: { shotRemaining: 0, shotLimit: 0, matchRemaining: 0, p1: 0, p2: 0 },
      gameOver: false,
      winner: null,
      reason: null,
      pendingResign: null,
      ...overrides,
    };
  }

  function localSession() {
    const s = new FeatureSession(resolveEngineVariant('6x4'), {
      mode: 'pvp',
      aiLevel: 2,
      timer: 'off',
      tournamentTimer: 'off',
      shotClock: 'off',
      centerRule: 'off',
    });
    s.reset();
    return s;
  }

  it('after a server move the local board matches the server board, turn and captures', () => {
    const s = localSession();
    const v = viewOf();
    const mv = s.getEngine().getLegalMoves()[0]!;
    const occ = [...v.occupants];
    occ[mv.to] = occ[mv.from]!;
    occ[mv.from] = null;
    const view = viewOf({
      occupants: occ,
      currentPlayer: 'BLUE',
      moveCount: 1,
      captures: { RED: 1, BLUE: 0 },
    });
    s.loadSnapshot(snapshotFromView(s.exportSnapshot(), view));
    const st = s.getEngine().getState();
    expect(st.board.intersections.map((n) => n.occupant ?? null)).toEqual(occ);
    expect(st.currentPlayer).toBe('BLUE');
    expect(st.captures.RED).toBe(1);
    expect(s.getMoveCount()).toBe(1);
  });

  it('clocks come from the server', () => {
    const s = localSession();
    const view = viewOf({
      clocks: { shotRemaining: 42, shotLimit: 60, matchRemaining: 99, p1: 7, p2: 8 },
    });
    s.loadSnapshot(snapshotFromView(s.exportSnapshot(), view));
    expect(s.getP1Clock()).toBe(7);
    expect(s.getP2Clock()).toBe(8);
    expect(s.getGlobalMatchRemaining()).toBe(99);
    expect(s.getShotRemaining()).toBe(42);
  });

  it('a server game-over shows the server winner and reason (and marks clock endings)', () => {
    const s = localSession();
    const view = viewOf({ gameOver: true, winner: 'BLUE', reason: 'Shot clock expired.' });
    s.loadSnapshot(snapshotFromView(s.exportSnapshot(), view));
    expect(s.isGameOver()).toBe(true);
    expect(s.getDisplayedWinner()).toBe('BLUE');
    expect(s.getDisplayedReason()).toBe('Shot clock expired.');
    expect(s.endedByClock()).toBe(true);
    expect(s.getUiState()).toBe('game_over');
  });

  it('a capture in progress on my turn selects the chain bead; on the other side it selects nothing', () => {
    const s = localSession();
    const mine = snapshotFromView(
      s.exportSnapshot(),
      viewOf({ chainPieceId: 5, currentPlayer: 'RED', you: 'RED' }),
    );
    expect(mine.selectedId).toBe(5);
    expect(mine.uiState).toBe('chain');
    const theirs = snapshotFromView(
      s.exportSnapshot(),
      viewOf({ chainPieceId: 5, currentPlayer: 'RED', you: 'BLUE' }),
    );
    expect(theirs.selectedId).toBeNull();
  });
});

describe('rejoin after a page reload (onlineResume)', () => {
  const mem = new Map<string, string>();
  beforeAll(() => {
    (globalThis as unknown as { sessionStorage: unknown }).sessionStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  });
  beforeEach(() => mem.clear());
  afterAll(() => {
    delete (globalThis as unknown as { sessionStorage?: unknown }).sessionStorage;
  });

  it('saves and loads a session; garbage is ignored', () => {
    expect(loadOnlineSession()).toBeNull();
    const session = {
      code: 'ABCDE',
      token: 'sometokenvalue123',
      seat: 'RED' as const,
      boardId: '6x4' as const,
      settings: {
        timer: 'off',
        tournamentTimer: 'off',
        shotClock: 'off',
        centerRule: 'off',
      } as const,
    };
    saveOnlineSession(session);
    expect(loadOnlineSession()).toEqual(session);
    mem.set('sb-online-session', '{"code":"abc","token":"x"}');
    expect(loadOnlineSession()).toBeNull();
    mem.set('sb-online-session', 'not json');
    expect(loadOnlineSession()).toBeNull();
    saveOnlineSession(null);
    expect(mem.has('sb-online-session')).toBe(false);
  });

  it('a live room is resumed with the same seat and keeps its game', async () => {
    const p = await setup(wsFactory);
    const first = await waitFor(() => p.viewsA.find((v) => v.started));
    await p.a.sendIntent({ type: 'move', ...first.legalMoves[0]! });
    await waitFor(() => p.viewsB.find((v) => v.moveCount === 1));
    saveOnlineSession(p.b.getSession());
    p.b.close();

    const game = await resumeOnlineGame(
      () => new OnlineClient({ baseUrl: base, createSocket: wsFactory }),
      base,
    );
    expect(game).not.toBeNull();
    expect(game!.session.seat).toBe('BLUE');
    const views: RoomView[] = [];
    game!.client.onView = (v) => views.push(v);
    game!.client.connect();
    const back = await waitFor(() => views[0]);
    expect(back.you).toBe('BLUE');
    expect(back.moveCount).toBe(1);
    game!.client.close();
    p.a.close();
  });

  it('a room that no longer exists is forgotten, not resumed', async () => {
    saveOnlineSession({
      code: 'ZZZZZ',
      token: 'sometokenvalue123',
      seat: 'RED',
      boardId: '6x4',
      settings: { timer: 'off', tournamentTimer: 'off', shotClock: 'off', centerRule: 'off' },
    });
    expect(await resumeOnlineGame(() => new OnlineClient({ baseUrl: base }), base)).toBeNull();
    expect(loadOnlineSession()).toBeNull();
  });

  it('an unreachable server keeps the saved room for another try', async () => {
    saveOnlineSession({
      code: 'ABCDE',
      token: 'sometokenvalue123',
      seat: 'RED',
      boardId: '6x4',
      settings: { timer: 'off', tournamentTimer: 'off', shotClock: 'off', centerRule: 'off' },
    });
    expect(await resumeOnlineGame(() => new OnlineClient(), 'http://127.0.0.1:1')).toBeNull();
    expect(loadOnlineSession()).not.toBeNull();
  });
});
