/** Board canvas colours — driven by unified play shell theme. */

import {
  getPlayShellTheme,
  readPlayBoardMatchMode,
  readPlayShellThemeId,
  resolveBoardCanvasLook,
  type PlayShellThemeId,
} from './playShellThemes';

export type BoardLookThemeId = PlayShellThemeId;

export type { CreamHalfStop, BeadShade } from './playShellThemes';
export type BoardLookTheme = import('./playShellThemes').PlayShellTheme;

export const BOARD_LOOK_THEMES = {
  get '1'() { return getPlayShellTheme('1'); },
  get '2'() { return getPlayShellTheme('2'); },
  get '3'() { return getPlayShellTheme('3'); },
};

export function isBoardLookThemeId(value: string | null | undefined): value is BoardLookThemeId {
  return value === '1' || value === '2' || value === '3';
}

export function getBoardLookTheme(id: BoardLookThemeId): BoardLookTheme {
  return getPlayShellTheme(id);
}

export function readBoardLookThemeId(): BoardLookThemeId {
  return readPlayShellThemeId();
}

export function getActiveBoardLookTheme(): BoardLookTheme {
  const themeId = readPlayShellThemeId();
  const mode = readPlayBoardMatchMode();
  return { ...getPlayShellTheme(themeId), ...resolveBoardCanvasLook(themeId, mode) };
}
