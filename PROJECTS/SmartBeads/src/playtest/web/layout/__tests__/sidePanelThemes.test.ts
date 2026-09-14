import { SIDE_PANEL_THEMES } from '../sidePanelThemes';

describe('sidePanelThemes', () => {
  it('defines six complete side presets plus charcoal side-only label via shell themes', () => {
    expect(Object.keys(SIDE_PANEL_THEMES)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(SIDE_PANEL_THEMES['1'].label).toBe('Classic Green');
    expect(SIDE_PANEL_THEMES['7'].label).toContain('Charcoal');
  });
});
