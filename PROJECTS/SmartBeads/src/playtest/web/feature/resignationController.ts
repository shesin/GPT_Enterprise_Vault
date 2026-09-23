import { Player } from '../../../models/GameState';
import { FeatureSession } from './FeatureSession';
import { aiCenterFromSession, aiTimerFromSession } from './aiTurnRunner';
import { shouldAcceptResignationDraw } from './HonestAi';

export interface ResignationElements {
  resignOfferModal: HTMLDivElement;
  resignOfferDesc: HTMLParagraphElement;
}

export interface ResignationDeps {
  getSession: () => FeatureSession;
  isAnimating: () => boolean;
  isAiThinking: () => boolean;
  clearTimerId: () => void;
  cancelAiWork: () => void;
  updateUI: () => void;
  sideDisplayName: (player: Player) => string;
}

export interface ResignationController {
  canOfferResignation: () => boolean;
  beginResignation: () => void;
  finishResignation: (resigning: Player, acceptDraw: boolean) => void;
  getPendingResignPlayer: () => Player | null;
  clearPendingResignPlayer: () => void;
}

/** Resignation offer/accept/decline flow — its modal, its pending-offer state. */
export function createResignationController(
  elements: ResignationElements,
  deps: ResignationDeps,
): ResignationController {
  const { resignOfferModal, resignOfferDesc } = elements;
  let pendingResignPlayer: Player | null = null;

  function canOfferResignation(): boolean {
    const session = deps.getSession();
    if (session.getSettings().mode === 'spectate' || session.getSettings().mode === 'coach')
      return false;
    if (session.isGameOver() || deps.isAnimating() || deps.isAiThinking()) return false;
    if (pendingResignPlayer !== null) return false;
    // Only the side to move may resign (PvE: human only on cream's turn).
    if (session.getSettings().mode === 'pve' && session.getEngine().getState().currentPlayer !== 'RED') {
      return false;
    }
    return true;
  }

  function resigningPlayerForMode(): Player {
    const session = deps.getSession();
    const settings = session.getSettings();
    if (settings.mode === 'pve') return 'RED';
    return session.getEngine().getState().currentPlayer;
  }

  function finishResignation(resigning: Player, acceptDraw: boolean): void {
    deps.clearTimerId();
    deps.cancelAiWork();
    resignOfferModal.style.display = 'none';
    pendingResignPlayer = null;
    deps.getSession().resolveResignation(resigning, acceptDraw);
    deps.updateUI();
  }

  function beginResignation(): void {
    if (!canOfferResignation()) return;
    const session = deps.getSession();
    const settings = session.getSettings();
    const resigning = resigningPlayerForMode();
    const confirmed = window.confirm(
      `Offer resignation as ${deps.sideDisplayName(resigning)}? Opponent may accept a draw or claim a win.`,
    );
    if (!confirmed) return;

    if (settings.mode === 'pve') {
      const testOverride = sessionStorage.getItem('sb-test-resign-ai');
      let acceptDraw: boolean;
      if (testOverride === 'accept') {
        acceptDraw = true;
      } else if (testOverride === 'reject') {
        acceptDraw = false;
      } else {
        acceptDraw = shouldAcceptResignationDraw(
          session.getBoardVariant(),
          session.getEngine().exportSnapshot(),
          session.getAiPlayer(),
          aiCenterFromSession(session),
          aiTimerFromSession(session),
        );
      }
      finishResignation(resigning, acceptDraw);
      return;
    }

    pendingResignPlayer = resigning;
    resignOfferDesc.textContent = `${deps.sideDisplayName(resigning)} offers resignation. Agree to a draw?`;
    resignOfferModal.style.display = 'flex';
  }

  function getPendingResignPlayer(): Player | null {
    return pendingResignPlayer;
  }

  function clearPendingResignPlayer(): void {
    pendingResignPlayer = null;
  }

  return {
    canOfferResignation,
    beginResignation,
    finishResignation,
    getPendingResignPlayer,
    clearPendingResignPlayer,
  };
}
