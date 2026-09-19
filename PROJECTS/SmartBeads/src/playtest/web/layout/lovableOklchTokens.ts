/** Lovable design tokens (OKLCH) — source of truth for shell, boards, beads. */

export const LOVABLE_SHELL = {
  pageBg: 'oklch(0.13 0.025 158)',
  rail: 'oklch(0.155 0.028 157 / 91%)',
  header: 'oklch(0.10 0.02 157 / 94%)',
  text: 'oklch(0.93 0.025 82)',
  muted: 'oklch(0.70 0.025 145)',
  gold: 'oklch(0.72 0.105 78)',
  softGold: 'oklch(0.82 0.075 82)',
  border: 'oklch(0.45 0.055 95 / 35%)',
} as const;

export interface LovableBoardTokens {
  label: string;
  surface: string;
  shadow: string;
  frameOuter: string;
  frameInner: string;
  lines: string;
}

/** Complete row — matched board + side (5 looks). */
export const LOVABLE_COMPLETE_BOARD_THEMES: readonly LovableBoardTokens[] = [
  {
    label: 'Classic Green',
    surface: 'oklch(0.30 0.07 157)',
    shadow: 'oklch(0.22 0.055 157)',
    frameOuter: 'oklch(0.25 0.055 66)',
    frameInner: 'oklch(0.13 0.035 62)',
    lines: 'oklch(0.72 0.105 78)',
  },
  {
    label: 'Wood Classic',
    surface: 'oklch(0.39 0.075 63)',
    shadow: 'oklch(0.29 0.07 57)',
    frameOuter: 'oklch(0.27 0.07 55)',
    frameInner: 'oklch(0.15 0.045 50)',
    lines: 'oklch(0.82 0.065 83)',
  },
  {
    label: 'Ocean Blue',
    surface: 'oklch(0.34 0.07 220)',
    shadow: 'oklch(0.23 0.055 225)',
    frameOuter: 'oklch(0.22 0.045 225)',
    frameInner: 'oklch(0.13 0.035 230)',
    lines: 'oklch(0.81 0.055 90)',
  },
  {
    label: 'Purple Night',
    surface: 'oklch(0.25 0.07 310)',
    shadow: 'oklch(0.17 0.055 305)',
    frameOuter: 'oklch(0.20 0.055 300)',
    frameInner: 'oklch(0.11 0.035 300)',
    lines: 'oklch(0.72 0.09 82)',
  },
  {
    // Moved from the light-board row (2026-09-18) — its lightness (0.55) and
    // distinct frame colours already set it apart from the pale pastel light
    // boards; reads better grouped with the other matched dark/medium boards.
    label: 'Warm Walnut',
    surface: 'oklch(0.55 0.075 55)',
    shadow: 'oklch(0.42 0.07 52)',
    frameOuter: 'oklch(0.32 0.06 50)',
    frameInner: 'oklch(0.18 0.045 48)',
    lines: 'oklch(0.76 0.055 80)',
  },
] as const;

/** Light board row — always paired with charcoal side panels. */
export const LOVABLE_LIGHT_BOARD_THEMES: readonly LovableBoardTokens[] = [
  {
    label: 'Sandy Beige',
    surface: 'oklch(0.72 0.055 84)',
    shadow: 'oklch(0.59 0.065 78)',
    frameOuter: 'oklch(0.43 0.07 65)',
    frameInner: 'oklch(0.25 0.055 58)',
    lines: 'oklch(0.39 0.065 62)',
  },
  {
    label: 'Seaglass',
    surface: 'oklch(0.80 0.045 195)',
    shadow: 'oklch(0.68 0.05 198)',
    frameOuter: 'oklch(0.44 0.05 200)',
    frameInner: 'oklch(0.26 0.04 202)',
    lines: 'oklch(0.36 0.05 205)',
  },
  {
    label: 'Powder Lilac',
    surface: 'oklch(0.82 0.04 305)',
    shadow: 'oklch(0.70 0.045 305)',
    frameOuter: 'oklch(0.46 0.06 300)',
    frameInner: 'oklch(0.28 0.045 298)',
    lines: 'oklch(0.40 0.06 305)',
  },
  {
    label: 'Celadon Jade',
    surface: 'oklch(0.82 0.05 170)',
    shadow: 'oklch(0.70 0.055 172)',
    frameOuter: 'oklch(0.44 0.055 175)',
    frameInner: 'oklch(0.26 0.04 178)',
    lines: 'oklch(0.36 0.055 178)',
  },
  {
    label: 'Alabaster Pearl',
    surface: 'oklch(0.88 0.018 85)',
    shadow: 'oklch(0.78 0.025 82)',
    frameOuter: 'oklch(0.55 0.055 72)',
    frameInner: 'oklch(0.33 0.045 65)',
    lines: 'oklch(0.44 0.06 68)',
  },
] as const;

/** @deprecated Use LOVABLE_COMPLETE_BOARD_THEMES + LOVABLE_LIGHT_BOARD_THEMES. */
export const LOVABLE_BOARD_THEMES = LOVABLE_COMPLETE_BOARD_THEMES;

export type BeadSetId = 'ivory-ebony' | 'white-black' | 'wooden' | 'black-brown';

export interface LovableBeadSetTokens {
  id: BeadSetId;
  label: string;
  creamHighlight: string;
  creamMid: string;
  creamShadow: string;
  creamStroke: string;
  blackHighlight: string;
  blackMid: string;
  blackShadow: string;
  blackRimStroke: string;
}

export const LOVABLE_BEAD_SETS: readonly LovableBeadSetTokens[] = [
  {
    id: 'ivory-ebony',
    label: 'Ivory & Ebony',
    creamHighlight: 'oklch(0.93 0.025 82)',
    creamMid: 'oklch(0.88 0.022 82)',
    creamShadow: 'oklch(0.78 0.028 83)',
    creamStroke: 'oklch(0.72 0.035 83)',
    blackHighlight: 'oklch(0.52 0.045 75)',
    blackMid: 'oklch(0.27 0.03 65)',
    blackShadow: 'oklch(0.10 0.012 60)',
    blackRimStroke: 'oklch(0.62 0.06 78)',
  },
  {
    id: 'white-black',
    label: 'White & Black',
    creamHighlight: 'oklch(1.0 0 0)',
    creamMid: 'oklch(0.94 0 0)',
    creamShadow: 'oklch(0.86 0 0)',
    creamStroke: 'oklch(0.78 0 0)',
    blackHighlight: 'oklch(0.48 0 0)',
    blackMid: 'oklch(0.22 0 0)',
    blackShadow: 'oklch(0.06 0 0)',
    blackRimStroke: 'oklch(0.55 0 0)',
  },
  {
    id: 'wooden',
    label: 'Wooden',
    // Cream side was a medium brown too (too close to the dark side) — replaced
    // with a clean, faintly warm white so the pairing is Brown + White, not
    // brown vs. duller brown.
    creamHighlight: 'oklch(0.97 0.006 70)',
    creamMid: 'oklch(0.90 0.006 70)',
    creamShadow: 'oklch(0.80 0.008 70)',
    creamStroke: 'oklch(0.86 0.01 70)',
    blackHighlight: 'oklch(0.60 0.09 62)',
    blackMid: 'oklch(0.40 0.08 57)',
    blackShadow: 'oklch(0.24 0.06 52)',
    blackRimStroke: 'oklch(0.66 0.085 68)',
  },
  {
    id: 'black-brown',
    label: 'Black & Brown',
    // Reuses Wooden's dark-wood brown (creamBead slot) and White & Black's true
    // black (blackBead slot) — both already-approved gradients, not new colours.
    // Soft default for light board themes (see beadSetThemes.ts).
    creamHighlight: 'oklch(0.60 0.09 62)',
    creamMid: 'oklch(0.40 0.08 57)',
    creamShadow: 'oklch(0.24 0.06 52)',
    creamStroke: 'oklch(0.66 0.085 68)',
    blackHighlight: 'oklch(0.48 0 0)',
    blackMid: 'oklch(0.22 0 0)',
    blackShadow: 'oklch(0.06 0 0)',
    blackRimStroke: 'oklch(0.55 0 0)',
  },
] as const;

export const LOVABLE_SELECTED_RING = {
  stroke: LOVABLE_SHELL.gold,
  width: 1.05,
} as const;
