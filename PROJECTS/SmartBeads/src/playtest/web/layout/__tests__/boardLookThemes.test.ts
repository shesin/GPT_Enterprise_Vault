import { BOARD_LOOK_THEMES } from '../boardLookThemes';



describe('boardLookThemes', () => {

  it('defines three snapshot board+bead presets', () => {

    const themes = Object.values(BOARD_LOOK_THEMES);

    expect(themes).toHaveLength(3);

    expect(themes.map((t) => t.label)).toEqual(['Classic Dark', 'Warm parchment', 'Camp edge glow']);

    const keys = themes.map((t) => `${t.edgeGlowRgba}|${JSON.stringify(t.creamHorizontalStops)}`);

    expect(new Set(keys).size).toBe(3);

  });

});

