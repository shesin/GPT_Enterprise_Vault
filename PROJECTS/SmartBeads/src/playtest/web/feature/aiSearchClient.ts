import type { Move } from '../../../models/GameState';
import type { AiPlanRequest } from './aiSearch';
import type { AiWorkerRequest, AiWorkerResponse } from './aiSearchWorker';

/** Minimal Worker surface so tests can supply a fake without a browser. */
export interface AiWorkerLike {
  postMessage(msg: AiWorkerRequest): void;
  terminate(): void;
  onmessage: ((ev: { data: AiWorkerResponse }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export class AiSearchCancelled extends Error {
  constructor() {
    super('AI search cancelled');
  }
}

/**
 * Runs AI searches off the main thread. One request at a time.
 * cancel() terminates the worker only when a search is actually pending (a fresh one is created lazily).
 */
export class AiSearchClient {
  private worker: AiWorkerLike | null = null;
  private nextId = 1;
  private pending: {
    id: number;
    resolve: (p: Move[] | null) => void;
    reject: (e: Error) => void;
  } | null = null;

  constructor(private readonly makeWorker: () => AiWorkerLike) {}

  private ensureWorker(): AiWorkerLike {
    if (this.worker) return this.worker;
    const w = this.makeWorker();
    w.onmessage = (ev) => {
      const res = ev.data;
      const p = this.pending;
      if (!p || p.id !== res.id) return;
      this.pending = null;
      if (res.ok) p.resolve(res.path);
      else p.reject(new Error(res.error));
    };
    w.onerror = () => {
      const p = this.pending;
      this.pending = null;
      this.dropWorker();
      p?.reject(new Error('AI worker crashed'));
    };
    this.worker = w;
    return w;
  }

  private dropWorker(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  plan(req: AiPlanRequest): Promise<Move[] | null> {
    this.cancel();
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending = { id, resolve, reject };
      try {
        this.ensureWorker().postMessage({ id, req });
      } catch (err) {
        this.pending = null;
        this.dropWorker();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  cancel(): void {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    this.dropWorker();
    p.reject(new AiSearchCancelled());
  }

  isBusy(): boolean {
    return this.pending !== null;
  }
}
