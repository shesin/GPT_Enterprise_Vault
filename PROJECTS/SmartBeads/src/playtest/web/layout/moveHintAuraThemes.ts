/** Move-hint aura — resolved render style is board-dependent; the only
 * player-facing control is a plain off/on toggle (2026-09-21, per human
 * request — "Original (orange/lime)" and the separate manual Gold/Black Gold
 * choice were both dropped; "on" always auto-picks the right gold variant
 * for whichever board is active). */

export type MoveHintAuraStyle = 'off' | 'gold-fill' | 'black-gold-fill';
export type MoveHintAuraToggle = 'off' | 'on';

export const MOVE_HINT_AURA_STORAGE_KEY = 'sb-move-hint-aura';

export function isMoveHintAuraToggle(value: string | null | undefined): value is MoveHintAuraToggle {
  return value === 'off' || value === 'on';
}

// Any pre-2026-09-21 stored value ('original', 'gold-fill', 'black-gold-fill',
// or an older retired style like 'white-gold') migrates to 'on' — the colour
// itself is no longer stored, only whether the aura shows at all.
function normalizeStoredToggle(value: string | null | undefined): MoveHintAuraToggle {
  return value === 'off' ? 'off' : 'on';
}

// Duplicated from playShellThemes.ts (not imported) to avoid a circular
// dependency — same pattern already used in beadSetThemes.ts.
const PLAY_BOARD_LOOK_STORAGE_KEY = 'sb-play-board-look';
// Boards with a light canvas need Black Gold instead of plain Gold for
// contrast, even though they're "complete" boards, not the old
// charcoal-paired light row (removed 2026-09-21) — see beadSetThemes.ts.
const LIGHT_BOARD_LOOK_IDS = new Set(['23', '24', '25', '26']);

function isStoredBoardLookLight(): boolean {
  if (typeof localStorage === 'undefined') return false;
  const stored = localStorage.getItem(PLAY_BOARD_LOOK_STORAGE_KEY);
  return stored !== null && LIGHT_BOARD_LOOK_IDS.has(stored);
}

export function readMoveHintAuraToggle(): MoveHintAuraToggle {
  if (typeof localStorage === 'undefined') return 'on';
  return normalizeStoredToggle(localStorage.getItem(MOVE_HINT_AURA_STORAGE_KEY));
}

export function writeMoveHintAuraToggle(toggle: MoveHintAuraToggle): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(MOVE_HINT_AURA_STORAGE_KEY, toggle);
}

/** Resolves a toggle value to the style the renderer actually draws — off, or
 * the board-appropriate gold variant. Exported separately so callers that
 * already have the toggle (e.g. read straight from a live <select>, to avoid
 * a storage read on every animation frame) can resolve it without another
 * storage round-trip. */
export function resolveMoveHintAuraStyle(toggle: MoveHintAuraToggle): MoveHintAuraStyle {
  if (toggle === 'off') return 'off';
  return isStoredBoardLookLight() ? 'black-gold-fill' : 'gold-fill';
}

export function readMoveHintAuraStyle(): MoveHintAuraStyle {
  return resolveMoveHintAuraStyle(readMoveHintAuraToggle());
}
