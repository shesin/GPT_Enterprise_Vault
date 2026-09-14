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

export const LOVABLE_BOARD_THEMES: readonly LovableBoardTokens[] = [
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
    label: 'Sandy Beige',
    surface: 'oklch(0.72 0.055 84)',
    shadow: 'oklch(0.59 0.065 78)',
    frameOuter: 'oklch(0.43 0.07 65)',
    frameInner: 'oklch(0.25 0.055 58)',
    lines: 'oklch(0.39 0.065 62)',
  },
  {
    label: 'Forest Green',
    surface: 'oklch(0.25 0.08 145)',
    shadow: 'oklch(0.18 0.055 145)',
    frameOuter: 'oklch(0.18 0.045 130)',
    frameInner: 'oklch(0.10 0.028 130)',
    lines: 'oklch(0.68 0.09 104)',
  },
  {
    label: 'Purple Night',
    surface: 'oklch(0.25 0.07 310)',
    shadow: 'oklch(0.17 0.055 305)',
    frameOuter: 'oklch(0.20 0.055 300)',
    frameInner: 'oklch(0.11 0.035 300)',
    lines: 'oklch(0.72 0.09 82)',
  },
] as const;

export type BeadSetId = 'ivory-ebony' | 'white-black' | 'wooden' | 'pearl' | 'metallic';

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
    creamHighlight: 'oklch(0.68 0.08 68)',
    creamMid: 'oklch(0.60 0.075 68)',
    creamShadow: 'oklch(0.50 0.07 67)',
    creamStroke: 'oklch(0.79 0.07 78)',
    blackHighlight: 'oklch(0.60 0.09 62)',
    blackMid: 'oklch(0.40 0.08 57)',
    blackShadow: 'oklch(0.24 0.06 52)',
    blackRimStroke: 'oklch(0.66 0.085 68)',
  },
  {
    id: 'pearl',
    label: 'Pearl',
    creamHighlight: 'oklch(0.92 0.035 250)',
    creamMid: 'oklch(0.84 0.032 248)',
    creamShadow: 'oklch(0.74 0.030 246)',
    creamStroke: 'oklch(0.80 0.04 240)',
    blackHighlight: 'oklch(0.66 0.055 255)',
    blackMid: 'oklch(0.44 0.05 253)',
    blackShadow: 'oklch(0.27 0.04 252)',
    blackRimStroke: 'oklch(0.72 0.05 250)',
  },
  {
    id: 'metallic',
    label: 'Metallic',
    creamHighlight: 'oklch(0.78 0.01 250)',
    creamMid: 'oklch(0.70 0.01 250)',
    creamShadow: 'oklch(0.58 0.01 250)',
    creamStroke: 'oklch(0.90 0.01 250)',
    blackHighlight: 'oklch(0.68 0.015 250)',
    blackMid: 'oklch(0.40 0.012 250)',
    blackShadow: 'oklch(0.22 0.01 250)',
    blackRimStroke: 'oklch(0.74 0.015 250)',
  },
] as const;

export const LOVABLE_SELECTED_RING = {
  stroke: LOVABLE_SHELL.gold,
  width: 1.05,
} as const;
