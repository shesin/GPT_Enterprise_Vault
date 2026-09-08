import type { SelectAiOptions } from '../HonestAi';

/** Upper bound for HonestAi search in unit tests (prevents multi-minute hangs). */
export const HONEST_AI_TEST_BUDGET_MS = 800;

export function honestAiTestOpts(overrides: Partial<SelectAiOptions> = {}): SelectAiOptions {
  return {
    budgetMs: HONEST_AI_TEST_BUDGET_MS,
    rng: () => 0,
    ...overrides,
  };
}

/** Deadline for generateTurnEnds in tests on large boards. */
export function honestAiTurnEndsDeadlineMs(extraMs = 5_000): number {
  return Date.now() + extraMs;
}
