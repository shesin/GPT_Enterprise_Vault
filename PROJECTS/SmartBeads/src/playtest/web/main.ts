import { bootstrapPlayHub } from './PlayHub';
import { bootstrapPlayShell } from './PlayController';
import type { ProductBoardId } from '../../config/BoardCatalog';
import { clampUiAiLevel, type AiLevel } from './feature/GameFeatureSettings';
import { getCatalogEntry } from '../../config/BoardCatalog';

function isDirectPlayBoard(): boolean {
  if (new URLSearchParams(window.location.search).get('play') === '1') return true;
  return document.body.dataset.sbDirectPlay === '1';
}

function isCoachWatchMode(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('coach') === '1' || params.get('spectate') === '1';
}

function parseCoachUrlOptions(): {
  boardId?: ProductBoardId;
  coachRedLevel?: AiLevel;
  coachBlueLevel?: AiLevel;
} {
  const params = new URLSearchParams(window.location.search);
  const boardParam = params.get('board');
  const boardId = boardParam && getCatalogEntry(boardParam as ProductBoardId)
    ? boardParam as ProductBoardId
    : undefined;

  const clampLevel = (raw: string | null): AiLevel | undefined => {
    if (!raw) return undefined;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return undefined;
    return clampUiAiLevel(n);
  };

  return {
    boardId,
    coachRedLevel: clampLevel(params.get('red')),
    coachBlueLevel: clampLevel(params.get('blue')),
  };
}

function showDirectPlayBoard(): void {
  document.getElementById('play-hub')?.classList.add('is-hidden');
  document.getElementById('play-shell')?.classList.remove('is-hidden');
}

function launchHubPve(boardId: ProductBoardId): void {
  showDirectPlayBoard();
  const testApi = (window as unknown as { __SB_TEST__?: { switchBoard?: (id: ProductBoardId) => void } })
    .__SB_TEST__;
  testApi?.switchBoard?.(boardId);
}

function boot(): void {
  if (isCoachWatchMode() || isDirectPlayBoard()) {
    showDirectPlayBoard();
  } else {
    bootstrapPlayHub(launchHubPve);
  }
  bootstrapPlayShell();
  if (isCoachWatchMode()) {
    const testApi = (window as unknown as {
      __SB_TEST__?: {
        prepareCoachWatch?: (opts?: {
          boardId?: ProductBoardId;
          coachRedLevel?: AiLevel;
          coachBlueLevel?: AiLevel;
        }) => void;
      };
    }).__SB_TEST__;
    testApi?.prepareCoachWatch?.(parseCoachUrlOptions());
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  boot();
} else {
  window.addEventListener('DOMContentLoaded', boot);
}
