import { getBoardLookTheme } from '../boardLookThemes';

describe('boardLookThemes', () => {
  it('exposes four board canvas presets from the complete row', () => {
    const labels = (['1', '2', '3', '4'] as const).map((id) => getBoardLookTheme(id).label);
    expect(labels).toEqual([
      'Deep teal / blue-green',
      'Deep plum / violet',
      'Forest & Gold',
      'Warm brown',
    ]);
    const keys = (['1', '2', '3', '4'] as const).map(
      (id) => `${getBoardLookTheme(id).edgeGlowRgba}|${JSON.stringify(getBoardLookTheme(id).creamHorizontalStops)}`,
    );
    expect(new Set(keys).size).toBe(4);
  });
});
