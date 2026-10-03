import { WATCH_LIMIT_MS, WatchLimit } from '../watchLimit';

describe('WatchLimit', () => {
  it('is 3 minutes', () => {
    expect(WATCH_LIMIT_MS).toBe(180_000);
  });

  it('is not expired until the limit has passed since the first check', () => {
    let t = 1000;
    const w = new WatchLimit(180_000, () => t);
    expect(w.expired()).toBe(false);
    t += 179_999;
    expect(w.expired()).toBe(false);
    t += 1;
    expect(w.expired()).toBe(true);
  });

  it('continue starts a full new period', () => {
    let t = 0;
    const w = new WatchLimit(100, () => t);
    w.expired();
    t = 150;
    expect(w.expired()).toBe(true);
    w.continueWatching();
    expect(w.expired()).toBe(false);
    t = 249;
    expect(w.expired()).toBe(false);
    t = 250;
    expect(w.expired()).toBe(true);
  });

  it('reset forgets the old start (a new game gets a new period)', () => {
    let t = 0;
    const w = new WatchLimit(100, () => t);
    w.expired();
    t = 500;
    expect(w.expired()).toBe(true);
    w.reset();
    expect(w.expired()).toBe(false);
  });
});
