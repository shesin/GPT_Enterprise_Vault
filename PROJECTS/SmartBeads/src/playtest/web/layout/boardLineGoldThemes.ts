/** Grid line colour — every board look (all 6 dark + all 5 light) now uses its own
 * Lovable-spec line colour instead of a shared gold — see getActiveBoardLineTheme().
 * CLASSIC_LINE_THEME / CLASSIC_BOARD_LINE_GOLD remain as the '7' charcoal side-only
 * fallback (not a board surface) and as a safety default for any unmapped id. */

import { readBoardLookThemeId } from './playShellThemes';

export interface BoardLineGoldTheme {
  label: string;
  lineRgba: string;
  nodeRgba: string;
}

export const CLASSIC_BOARD_LINE_GOLD: BoardLineGoldTheme = {
  label: 'Classic gold',
  lineRgba: 'rgba(255, 205, 92, 0.74)',
  nodeRgba: 'rgba(255, 205, 92, 0.46)',
};

/** Faint intersection dots on empty nodes — same gold family. */
export const CLASSIC_BOARD_LINE_GOLD_EMPTY_NODE = 'rgba(255, 205, 92, 0.24)';

export function getClassicBoardLineGold(): BoardLineGoldTheme {
  return CLASSIC_BOARD_LINE_GOLD;
}

export interface BoardLineTheme {
  lineRgba: string;
  nodeRgba: string;
  emptyNodeRgba: string;
}

const CLASSIC_LINE_THEME: BoardLineTheme = {
  lineRgba: CLASSIC_BOARD_LINE_GOLD.lineRgba,
  nodeRgba: CLASSIC_BOARD_LINE_GOLD.nodeRgba,
  emptyNodeRgba: CLASSIC_BOARD_LINE_GOLD_EMPTY_NODE,
};

/** Board-look id -> its own Lovable line colour. Every dark and light board look
 * is mapped here now; only '7' (charcoal side-only) falls through to gold. */
const OWN_COLOUR_LINE_THEMES: Record<string, BoardLineTheme> = {
  '1': { // Classic Green — oklch(0.72 0.105 78)
    lineRgba: 'rgba(201, 156, 84, 0.85)',
    nodeRgba: 'rgba(201, 156, 84, 0.55)',
    emptyNodeRgba: 'rgba(201, 156, 84, 0.30)',
  },
  '2': { // Wood Classic — oklch(0.82 0.065 83)
    lineRgba: 'rgba(217, 193, 148, 0.85)',
    nodeRgba: 'rgba(217, 193, 148, 0.55)',
    emptyNodeRgba: 'rgba(217, 193, 148, 0.30)',
  },
  '3': { // Ocean Blue — oklch(0.81 0.055 90)
    lineRgba: 'rgba(207, 192, 153, 0.85)',
    nodeRgba: 'rgba(207, 192, 153, 0.55)',
    emptyNodeRgba: 'rgba(207, 192, 153, 0.30)',
  },
  '4': { // Sandy Beige — oklch(0.39 0.065 62)
    lineRgba: 'rgba(94, 61, 29, 0.85)',
    nodeRgba: 'rgba(94, 61, 29, 0.55)',
    emptyNodeRgba: 'rgba(94, 61, 29, 0.30)',
  },
  '6': { // Purple Night — oklch(0.72 0.09 82)
    lineRgba: 'rgba(193, 159, 97, 0.85)',
    nodeRgba: 'rgba(193, 159, 97, 0.55)',
    emptyNodeRgba: 'rgba(193, 159, 97, 0.30)',
  },
  '14': { // Warm Walnut — oklch(0.76 0.055 80)
    lineRgba: 'rgba(196, 174, 138, 0.85)',
    nodeRgba: 'rgba(196, 174, 138, 0.55)',
    emptyNodeRgba: 'rgba(196, 174, 138, 0.30)',
  },
  '15': { // Seaglass — oklch(0.36 0.05 205)
    lineRgba: 'rgba(22, 69, 74, 0.85)',
    nodeRgba: 'rgba(22, 69, 74, 0.55)',
    emptyNodeRgba: 'rgba(22, 69, 74, 0.30)',
  },
  '16': { // Powder Lilac — oklch(0.40 0.06 305)
    lineRgba: 'rgba(79, 63, 98, 0.85)',
    nodeRgba: 'rgba(79, 63, 98, 0.55)',
    emptyNodeRgba: 'rgba(79, 63, 98, 0.30)',
  },
  '17': { // Celadon Jade — oklch(0.36 0.055 178)
    lineRgba: 'rgba(21, 70, 61, 0.85)',
    nodeRgba: 'rgba(21, 70, 61, 0.55)',
    emptyNodeRgba: 'rgba(21, 70, 61, 0.30)',
  },
  '18': { // Alabaster Pearl — oklch(0.44 0.06 68)
    lineRgba: 'rgba(105, 76, 45, 0.85)',
    nodeRgba: 'rgba(105, 76, 45, 0.55)',
    emptyNodeRgba: 'rgba(105, 76, 45, 0.30)',
  },
};

/**
 * Grid line colour for the currently active board look. Every dark and light
 * board look has its own Lovable colour now; CLASSIC_LINE_THEME is only a
 * fallback for '7' (charcoal side-only) or any id not in the map above.
 */
export function getActiveBoardLineTheme(): BoardLineTheme {
  const id = readBoardLookThemeId();
  const own = OWN_COLOUR_LINE_THEMES[id];
  if (own) return own;
  return CLASSIC_LINE_THEME;
}
