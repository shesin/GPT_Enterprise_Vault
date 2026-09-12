import { CREAM_CAMP_TINT_THEMES } from '../creamCampTintThemes';

describe('creamCampTintThemes', () => {
  it('defines four distinct cream-camp wash presets', () => {
    const themes = Object.values(CREAM_CAMP_TINT_THEMES);
    expect(themes).toHaveLength(4);
    const keys = themes.map((t) => JSON.stringify([t.horizontalStops, t.verticalStops]));
    expect(new Set(keys).size).toBe(4);
  });
});
