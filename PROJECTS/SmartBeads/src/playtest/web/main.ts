import { bootstrapPlayHub } from './PlayHub';
import { bootstrapPlayShell } from './PlayController';
import type { ProductBoardId } from '../../config/BoardCatalog';
import type { GameFeatureSettings } from './feature/GameFeatureSettings';
import type { HubLaunchAction } from './PlayHub';

function isDirectPlayBoard(): boolean {
  if (new URLSearchParams(window.location.search).get('play') === '1') return true;
  return document.body.dataset.sbDirectPlay === '1';
}

function showPlayShell(): void {
  document.getElementById('play-hub')?.classList.add('is-hidden');
  document.getElementById('play-shell')?.classList.remove('is-hidden');
  document.body.classList.remove('hub-page');
}

function testApi(): {
  enterFromHub?: (
    boardId: ProductBoardId,
    mode: GameFeatureSettings['mode'],
    action: HubLaunchAction,
  ) => void;
  launchCoachLesson?: () => void;
} | undefined {
  return (window as unknown as {
    __SB_TEST__?: {
      enterFromHub?: (
        boardId: ProductBoardId,
        mode: GameFeatureSettings['mode'],
        action: HubLaunchAction,
      ) => void;
      launchCoachLesson?: () => void;
    };
  }).__SB_TEST__;
}

function boot(): void {
  const coachParam = new URLSearchParams(window.location.search).get('coach');

  if (isDirectPlayBoard()) {
    showPlayShell();
    bootstrapPlayShell(() => {
      if (coachParam === 'start' || coachParam === '1') {
        testApi()?.launchCoachLesson?.();
      }
    });
    return;
  }

  document.body.classList.add('hub-page');

  bootstrapPlayShell(() => {
    bootstrapPlayHub((boardId, mode, action) => {
      showPlayShell();
      testApi()?.enterFromHub?.(boardId, mode, action);
    });
    if (coachParam === 'start' || coachParam === '1') {
      document.getElementById('hub-section-lesson')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  boot();
} else {
  window.addEventListener('DOMContentLoaded', boot);
}
