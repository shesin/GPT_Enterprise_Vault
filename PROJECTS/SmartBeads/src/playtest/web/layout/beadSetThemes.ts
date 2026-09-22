/** Bead set presets — Lovable Table collection (OKLCH). */

import { LOVABLE_BEAD_SETS, type BeadSetId, type LovableBeadSetTokens } from './lovableOklchTokens';
import type { BeadShade } from './playShellThemes';

export type { BeadSetId };

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

// Duplicated from playShellThemes.ts (not imported) to avoid a circular
// dependency — playShellThemes.ts already imports BEAD_SET_THEMES from this
// file at runtime, so importing back from it here would create a cycle.
const PLAY_BOARD_LOOK_STORAGE_KEY = 'sb-play-board-look';

/**
 * Bead set is fully automatic per board (2026-09-21, per human request — the
 * manual "Bead set" dropdown was removed entirely, no explicit override
 * exists anymore):
 * - Wood Classic (2) and Warm Walnut (14) default to Black & White — both are
 *   wood-toned dark boards, so Wooden & White beads would blend into the
 *   board itself.
 * - The other 3 dark/complete boards (Classic Green, Ocean Blue, Purple
 *   Night) default to Wooden & White.
 * - The 4 light-canvas "Matched" boards (Seaglass/Powder Lilac/Celadon
 *   Jade/Alabaster Pearl, ids 23/24/25/26) default to Black & Wooden.
 */
const DEFAULT_BEAD_SET_BY_BOARD: Record<string, BeadSetId> = {
  '1': 'wooden',
  '2': 'white-black',
  '3': 'wooden',
  '6': 'wooden',
  '14': 'white-black',
  '23': 'black-wooden',
  '24': 'black-wooden',
  '25': 'black-wooden',
  '26': 'black-wooden',
};

const FALLBACK_BEAD_SET_ID: BeadSetId = 'white-black';

export function readBeadSetId(): BeadSetId {
  if (typeof localStorage === 'undefined') return FALLBACK_BEAD_SET_ID;
  const stored = localStorage.getItem(PLAY_BOARD_LOOK_STORAGE_KEY);
  const byBoard = stored ? DEFAULT_BEAD_SET_BY_BOARD[stored] : undefined;
  return byBoard ?? FALLBACK_BEAD_SET_ID;
}

export function getActiveBeadSet(): BeadSetTheme {
  return BEAD_SET_THEMES[readBeadSetId()];
}
