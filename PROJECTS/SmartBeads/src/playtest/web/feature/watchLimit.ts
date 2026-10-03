/**
 * Watch AI stops by itself after a fixed time and asks "Still watching?" (A23), so a forgotten
 * tab does not run the AI for hours. Time is wall-clock, so a hidden or throttled tab still counts.
 */
export const WATCH_LIMIT_MS = 3 * 60_000;

export class WatchLimit {
  private since: number | null = null;

  constructor(
    private readonly limitMs: number = WATCH_LIMIT_MS,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** True once the limit has passed since the first call (or since the last continue). */
  expired(): boolean {
    const t = this.now();
    if (this.since === null) this.since = t;
    return t - this.since >= this.limitMs;
  }

  /** The viewer said "still watching": count another full period. */
  continueWatching(): void {
    this.since = this.now();
  }

  /** A new game starts a new period. */
  reset(): void {
    this.since = null;
  }
}
