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

  it('recognises off, original, gold-fill, and black-gold-fill presets', () => {
    expect(isMoveHintAuraStyle('off')).toBe(true);
    expect(isMoveHintAuraStyle('original')).toBe(true);
    expect(isMoveHintAuraStyle('gold-fill')).toBe(true);
    expect(isMoveHintAuraStyle('black-gold-fill')).toBe(true);
    expect(isMoveHintAuraStyle('white-gold')).toBe(false);
  });

  it('defaults to gold-fill on a dark/complete board and round-trips storage', () => {
    expect(readMoveHintAuraStyle()).toBe('gold-fill');
    writeMoveHintAuraStyle('black-gold-fill');
    expect(localStorage.getItem(MOVE_HINT_AURA_STORAGE_KEY)).toBe('black-gold-fill');
    expect(readMoveHintAuraStyle()).toBe('black-gold-fill');
  });

  it('defaults to black-gold-fill on a light-canvas Matched board (e.g. Seaglass Matched, id 23)', () => {
    localStorage.setItem('sb-play-board-look', '23');
    expect(readMoveHintAuraStyle()).toBe('black-gold-fill');
  });

  it('an explicit "off" choice persists on both board types, not overridden by the soft default', () => {
    writeMoveHintAuraStyle('off');
    expect(readMoveHintAuraStyle()).toBe('off');
    localStorage.setItem('sb-play-board-look', '23');
    expect(readMoveHintAuraStyle()).toBe('off');
  });

  it('migrates retired aura storage to gold-fill', () => {
    for (const retired of ['white-gold', 'gold-no-fill', 'ring-only']) {
      localStorage.setItem(MOVE_HINT_AURA_STORAGE_KEY, retired);
      expect(readMoveHintAuraStyle()).toBe('gold-fill');
    }
  });
});
