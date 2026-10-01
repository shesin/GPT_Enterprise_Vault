/// <reference lib="webworker" />
// AI search Web Worker: keeps the page responsive while the AI thinks (search is synchronous CPU work).
import { AiPlanRequest, searchAiPath } from './aiSearch';
import type { Move } from '../../../models/GameState';

export type AiWorkerRequest = { id: number; req: AiPlanRequest };
export type AiWorkerResponse =
  { id: number; ok: true; path: Move[] | null } | { id: number; ok: false; error: string };

const ctx = self as unknown as {
  onmessage: ((ev: MessageEvent<AiWorkerRequest>) => void) | null;
  postMessage: (msg: AiWorkerResponse) => void;
};

ctx.onmessage = (ev) => {
  const { id, req } = ev.data;
  try {
    ctx.postMessage({ id, ok: true, path: searchAiPath(req) });
  } catch (err) {
    ctx.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
