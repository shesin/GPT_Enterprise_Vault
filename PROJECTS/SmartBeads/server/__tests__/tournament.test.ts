import { AccountStore } from '../accounts/AccountStore';
import { Ratings } from '../accounts/Ratings';
import type { GameResult } from '../GameRoom';
import { RoomManager } from '../RoomManager';
import { bracketSize, firstRoundPairs, nextRoundPairs, seedOrder } from '../tournaments/bracket';
import { MAX_ENTRANTS, NO_SHOW_MS, TournamentService } from '../tournaments/TournamentService';

describe('bracket layout', () => {
  it('seeds meet in the classic order', () => {
    expect(seedOrder(2)).toEqual([1, 2]);
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it('rounds the size up to a power of two', () => {
    expect([2, 3, 4, 5, 8, 9].map(bracketSize)).toEqual([2, 4, 4, 8, 8, 16]);
  });

  it('first round: 4 players are 1v4 and 2v3', () => {
    expect(firstRoundPairs(['a', 'b', 'c', 'd'])).toEqual([
      ['a', 'd'],
      ['b', 'c'],
    ]);
  });

  it('byes go to the best seeds', () => {
    expect(firstRoundPairs(['a', 'b', 'c'])).toEqual([
      ['a', null],
      ['b', 'c'],
    ]);
    const five = firstRoundPairs(['a', 'b', 'c', 'd', 'e']);
    const byes = five.filter(([, y]) => y === null).map(([x]) => x);
    expect(byes).toEqual(['a', 'b', 'c']);
    expect(five).toContainEqual(['d', 'e']);
  });

  it('winners are paired in bracket order for the next round', () => {
    expect(nextRoundPairs(['a', 'b', 'c', 'd'])).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

const SETTINGS = { timer: '5', shotClock: '60' } as const;

function world() {
  const clock = { t: 50_000_000_000 };
  const store = new AccountStore();
  const manager = new RoomManager(() => clock.t);
  const ratings = new Ratings(store, () => clock.t);
  const svc = new TournamentService(store, manager, ratings, () => clock.t);
  manager.onFinished = (r) => svc.onGameFinished(r);
  const add = (id: string, elo = 1200) => {
    store.putUser({
      id,
      email: `${id}@example.com`,
      displayName: id,
      createdAt: 0,
      ratings: { '6x4': { elo, games: 10, wins: 0, losses: 0, draws: 0 } },
    });
    return id;
  };
  const open = (closesInMinutes = 10, settings: object = SETTINGS) => {
    const r = svc.create({ name: 'Cup', boardId: '6x4', settings, closesInMinutes });
    if (!r.ok) throw new Error(r.error);
    return r.tournament.id;
  };
  const close = () => {
    clock.t += 11 * 60_000;
    svc.tick();
  };
  const result = (code: string, winner: GameResult['winner'], users: GameResult['users']) =>
    ({ code, boardId: '6x4', winner, moveCount: 30, reason: null, users }) as GameResult;
  const matchOf = (id: string, round: number, i: number) =>
    store.getTournament(id)!.rounds[round]![i]!;
  return { clock, store, manager, svc, add, open, close, result, matchOf };
}

describe('creating and registering', () => {
  it('needs a name, a sensible closing time, an online board and a match or tournament timer', () => {
    const { svc } = world();
    const base = { name: 'Cup', boardId: '6x4', settings: SETTINGS, closesInMinutes: 10 };
    expect(svc.create({ ...base, name: '  ' })).toMatchObject({ ok: false, status: 400 });
    expect(svc.create({ ...base, closesInMinutes: 0 })).toMatchObject({ ok: false });
    expect(svc.create({ ...base, closesInMinutes: 'soon' })).toMatchObject({ ok: false });
    expect(svc.create({ ...base, boardId: '10x5' })).toMatchObject({ ok: false });
    expect(svc.create({ ...base, settings: { timer: 'off', shotClock: '60' } })).toMatchObject({
      ok: false,
    });
    expect(svc.create(base)).toMatchObject({ ok: true });
  });

  it('the shot clock is fixed by board (60, 90, 120 s) whatever the organiser asks for', () => {
    const { svc } = world();
    const make = (boardId: string, settings: object) => {
      const r = svc.create({ name: 'Cup', boardId, settings, closesInMinutes: 10 });
      if (!r.ok) throw new Error(r.error);
      return r.tournament.settings.shotClock;
    };
    expect(make('6x4', { timer: '5' })).toBe('60');
    expect(make('6x4', { timer: '5', shotClock: '30' })).toBe('60');
    expect(make('6x4', { timer: '5', shotClock: 'off' })).toBe('60');
    expect(make('8x4x6', { timer: '10' })).toBe('90');
    expect(make('16', { timer: '15' })).toBe('120');
  });

  it('registers once, can leave, and cannot join after sign-up closes', () => {
    const w = world();
    const id = w.open();
    const ann = w.add('ann');
    expect(w.svc.register(id, ann)).toEqual({ ok: true });
    expect(w.svc.register(id, ann)).toEqual({ ok: true });
    expect(w.store.getTournament(id)!.entries).toEqual(['ann']);
    expect(w.svc.unregister(id, ann)).toEqual({ ok: true });
    expect(w.store.getTournament(id)!.entries).toEqual([]);
    w.svc.register(id, ann);
    w.clock.t += 11 * 60_000;
    expect(w.svc.register(id, w.add('bob'))).toMatchObject({ ok: false, status: 409 });
  });

  it('holds at most 64 players', () => {
    const w = world();
    const id = w.open();
    for (let i = 0; i < MAX_ENTRANTS; i++)
      expect(w.svc.register(id, w.add(`p${i}`))).toEqual({ ok: true });
    expect(w.svc.register(id, w.add('late'))).toMatchObject({ ok: false, status: 409 });
  });
});

describe('closing sign-up', () => {
  it('cancels an event with fewer than 2 players', () => {
    const w = world();
    const id = w.open();
    w.svc.register(id, w.add('ann'));
    w.close();
    expect(w.store.getTournament(id)!.status).toBe('cancelled');
  });

  it('seeds by rating (ties by sign-up order) and gives each pairing a reserved room, the better seed Cream', () => {
    const w = world();
    const id = w.open();
    for (const [p, elo] of [
      ['dee', 1100],
      ['ann', 1500],
      ['cy', 1300],
      ['bob', 1300],
    ] as const) {
      w.svc.register(id, w.add(p, elo));
    }
    w.close();
    const t = w.store.getTournament(id)!;
    expect(t.status).toBe('running');
    expect(t.seeds).toEqual({ ann: 1, cy: 2, bob: 3, dee: 4 });
    expect(t.rounds[0]!.map((m) => [m.a, m.b])).toEqual([
      ['ann', 'dee'],
      ['cy', 'bob'],
    ]);
    const m = t.rounds[0]![0]!;
    const room = w.manager.get(m.roomCode!)!;
    expect(room.claim('ann')!.seat).toBe('RED');
    expect(room.claim('dee')!.seat).toBe('BLUE');
    expect(room.join('eve')).toBeNull();
  });

  it('an odd field gives the best seed a bye, who goes straight to round two', () => {
    const w = world();
    const id = w.open();
    for (const [p, elo] of [
      ['ann', 1500],
      ['bob', 1400],
      ['cy', 1300],
    ] as const) {
      w.svc.register(id, w.add(p, elo));
    }
    w.close();
    expect(w.matchOf(id, 0, 0)).toMatchObject({
      a: 'ann',
      b: null,
      status: 'done',
      winner: 'ann',
      how: 'bye',
    });
    expect(w.matchOf(id, 0, 1).status).toBe('live');
    expect(w.store.getTournament(id)!.rounds).toHaveLength(1);
    w.svc.onGameFinished(
      w.result(w.matchOf(id, 0, 1).roomCode!, 'RED', { RED: 'bob', BLUE: 'cy' }),
    );
    const t = w.store.getTournament(id)!;
    expect(t.rounds).toHaveLength(2);
    expect([t.rounds[1]![0]!.a, t.rounds[1]![0]!.b].sort()).toEqual(['ann', 'bob']);
  });
});

describe('playing the bracket', () => {
  function four() {
    const w = world();
    const id = w.open();
    for (const [p, elo] of [
      ['ann', 1500],
      ['bob', 1400],
      ['cy', 1300],
      ['dee', 1200],
    ] as const) {
      w.svc.register(id, w.add(p, elo));
    }
    w.close();
    return { w, id };
  }

  it('a player gets their own seat; strangers and finished players do not', () => {
    const { w, id } = four();
    const a = w.svc.play(id, 'ann');
    expect(a).toMatchObject({ ok: true, seat: 'RED', boardId: '6x4' });
    expect(w.svc.play(id, 'eve')).toMatchObject({ ok: false, status: 409 });
    expect(w.svc.play('nope', 'ann')).toMatchObject({ ok: false, status: 404 });
  });

  it('the winner advances; a champion is crowned after the final', () => {
    const { w, id } = four();
    w.svc.onGameFinished(
      w.result(w.matchOf(id, 0, 0).roomCode!, 'RED', { RED: 'ann', BLUE: 'dee' }),
    );
    expect(w.store.getTournament(id)!.rounds).toHaveLength(1);
    w.svc.onGameFinished(
      w.result(w.matchOf(id, 0, 1).roomCode!, 'BLUE', { RED: 'bob', BLUE: 'cy' }),
    );
    const final = w.matchOf(id, 1, 0);
    expect([final.a, final.b].sort()).toEqual(['ann', 'cy']);
    w.svc.onGameFinished(w.result(final.roomCode!, 'BLUE', { RED: 'ann', BLUE: 'cy' }));
    const t = w.store.getTournament(id)!;
    expect(t.status).toBe('finished');
    expect(t.champion).toBe('cy');
    expect(w.svc.get(id)!.champion).toBe('cy');
  });

  it('a drawn game is replayed with the colours swapped; a second draw sends the higher seed on', () => {
    const { w, id } = four();
    const first = w.matchOf(id, 0, 0);
    const code1 = first.roomCode!;
    w.svc.onGameFinished(w.result(code1, 'DRAW', { RED: 'ann', BLUE: 'dee' }));
    const again = w.matchOf(id, 0, 0);
    expect(again.status).toBe('live');
    expect(again.roomCode).not.toBe(code1);
    const room = w.manager.get(again.roomCode!)!;
    expect(room.claim('dee')!.seat).toBe('RED'); // swapped
    w.svc.onGameFinished(w.result(again.roomCode!, 'DRAW', { RED: 'dee', BLUE: 'ann' }));
    expect(w.matchOf(id, 0, 0)).toMatchObject({ status: 'done', winner: 'ann', how: 'draw-seed' });
  });

  it('an unrelated finished game changes nothing', () => {
    const { w, id } = four();
    w.svc.onGameFinished(w.result('ZZZZZ', 'RED', { RED: 'ann', BLUE: 'dee' }));
    expect(w.matchOf(id, 0, 0).status).toBe('live');
  });

  it('a room finished through real play (resign) advances the winner', () => {
    const { w, id } = four();
    const m = w.matchOf(id, 0, 0);
    const room = w.manager.get(m.roomCode!)!;
    const ann = w.svc.play(id, 'ann');
    const dee = w.svc.play(id, 'dee');
    if (!ann.ok || !dee.ok) throw new Error('claim failed');
    expect(room.act('RED', { type: 'resign' })).toEqual({ ok: true });
    expect(room.act('BLUE', { type: 'resignRespond', acceptDraw: false })).toEqual({ ok: true });
    expect(w.matchOf(id, 0, 0)).toMatchObject({ status: 'done', winner: 'dee', how: 'played' });
  });
});

describe('no-shows, restarts and the organiser', () => {
  function two() {
    const w = world();
    const id = w.open();
    w.svc.register(id, w.add('ann', 1500));
    w.svc.register(id, w.add('bob', 1400));
    w.close();
    return { w, id };
  }

  it('the player who arrived wins when the other does not come', () => {
    const { w, id } = two();
    w.svc.play(id, 'bob');
    w.clock.t += NO_SHOW_MS + 1000;
    w.svc.tick();
    expect(w.matchOf(id, 0, 0)).toMatchObject({ winner: 'bob', how: 'no-show' });
    expect(w.store.getTournament(id)!.status).toBe('finished');
  });

  it('when neither comes the higher seed moves on', () => {
    const { w, id } = two();
    w.clock.t += NO_SHOW_MS + 1000;
    w.svc.tick();
    expect(w.matchOf(id, 0, 0)).toMatchObject({ winner: 'ann', how: 'no-show' });
  });

  it('nobody is sent home before the deadline, or once the game has started', () => {
    const { w, id } = two();
    w.clock.t += NO_SHOW_MS - 1000;
    w.svc.tick();
    expect(w.matchOf(id, 0, 0).status).toBe('live');
    w.svc.play(id, 'ann');
    w.svc.play(id, 'bob'); // both here: the game is on
    w.clock.t += 60 * 60_000;
    w.svc.tick();
    expect(w.matchOf(id, 0, 0).status).toBe('live');
  });

  it('after a server restart a live match gets a fresh room', () => {
    const { w, id } = two();
    const svc2 = new TournamentService(
      w.store,
      new RoomManager(() => w.clock.t),
      undefined,
      () => w.clock.t,
    );
    svc2.tick();
    const fresh = w.matchOf(id, 0, 0);
    expect(fresh.status).toBe('live');
    expect(fresh.roomCode).toBeDefined();
    expect(svc2.play(id, 'ann')).toMatchObject({ ok: true });
  });

  it('the organiser can decide a stuck match, but only for a side that exists', () => {
    const { w, id } = two();
    const m = w.matchOf(id, 0, 0);
    expect(w.svc.adminAdvance(id, m.id, 'x')).toMatchObject({ ok: false, status: 400 });
    expect(w.svc.adminAdvance(id, 'nope', 'a')).toMatchObject({ ok: false, status: 404 });
    expect(w.svc.adminAdvance(id, m.id, 'b')).toEqual({ ok: true });
    expect(w.matchOf(id, 0, 0)).toMatchObject({ winner: 'bob', how: 'admin' });
    expect(w.svc.adminAdvance(id, m.id, 'a')).toMatchObject({ ok: false });
  });

  it('cancel stops an event, once', () => {
    const { w, id } = two();
    expect(w.svc.cancel(id)).toEqual({ ok: true });
    expect(w.svc.cancel(id)).toMatchObject({ ok: false, status: 409 });
    expect(w.svc.play(id, 'ann')).toMatchObject({ ok: false });
  });
});

describe('what players see', () => {
  it('shows names, never ids or e-mail addresses, and the viewer’s own match', () => {
    const w = world();
    const id = w.open();
    w.svc.register(id, w.add('ann', 1500));
    w.svc.register(id, w.add('bob', 1400));
    w.close();
    const v = w.svc.get(id, 'ann')!;
    expect(v.registered).toBe(true);
    expect(v.myMatch).toEqual({ id: 'r1m1', round: 1, opponent: 'bob', status: 'ready' });
    expect(v.bracket[0]![0]).toMatchObject({ a: 'ann', b: 'bob', status: 'live' });
    const text = JSON.stringify(w.svc.list());
    expect(text).not.toContain('@example.com');
    expect(w.svc.get(id)!.registered).toBe(false);
    expect(w.svc.get(id)!.myMatch).toBeNull();
  });
});
