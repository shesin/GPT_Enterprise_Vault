/** Move-hint aura presets — preview until locked in DECISIONS. */

export type MoveHintAuraStyle = 'off' | 'original' | 'gold-fill' | 'black-gold-fill';

export const MOVE_HINT_AURA_STORAGE_KEY = 'sb-move-hint-aura';

const RETIRED_AURA_STYLES = new Set(['white-gold', 'gold-no-fill', 'ring-only']);

export function isMoveHintAuraStyle(value: string | null | undefined): value is MoveHintAuraStyle {
  return value === 'off' || value === 'original' || value === 'gold-fill' || value === 'black-gold-fill';
}

function normalizeMoveHintAuraStyle(value: string | null | undefined): MoveHintAuraStyle | null {
  if (value && RETIRED_AURA_STYLES.has(value)) return 'gold-fill';
  return isMoveHintAuraStyle(value) ? value : null;
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

/**
 * Soft default only: applies when the player has never explicitly picked an
 * aura style (writeMoveHintAuraStyle). Once they choose one, including
 * explicitly picking 'off', that choice persists and this never overrides
 * it. Dark/complete boards default to Gold; light boards default to Black
 * Gold, since plain Gold has poor contrast against a light board surface
 * (2026-09-21, per human request).
 */
export function readMoveHintAuraStyle(): MoveHintAuraStyle {
  const fallback = isStoredBoardLookLight() ? 'black-gold-fill' : 'gold-fill';
  if (typeof localStorage === 'undefined') return fallback;
  const stored = localStorage.getItem(MOVE_HINT_AURA_STORAGE_KEY);
  return normalizeMoveHintAuraStyle(stored) ?? fallback;
}

export function writeMoveHintAuraStyle(style: MoveHintAuraStyle): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(MOVE_HINT_AURA_STORAGE_KEY, style);
}

/**
 * Forces the aura style to the current board's soft default, overriding any
 * prior explicit choice — unlike readMoveHintAuraStyle(), which never does
 * that. Called only from the page-1 hub board picker (2026-09-21, per human
 * request) — see forceDefaultBeadSetId() in beadSetThemes.ts for the same
 * rule applied to bead sets.
 */
export function forceDefaultMoveHintAuraStyle(): void {
  writeMoveHintAuraStyle(isStoredBoardLookLight() ? 'black-gold-fill' : 'gold-fill');
}
