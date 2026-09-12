import { SIDE_PANEL_THEMES } from '../sidePanelThemes';

describe('sidePanelThemes', () => {
  it('defines three unified side panel presets', () => {
    const themes = Object.values(SIDE_PANEL_THEMES);
    expect(themes).toHaveLength(3);
    expect(themes.map((t) => t.label)).toEqual(['Classic Dark', 'Warm parchment', 'Camp edge glow']);
  });
});
