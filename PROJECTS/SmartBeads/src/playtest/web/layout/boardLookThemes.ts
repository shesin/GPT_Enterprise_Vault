/** Board canvas colours — driven by stored board look (complete row 1–4 only). */

import {
  getPlayShellTheme,
  readBoardLookThemeId,
  resolveBoardCanvasLook,
  resolveBoardMatchForTheme,
  type BoardLookThemeId,
} from './playShellThemes';

export type { BoardLookThemeId };

export type { CreamHalfStop, BeadShade } from './playShellThemes';
export type BoardLookTheme = import('./playShellThemes').PlayShellTheme;

export function isBoardLookThemeId(value: string | null | undefined): value is BoardLookThemeId {
  return value === '1' || value === '2' || value === '3' || value === '4';
}

export function getBoardLookTheme(id: BoardLookThemeId): BoardLookTheme {
  return getPlayShellTheme(id);
}

export function readBoardLookThemeIdFromShell(): BoardLookThemeId {
  return readBoardLookThemeId();
}

export function getActiveBoardLookTheme(): BoardLookTheme {
  const boardLookId = readBoardLookThemeId();
  const mode = resolveBoardMatchForTheme(boardLookId);
  return { ...getPlayShellTheme(boardLookId), ...resolveBoardCanvasLook(boardLookId, mode) };
}
