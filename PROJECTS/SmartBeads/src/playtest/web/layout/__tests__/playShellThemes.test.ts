import { LOVABLE_BOARD_THEMES } from '../lovableOklchTokens';
import {
  applyPlayLookFromSwatch,
  applyPlayLookState,
  PLAY_SHELL_THEMES,
  readPlayBoardMatchMode,
  readBoardLookThemeId,
  SIDE_ONLY_LOOK_ID,
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

describe('playShellThemes — 6 complete + charcoal side-only', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'document');
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('defines six complete presets and one side-only charcoal', () => {
    expect(Object.keys(PLAY_SHELL_THEMES)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(PLAY_SHELL_THEMES['7'].lookGroup).toBe('side-only');
    expect(SIDE_ONLY_LOOK_ID).toBe('7');
  });

  it('complete looks use one colour family on board frame and side panels', () => {
    for (let i = 0; i < 6; i += 1) {
      const id = String(i + 1) as '1' | '2' | '3' | '4' | '5' | '6';
      const tokens = LOVABLE_BOARD_THEMES[i];
      const theme = PLAY_SHELL_THEMES[id];
      expect(theme.label).toBe(tokens.label);
      expect(theme.frameOuter).toBe(tokens.surface);
      expect(theme.frameInner).toBe(tokens.shadow);
      expect(theme.sideCardBackground).toContain(tokens.surface);
      expect(theme.playAiBg).toBe(tokens.shadow);
      expect(theme.bodyBackground).toBe(tokens.shadow);
    }
  });

  it('side-only swatch keeps board look and switches match mode', () => {
    mockPlayThemeDom('3', '3', 'matched');
    applyPlayLookState('3', '3');
    const sideOnly = applyPlayLookFromSwatch('7');
    expect(sideOnly.boardChanged).toBe(false);
    expect(sideOnly.boardLookId).toBe('3');
    expect(sideOnly.sideLookId).toBe('7');
    expect(readBoardLookThemeId()).toBe('3');
    expect(readPlayBoardMatchMode()).toBe('side-only');
  });

  it('side-only swatch keeps stored board when DOM still shows default 1', () => {
    mockPlayThemeDom('1', '1', 'matched', {
      'sb-play-board-look': '3',
      'sb-play-side-look-v3': '3',
      'sb-play-theme-v2': '3',
    });
    const sideOnly = applyPlayLookFromSwatch('7');
    expect(sideOnly.boardLookId).toBe('3');
    expect(sideOnly.boardChanged).toBe(false);
    expect(readBoardLookThemeId()).toBe('3');
  });

  it('complete swatch sets board and side to the same id', () => {
    mockPlayThemeDom('1', '7', 'side-only');
    const result = applyPlayLookFromSwatch('2');
    expect(result.boardLookId).toBe('2');
    expect(result.sideLookId).toBe('2');
    expect(result.boardChanged).toBe(true);
    expect(readBoardLookThemeId()).toBe('2');
    expect(readPlayBoardMatchMode()).toBe('matched');
  });
});
