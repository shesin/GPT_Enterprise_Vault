import { bootstrapPlayHub } from './PlayHub';
import { bootstrapPlayShell } from './PlayController';
import { installGlobalErrorBanner } from './globalErrorBanner';
import { createBrowserOnlineClient, wireOnlineLobby } from './online/onlineLobby';
import { resumeOnlineGame } from './online/onlineResume';
import { AiSearchClient, type AiWorkerLike } from './feature/aiSearchClient';
import AiSearchWorker from './feature/aiSearchWorker?worker';

function isDirectPlayBoard(): boolean {
  if (new URLSearchParams(window.location.search).get('play') === '1') return true;
  return document.body.dataset.sbDirectPlay === '1';
}

function showPlayShell(): void {
  document.getElementById('play-hub')?.classList.add('is-hidden');
  document.getElementById('play-shell')?.classList.remove('is-hidden');
  document.body.classList.remove('hub-page');
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
      (launcher) => {
        if (coachParam === 'start' || coachParam === '1') {
          launcher.launchCoachLesson();
        }
      },
      { aiSearchClient },
    );
    return;
  }

  document.body.classList.add('hub-page');

  bootstrapPlayShell(
    (launcher) => {
      const lobby = wireOnlineLobby((game) => {
        showPlayShell();
        launcher.enterOnline(game);
      });
      bootstrapPlayHub(
        (boardId, mode, action) => {
          showPlayShell();
          launcher.enterFromHub(boardId, mode, action);
        },
        (boardId) => lobby.open(boardId),
      );
      // A refreshed page goes straight back into its online room.
      void resumeOnlineGame(createBrowserOnlineClient).then((game) => {
        if (!game) return;
        showPlayShell();
        launcher.enterOnline(game);
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

installGlobalErrorBanner();

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  boot();
} else {
  window.addEventListener('DOMContentLoaded', boot);
}
