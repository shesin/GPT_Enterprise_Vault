import { GameRoom } from '../GameRoom';
import type { RoomSettings } from '../protocol';

const OFF: RoomSettings = {
  timer: 'off',
  tournamentTimer: 'off',
  shotClock: 'off',
  centerRule: 'off',
};

function startedRoom(settings: RoomSettings = OFF, board: '6x4' | '8x4x6' | '16' = '6x4') {
  const clock = { t: 1_000_000 };
  const room = new GameRoom('ABCDE', board, settings, () => clock.t);
  const red = room.join()!;
  const blue = room.join()!;
  return { room, clock, red, blue };
}

describe('GameRoom.validate', () => {
  it('accepts the launch boards with their defaults', () => {
    for (const b of ['6x4', '8x4x6', '16']) {
      const r = GameRoom.validate(b, undefined);
      expect(typeof r).toBe('object');
    }
  });

  it('rejects boards that are not open online', () => {
    expect(GameRoom.validate('10x5', undefined)).toMatch(/open on these boards only/);
    expect(GameRoom.validate('nope', undefined)).toMatch(/open on these boards only/);
    expect(GameRoom.validate(7, undefined)).toMatch(/open on these boards only/);
  });

  it('rejects settings the board does not offer, both timers at once, and a centre rule without a timer', () => {
    expect(GameRoom.validate('6x4', { shotClock: '45' as never })).toMatch(/shot clock/);
    expect(GameRoom.validate('6x4', { timer: '2', tournamentTimer: '2' })).toMatch(/either/);
    expect(GameRoom.validate('6x4', { timer: 'off', centerRule: 'endgame' })).toMatch(
      /centre rule/,
    );
  });
});

describe('GameRoom seats', () => {
  it('gives RED then BLUE, then refuses, and starts only when both are seated', () => {
    const clock = { t: 0 };
    const room = new GameRoom('X', '6x4', OFF, () => clock.t);
    expect(room.view('RED').started).toBe(false);
    const a = room.join()!;
    expect(a.seat).toBe('RED');
    expect(room.view('RED').started).toBe(false);
    const b = room.join()!;
    expect(b.seat).toBe('BLUE');
    expect(room.view('RED').started).toBe(true);
    expect(room.join()).toBeNull();
    expect(a.token).not.toBe(b.token);
  });

  it('maps a token back to its seat and nothing else', () => {
    const { room, red, blue } = startedRoom();
    expect(room.seatFor(red.token)).toBe('RED');
    expect(room.seatFor(blue.token)).toBe('BLUE');
    expect(room.seatFor('guess')).toBeNull();
    expect(room.seatFor(undefined)).toBeNull();
  });

  it('nobody can move before the second player arrives', () => {
    const room = new GameRoom('X', '6x4', OFF, () => 0);
    room.join();
    const m = room.view('RED').legalMoves;
    expect(m).toEqual([]);
    expect(room.act('RED', { type: 'move', from: 0, to: 1 })).toEqual({
      ok: false,
      error: 'Waiting for the second player.',
    });
  });
});

describe('GameRoom moves', () => {
  it('only the side to move can move, and only legally', () => {
    const { room } = startedRoom();
    const view = room.view('RED');
    expect(view.currentPlayer).toBe('RED');
    expect(view.legalMoves.length).toBeGreaterThan(0);
    const mv = view.legalMoves[0]!;

    expect(room.act('BLUE', { type: 'move', from: mv.from, to: mv.to })).toEqual({
      ok: false,
      error: 'It is not your turn.',
    });
    expect(room.act('RED', { type: 'move', from: 0, to: 0 })).toEqual({
      ok: false,
      error: 'That move is not legal.',
    });
    expect(room.act('RED', { type: 'move', from: 1.5, to: 2 } as never)).toEqual({
      ok: false,
      error: 'Bad move.',
    });

    const before = room.getVersion();
    expect(room.act('RED', { type: 'move', from: mv.from, to: mv.to })).toEqual({ ok: true });
    const after = room.view('BLUE');
    expect(after.moveCount).toBe(1);
    expect(after.currentPlayer).toBe('BLUE');
    expect(after.lastMove).toEqual({ from: mv.from, to: mv.to, by: 'RED' });
    expect(room.getVersion()).toBeGreaterThan(before);
    expect(after.occupants[mv.to]).toBe('RED');
    expect(after.occupants[mv.from]).toBeNull();
  });

  it('a rejected action does not change the game or its version', () => {
    const { room } = startedRoom();
    const v = room.getVersion();
    room.act('BLUE', { type: 'move', from: 0, to: 1 });
    room.act('RED', { type: 'move', from: 0, to: 0 });
    expect(room.getVersion()).toBe(v);
    expect(room.view('RED').moveCount).toBe(0);
  });

  it('finishChain with no capture in progress is refused', () => {
    const { room } = startedRoom();
    expect(room.act('RED', { type: 'finishChain' })).toEqual({
      ok: false,
      error: 'There is no capture to finish.',
    });
  });

  it('plays two turns in a row between both seats', () => {
    const { room } = startedRoom();
    const m1 = room.view('RED').legalMoves[0]!;
    room.act('RED', { type: 'move', ...m1 });
    const m2 = room.view('BLUE').legalMoves[0]!;
    expect(room.act('BLUE', { type: 'move', ...m2 })).toEqual({ ok: true });
    expect(room.view('RED').moveCount).toBe(2);
    expect(room.view('RED').currentPlayer).toBe('RED');
  });

  it('views are per seat and legal moves are empty after the game ends', () => {
    const { room } = startedRoom();
    expect(room.view('RED').you).toBe('RED');
    expect(room.view('BLUE').you).toBe('BLUE');
    room.act('RED', { type: 'resign' });
    room.act('BLUE', { type: 'resignRespond', acceptDraw: true });
    expect(room.view('RED').legalMoves).toEqual([]);
  });
});

describe('GameRoom clocks (server is the clock authority)', () => {
  it('the shot clock ends the game on the side to move, even if the whole gap arrives in one tick', () => {
    const { room, clock } = startedRoom({ ...OFF, shotClock: '60' });
    expect(room.view('RED').clocks.shotRemaining).toBe(60);
    clock.t += 61_000; // one callback after a long gap (throttled server, laptop sleep)
    expect(room.tick()).toBe(true);
    const v = room.view('RED');
    expect(v.gameOver).toBe(true);
    expect(v.winner).toBe('BLUE');
    expect(v.reason).toMatch(/Shot clock expired/);
  });

  it('a move after the clock ran out is refused: the clock is settled before the move is judged', () => {
    const { room, clock } = startedRoom({ ...OFF, shotClock: '60' });
    const m = room.view('RED').legalMoves[0]!;
    clock.t += 61_000;
    expect(room.act('RED', { type: 'move', ...m })).toEqual({
      ok: false,
      error: 'The game is over.',
    });
    expect(room.view('RED').winner).toBe('BLUE');
  });

  it('a move inside the limit restarts the shot clock for the next player', () => {
    const { room, clock } = startedRoom({ ...OFF, shotClock: '60' });
    clock.t += 30_000;
    const m = room.view('RED').legalMoves[0]!;
    room.act('RED', { type: 'move', ...m });
    expect(room.view('BLUE').clocks.shotRemaining).toBe(60);
    clock.t += 59_000;
    room.tick();
    expect(room.view('BLUE').gameOver).toBe(false);
  });

  it('the tournament timer is per player: only the side to move loses time', () => {
    const { room, clock } = startedRoom({ ...OFF, tournamentTimer: '2' });
    const start = room.view('RED').clocks;
    clock.t += 10_000;
    room.tick();
    const c = room.view('RED').clocks;
    expect(start.p1 - c.p1).toBe(10);
    expect(start.p2 - c.p2).toBe(0);
  });

  it('the match timer running out ends the game with the timer reason', () => {
    const { room, clock } = startedRoom({ ...OFF, timer: '2' });
    clock.t += 125_000;
    room.tick();
    const v = room.view('RED');
    expect(v.gameOver).toBe(true);
    expect(v.reason).toMatch(/Timer expired/);
  });

  it('clocks do not run before the second player joins', () => {
    const clock = { t: 0 };
    const room = new GameRoom('X', '6x4', { ...OFF, shotClock: '60' }, () => clock.t);
    room.join();
    clock.t += 500_000;
    expect(room.tick()).toBe(false);
    room.join();
    expect(room.view('RED').clocks.shotRemaining).toBe(60);
    expect(room.view('RED').gameOver).toBe(false);
  });

  it('ordinary 1 s ticks with jitter count exactly the elapsed seconds', () => {
    const { room, clock } = startedRoom({ ...OFF, shotClock: '120' });
    for (const dt of [990, 1012, 1003, 988, 1007]) {
      clock.t += dt;
      room.tick();
    }
    expect(room.view('RED').clocks.shotRemaining).toBe(115);
  });
});

describe('GameRoom resignation', () => {
  it('offer, then the opponent declines: the opponent wins', () => {
    const { room } = startedRoom();
    expect(room.act('RED', { type: 'resign' })).toEqual({ ok: true });
    expect(room.view('BLUE').pendingResign).toBe('RED');
    expect(room.act('RED', { type: 'resignRespond', acceptDraw: true })).toMatchObject({
      ok: false,
    });
    expect(room.act('BLUE', { type: 'resignRespond', acceptDraw: false })).toEqual({ ok: true });
    const v = room.view('RED');
    expect(v.gameOver).toBe(true);
    expect(v.winner).toBe('BLUE');
    expect(v.pendingResign).toBeNull();
  });

  it('the opponent accepts: a draw', () => {
    const { room } = startedRoom();
    room.act('RED', { type: 'resign' });
    room.act('BLUE', { type: 'resignRespond', acceptDraw: true });
    expect(room.view('RED').winner).toBe('DRAW');
  });

  it('you can resign only on your turn, and no move can be made while an offer is open', () => {
    const { room } = startedRoom();
    expect(room.act('BLUE', { type: 'resign' })).toMatchObject({ ok: false });
    room.act('RED', { type: 'resign' });
    const m = room.view('RED').legalMoves[0]!;
    expect(room.act('RED', { type: 'move', ...m })).toMatchObject({ ok: false });
  });

  it('answering when there is no offer is refused', () => {
    const { room } = startedRoom();
    expect(room.act('BLUE', { type: 'resignRespond', acceptDraw: true })).toMatchObject({
      ok: false,
    });
  });
});

describe('GameRoom unanswered resignation offer', () => {
  it('lapses after two minutes so a silent opponent cannot freeze the game', () => {
    const { room, clock } = startedRoom();
    expect(room.act('RED', { type: 'resign' })).toEqual({ ok: true });
    clock.t += 119_000;
    room.tick();
    expect(room.view('RED').pendingResign).toBe('RED');
    clock.t += 2_000;
    room.tick();
    expect(room.view('RED').pendingResign).toBeNull();
    expect(room.act('BLUE', { type: 'resignRespond', acceptDraw: true })).toMatchObject({
      ok: false,
    });
    const first = room.view('RED').legalMoves[0]!;
    expect(room.act('RED', { type: 'move', from: first.from, to: first.to })).toEqual({ ok: true });
  });
});
