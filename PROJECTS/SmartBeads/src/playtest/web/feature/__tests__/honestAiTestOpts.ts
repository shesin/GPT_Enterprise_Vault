import type { SelectAiOptions } from '../HonestAi';

/** Deterministic options for HonestAi unit tests: the seeded rng always picks the first tied move. */
export function honestAiTestOpts(overrides: Partial<SelectAiOptions> = {}): SelectAiOptions {
  return {
    rng: () => 0,
    ...overrides,
  };
}
