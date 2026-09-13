import {
  isMoveHintAuraStyle,
  readMoveHintAuraStyle,
  writeMoveHintAuraStyle,
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

  it('recognises off, original, and gold-fill presets', () => {
    expect(isMoveHintAuraStyle('off')).toBe(true);
    expect(isMoveHintAuraStyle('original')).toBe(true);
    expect(isMoveHintAuraStyle('gold-fill')).toBe(true);
    expect(isMoveHintAuraStyle('white-gold')).toBe(false);
  });

  it('defaults to off and round-trips storage', () => {
    expect(readMoveHintAuraStyle()).toBe('off');
    writeMoveHintAuraStyle('gold-fill');
    expect(localStorage.getItem(MOVE_HINT_AURA_STORAGE_KEY)).toBe('gold-fill');
    expect(readMoveHintAuraStyle()).toBe('gold-fill');
  });

  it('migrates retired aura storage to gold-fill', () => {
    for (const retired of ['white-gold', 'gold-no-fill', 'ring-only']) {
      localStorage.setItem(MOVE_HINT_AURA_STORAGE_KEY, retired);
      expect(readMoveHintAuraStyle()).toBe('gold-fill');
    }
  });
});
