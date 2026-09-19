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

export const DEFAULT_BEAD_SET_ID: BeadSetId = 'ivory-ebony';
export const LIGHT_BOARD_DEFAULT_BEAD_SET_ID: BeadSetId = 'black-brown';

export function isBeadSetId(value: string | null | undefined): value is BeadSetId {
  return value === 'ivory-ebony'
    || value === 'white-black'
    || value === 'wooden'
    || value === 'black-brown';
}

// Duplicated from playShellThemes.ts (not imported) to avoid a circular
// dependency — playShellThemes.ts already imports BEAD_SET_THEMES from this
// file at runtime, so importing back from it here would create a cycle.
const PLAY_BOARD_LOOK_STORAGE_KEY = 'sb-play-board-look';
// '12' (Warm Walnut) moved to the dark/complete board group (2026-09-18).
// '15'-'18' are the 4 new light boards added the same day (Seaglass, Powder
// Lilac, Celadon Jade, Alabaster Pearl). '9' (Soft Blush) and '10' (Pale Sage)
// were removed (2026-09-19).
const LIGHT_BOARD_LOOK_IDS = new Set(['4', '15', '16', '17', '18']);

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

export function getBeadSetTheme(id: BeadSetId = readBeadSetId()): BeadSetTheme {
  return BEAD_SET_THEMES[id];
}

export function getActiveBeadSet(): BeadSetTheme {
  return getBeadSetTheme(readBeadSetId());
}
