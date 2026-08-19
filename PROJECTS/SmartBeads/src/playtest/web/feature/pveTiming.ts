/** Slide flight on canvas (ms). Same as SHOLO_GUTI_WITH_FEATURE.html. */
export const HUMAN_SLIDE_ANIM_MS = 200;
/** Jump flight on canvas (ms). Same as prototype. */
export const HUMAN_JUMP_ANIM_MS = 280;
/**
 * After the human animation ends, wait this long before AI starts.
 * Prototype uses 40ms. Tests must sample occupancy after the slide lands
 * and before this delay elapses — never after the AI ply.
 */
export const AI_REPLY_DELAY_MS = 40;

/** After dest click: animation has landed, AI has not started (200 + 40). */
export const HUMAN_PLY_OBSERVE_MS = HUMAN_SLIDE_ANIM_MS + 15;
