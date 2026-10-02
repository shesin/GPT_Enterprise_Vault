/**
 * Shell timer interval policy.
 * Clocks must keep counting during AI think and piece animation.
 * Freezing on aiThinking previously made Ebony immune to the shot clock in PvE.
 */
export function shellTimerShouldSkip(opts: {
  gameOver: boolean;
  aiThinking: boolean;
  animating: boolean;
}): boolean {
  void opts.aiThinking;
  void opts.animating;
  return opts.gameOver;
}

/**
 * Whole clock ticks owed for the real time that passed since the last timer callback.
 * Browsers slow or pause timers in hidden tabs, so clocks follow real time, not callback count.
 * Rounds to the nearest second (a 990 ms callback still counts as 1 tick) and carries the
 * remainder, so no real time is lost or double counted.
 */
export function wallClockTicks(
  elapsedMs: number,
  carryMs: number,
): { ticks: number; carryMs: number } {
  const total = Math.max(0, elapsedMs) + carryMs;
  const ticks = Math.max(0, Math.round(total / 1000));
  return { ticks, carryMs: total - ticks * 1000 };
}
