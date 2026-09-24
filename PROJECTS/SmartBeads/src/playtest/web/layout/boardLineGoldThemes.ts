/** Grid line colour — every board look derives its canvas line/node colour
 * directly from its own oklch `lines` token (playShellThemes.ts / lovableOklchTokens.ts)
 * at alpha 85%/55%/30%, via canvas's native oklch(... / alpha%) support. There is
 * no separate hand-maintained colour table — a board added there is automatically
 * correct here too, with nothing to remember to keep in sync. */

import { getPlayShellTheme, readBoardLookThemeId } from './playShellThemes';

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

/** Appends CSS Color 4 alpha syntax to an `oklch(L C H)` string, e.g.
 * `oklch(0.36 0.055 178)` + 85 -> `oklch(0.36 0.055 178 / 85%)`. */
function withAlpha(oklch: string, alphaPercent: number): string {
  return oklch.replace(/\)\s*$/, ` / ${alphaPercent}%)`);
}

/**
 * Grid line colour for the currently active board look, derived from that
 * board's own `lineColor` (its oklch `lines` token — the same one used for
 * the CSS board-frame border). CLASSIC_LINE_THEME (gold) is only a defensive
 * fallback if a theme is somehow missing.
 */
export function getActiveBoardLineTheme(): BoardLineTheme {
  const id = readBoardLookThemeId();
  const theme = getPlayShellTheme(id);
  if (!theme) return CLASSIC_LINE_THEME;
  return {
    lineRgba: withAlpha(theme.lineColor, 85),
    nodeRgba: withAlpha(theme.lineColor, 55),
    emptyNodeRgba: withAlpha(theme.lineColor, 30),
  };
}
