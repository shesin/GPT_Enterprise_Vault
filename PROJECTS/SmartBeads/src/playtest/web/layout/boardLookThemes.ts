/** Board canvas — driven by the stored board look id (see COMPLETE_LOOK_IDS in playShellThemes.ts). */

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

export function getBoardLookTheme(id: BoardLookThemeId): BoardLookTheme {
  return getPlayShellTheme(id);
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
