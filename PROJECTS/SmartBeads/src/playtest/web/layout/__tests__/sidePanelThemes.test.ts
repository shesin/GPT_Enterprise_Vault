import { SIDE_PANEL_THEMES } from '../sidePanelThemes';

describe('sidePanelThemes', () => {
  it('defines complete, light board, and charcoal side presets', () => {
    expect(Object.keys(SIDE_PANEL_THEMES).sort()).toEqual([
      '1',
      '10',
      '12',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '9',
    ]);
    expect(SIDE_PANEL_THEMES['4'].label).toBe('Sandy Beige');
    expect(SIDE_PANEL_THEMES['7'].label).toContain('Charcoal');
  });
});
