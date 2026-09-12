import { BOARD_LINE_GOLD_THEMES, readBoardLineGoldThemeId } from '../boardLineGoldThemes';

describe('boardLineGoldThemes', () => {
  it('defines three distinct line gold intensities', () => {
    const themes = Object.values(BOARD_LINE_GOLD_THEMES);
    expect(themes).toHaveLength(3);
    const keys = themes.map((t) => `${t.lineRgba}|${t.nodeRgba}`);
    expect(new Set(keys).size).toBe(3);
  });

  it('locks Classic gold for grid lines', () => {
    expect(readBoardLineGoldThemeId()).toBe('2');
  });
});

