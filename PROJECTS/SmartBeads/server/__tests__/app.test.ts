import { WebSocket } from 'ws';
import { startApp, type RunningApp } from '../app';
import type { RoomView, ServerMessage } from '../protocol';

let app: RunningApp;
let base: string;
const clock = { t: 5_000_000 };

beforeAll(async () => {
  app = await startApp({ port: 0, now: () => clock.t, tickMs: 50 });
  base = `http://127.0.0.1:${app.port}`;
});
afterAll(async () => {
  await app.close();
});

async function post(path: string, body: unknown) {
  const r = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, json: (await r.json()) as Record<string, unknown> };
}

async function newGame(settings?: object) {
  const made = await post('/api/rooms', { boardId: '6x4', settings });
  const joined = await post(`/api/rooms/${made.json.code}/join`, {});
  return { code: made.json.code as string, red: made.json, blue: joined.json };
}

/** Collects every message a socket receives and lets a test wait for the next matching one. */
function listen(code: string, token: string) {
  const ws = new WebSocket(`ws://127.0.0.1:${app.port}/ws?code=${code}&token=${token}`);
  const messages: ServerMessage[] = [];
  const waiters: Array<() => void> = [];
  ws.on('message', (d) => {
    messages.push(JSON.parse(String(d)) as ServerMessage);
    waiters.splice(0).forEach((w) => w());
  });
  const until = async (pred: (m: ServerMessage) => boolean, ms = 3000): Promise<ServerMessage> => {
    const end = Date.now() + ms;
    for (;;) {
      const hit = messages.find(pred);
      if (hit) return hit;
      if (Date.now() > end) throw new Error('timed out waiting for a message');
      await new Promise<void>((r) => {
        waiters.push(r);
        setTimeout(r, 50);
      });
    }
  };
  const opened = new Promise<void>((r) => ws.on('open', () => r()));
  return { ws, messages, until, opened };
}

describe('HTTP API', () => {
  it('creates a room, then a second player joins; a third is refused', async () => {
    const made = await post('/api/rooms', { boardId: '6x4' });
    expect(made.status).toBe(200);
    expect(made.json.seat).toBe('RED');
    expect(made.json.boardId).toBe('6x4');
    expect(made.json.settings).toMatchObject({
      timer: expect.any(String),
      shotClock: expect.any(String),
    });
    expect(String(made.json.code)).toMatch(/^[A-Z2-9]{5}$/);
    const code = made.json.code as string;
    const j = await post(`/api/rooms/${code}/join`, {});
    expect(j.status).toBe(200);
    expect(j.json.seat).toBe('BLUE');
    expect(j.json.boardId).toBe('6x4');
    const third = await post(`/api/rooms/${code}/join`, {});
    expect(third.status).toBe(409);
    const lower = await post(`/api/rooms/${code.toLowerCase()}/join`, {});
    expect(lower.status).toBe(409); // codes are not case sensitive, the room is just full
  });

  it('rejects a board that is not open online and a missing room', async () => {
    expect((await post('/api/rooms', { boardId: '10x5' })).status).toBe(400);
    expect((await post('/api/rooms/ZZZZZ/join', {})).status).toBe(404);
  });

  it('polling: state needs a valid token, returns 204 when nothing changed, and a move bumps the version', async () => {
    const g = await newGame();
    const stateUrl = (token: string, since = 0) =>
      `${base}/api/rooms/${g.code}/state?token=${encodeURIComponent(token)}&since=${since}`;
    expect((await fetch(stateUrl('nope'))).status).toBe(403);

    const first = await fetch(stateUrl(g.red.token as string));
    expect(first.status).toBe(200);
    const v1 = (await first.json()) as RoomView;
    expect(v1.you).toBe('RED');
    expect(v1.started).toBe(true);
    expect((await fetch(stateUrl(g.red.token as string, v1.version))).status).toBe(204);

    const mv = v1.legalMoves[0]!;
    const act = await post(`/api/rooms/${g.code}/action`, {
      token: g.red.token,
      intent: { type: 'move', ...mv },
    });
    expect(act.status).toBe(200);
    const v2 = (await (
      await fetch(stateUrl(g.blue.token as string, v1.version))
    ).json()) as RoomView;
    expect(v2.you).toBe('BLUE');
    expect(v2.moveCount).toBe(1);
    expect(v2.currentPlayer).toBe('BLUE');
  });

  it('refuses an action from the wrong seat, with a bad token, or with an unknown type', async () => {
    const g = await newGame();
    const mv = (
      (await (
        await fetch(`${base}/api/rooms/${g.code}/state?token=${g.red.token}`)
      ).json()) as RoomView
    ).legalMoves[0]!;
    const wrongTurn = await post(`/api/rooms/${g.code}/action`, {
      token: g.blue.token,
      intent: { type: 'move', ...mv },
    });
    expect(wrongTurn.status).toBe(409);
    expect(wrongTurn.json.error).toBe('It is not your turn.');
    expect(
      (await post(`/api/rooms/${g.code}/action`, { token: 'x', intent: { type: 'resign' } }))
        .status,
    ).toBe(403);
    expect(
      (await post(`/api/rooms/${g.code}/action`, { token: g.red.token, intent: { type: 'hack' } }))
        .status,
    ).toBe(400);
  });

  it('a request body over 4 KB is refused', async () => {
    const r = await post('/api/rooms', { boardId: '6x4', pad: 'x'.repeat(10_000) });
    expect(r.status).toBe(413);
  });

  it('unknown API paths are 404', async () => {
    expect((await fetch(`${base}/api/nothing`)).status).toBe(404);
  });
});

describe('WebSocket', () => {
  it('both players get live state; a move by one reaches the other without polling', async () => {
    const g = await newGame();
    const red = listen(g.code, g.red.token as string);
    const blue = listen(g.code, g.blue.token as string);
    await Promise.all([red.opened, blue.opened]);

    const first = (await red.until((m) => m.type === 'state')) as { type: 'state'; view: RoomView };
    expect(first.view.you).toBe('RED');
    expect(first.view.started).toBe(true);
    const mv = first.view.legalMoves[0]!;

    red.ws.send(JSON.stringify({ type: 'intent', intent: { type: 'move', ...mv } }));
    const seen = (await blue.until((m) => m.type === 'state' && m.view.moveCount === 1)) as {
      type: 'state';
      view: RoomView;
    };
    expect(seen.view.you).toBe('BLUE');
    expect(seen.view.currentPlayer).toBe('BLUE');
    expect(seen.view.lastMove).toEqual({ ...mv, by: 'RED' });
    red.ws.close();
    blue.ws.close();
  });

  it('an illegal intent gets an error message and changes nothing', async () => {
    const g = await newGame();
    const blue = listen(g.code, g.blue.token as string);
    await blue.opened;
    blue.ws.send(JSON.stringify({ type: 'intent', intent: { type: 'move', from: 0, to: 1 } }));
    const err = (await blue.until((m) => m.type === 'error')) as { type: 'error'; message: string };
    expect(err.message).toBe('It is not your turn.');
    blue.ws.send('not json');
    expect(
      (
        (await blue.until((m) => m.type === 'error' && m.message === 'Bad message.')) as {
          message: string;
        }
      ).message,
    ).toBe('Bad message.');
    blue.ws.close();
  });

  it('a socket with a wrong token is told and closed', async () => {
    const g = await newGame();
    const bad = listen(g.code, 'wrong');
    const err = (await bad.until((m) => m.type === 'error')) as { message: string };
    expect(err.message).toBe('Not a player in this room.');
    await new Promise<void>((r) => bad.ws.on('close', () => r()));
  });

  it('the server ticks the clocks by itself and pushes the game-over to both players', async () => {
    const g = await newGame({ shotClock: '60' });
    const red = listen(g.code, g.red.token as string);
    const blue = listen(g.code, g.blue.token as string);
    await Promise.all([red.opened, blue.opened]);
    await red.until((m) => m.type === 'state');
    clock.t += 61_000; // time passes on the server clock only
    const over = (await blue.until((m) => m.type === 'state' && m.view.gameOver)) as {
      type: 'state';
      view: RoomView;
    };
    expect(over.view.winner).toBe('BLUE');
    expect(over.view.reason).toMatch(/Shot clock expired/);
    await red.until((m) => m.type === 'state' && m.view.gameOver);
    red.ws.close();
    blue.ws.close();
  });
});
