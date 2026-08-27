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
