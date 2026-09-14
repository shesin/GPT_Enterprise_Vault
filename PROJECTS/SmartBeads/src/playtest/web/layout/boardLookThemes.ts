/** Board canvas — driven by stored board look (complete 1–6); side-only never changes board. */

import { getActiveBeadSet } from './beadSetThemes';
import {
  getPlayShellTheme,
  readBoardLookThemeId,
  resolveBoardCanvasLook,
  type BoardLookThemeId,
} from './playShellThemes';

export type { BoardLookThemeId };
export type { CreamHalfStop, BeadShade } from './playShellThemes';
export type BoardLookTheme = import('./playShellThemes').PlayShellTheme;

export function isBoardLookThemeId(value: string | null | undefined): value is BoardLookThemeId {
  return value === '1' || value === '2' || value === '3' || value === '4' || value === '5' || value === '6';
}

export function getBoardLookTheme(id: BoardLookThemeId): BoardLookTheme {
  return getPlayShellTheme(id);
}

export function readBoardLookThemeIdFromShell(): BoardLookThemeId {
  return readBoardLookThemeId();
}

export function getActiveBoardLookTheme(): BoardLookTheme {
  const boardLookId = readBoardLookThemeId();
  const beadSet = getActiveBeadSet();
  return {
    ...getPlayShellTheme(boardLookId),
    ...resolveBoardCanvasLook(boardLookId),
    creamBead: beadSet.creamBead,
    blackBead: beadSet.blackBead,
  };
}
