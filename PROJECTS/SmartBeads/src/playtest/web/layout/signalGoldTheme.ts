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
 * Move-hint aura for the Black & Brown bead set. The first attempt (pale
 * rgb(214,174,147)) was checked only against the dark board and turned out
 * near-invisible on the Soft Blush light theme — too close in both lightness
 * and hue to a pastel pink board. This is a more saturated caramel-brown
 * (contrast via chroma, not just lightness) plus a small dark edge shadow for
 * definition against any of the 4 light boards, not just one.
 */
export const LOVABLE_RING_LIGHT_BROWN = {
  core: 'rgba(196, 130, 74, 0.95)',
  soft: 'rgba(196, 130, 74, 0.55)',
  edge: 'rgba(90, 58, 32, 0.55)',
} as const;
