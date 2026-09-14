import { LOVABLE_COMPLETE_BOARD_THEMES, LOVABLE_LIGHT_BOARD_THEMES } from '../lovableOklchTokens';
import {
  applyPlayLookFromRow,
  applyPlayLookFromSwatch,
  applyPlayLookState,
  COMPLETE_LOOK_IDS,
  LIGHT_BOARD_LOOK_IDS,
  PLAY_SHELL_THEMES,
  PLAY_THEME_STORAGE_KEY,
  readBoardLookThemeId,
  readPlayBoardMatchMode,
  readSideLookThemeId,
  readStoredBoardLookId,
  readStoredSideLookId,
  syncPlayLookFromStorageIfDrifted,
} from '../playShellThemes';

function mockPlayThemeDom(
  boardLook: string,
  sideLook: string,
  boardMatch = 'matched',
  seedStorage?: Record<string, string>,
): void {
  const attrs = new Map<string, string>([
    ['data-play-board-look', boardLook],
    ['data-play-side-look', sideLook],
    ['data-play-board-match', boardMatch],
  ]);
  const shell = {
    setAttribute(key: string, value: string) {
      attrs.set(key, value);
    },
    getAttribute(key: string) {
      return attrs.get(key) ?? null;
    },
    style: { setProperty: jest.fn() },
  };
  const store = new Map<string, string>(Object.entries(seedStorage ?? {}));
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'document', {
    value: {
      getElementById: (id: string) => (id === 'play-shell' ? shell : null),
      body: {
        setAttribute: jest.fn(),
        style: { background: '', setProperty: jest.fn() },
      },
      querySelectorAll: () => [],
    },
    configurable: true,
  });
}

describe('playShellThemes — 4 complete + 4 light (charcoal sides)', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'document');
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('defines four complete and four light board presets plus charcoal side shell', () => {
    expect(COMPLETE_LOOK_IDS).toEqual(['1', '2', '3', '5', '6']);
    expect(LIGHT_BOARD_LOOK_IDS).toEqual(['4', '9', '10', '12']);
    expect(PLAY_SHELL_THEMES['7'].lookGroup).toBe('side-only');
    expect(PLAY_SHELL_THEMES['4'].lookGroup).toBe('light-charcoal');
  });

  it('complete looks use one colour family on board frame and side panels', () => {
    for (const id of COMPLETE_LOOK_IDS) {
      const index = COMPLETE_LOOK_IDS.indexOf(id);
      const tokens = LOVABLE_COMPLETE_BOARD_THEMES[index];
      const theme = PLAY_SHELL_THEMES[id];
      expect(theme.label).toBe(tokens.label);
      expect(theme.frameOuter).toBe(tokens.frameOuter);
      expect(theme.sideCardBackground).toContain(tokens.surface);
    }
  });

  it('warm walnut uses distinct lovable frame colours on the board', () => {
    const warmWalnut = PLAY_SHELL_THEMES['12'];
    expect(warmWalnut.label).toBe('Warm Walnut');
    expect(warmWalnut.surfaceTop).toBe('oklch(0.55 0.075 55)');
    expect(warmWalnut.frameOuter).toBe('oklch(0.32 0.06 50)');
    expect(warmWalnut.lineColor).toBe('oklch(0.76 0.055 80)');
  });

  it('light looks are board-only tokens paired with charcoal side shell', () => {
    for (const id of LIGHT_BOARD_LOOK_IDS) {
      const index = LIGHT_BOARD_LOOK_IDS.indexOf(id);
      const tokens = LOVABLE_LIGHT_BOARD_THEMES[index];
      const theme = PLAY_SHELL_THEMES[id];
      expect(theme.label).toBe(tokens.label);
      expect(theme.lookGroup).toBe('light-charcoal');
    }
  });

  it('light swatch applies charcoal sides and keeps board colour', () => {
    mockPlayThemeDom('1', '1', 'matched', {
      'sb-play-board-look': '3',
      'sb-play-side-look-v3': '3',
    });
    applyPlayLookState('3', '3');
    const sandy = applyPlayLookFromSwatch('4');
    expect(sandy.boardLookId).toBe('4');
    expect(sandy.sideLookId).toBe('7');
    expect(sandy.boardChanged).toBe(true);
    expect(readPlayBoardMatchMode()).toBe('side-only');
  });

  it('light swatch keeps stored board when DOM still shows default 1', () => {
    mockPlayThemeDom('1', '1', 'matched', {
      'sb-play-board-look': '3',
      'sb-play-side-look-v3': '3',
    });
    const softBlush = applyPlayLookFromSwatch('9');
    expect(softBlush.boardLookId).toBe('9');
    expect(softBlush.sideLookId).toBe('7');
    expect(readStoredBoardLookId()).toBe('9');
  });

  it('migrates old complete sandy (board 4 + side 4) to light + charcoal', () => {
    mockPlayThemeDom('4', '4', 'matched', {
      'sb-play-board-look': '4',
      'sb-play-side-look-v3': '4',
    });
    applyPlayLookState(readStoredBoardLookId(), readStoredSideLookId());
    expect(readBoardLookThemeId()).toBe('4');
    expect(readPlayBoardMatchMode()).toBe('side-only');
  });

  it('dark-charcoal row applies charcoal sides for the same swatch id', () => {
    mockPlayThemeDom('6', '6', 'matched', {
      'sb-play-board-look': '6',
      'sb-play-side-look-v3': '6',
    });
    applyPlayLookState('6', '6');
    const charcoalSide = applyPlayLookFromRow('6', 'dark-charcoal');
    expect(charcoalSide.boardChanged).toBe(false);
    expect(charcoalSide.boardLookId).toBe('6');
    expect(charcoalSide.sideLookId).toBe('7');
    expect(readPlayBoardMatchMode()).toBe('side-only');
    expect(PLAY_SHELL_THEMES['6'].surfaceTop).toBe(LOVABLE_COMPLETE_BOARD_THEMES[4].surface);
  });

  it('reads board and side look from storage when DOM drifts back to default 1', () => {
    mockPlayThemeDom('1', '1', 'matched', {
      'sb-play-board-look': '12',
      'sb-play-side-look-v3': '7',
    });
    applyPlayLookState('12', '7');
    const shell = document.getElementById('play-shell') as { setAttribute: (k: string, v: string) => void };
    shell.setAttribute('data-play-board-look', '1');
    shell.setAttribute('data-play-side-look', '1');
    expect(readBoardLookThemeId()).toBe('12');
    expect(readSideLookThemeId()).toBe('7');
    expect(readPlayBoardMatchMode()).toBe('side-only');
    expect(syncPlayLookFromStorageIfDrifted()).toBe(true);
    expect(document.getElementById('play-shell')?.getAttribute('data-play-board-look')).toBe('12');
    expect(document.getElementById('play-shell')?.getAttribute('data-play-side-look')).toBe('7');
  });

  it('migrates old matched dark storage to dark theme with charcoal sides', () => {
    mockPlayThemeDom('6', '6', 'matched', {
      'sb-play-board-look': '6',
      'sb-play-side-look-v3': '6',
    });
    expect(readStoredBoardLookId()).toBe('6');
    expect(readStoredSideLookId()).toBe('7');
    expect(readPlayBoardMatchMode()).toBe('side-only');
  });

  it('stores board id in v2 when side is charcoal-only (recovery backup)', () => {
    mockPlayThemeDom('1', '1', 'matched');
    applyPlayLookState('6', '7');
    expect(localStorage.getItem(PLAY_THEME_STORAGE_KEY)).toBe('6');
    applyPlayLookState('12', '7');
    expect(localStorage.getItem(PLAY_THEME_STORAGE_KEY)).toBe('12');
    applyPlayLookState('6', '6');
    expect(localStorage.getItem(PLAY_THEME_STORAGE_KEY)).toBe('6');
  });

  it('recovers purple night board from v2 when primary board key is missing', () => {
    mockPlayThemeDom('6', '7', 'side-only', {
      'sb-play-side-look-v3': '7',
      'sb-play-theme-v2': '6',
    });
    localStorage.removeItem('sb-play-board-look');
    expect(readStoredBoardLookId()).toBe('6');
    expect(readStoredSideLookId()).toBe('7');
  });

  it('syncs swatch highlight even when shell attrs already match storage', () => {
    const swatches: Array<{ id: string; row: string; active: boolean }> = [
      { id: '6', row: 'dark-charcoal', active: false },
    ];
    const shell = {
      attrs: new Map<string, string>([
        ['data-play-board-look', '6'],
        ['data-play-side-look', '7'],
      ]),
      setAttribute(key: string, value: string) {
        this.attrs.set(key, value);
      },
      getAttribute(key: string) {
        return this.attrs.get(key) ?? null;
      },
      style: { setProperty: jest.fn() },
    };
    const store = new Map(Object.entries({
      'sb-play-board-look': '6',
      'sb-play-side-look-v3': '7',
    }));
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: {
        getElementById: (id: string) => (id === 'play-shell' ? shell : null),
        querySelectorAll: (sel: string) => {
          if (!sel.includes('data-play-look-setting')) return [];
          return [{
            querySelectorAll: () => swatches.map((s) => ({
              dataset: { playTheme: s.id },
              closest: (sel: string) => (sel.includes(s.row) ? {} : null),
              classList: { toggle: (_: string, on: boolean) => { s.active = on; } },
            })),
          }];
        },
        body: {
          setAttribute: jest.fn(),
          style: { background: '', setProperty: jest.fn() },
        },
      },
      configurable: true,
    });

    expect(syncPlayLookFromStorageIfDrifted()).toBe(false);
    expect(swatches.find((s) => s.row === 'dark-charcoal')?.active).toBe(true);
  });
});
