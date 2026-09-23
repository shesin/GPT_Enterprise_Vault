import { FeatureSession, SessionSnapshot } from './FeatureSession';
import { isHumanVsAiMode } from './GameFeatureSettings';

export interface UndoElements {
  undoBtn: HTMLButtonElement;
}

export interface UndoDeps {
  getSession: () => FeatureSession;
  isAnimating: () => boolean;
  isAiThinking: () => boolean;
  cancelAiWork: () => void;
  clearAnim: () => void;
  resetTurnCaptures: () => void;
  clearMoveFeedback: () => void;
  hideResultModal: () => void;
  hideResignOfferModal: () => void;
  clearPendingResignPlayer: () => void;
  startTimersIfNotGameOver: () => void;
  updateUI: () => void;
}

export interface UndoController {
  pushSnapshot: () => void;
  undo: () => void;
  reset: () => void;
  syncButtonState: () => void;
}

/** Undo-stack bookkeeping + the undo action itself, and the undo button's enabled state. */
export function createUndoController(elements: UndoElements, deps: UndoDeps): UndoController {
  const { undoBtn } = elements;
  const undoStack: SessionSnapshot[] = [];

  function pushSnapshot(): void {
    undoStack.push(deps.getSession().exportSnapshot());
    if (undoStack.length > 80) undoStack.shift();
    undoBtn.disabled = undoStack.length === 0;
  }

  function undo(): void {
    if (deps.isAnimating() || deps.isAiThinking() || undoStack.length === 0) return;
    deps.cancelAiWork();
    deps.clearAnim();
    deps.resetTurnCaptures();
    deps.clearMoveFeedback();
    const session = deps.getSession();
    const settings = session.getSettings();
    const uiState = session.getUiState();

    if (
      isHumanVsAiMode(settings.mode) &&
      undoStack.length >= 2 &&
      session.getEngine().getState().currentPlayer === 'RED' &&
      uiState !== 'chain'
    ) {
      undoStack.pop();
      session.loadSnapshot(undoStack.pop()!);
    } else {
      session.loadSnapshot(undoStack.pop()!);
    }

    deps.hideResultModal();
    deps.hideResignOfferModal();
    deps.clearPendingResignPlayer();
    undoBtn.disabled = undoStack.length === 0;
    deps.startTimersIfNotGameOver();
    deps.updateUI();
  }

  function reset(): void {
    undoStack.length = 0;
    undoBtn.disabled = true;
  }

  function syncButtonState(): void {
    const settings = deps.getSession().getSettings();
    undoBtn.disabled =
      undoStack.length === 0 || deps.isAnimating() || deps.isAiThinking() || settings.mode === 'spectate';
  }

  return { pushSnapshot, undo, reset, syncButtonState };
}
