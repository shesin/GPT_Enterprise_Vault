import { fmtClock, updateMatchRing, updatePlayerTimerMmss, updateShotRing } from '../timerDisplay';

function fakeEl() {
  const classes = new Set<string>();
  const props = new Map<string, string>();
  return {
    textContent: '',
    classList: {
      add: (c: string) => void classes.add(c),
      remove: (c: string) => void classes.delete(c),
      toggle: (c: string, on?: boolean) => {
        const want = on ?? !classes.has(c);
        if (want) classes.add(c);
        else classes.delete(c);
        return want;
      },
      contains: (c: string) => classes.has(c),
    },
    style: { setProperty: (k: string, v: string) => void props.set(k, v) },
    prop: (k: string) => props.get(k),
  };
}
const el = () => fakeEl() as unknown as HTMLElement & { prop(k: string): string | undefined };

describe('timer display', () => {
  it('formats clocks as mm:ss and never shows negative time', () => {
    expect(fmtClock(0)).toBe('00:00');
    expect(fmtClock(65)).toBe('01:05');
    expect(fmtClock(3600)).toBe('60:00');
    expect(fmtClock(-4)).toBe('00:00');
  });

  it('a running timer shows its time; a timer that is off shows OFF (this is what the phone layout keys on)', () => {
    const e = el();
    updatePlayerTimerMmss(e, 299, 300);
    expect(e.textContent).toBe('04:59');
    expect(e.classList.contains('off')).toBe(false);
    updatePlayerTimerMmss(e, 0, 0);
    expect(e.textContent).toBe('OFF');
    expect(e.classList.contains('off')).toBe(true);
  });

  it('the match ring tracks the fraction left and flags low time', () => {
    const ring = el();
    updateMatchRing(ring, 30, 120, true);
    expect(ring.prop('--match-pct')).toBe('0.25');
    expect(ring.classList.contains('low-time')).toBe(true);
    expect(ring.classList.contains('off')).toBe(false);
    updateMatchRing(ring, 0, 0, false);
    expect(ring.classList.contains('off')).toBe(true);
    expect(ring.classList.contains('low-time')).toBe(false);
  });

  it('the shot ring counts down only for the active side and clamps at zero', () => {
    const ring = el();
    const sec = el();
    updateShotRing(ring, sec, 12, 60, true);
    expect(sec.textContent).toBe('12');
    expect(ring.prop('--shot-pct')).toBe('0.2');
    expect(ring.classList.contains('off')).toBe(false);
    updateShotRing(ring, sec, -3, 60, true);
    expect(sec.textContent).toBe('0');
    updateShotRing(ring, sec, 60, 60, false);
    expect(ring.classList.contains('off')).toBe(true);
    updateShotRing(ring, sec, 0, 0, false);
    expect(sec.textContent).toBe('—');
  });
});
