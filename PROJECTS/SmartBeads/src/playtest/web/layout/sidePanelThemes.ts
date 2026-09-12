/** Side column colours — driven by unified play shell theme. */

import {
  isPlayShellThemeId,
  readPlayShellThemeId,
  type PlayShellThemeId,
} from './playShellThemes';

export type SidePanelThemeId = PlayShellThemeId;

export interface SidePanelTheme {
  id: SidePanelThemeId;
  label: string;
}

export const SIDE_PANEL_THEMES: Record<SidePanelThemeId, SidePanelTheme> = {
  '1': { id: '1', label: 'Classic Dark' },
  '2': { id: '2', label: 'Warm parchment' },
  '3': { id: '3', label: 'Camp edge glow' },
};

export function isSidePanelThemeId(value: string | null | undefined): value is SidePanelThemeId {
  return isPlayShellThemeId(value);
}

export function readSidePanelThemeId(): SidePanelThemeId {
  return readPlayShellThemeId();
}
