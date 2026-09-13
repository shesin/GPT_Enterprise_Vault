/** Side column colours — driven by stored side look (complete row or side-only 5/6). */

import {
  getPlayShellTheme,
  isPlayShellThemeId,
  PLAY_SHELL_THEMES,
  readSideLookThemeId,
  type PlayShellThemeId,
} from './playShellThemes';

export type SidePanelThemeId = PlayShellThemeId;

export interface SidePanelTheme {
  id: SidePanelThemeId;
  label: string;
}

export const SIDE_PANEL_THEMES: Record<SidePanelThemeId, SidePanelTheme> = Object.fromEntries(
  Object.values(PLAY_SHELL_THEMES).map((theme) => [theme.id, { id: theme.id, label: theme.label }]),
) as Record<SidePanelThemeId, SidePanelTheme>;

export function isSidePanelThemeId(value: string | null | undefined): value is SidePanelThemeId {
  return isPlayShellThemeId(value);
}

export function readSidePanelThemeId(): SidePanelThemeId {
  return readSideLookThemeId();
}

export function getSidePanelTheme(id: SidePanelThemeId): SidePanelTheme {
  const theme = getPlayShellTheme(id);
  return { id: theme.id, label: theme.label };
}
