export function fmtClock(sec: number): string {
  const clamped = sec < 0 ? 0 : sec;
  const m = Math.floor(clamped / 60)
    .toString()
    .padStart(2, '0');
  const s = (clamped % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function updatePlayerTimerMmss(
  el: HTMLElement | null,
  displaySec: number,
  limitSec: number,
): void {
  if (!el) return;
  if (limitSec <= 0) {
    el.textContent = 'OFF';
    el.classList.add('off');
    return;
  }
  el.classList.remove('off');
  el.textContent = fmtClock(displaySec);
}

export function updateShotRing(
  ringEl: HTMLElement | null,
  secEl: HTMLElement | null,
  secs: number,
  limit: number,
  active: boolean,
): void {
  if (!ringEl || !secEl) return;
  if (limit <= 0) {
    ringEl.classList.add('off');
    ringEl.style.setProperty('--shot-pct', '1');
    secEl.textContent = '—';
    return;
  }
  ringEl.classList.toggle('off', !active);
  const clamped = Math.max(0, secs);
  const pct = limit > 0 ? clamped / limit : 0;
  ringEl.style.setProperty('--shot-pct', String(pct));
  secEl.textContent = String(clamped);
}
