import { LOVABLE_BOARD_THEMES } from '../lovableOklchTokens';
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

  it('exposes six board presets from play shell themes', () => {
    expect(getBoardLookTheme('1').label).toBe('Classic Green');
    expect(getBoardLookTheme('6').label).toBe('Purple Night');
  });

  it('active board look follows stored board id, not side-only side id', () => {
    mockPlayThemeDom('3', '7');
    applyPlayLookState('3', '7');
    const active = getActiveBoardLookTheme();
    const ocean = LOVABLE_BOARD_THEMES[2];
    expect(active.surfaceTop).toBe(ocean.surface);
    expect(active.frameOuter).toBe(ocean.surface);
    expect(active.lineColor).toBe(ocean.lines);
  });
});
