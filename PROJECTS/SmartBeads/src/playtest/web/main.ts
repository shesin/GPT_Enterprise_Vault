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

function launchHubPve(boardId: ProductBoardId): void {
  showDirectPlayBoard();
  const testApi = (window as unknown as { __SB_TEST__?: { switchBoard?: (id: ProductBoardId) => void } })
    .__SB_TEST__;
  testApi?.switchBoard?.(boardId);
}

function boot(): void {
  if (isDirectPlayBoard()) {
    showDirectPlayBoard();
  } else {
    bootstrapPlayHub(launchHubPve);
  }
  bootstrapPlayShell();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  boot();
} else {
  window.addEventListener('DOMContentLoaded', boot);
}
