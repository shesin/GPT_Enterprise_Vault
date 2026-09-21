import {
  CLASSIC_BOARD_LINE_GOLD,
  getActiveBoardLineTheme,
  getClassicBoardLineGold,
} from '../boardLineGoldThemes';
import {
  COMPLETE_LOOK_IDS,
  getPlayShellTheme,
  PLAY_BOARD_LOOK_STORAGE_KEY,
} from '../playShellThemes';

function mockStoredBoardLook(id: string): void {
  const store = new Map<string, string>([[PLAY_BOARD_LOOK_STORAGE_KEY, id]]);
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
}

describe('boardLineGoldThemes', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('locks Classic gold for grid lines', () => {
    expect(getClassicBoardLineGold()).toBe(CLASSIC_BOARD_LINE_GOLD);
    expect(CLASSIC_BOARD_LINE_GOLD.lineRgba).toBe('rgba(255, 205, 92, 0.74)');
    expect(CLASSIC_BOARD_LINE_GOLD.nodeRgba).toBe('rgba(255, 205, 92, 0.46)');
  });

  // Regression guard (2026-09-20) — id 19 (Pearl Gold) and id 20 (Jade
  // Matched) were added to lovableOklchTokens.ts with their own line colours,
  // but a since-removed separate rgba table was never updated for them, so
  // both boards silently rendered gold grid lines on canvas despite every
  // other layer being correct. getActiveBoardLineTheme() now derives directly
  // from each board's own theme.lineColor instead of a hand-maintained table,
  // so this can't happen again — this test proves that derivation for every
  // board id, not just the two that broke.
  it('every non-charcoal board look derives its own line colour from theme.lineColor (no silent gold fallback)', () => {
    const boardIds = [...COMPLETE_LOOK_IDS];
    for (const id of boardIds) {
      mockStoredBoardLook(id);
      const expectedLine = getPlayShellTheme(id).lineColor;
      const lineTheme = getActiveBoardLineTheme();
      expect(lineTheme.lineRgba).toBe(`${expectedLine.replace(/\)$/, '')} / 85%)`);
      expect(lineTheme.lineRgba).not.toBe(CLASSIC_BOARD_LINE_GOLD.lineRgba);
    }
  });
});
