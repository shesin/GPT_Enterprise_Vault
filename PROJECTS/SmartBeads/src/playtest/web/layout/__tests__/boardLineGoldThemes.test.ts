import {
  CLASSIC_BOARD_LINE_GOLD,
  getClassicBoardLineGold,
} from '../boardLineGoldThemes';

describe('boardLineGoldThemes', () => {
  it('locks Classic gold for grid lines', () => {
    expect(getClassicBoardLineGold()).toBe(CLASSIC_BOARD_LINE_GOLD);
    expect(CLASSIC_BOARD_LINE_GOLD.lineRgba).toBe('rgba(255, 205, 92, 0.74)');
    expect(CLASSIC_BOARD_LINE_GOLD.nodeRgba).toBe('rgba(255, 205, 92, 0.46)');
  });
});
