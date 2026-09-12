/** Grid line gold intensity — preview for Classic Dark board; applies to active board look. */

export type BoardLineGoldThemeId = '1' | '2' | '3';

export interface BoardLineGoldTheme {
  id: BoardLineGoldThemeId;
  label: string;
  lineRgba: string;
  nodeRgba: string;
}

export const BOARD_LINE_GOLD_THEMES: Record<BoardLineGoldThemeId, BoardLineGoldTheme> = {
  '1': {
    id: '1',
    label: 'Soft gold',
    lineRgba: 'rgba(212, 168, 75, 0.58)',
    nodeRgba: 'rgba(212, 168, 75, 0.36)',
  },
  '2': {
    id: '2',
    label: 'Classic gold',
    lineRgba: 'rgba(255, 205, 92, 0.74)',
    nodeRgba: 'rgba(255, 205, 92, 0.46)',
  },
  '3': {
    id: '3',
    label: 'Bright gold',
    lineRgba: 'rgba(255, 214, 96, 0.88)',
    nodeRgba: 'rgba(255, 214, 96, 0.58)',
  },
};

export function isBoardLineGoldThemeId(value: string | null | undefined): value is BoardLineGoldThemeId {
  return value === '1' || value === '2' || value === '3';
}

export function getBoardLineGoldTheme(id: BoardLineGoldThemeId): BoardLineGoldTheme {
  return BOARD_LINE_GOLD_THEMES[id];
}

/** Locked — Classic gold (human pick 2026-09). Preview picker removed. */
export function readBoardLineGoldThemeId(): BoardLineGoldThemeId {
  return '2';
}
