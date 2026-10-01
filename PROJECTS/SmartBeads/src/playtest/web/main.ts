import { bootstrapPlayHub } from './PlayHub';
import { bootstrapPlayShell } from './PlayController';
import { AiSearchClient, type AiWorkerLike } from './feature/aiSearchClient';
import AiSearchWorker from './feature/aiSearchWorker?worker';
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

function testApi():
  | {
      enterFromHub?: (
        boardId: ProductBoardId,
        mode: GameFeatureSettings['mode'],
        action: HubLaunchAction,
      ) => void;
      launchCoachLesson?: () => void;
    }
  | undefined {
  return (
    window as unknown as {
      __SB_TEST__?: {
        enterFromHub?: (
          boardId: ProductBoardId,
          mode: GameFeatureSettings['mode'],
          action: HubLaunchAction,
        ) => void;
        launchCoachLesson?: () => void;
      };
    }
  ).__SB_TEST__;
}

/** AI search runs in a Web Worker so the page never freezes while the AI thinks (no worker support -> undefined -> main-thread search). */
function createAiSearchClient(): AiSearchClient | undefined {
  if (typeof Worker === 'undefined') return undefined;
  return new AiSearchClient(() => new AiSearchWorker() as unknown as AiWorkerLike);
}

function boot(): void {
  const aiSearchClient = createAiSearchClient();
  const coachParam = new URLSearchParams(window.location.search).get('coach');

  if (isDirectPlayBoard()) {
    showPlayShell();
    bootstrapPlayShell(
      () => {
        if (coachParam === 'start' || coachParam === '1') {
          testApi()?.launchCoachLesson?.();
        }
      },
      { aiSearchClient },
    );
    return;
  }

  document.body.classList.add('hub-page');

  bootstrapPlayShell(
    () => {
      bootstrapPlayHub((boardId, mode, action) => {
        showPlayShell();
        testApi()?.enterFromHub?.(boardId, mode, action);
      });
      if (coachParam === 'start' || coachParam === '1') {
        document
          .getElementById('hub-section-lesson')
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    },
    { aiSearchClient },
  );
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  boot();
} else {
  window.addEventListener('DOMContentLoaded', boot);
}
