import { createStartBannerController } from '../startBannerController';

function fakeEl() {
  const classes = new Set<string>();
  return {
    textContent: '',
    innerHTML: '',
    offsetWidth: 0,
    style: { display: '', setProperty: jest.fn() },
    appendChild: jest.fn(function (this: { innerHTML: string }) {
      this.innerHTML += 'x';
    }),
    classList: {
      add: (...c: string[]) => c.forEach((x) => classes.add(x)),
      remove: (...c: string[]) => c.forEach((x) => classes.delete(x)),
      contains: (c: string) => classes.has(c),
    },
  };
}

function setup(coach = false) {
  const els = {
    celebrationFx: fakeEl(),
    celebrationParticles: fakeEl(),
    startBanner: fakeEl(),
    startBannerTitle: fakeEl(),
    startBannerSubtitle: fakeEl(),
  };
  (globalThis as unknown as { window: unknown }).window = {
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms) as unknown as number,
  };
  (globalThis as unknown as { document: unknown }).document = {
    createElement: () => ({ className: '', textContent: '', style: { setProperty: jest.fn() } }),
  };
  const ctl = createStartBannerController(els as never, {
    isCoachMode: () => coach,
    getCoachTimeMs: () => 0,
    getBoardDisplayName: () => 'Board Six',
  });
  return { ctl, els };
}

describe('startBannerController (W8)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('start banner shows the board name, switches to READY... PLAY! at 0.75 s and clears itself at 2 s', () => {
    const { ctl, els } = setup();
    ctl.triggerStartBanner();
    expect(els.startBannerSubtitle.textContent).toBe('★ BOARD SIX ★');
    expect(els.startBannerTitle.textContent).toBe('★ MATCH START ★');
    expect(els.startBanner.classList.contains('animate')).toBe(true);
    jest.advanceTimersByTime(800);
    expect(els.startBannerTitle.textContent).toBe('READY... PLAY!');
    jest.advanceTimersByTime(1300);
    expect(els.startBanner.classList.contains('animate')).toBe(false);
    expect(els.celebrationFx.classList.contains('animate')).toBe(false);
  });

  it('dismissStartBanner cancels the pending timers (no late READY text)', () => {
    const { ctl, els } = setup();
    ctl.triggerStartBanner();
    ctl.dismissStartBanner();
    jest.advanceTimersByTime(3000);
    expect(els.startBannerTitle.textContent).toBe('★ MATCH START ★');
    expect(els.startBanner.classList.contains('animate')).toBe(false);
  });

  it('a second trigger restarts the sequence instead of stacking timers', () => {
    const { ctl, els } = setup();
    ctl.triggerStartBanner();
    jest.advanceTimersByTime(1500);
    ctl.triggerStartBanner('SECOND');
    jest.advanceTimersByTime(600);
    expect(els.startBannerTitle.textContent).toBe('SECOND'); // not dismissed by the first timer
    jest.advanceTimersByTime(300);
    expect(els.startBannerTitle.textContent).toBe('READY... PLAY!');
  });

  it('coach segment banners are ignored outside coach mode', () => {
    const { ctl, els } = setup(false);
    ctl.triggerCoachSegmentBanner({ atMs: 0, title: 'HELLO' } as never);
    expect(els.startBannerTitle.textContent).toBe('');
  });

  it('in coach mode a segment banner is shown, and null clears it', () => {
    const { ctl, els } = setup(true);
    ctl.triggerCoachSegmentBanner({ atMs: 0, title: 'MOVE', durationMs: 2000 } as never, 0, 1000);
    expect(els.startBannerTitle.textContent).toBe('MOVE');
    expect(els.startBanner.classList.contains('coach-segment-banner-move')).toBe(true);
    ctl.triggerCoachSegmentBanner(null);
    expect(els.startBanner.classList.contains('animate')).toBe(false);
  });
});
