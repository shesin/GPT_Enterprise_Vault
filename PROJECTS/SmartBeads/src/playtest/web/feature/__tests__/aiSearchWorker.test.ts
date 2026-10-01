import { FeatureSession } from '../FeatureSession';
import { AiSearchCancelled, AiSearchClient, AiWorkerLike } from '../aiSearchClient';
import { AiWorkerRequest, AiWorkerResponse } from '../aiSearchWorker';
import { buildAiPlanRequest, emergencyLegalPath, planAiTurnPath } from '../aiTurnRunner';
import { searchAiPath } from '../aiSearch';
import { GameFeatureSettings } from '../GameFeatureSettings';

const settings: GameFeatureSettings = {
  mode: 'pve',
  aiLevel: 2,
  timer: 'off',
  tournamentTimer: 'off',
  shotClock: 'off',
  centerRule: 'off',
};

/** Stand-in for the browser Worker: structured-clones the request like postMessage does, then runs the real search. */
class FakeWorker implements AiWorkerLike {
  onmessage: ((ev: { data: AiWorkerResponse }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  terminated = false;
  hold = false;
  held: AiWorkerRequest | null = null;
  postMessage(msg: AiWorkerRequest): void {
    const cloned = structuredClone(msg);
    if (this.hold) {
      this.held = cloned;
      return;
    }
    setTimeout(() => {
      if (this.terminated) return;
      try {
        this.onmessage?.({ data: { id: cloned.id, ok: true, path: searchAiPath(cloned.req) } });
      } catch (e) {
        this.onmessage?.({ data: { id: cloned.id, ok: false, error: String(e) } });
      }
    }, 0);
  }
  terminate(): void {
    this.terminated = true;
  }
}

function blueToMove(): FeatureSession {
  const session = new FeatureSession('6x3x5', settings);
  const legal = session.getEngine().getLegalMoves();
  session.applyMove(legal[0]!);
  return session;
}

describe('AI search runs off the main thread (worker plumbing)', () => {
  it('the plan request survives structured clone and the clone gives a legal AI path', () => {
    const session = blueToMove();
    const req = buildAiPlanRequest(session);
    const clone = structuredClone(req);
    const path = searchAiPath(clone);
    expect(path?.length).toBeGreaterThan(0);
    const legal = session.getEngine().getLegalMoves();
    expect(legal.some((m) => m.from === path![0]!.from && m.to === path![0]!.to)).toBe(true);
  });

  it('client resolves a path through the (fake) worker and reuses it for the next search', async () => {
    const workers: FakeWorker[] = [];
    const client = new AiSearchClient(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    });
    const session = blueToMove();
    const a = await client.plan(buildAiPlanRequest(session));
    expect(a?.length).toBeGreaterThan(0);
    const b = await client.plan(buildAiPlanRequest(session));
    expect(b?.length).toBeGreaterThan(0);
    expect(workers).toHaveLength(1);
    expect(client.isBusy()).toBe(false);
  });

  it('cancel() terminates a pending search and rejects with AiSearchCancelled', async () => {
    const w = new FakeWorker();
    w.hold = true;
    const client = new AiSearchClient(() => w);
    const p = client.plan(buildAiPlanRequest(blueToMove()));
    expect(client.isBusy()).toBe(true);
    client.cancel();
    await expect(p).rejects.toBeInstanceOf(AiSearchCancelled);
    expect(w.terminated).toBe(true);
    expect(client.isBusy()).toBe(false);
  });

  it('cancel() with nothing pending does not terminate the worker', async () => {
    const w = new FakeWorker();
    const client = new AiSearchClient(() => w);
    await client.plan(buildAiPlanRequest(blueToMove()));
    client.cancel();
    expect(w.terminated).toBe(false);
  });

  it('a worker error response rejects (caller falls back to a logged main-thread search)', async () => {
    const w = new FakeWorker();
    w.postMessage = (msg) =>
      setTimeout(() => w.onmessage?.({ data: { id: msg.id, ok: false, error: 'boom' } }), 0);
    const client = new AiSearchClient(() => w);
    await expect(client.plan(buildAiPlanRequest(blueToMove()))).rejects.toThrow('boom');
  });

  it('a worker crash rejects and a fresh worker is created for the next search', async () => {
    const workers: FakeWorker[] = [];
    const client = new AiSearchClient(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    });
    workers.length = 0;
    const first = new FakeWorker();
    first.postMessage = () => setTimeout(() => first.onerror?.({}), 0);
    const c2 = new AiSearchClient(() => first);
    await expect(c2.plan(buildAiPlanRequest(blueToMove()))).rejects.toThrow('crashed');
    expect(first.terminated).toBe(true);
    // original client still healthy
    await expect(client.plan(buildAiPlanRequest(blueToMove()))).resolves.toBeTruthy();
  });
});

describe('AI emergency fallback is never silent', () => {
  it('logs an error when it substitutes the first legal hop', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const session = blueToMove();
    const path = emergencyLegalPath(session, new Error('simulated search bug'));
    expect(path).toHaveLength(1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not log when there are genuinely no legal moves', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const session = blueToMove();
    for (const p of session.getEngine().getState().board.intersections) p.occupant = undefined;
    expect(emergencyLegalPath(session, 'no moves')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('planAiTurnPath returns the real search result without logging on the normal path', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const path = planAiTurnPath(blueToMove());
    expect(path?.length).toBeGreaterThan(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
