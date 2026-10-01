/** Player-facing end-of-game text. Engine reason codes never reach the screen raw. */

/** Engine reason codes that need their own wording (everything else either says it already or is skipped). */
const ENGINE_REASON_TEXT: Record<string, string> = {
  safety_cap: 'Move limit reached',
  safety_cap_captures: 'Move limit reached',
  repetition: 'Draw by threefold repetition',
};

/** Engine reason codes the headline already explains. */
const SKIP_ENGINE_CODES = new Set([
  'elimination',
  'stalemate',
  'ply_limit_captures',
  'ply_limit_center',
  'ply_limit_draw',
]);

/** Headline for a drawn game; a draw is not always a captures tie (repetition, agreed resignation). */
export function drawScoreLine(redCaps: number, blueCaps: number): string {
  return redCaps === blueCaps
    ? `Tied in captures (${redCaps} vs ${blueCaps} beads)`
    : `Draw (${redCaps} vs ${blueCaps} captures)`;
}

/** Avoid duplicating capture win on the modal when scoreLine already states the margin. */
export function composeResultDescription(scoreLine: string, reason: string | undefined): string {
  if (!reason || reason === 'Normal') return scoreLine;
  const mapped = ENGINE_REASON_TEXT[reason];
  if (mapped) return `${scoreLine} • ${mapped}`;
  if (SKIP_ENGINE_CODES.has(reason)) return scoreLine;
  if (/won on captures/i.test(reason) && /won by \d+ bead/i.test(scoreLine)) return scoreLine;
  if (/won on captures/i.test(reason) && /\bYou won\b/i.test(scoreLine)) return scoreLine;
  if (/won on captures/i.test(reason) && /\bWON!/i.test(scoreLine)) return scoreLine;
  return `${scoreLine} • ${reason.trim()}`;
}
