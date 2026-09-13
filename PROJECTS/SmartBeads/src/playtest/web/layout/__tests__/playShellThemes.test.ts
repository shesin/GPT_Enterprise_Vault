import {
  isSideOnlyLookId,
  LOCKED_HUB_CENTRE,
  migrateLegacyPlayThemeId,
  normalizeSideLookId,
  PLAY_SHELL_THEMES,
  resolveBoardCanvasLook,
  resolveBoardMatchForTheme,
  resolveHubBoardMatchForSideLook,
  resolveHubCentrePalette,
  resolvePlayShellPresentation,
} from '../playShellThemes';

describe('playShellThemes', () => {
  it('defines five look presets in two groups (warm parchment removed)', () => {
    const themes = Object.values(PLAY_SHELL_THEMES);
    expect(themes).toHaveLength(5);
    expect(themes.filter((t) => t.lookGroup === 'complete').map((t) => t.label)).toEqual([
      'Deep teal / blue-green',
      'Deep plum / violet',
      'Forest & Gold',
      'Warm brown',
    ]);
    expect(themes.filter((t) => t.lookGroup === 'side-only').map((t) => t.label)).toEqual([
      'Charcoal + gold accents',
    ]);
  });

  it('pairs board and side within the same colour family for complete looks', () => {
    expect(PLAY_SHELL_THEMES['1'].surfaceTop).toBe('#0f3d48');
    expect(PLAY_SHELL_THEMES['1'].sideCardBackground).toContain('#143840');
    expect(PLAY_SHELL_THEMES['2'].surfaceTop).toBe('#24162b');
    expect(PLAY_SHELL_THEMES['2'].sideCardBackground).toContain('#2a1932');
    expect(PLAY_SHELL_THEMES['3'].surfaceTop).toBe('#0a3828');
    expect(PLAY_SHELL_THEMES['3'].sideCardBackground).toContain('#1a4030');
    expect(PLAY_SHELL_THEMES['4'].surfaceTop).toBe('#3d2e22');
    expect(PLAY_SHELL_THEMES['4'].sideCardBackground).toContain('#352820');
  });

  it('uses flat cream stops on board looks (no asymmetric fade)', () => {
    const matched = resolveBoardCanvasLook('1', 'matched');
    expect(matched.creamHorizontalStops.every(([, c]) => c === 'rgba(0,0,0,0)')).toBe(true);
    expect(matched.creamVerticalStops.every(([, c]) => c === 'rgba(0,0,0,0)')).toBe(true);
  });

  it('board match always follows board look id (complete row)', () => {
    expect(resolveBoardMatchForTheme('1')).toBe('matched');
    expect(resolveBoardMatchForTheme('4')).toBe('matched');
    expect(resolveHubBoardMatchForSideLook('5')).toBe('side-only');
    expect(resolveHubBoardMatchForSideLook('3')).toBe('matched');
  });

  it('resolves board canvas from board look only', () => {
    expect(resolveBoardCanvasLook('1', 'matched').surfaceTop).toBe('#0f3d48');
    expect(resolveBoardCanvasLook('4', 'matched').surfaceTop).toBe('#3d2e22');
    expect(resolveBoardCanvasLook('3', 'matched').surfaceTop).toBe('#0a3828');
  });

  it('charcoal side uses flat dark panels', () => {
    expect(PLAY_SHELL_THEMES['5'].sideCardBackground).toBe('#121110');
    expect(PLAY_SHELL_THEMES['5'].bodyBackground).toBe('#0e0d0b');
  });

  it('uses side theme body background for shell presentation', () => {
    expect(resolvePlayShellPresentation('5', 'matched').bodyBackground).toBe('#0e0d0b');
    expect(resolvePlayShellPresentation('3', 'matched').bodyBackground).toBe('#12281f');
  });

  it('keeps hub centre on locked green when side look is charcoal', () => {
    expect(resolveHubCentrePalette('5', 'side-only')).toEqual(LOCKED_HUB_CENTRE);
    expect(resolveHubCentrePalette('2', 'matched').centreBg).toBe('#24162b');
  });

  it('identifies side-only swatch as charcoal (5) only', () => {
    expect(isSideOnlyLookId('5')).toBe(true);
    expect(isSideOnlyLookId('3')).toBe(false);
  });

  it('migrates retired warm parchment id to charcoal', () => {
    expect(normalizeSideLookId('6')).toBe('5');
    expect(migrateLegacyPlayThemeId('6')).toBe('5');
    expect(migrateLegacyPlayThemeId('4')).toBe('5');
    expect(migrateLegacyPlayThemeId('5')).toBe('5');
  });
});
