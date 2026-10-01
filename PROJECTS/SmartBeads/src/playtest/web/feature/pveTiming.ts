/** Slide flight on canvas (ms). Same as SHOLO_GUTI_WITH_FEATURE.html. */
export const HUMAN_SLIDE_ANIM_MS = 200;
/** Jump flight on canvas (ms). Same as prototype. */
export const HUMAN_JUMP_ANIM_MS = 280;
/**
 * Artificial pause before AI search — zero: search starts as soon as the prior ply allows.
 * The search itself has no time limit (HonestAi); it is made fast, never cut short.
 */
export const AI_REPLY_DELAY_MS = 0;

/** After dest click: animation has landed, AI has not started (200 + 40). */
export const HUMAN_PLY_OBSERVE_MS = HUMAN_SLIDE_ANIM_MS + 15;
