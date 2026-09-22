import { LOVABLE_COMPLETE_BOARD_THEMES } from '../lovableOklchTokens';
import {
  applyPlayLookFromRow,
  applyPlayLookFromSwatch,
  applyPlayLookState,
  COMPLETE_LOOK_IDS,
  MATCHED_SIDE_LOOK_IDS,
  PLAY_SHELL_THEMES,
  PLAY_THEME_STORAGE_KEY,
  readBoardLookThemeId,
  readPlayBoardMatchMode,
  readSideLookThemeId,
  readStoredBoardLookId,
  readStoredSideLookId,
  resolvePlayLookRowFromButton,
  syncPlayLookFromStorageIfDrifted,
  syncThemeSwatchActive,
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

describe('playShellThemes — 9 complete boards (5 base + 4 light-canvas Matched) + charcoal side shell', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'document');
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('defines nine complete board presets plus charcoal side shell', () => {
    expect(COMPLETE_LOOK_IDS).toEqual(['1', '2', '3', '6', '14', '23', '24', '25', '26']);
    expect(PLAY_SHELL_THEMES['7'].lookGroup).toBe('side-only');
    expect(PLAY_SHELL_THEMES['25'].lookGroup).toBe('complete');
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
    const warmWalnut = PLAY_SHELL_THEMES['14'];
    expect(warmWalnut.label).toBe('Warm Walnut');
    expect(warmWalnut.surfaceTop).toBe('oklch(0.55 0.075 55)');
    expect(warmWalnut.frameOuter).toBe('oklch(0.32 0.06 50)');
    expect(warmWalnut.lineColor).toBe('oklch(0.76 0.055 80)');
  });

  it('deprecated swatch helper applies charcoal side by default for a light-canvas Matched board', () => {
    mockPlayThemeDom('1', '1', 'matched', {
      'sb-play-board-look': '3',
      'sb-play-side-look-v3': '3',
    });
    applyPlayLookState('3', '3');
    const jadeMatched = applyPlayLookFromSwatch('25');
    expect(jadeMatched.boardLookId).toBe('25');
    expect(jadeMatched.sideLookId).toBe('7');
    expect(jadeMatched.boardChanged).toBe(true);
    expect(readPlayBoardMatchMode()).toBe('side-only');
  });

  it('deprecated swatch helper keeps stored board when DOM still shows default 1', () => {
    mockPlayThemeDom('1', '1', 'matched', {
      'sb-play-board-look': '3',
      'sb-play-side-look-v3': '3',
    });
    const pearlMatched = applyPlayLookFromSwatch('26');
    expect(pearlMatched.boardLookId).toBe('26');
    expect(pearlMatched.sideLookId).toBe('7');
    expect(readStoredBoardLookId()).toBe('26');
  });

  // Mirrors REMOVED_LIGHT_BOARD_LOOK_IDS and REMOVED_COMPLETE_LOOK_IDS in
  // playShellThemes.ts (both private, not exported) — this is the exact
  // failure class that already broke production once (see
  // boardLineGoldThemes.test.ts's regression-guard comment for ids 19/20):
  // a browser with a since-removed id already in storage must fall back
  // cleanly, not crash getPlayShellTheme() (2026-09-22 audit).
  it.each(['4', '8', '9', '10', '11', '13', '15', '16', '17', '18', '19', '20', '21', '22'])(
    'migrates a stored removed id (%s) back to the default board without throwing',
    (removedId) => {
      mockPlayThemeDom('1', '1', 'matched', {
        'sb-play-board-look': removedId,
        'sb-play-side-look-v3': removedId,
      });
      expect(() => applyPlayLookState(readStoredBoardLookId(), readStoredSideLookId())).not.toThrow();
      expect(readBoardLookThemeId()).toBe('1');
      expect(readPlayBoardMatchMode()).toBe('side-only');
    },
  );

  it('migrates a stored id from the removed charcoal-paired light row (e.g. old Sandy Beige, id 4) back to the default board', () => {
    mockPlayThemeDom('1', '1', 'matched', {
      'sb-play-board-look': '4',
      'sb-play-side-look-v3': '4',
    });
    applyPlayLookState(readStoredBoardLookId(), readStoredSideLookId());
    expect(readBoardLookThemeId()).toBe('1');
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
    expect(PLAY_SHELL_THEMES['6'].surfaceTop).toBe(LOVABLE_COMPLETE_BOARD_THEMES[3].surface);
  });

  describe('dark-same row — matched side panel colour (2026-09-19)', () => {
    it('resolvePlayLookRowFromButton recognises the matched row class', () => {
      const btn = { closest: (sel: string) => (sel === '.play-theme-swatches--dark-same' ? {} : null) } as unknown as HTMLElement;
      expect(resolvePlayLookRowFromButton(btn)).toBe('dark-same');
    });

    it.each(MATCHED_SIDE_LOOK_IDS)('applies board colour as the side panel for eligible id %s', (id) => {
      mockPlayThemeDom('1', '1', 'matched', {
        'sb-play-board-look': '1',
        'sb-play-side-look-v3': '1',
      });
      const matched = applyPlayLookFromRow(id, 'dark-same');
      expect(matched.boardLookId).toBe(id);
      expect(matched.sideLookId).toBe(id);
      expect(readPlayBoardMatchMode()).toBe('matched');
      // Side panel reuses the board's own `surface` token, not the charcoal
      // side theme — and not necessarily `surfaceTop`, since a board may
      // override its canvas-only lightness (e.g. Classic Green's palest
      // variant) while keeping the panel on the original token.
      const tokens = LOVABLE_COMPLETE_BOARD_THEMES.find((t) => t.label === PLAY_SHELL_THEMES[id].label);
      expect(PLAY_SHELL_THEMES[id].sideCardBackground).toContain(tokens!.surface);
    });

    it('rejects dark-same for an unknown/removed board id (e.g. old Sandy Beige, id 4)', () => {
      mockPlayThemeDom('1', '1', 'matched', {
        'sb-play-board-look': '1',
        'sb-play-side-look-v3': '1',
      });
      const priorBoard = readStoredBoardLookId();
      const result = applyPlayLookFromRow('4', 'dark-same');
      expect(result.boardLookId).toBe(priorBoard);
      expect(result.boardChanged).toBe(false);
    });

    it('matched selection survives a simulated reload (coalesceStoredLookState), unlike a stray board-only write', () => {
      mockPlayThemeDom('1', '1', 'matched', {
        'sb-play-board-look': '1',
        'sb-play-side-look-v3': '1',
      });
      applyPlayLookFromRow('2', 'dark-same');
      // Re-read exactly like a fresh page load would (this is the code path the
      // drift-correction safety net also calls) — must NOT collapse to charcoal.
      expect(readStoredBoardLookId()).toBe('2');
      expect(readStoredSideLookId()).toBe('2');
      expect(syncPlayLookFromStorageIfDrifted()).toBe(false);
    });
  });

  it('reads board and side look from storage when DOM drifts back to default 1', () => {
    mockPlayThemeDom('1', '1', 'matched', {
      'sb-play-board-look': '14',
      'sb-play-side-look-v3': '7',
    });
    applyPlayLookState('14', '7');
    const shell = document.getElementById('play-shell') as { setAttribute: (k: string, v: string) => void };
    shell.setAttribute('data-play-board-look', '1');
    shell.setAttribute('data-play-side-look', '1');
    expect(readBoardLookThemeId()).toBe('14');
    expect(readSideLookThemeId()).toBe('7');
    expect(readPlayBoardMatchMode()).toBe('side-only');
    expect(syncPlayLookFromStorageIfDrifted()).toBe(true);
    expect(document.getElementById('play-shell')?.getAttribute('data-play-board-look')).toBe('14');
    expect(document.getElementById('play-shell')?.getAttribute('data-play-side-look')).toBe('7');
  });

  it('honours stored matched board+side for a matched-eligible id (Purple Night, 2026-09-19)', () => {
    // Purple Night became matched-eligible when the row grew to all 5 dark
    // boards, so stored board===side==='6' is now a legitimate Matched
    // selection, not stale Row-3 leftovers to coerce back to charcoal.
    mockPlayThemeDom('6', '6', 'matched', {
      'sb-play-board-look': '6',
      'sb-play-side-look-v3': '6',
    });
    expect(readStoredBoardLookId()).toBe('6');
    expect(readStoredSideLookId()).toBe('6');
    expect(readPlayBoardMatchMode()).toBe('matched');
  });

  it('stores board id in v2 when side is charcoal-only (recovery backup)', () => {
    mockPlayThemeDom('1', '1', 'matched');
    applyPlayLookState('6', '7');
    expect(localStorage.getItem(PLAY_THEME_STORAGE_KEY)).toBe('6');
    applyPlayLookState('14', '7');
    expect(localStorage.getItem(PLAY_THEME_STORAGE_KEY)).toBe('14');
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
              setAttribute: jest.fn(),
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

  it('syncThemeSwatchActive clears stale highlights so only one swatch is active globally', () => {
    type Swatch = { id: string; row: string; active: boolean };
    const hubSwatches: Swatch[] = [
      { id: '2', row: 'dark-charcoal', active: true },
      { id: '25', row: 'dark-same', active: true },
      { id: '14', row: 'dark-charcoal', active: false },
    ];
    const shellSwatches: Swatch[] = [
      { id: '2', row: 'dark-charcoal', active: true },
      { id: '25', row: 'dark-same', active: true },
      { id: '14', row: 'dark-charcoal', active: false },
    ];
    const makeRoot = (swatches: Swatch[]) => ({
      querySelectorAll: () => swatches.map((s) => ({
        dataset: { playTheme: s.id },
        closest: (sel: string) => (sel.includes(s.row) ? {} : null),
        classList: {
          remove: (cls: string) => {
            if (cls === 'is-active') s.active = false;
          },
          toggle: (_: string, on: boolean) => {
            s.active = on;
          },
        },
        setAttribute: jest.fn(),
      })),
    });
    Object.defineProperty(globalThis, 'document', {
      value: {
        querySelectorAll: (sel: string) => {
          if (sel === '.play-theme-swatch.is-active') {
            return [...hubSwatches, ...shellSwatches]
              .filter((s) => s.active)
              .map((s) => ({
                classList: {
                  remove: (cls: string) => {
                    if (cls === 'is-active') s.active = false;
                  },
                },
              }));
          }
          if (sel.includes('data-play-look-setting')) {
            return [makeRoot(hubSwatches), makeRoot(shellSwatches)];
          }
          return [];
        },
      },
      configurable: true,
    });

    syncThemeSwatchActive('14', '7');

    expect(hubSwatches.filter((s) => s.active)).toHaveLength(1);
    expect(shellSwatches.filter((s) => s.active)).toHaveLength(1);
    expect(hubSwatches.find((s) => s.id === '14')?.active).toBe(true);
    expect(shellSwatches.find((s) => s.id === '14')?.active).toBe(true);
    expect(hubSwatches.find((s) => s.id === '2')?.active).toBe(false);
    expect(hubSwatches.find((s) => s.id === '25')?.active).toBe(false);
  });
});
