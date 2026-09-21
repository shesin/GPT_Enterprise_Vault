/**
 * Move-hint aura gold — Lovable's "soft gold" token (oklch(0.82 0.075 82),
 * converted to rgb), paler and lighter than the center marker's Classic gold
 * (boardLineGoldThemes.ts) so the aura reads clearly without becoming the same
 * colour as center scoring or the grid lines.
 */
export const LOVABLE_RING_GOLD = {
  core: 'rgba(221, 192, 140, 0.95)',
  soft: 'rgba(221, 192, 140, 0.55)',
} as const;

/**
 * "Black Gold" move-hint aura (2026-09-21, shade picked after
 * comparing the real canvas render, not a CSS approximation) — a mid-tone
 * gold (oklch(0.63 0.08 80), converted to rgb) for boards where the paler
 * LOVABLE_RING_GOLD doesn't have enough contrast — e.g. it sits almost at
 * the same lightness as a light board like Seaglass (oklch(0.80 ...)).
 * Started darker (oklch(0.45 0.09 75)) but that read as dull/brown rather
 * than gold at the real ~15px bead scale; this is lighter for contrast
 * while still reading as a shade of gold, not a plain dark ring.
 */
export const LOVABLE_RING_BLACK_GOLD = {
  core: 'rgba(163, 132, 79, 0.95)',
  soft: 'rgba(163, 132, 79, 0.55)',
} as const;
