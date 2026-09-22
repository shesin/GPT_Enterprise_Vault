import { coachSegmentBannerUntilMs, type CoachVideoSegmentBanner } from './CoachLesson';

export interface StartBannerElements {
  celebrationFx: HTMLDivElement | null;
  celebrationParticles: HTMLDivElement | null;
  startBanner: HTMLDivElement | null;
  startBannerTitle: HTMLDivElement | null;
  startBannerSubtitle: HTMLDivElement | null;
}

export interface StartBannerDeps {
  isCoachMode: () => boolean;
  getCoachTimeMs: () => number | undefined;
  getBoardDisplayName: () => string;
}

export interface StartBannerController {
  emitCelebrationSparkles: (targetContainer?: HTMLElement | null) => void;
  triggerStartBanner: (initialTitle?: string, subtitle?: string) => void;
  dismissStartBanner: () => void;
  triggerCoachSegmentBanner: (
    banner: CoachVideoSegmentBanner | null,
    atTimeMs?: number,
    holdMsOverride?: number,
  ) => void;
}

/** Celebration sparkles + start/coach-segment banner effects on the play shell overlay. */
export function createStartBannerController(
  elements: StartBannerElements,
  deps: StartBannerDeps,
): StartBannerController {
  const { celebrationFx, celebrationParticles, startBanner, startBannerTitle, startBannerSubtitle } =
    elements;
  let bannerTimer: number | null = null;
  let bannerPhase2Timer: number | null = null;

  function emitCelebrationSparkles(targetContainer: HTMLElement | null = celebrationParticles): void {
    if (!targetContainer) return;
    targetContainer.innerHTML = '';

    const colors = ['#ffd700', '#fbbf24', '#ffffff', '#f8fafc', '#fef08a'];
    const shapes = ['★', '✦', '✧', '★', '✦'];
    const count = 20;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'celebration-particle';
      const shape = shapes[i % shapes.length]!;
      p.textContent = shape;

      const angle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.3;
      const distance = 60 + Math.random() * 130;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const rot = (Math.random() - 0.5) * 360;
      const dur = 1.4 + Math.random() * 0.6;
      const delay = Math.random() * 0.25;
      const size = 12 + Math.random() * 12;
      const color = colors[i % colors.length]!;

      p.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      p.style.setProperty('--dy', `${dy.toFixed(1)}px`);
      p.style.setProperty('--rot', `${rot.toFixed(0)}deg`);
      p.style.setProperty('--dur', `${dur.toFixed(2)}s`);
      p.style.setProperty('--delay', `${delay.toFixed(2)}s`);
      p.style.setProperty('--size', `${size.toFixed(0)}px`);
      p.style.setProperty('--color', color);

      targetContainer.appendChild(p);
    }
  }

  function dismissStartBanner(): void {
    if (celebrationFx) celebrationFx.classList.remove('animate', 'coach-segment-top');
    if (startBanner)
      startBanner.classList.remove('animate', 'coach-segment-banner', 'coach-segment-banner-move');
    if (startBannerSubtitle) startBannerSubtitle.style.display = '';
    if (celebrationParticles) celebrationParticles.innerHTML = '';
    if (bannerTimer !== null) {
      clearTimeout(bannerTimer);
      bannerTimer = null;
    }
    if (bannerPhase2Timer !== null) {
      clearTimeout(bannerPhase2Timer);
      bannerPhase2Timer = null;
    }
  }

  function triggerStartBanner(initialTitle?: string, subtitle?: string): void {
    if (!startBanner || !startBannerTitle || !startBannerSubtitle) return;
    const boardName = subtitle ?? deps.getBoardDisplayName();
    startBannerSubtitle.textContent = `★ ${boardName.toUpperCase()} ★`;
    startBannerTitle.textContent = initialTitle ?? '★ MATCH START ★';

    if (bannerTimer !== null) {
      clearTimeout(bannerTimer);
      bannerTimer = null;
    }
    if (bannerPhase2Timer !== null) {
      clearTimeout(bannerPhase2Timer);
      bannerPhase2Timer = null;
    }

    // Reset and trigger animations
    celebrationFx?.classList.remove('animate');
    startBanner.classList.remove('animate');
    void startBanner.offsetWidth;

    celebrationFx?.classList.add('animate');
    startBanner.classList.add('animate');
    emitCelebrationSparkles();

    // Phase 2: Pop into "READY... PLAY!" at 0.75s
    bannerPhase2Timer = window.setTimeout(() => {
      if (startBannerTitle && startBanner.classList.contains('animate')) {
        startBannerTitle.textContent = 'READY... PLAY!';
        emitCelebrationSparkles();
      }
      bannerPhase2Timer = null;
    }, 750);

    // Total duration: 2.0 seconds
    bannerTimer = window.setTimeout(() => {
      dismissStartBanner();
    }, 2000);
  }

  function triggerCoachSegmentBanner(
    banner: CoachVideoSegmentBanner | null,
    atTimeMs?: number,
    holdMsOverride?: number,
  ): void {
    if (!deps.isCoachMode()) return;
    if (!banner) {
      dismissStartBanner();
      return;
    }
    if (!startBanner || !startBannerTitle || !startBannerSubtitle || !celebrationFx) return;

    startBannerTitle.textContent = banner.title;
    if (banner.subtitle) {
      startBannerSubtitle.textContent = banner.subtitle;
      startBannerSubtitle.style.display = '';
    } else {
      startBannerSubtitle.style.display = 'none';
    }

    if (bannerTimer !== null) {
      clearTimeout(bannerTimer);
      bannerTimer = null;
    }
    if (bannerPhase2Timer !== null) {
      clearTimeout(bannerPhase2Timer);
      bannerPhase2Timer = null;
    }

    const nowMs = atTimeMs ?? deps.getCoachTimeMs() ?? banner.atMs;
    const untilMs =
      holdMsOverride != null ? nowMs + holdMsOverride : coachSegmentBannerUntilMs(banner);
    const remainingMs = Math.max(400, untilMs - nowMs);
    const isMoveBanner = banner.atMs === 0 && banner.title === 'MOVE';

    celebrationFx.classList.add('coach-segment-top');
    celebrationFx.classList.remove('animate');
    startBanner.classList.remove('animate', 'coach-segment-banner', 'coach-segment-banner-move');
    void startBanner.offsetWidth;

    const animSec = `${(remainingMs / 1000).toFixed(2)}s`;
    startBanner.style.setProperty('--coach-banner-dur', animSec);
    celebrationFx.classList.add('animate');
    startBanner.classList.add('animate', 'coach-segment-banner');
    if (isMoveBanner) startBanner.classList.add('coach-segment-banner-move');
    // Coach watch-only: no celebration sparkles on segment banners.

    bannerTimer = window.setTimeout(() => {
      dismissStartBanner();
    }, remainingMs);
  }

  return { emitCelebrationSparkles, triggerStartBanner, dismissStartBanner, triggerCoachSegmentBanner };
}
