import { SIDE_PANEL_THEMES } from '../sidePanelThemes';

describe('sidePanelThemes', () => {
  it('defines five unified side panel presets', () => {
    const themes = Object.values(SIDE_PANEL_THEMES);
    expect(themes).toHaveLength(5);
    expect(themes.map((t) => t.label)).toEqual([
      'Deep teal / blue-green',
      'Deep plum / violet',
      'Forest & Gold',
      'Warm brown',
      'Charcoal + gold accents',
    ]);
  });
});
