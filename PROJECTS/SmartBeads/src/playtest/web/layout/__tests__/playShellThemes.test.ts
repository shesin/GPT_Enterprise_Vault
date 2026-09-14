import { LOVABLE_COMPLETE_BOARD_THEMES, LOVABLE_LIGHT_BOARD_THEMES } from '../lovableOklchTokens';
import {
  applyPlayLookFromRow,
  applyPlayLookFromSwatch,
  applyPlayLookState,
  COMPLETE_LOOK_IDS,
  LIGHT_BOARD_LOOK_IDS,
  PLAY_SHELL_THEMES,
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

  it('dark-same row sets board and side to the same id', () => {
    mockPlayThemeDom('4', '7', 'side-only');
    const result = applyPlayLookFromRow('2', 'dark-same');
    expect(result.boardLookId).toBe('2');
    expect(result.sideLookId).toBe('2');
    expect(readPlayBoardMatchMode()).toBe('matched');
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

  it('same swatch id differs by row (purple night matched vs charcoal sides)', () => {
    mockPlayThemeDom('1', '1', 'matched');
    const matched = applyPlayLookFromRow('6', 'dark-same');
    expect(matched.boardLookId).toBe('6');
    expect(matched.sideLookId).toBe('6');
    expect(readPlayBoardMatchMode()).toBe('matched');

    const charcoal = applyPlayLookFromRow('6', 'dark-charcoal');
    expect(charcoal.boardLookId).toBe('6');
    expect(charcoal.sideLookId).toBe('7');
    expect(readPlayBoardMatchMode()).toBe('side-only');
  });
});
