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

export function isBeadSetId(value: string | null | undefined): value is BeadSetId {
  return value === 'ivory-ebony'
    || value === 'white-black'
    || value === 'wooden'
    || value === 'pearl'
    || value === 'metallic';
}

export function readBeadSetId(): BeadSetId {
  if (typeof localStorage === 'undefined') return DEFAULT_BEAD_SET_ID;
  const stored = localStorage.getItem(BEAD_SET_STORAGE_KEY);
  return isBeadSetId(stored) ? stored : DEFAULT_BEAD_SET_ID;
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
