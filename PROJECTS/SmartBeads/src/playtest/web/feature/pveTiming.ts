/** Slide flight on canvas (ms). Same as SHOLO_GUTI_WITH_FEATURE.html. */
export const HUMAN_SLIDE_ANIM_MS = 200;
/** Jump flight on canvas (ms). Same as prototype. */
export const HUMAN_JUMP_ANIM_MS = 280;
/**
 * Artificial pause before AI search — zero: search starts as soon as the prior ply allows.
 * Level think budgets (HonestAi) are the only intentional AI timing.
 */
export const AI_REPLY_DELAY_MS = 0;

/** Main-thread Medium/Hard search must return within this budget or fall back to scored-so-far. */
export const AI_THINK_BUDGET_MS = 800;

/** After dest click: animation has landed, AI has not started (200 + 40). */
export const HUMAN_PLY_OBSERVE_MS = HUMAN_SLIDE_ANIM_MS + 15;
