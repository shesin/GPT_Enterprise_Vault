import { readBeadSetId } from '../beadSetThemes';
import {
  readMoveHintAuraStyle,
  readMoveHintAuraToggle,
  writeMoveHintAuraToggle,
} from '../moveHintAuraThemes';

/** Private windows / blocked site data make every localStorage call throw — drawing must survive it. */
describe('blocked localStorage (private window, blocked site data)', () => {
  beforeEach(() => {
    const boom = (): never => {
      throw new DOMException('blocked', 'SecurityError');
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: boom, setItem: boom, removeItem: boom, clear: boom },
      configurable: true,
    });
  });

  it('the bead set falls back to the default instead of throwing', () => {
    expect(() => readBeadSetId()).not.toThrow();
    expect(readBeadSetId()).toBe('white-black');
  });

  it('the move-hint aura falls back to "on" and can be written without throwing', () => {
    expect(readMoveHintAuraToggle()).toBe('on');
    expect(() => writeMoveHintAuraToggle('off')).not.toThrow();
    expect(() => readMoveHintAuraStyle()).not.toThrow();
  });
});
