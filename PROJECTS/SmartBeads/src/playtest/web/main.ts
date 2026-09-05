import { bootstrapPlayHub } from './PlayHub';
import { bootstrapPlayShell } from './PlayController';
import type { ProductBoardId } from '../../config/BoardCatalog';

function isDirectPlayBoard(): boolean {
  if (new URLSearchParams(window.location.search).get('play') === '1') return true;
  return document.body.dataset.sbDirectPlay === '1';
}

function showDirectPlayBoard(): void {
  document.getElementById('play-hub')?.classList.add('is-hidden');
  document.getElementById('play-shell')?.classList.remove('is-hidden');
}

function testApi(): {
  switchBoard?: (id: ProductBoardId) => void;
  launchCoachLesson?: () => void;
} | undefined {
  return (window as unknown as {
    __SB_TEST__?: {
      switchBoard?: (id: ProductBoardId) => void;
      launchCoachLesson?: () => void;
    };
  }).__SB_TEST__;
}

function launchHubPve(boardId: ProductBoardId): void {
  showDirectPlayBoard();
  testApi()?.switchBoard?.(boardId);
}

function launchHubCoach(): void {
  showDirectPlayBoard();
  testApi()?.launchCoachLesson?.();
}

function boot(): void {
  const coachParam = new URLSearchParams(window.location.search).get('coach');

  if (isDirectPlayBoard()) {
    showDirectPlayBoard();
    bootstrapPlayShell(() => {
      if (coachParam === 'start') {
        testApi()?.launchCoachLesson?.();
      }
    });
    return;
  }

  bootstrapPlayHub(launchHubPve, launchHubCoach);
  bootstrapPlayShell(() => {
    if (coachParam === 'start') {
      launchHubCoach();
    }
  });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  boot();
} else {
  window.addEventListener('DOMContentLoaded', boot);
}
