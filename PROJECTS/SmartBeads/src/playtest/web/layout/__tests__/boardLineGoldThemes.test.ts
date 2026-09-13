import {
  BOARD_LINE_GOLD_THEMES,
  CLASSIC_BOARD_LINE_GOLD,
  getClassicBoardLineGold,
  readBoardLineGoldThemeId,
} from '../boardLineGoldThemes';

describe('boardLineGoldThemes', () => {
  it('defines three distinct line gold intensities', () => {
    const themes = Object.values(BOARD_LINE_GOLD_THEMES);
    expect(themes).toHaveLength(3);
    const keys = themes.map((t) => `${t.lineRgba}|${t.nodeRgba}`);
    expect(new Set(keys).size).toBe(3);
  });

  it('locks Classic gold for grid lines', () => {
    expect(readBoardLineGoldThemeId()).toBe('2');
    expect(getClassicBoardLineGold()).toBe(CLASSIC_BOARD_LINE_GOLD);
    expect(CLASSIC_BOARD_LINE_GOLD.lineRgba).toBe('rgba(255, 205, 92, 0.74)');
    expect(CLASSIC_BOARD_LINE_GOLD.nodeRgba).toBe('rgba(255, 205, 92, 0.46)');
  });
});

