/** Bead set presets — Lovable Table collection (OKLCH). */

import {
  LOVABLE_BEAD_SETS,
  type BeadSetId,
  type LovableBeadSetTokens,
} from './lovableOklchTokens';
import type { BeadShade } from './playShellThemes';

export type { BeadSetId };

export const BEAD_SET_STORAGE_KEY = 'sb-bead-set';

export interface BeadSetTheme {
  id: BeadSetId;
  label: string;
  creamBead: BeadShade;
  blackBead: BeadShade;
  creamStroke: string;
  blackRimStroke: string;
}

function toBeadSetTheme(tokens: LovableBeadSetTokens): BeadSetTheme {
  return {
    id: tokens.id,
    label: tokens.label,
    creamBead: {
      highlight: tokens.creamHighlight,
      mid: tokens.creamMid,
      shadow: tokens.creamShadow,
    },
    blackBead: {
      highlight: tokens.blackHighlight,
      mid: tokens.blackMid,
      shadow: tokens.blackShadow,
    },
    creamStroke: tokens.creamStroke,
    blackRimStroke: tokens.blackRimStroke,
  };
}

export const BEAD_SET_THEMES: Record<BeadSetId, BeadSetTheme> = Object.fromEntries(
  LOVABLE_BEAD_SETS.map((t) => [t.id, toBeadSetTheme(t)]),
) as Record<BeadSetId, BeadSetTheme>;

// Dark/complete boards default to Black & White; light boards default to
// Black & Wooden (2026-09-21, per human request — Ivory & Ebony removed).
export const DEFAULT_BEAD_SET_ID: BeadSetId = 'white-black';
export const LIGHT_BOARD_DEFAULT_BEAD_SET_ID: BeadSetId = 'black-wooden';

export function isBeadSetId(value: string | null | undefined): value is BeadSetId {
  return value === 'white-black'
    || value === 'wooden'
    || value === 'black-wooden';
}

// Duplicated from playShellThemes.ts (not imported) to avoid a circular
// dependency — playShellThemes.ts already imports BEAD_SET_THEMES from this
// file at runtime, so importing back from it here would create a cycle.
const PLAY_BOARD_LOOK_STORAGE_KEY = 'sb-play-board-look';
// Boards with a light canvas need the light-appropriate bead default even
// though they're "complete" boards, not the old charcoal-paired light row
// (removed 2026-09-21) — Seaglass/Powder Lilac/Celadon Jade/Alabaster Pearl
// "Matched" (23/24/25/26) all render the same light boardSurface tones the
// removed row used to.
const LIGHT_BOARD_LOOK_IDS = new Set(['23', '24', '25', '26']);

function isStoredBoardLookLight(): boolean {
  if (typeof localStorage === 'undefined') return false;
  const stored = localStorage.getItem(PLAY_BOARD_LOOK_STORAGE_KEY);
  return stored !== null && LIGHT_BOARD_LOOK_IDS.has(stored);
}

/**
 * Soft default only: applies when the player has never explicitly picked a
 * bead set. Once they choose one in Settings (writeBeadSetId), that choice
 * persists across board-theme switches — this never overrides it.
 */
export function readBeadSetId(): BeadSetId {
  if (typeof localStorage === 'undefined') return DEFAULT_BEAD_SET_ID;
  const stored = localStorage.getItem(BEAD_SET_STORAGE_KEY);
  if (isBeadSetId(stored)) return stored;
  return isStoredBoardLookLight() ? LIGHT_BOARD_DEFAULT_BEAD_SET_ID : DEFAULT_BEAD_SET_ID;
}

export function writeBeadSetId(id: BeadSetId): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(BEAD_SET_STORAGE_KEY, id);
}

/**
 * Forces the bead set to the current board's soft default, overriding any
 * prior explicit choice — unlike readBeadSetId(), which never does that.
 * Called only from the page-1 hub board picker (2026-09-21, per human
 * request): picking a board on page 1 should always reset bead set to that
 * board's default; picking a board on page 2 must not touch it.
 */
export function forceDefaultBeadSetId(): void {
  writeBeadSetId(isStoredBoardLookLight() ? LIGHT_BOARD_DEFAULT_BEAD_SET_ID : DEFAULT_BEAD_SET_ID);
}

export function getBeadSetTheme(id: BeadSetId = readBeadSetId()): BeadSetTheme {
  return BEAD_SET_THEMES[id];
}

export function getActiveBeadSet(): BeadSetTheme {
  return getBeadSetTheme(readBeadSetId());
}
