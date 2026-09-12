import {
  HUB_CENTRE_PALETTES,
  PLAY_SHELL_THEMES,
  resolveBoardCanvasLook,
  resolveHubCentrePalette,
  resolvePlayShellPresentation,
} from '../playShellThemes';

describe('playShellThemes', () => {
  it('defines three unified board+side panel presets', () => {
    const themes = Object.values(PLAY_SHELL_THEMES);
    expect(themes).toHaveLength(3);
    expect(themes.map((t) => t.label)).toEqual(['Classic Dark', 'Warm parchment', 'Camp edge glow']);
    expect(new Set(themes.map((t) => t.edgeGlowRgba)).size).toBe(3);
  });

  it('pairs board and side within the same theme family', () => {
    expect(PLAY_SHELL_THEMES['1'].sideCardBackground).toContain(PLAY_SHELL_THEMES['1'].surfaceTop);
    expect(PLAY_SHELL_THEMES['3'].sideCardBackground).toContain(PLAY_SHELL_THEMES['3'].surfaceTop);
    expect(PLAY_SHELL_THEMES['2'].surfaceTop).toBe('#1a4030');
    expect(PLAY_SHELL_THEMES['2'].sideCardBackground).toContain('#1c261e');
  });

  it('keeps warm parchment on green board with cream wash (not brown)', () => {
    expect(PLAY_SHELL_THEMES['2'].surfaceTop).toBe('#1a4030');
    expect(PLAY_SHELL_THEMES['2'].sideCardBackground).toContain('#1c261e');
    expect(PLAY_SHELL_THEMES['2'].bodyBackground).toContain('255,242,215');
  });

  it('keeps snapshot-green board in side-only and applies swatch board paint in matched mode', () => {
    const classic = PLAY_SHELL_THEMES['1'];
    const sideOnlyBoard = resolveBoardCanvasLook('3', 'side-only');
    const matchedBoard = resolveBoardCanvasLook('3', 'matched');
    expect(sideOnlyBoard).toEqual({
      surfaceTop: classic.surfaceTop,
      surfaceBottom: classic.surfaceBottom,
      creamHorizontalStops: classic.creamHorizontalStops,
      creamVerticalStops: classic.creamVerticalStops,
      edgeGlowRgba: classic.edgeGlowRgba,
    });
    expect(matchedBoard.edgeGlowRgba).toContain('255, 245, 220');
    expect(resolveBoardCanvasLook('2', 'side-only').creamHorizontalStops).toEqual(classic.creamHorizontalStops);
    expect(resolveBoardCanvasLook('2', 'matched').creamHorizontalStops).toEqual(
      PLAY_SHELL_THEMES['2'].creamHorizontalStops,
    );
    expect(resolvePlayShellPresentation('3', 'side-only').bodyBackground).toBe(classic.bodyBackground);
    expect(resolvePlayShellPresentation('3', 'matched').bodyBackground).toContain('255,245,220');
  });

  it('hub centre stays classic green in side-only and follows swatch in matched mode', () => {
    expect(resolveHubCentrePalette('2', 'side-only')).toEqual(HUB_CENTRE_PALETTES['1']);
    expect(resolveHubCentrePalette('2', 'matched').cardBg).toBe('#234036');
    expect(resolveHubCentrePalette('3', 'side-only').centreBg).toBe(HUB_CENTRE_PALETTES['1'].centreBg);
    expect(resolveHubCentrePalette('3', 'matched').centreBg).toBe('#1a4030');
  });
});
