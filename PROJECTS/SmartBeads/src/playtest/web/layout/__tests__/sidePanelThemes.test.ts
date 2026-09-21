import { SIDE_PANEL_THEMES } from '../sidePanelThemes';

describe('sidePanelThemes', () => {
  it('defines complete board and charcoal side presets', () => {
    expect(Object.keys(SIDE_PANEL_THEMES).sort()).toEqual([
      '1',
      '14',
      '2',
      '23',
      '24',
      '25',
      '26',
      '3',
      '6',
      '7',
    ]);
    expect(SIDE_PANEL_THEMES['25'].label).toBe('Celadon Jade Matched');
    expect(SIDE_PANEL_THEMES['7'].label).toContain('Charcoal');
  });
});
