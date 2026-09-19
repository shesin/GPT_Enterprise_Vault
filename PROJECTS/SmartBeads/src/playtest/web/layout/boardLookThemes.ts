/** Board canvas — driven by stored board look (complete 1,2,3,6,14); side-only never changes board. */

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

export { isBoardLookThemeId } from './playShellThemes';

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
