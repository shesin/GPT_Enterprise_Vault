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
  /** Undo can land on a position where the AI is to move (it opened the game): the shell must schedule it again. */
  resumeAutomatedPlay: () => void;
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
    // A game lost on a clock is final: Undo must not reopen it or give time back.
    if (deps.getSession().endedByClock()) return;
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
      session.loadSnapshot(undoStack.pop()!, { keepClocks: true });
    } else {
      session.loadSnapshot(undoStack.pop()!, { keepClocks: true });
    }

    deps.hideResultModal();
    deps.hideResignOfferModal();
    deps.clearPendingResignPlayer();
    undoBtn.disabled = undoStack.length === 0;
    deps.startTimersIfNotGameOver();
    deps.updateUI();
    deps.resumeAutomatedPlay();
  }

  function reset(): void {
    undoStack.length = 0;
    undoBtn.disabled = true;
  }

  function syncButtonState(): void {
    const session = deps.getSession();
    undoBtn.disabled =
      undoStack.length === 0 ||
      deps.isAnimating() ||
      deps.isAiThinking() ||
      session.getSettings().mode === 'spectate' ||
      session.endedByClock();
  }

  return { pushSnapshot, undo, reset, syncButtonState };
}
