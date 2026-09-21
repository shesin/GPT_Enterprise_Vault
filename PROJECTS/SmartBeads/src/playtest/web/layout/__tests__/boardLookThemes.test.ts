import { LOVABLE_COMPLETE_BOARD_THEMES } from '../lovableOklchTokens';
import { getActiveBoardLookTheme, getBoardLookTheme } from '../boardLookThemes';
import { applyPlayLookState } from '../playShellThemes';

function mockPlayThemeDom(boardLook: string, sideLook: string): void {
  const attrs = new Map<string, string>([
    ['data-play-board-look', boardLook],
    ['data-play-side-look', sideLook],
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
  const store = new Map<string, string>();
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

describe('boardLookThemes', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'document');
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('exposes complete board presets including the light-canvas Matched swatches', () => {
    expect(getBoardLookTheme('1').label).toBe('Classic Green');
    expect(getBoardLookTheme('6').label).toBe('Purple Night');
    expect(getBoardLookTheme('14').label).toBe('Warm Walnut');
    expect(getBoardLookTheme('25').label).toBe('Celadon Jade Matched');
  });

  it('active board look follows a light-canvas Matched board id when side is charcoal', () => {
    mockPlayThemeDom('25', '7');
    applyPlayLookState('25', '7');
    const active = getActiveBoardLookTheme();
    const jadeMatched = LOVABLE_COMPLETE_BOARD_THEMES[7];
    expect(active.surfaceTop).toBe(jadeMatched.boardSurface);
    expect(active.frameOuter).toBe(jadeMatched.frameOuter);
  });
});
