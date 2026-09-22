import {
  isMoveHintAuraToggle,
  readMoveHintAuraStyle,
  readMoveHintAuraToggle,
  writeMoveHintAuraToggle,
  MOVE_HINT_AURA_STORAGE_KEY,
} from '../moveHintAuraThemes';

describe('moveHintAuraThemes', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        },
      },
      configurable: true,
    });
  });

  it('recognises only off and on as valid toggle values', () => {
    expect(isMoveHintAuraToggle('off')).toBe(true);
    expect(isMoveHintAuraToggle('on')).toBe(true);
    expect(isMoveHintAuraToggle('original')).toBe(false);
    expect(isMoveHintAuraToggle('gold-fill')).toBe(false);
    expect(isMoveHintAuraToggle('white-gold')).toBe(false);
  });

  it('defaults to gold-fill on a dark/complete board and round-trips storage', () => {
    expect(readMoveHintAuraStyle()).toBe('gold-fill');
    writeMoveHintAuraToggle('off');
    expect(localStorage.getItem(MOVE_HINT_AURA_STORAGE_KEY)).toBe('off');
    expect(readMoveHintAuraStyle()).toBe('off');
  });

  it('defaults to black-gold-fill on a light-canvas Matched board (e.g. Seaglass Matched, id 23)', () => {
    localStorage.setItem('sb-play-board-look', '23');
    expect(readMoveHintAuraStyle()).toBe('black-gold-fill');
  });

  it('an explicit "off" choice persists on both board types, not overridden by the soft default', () => {
    writeMoveHintAuraToggle('off');
    expect(readMoveHintAuraStyle()).toBe('off');
    localStorage.setItem('sb-play-board-look', '23');
    expect(readMoveHintAuraStyle()).toBe('off');
  });

  it('migrates any pre-2026-09-21 stored value (original, gold-fill, retired styles) to on', () => {
    for (const legacy of ['original', 'gold-fill', 'black-gold-fill', 'white-gold', 'gold-no-fill', 'ring-only']) {
      localStorage.setItem(MOVE_HINT_AURA_STORAGE_KEY, legacy);
      // Assert the toggle itself, not just the style it happens to resolve
      // to on a dark board — a bug that returned 'off' but still resolved
      // gold-fill via another path wouldn't be caught by the style check
      // alone (2026-09-22 audit).
      expect(readMoveHintAuraToggle()).toBe('on');
      expect(readMoveHintAuraStyle()).toBe('gold-fill');
    }
  });
});
