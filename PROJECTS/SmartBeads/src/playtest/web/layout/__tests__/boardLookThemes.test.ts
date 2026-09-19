import { LOVABLE_LIGHT_BOARD_THEMES } from '../lovableOklchTokens';
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

  it('exposes complete and light board presets including lovable compare swatches', () => {
    expect(getBoardLookTheme('1').label).toBe('Classic Green');
    expect(getBoardLookTheme('6').label).toBe('Purple Night');
    expect(getBoardLookTheme('4').label).toBe('Sandy Beige');
    expect(getBoardLookTheme('15').label).toBe('Seaglass');
    expect(getBoardLookTheme('14').label).toBe('Warm Walnut');
  });

  it('active board look follows light board id when side is charcoal', () => {
    mockPlayThemeDom('15', '7');
    applyPlayLookState('15', '7');
    const active = getActiveBoardLookTheme();
    const seaglass = LOVABLE_LIGHT_BOARD_THEMES[1];
    expect(active.surfaceTop).toBe(seaglass.surface);
    expect(active.frameOuter).toBe(seaglass.frameOuter);
  });
});
