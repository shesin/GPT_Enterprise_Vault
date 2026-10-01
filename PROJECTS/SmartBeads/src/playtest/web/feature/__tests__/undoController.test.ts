import { FeatureSession } from '../FeatureSession';
import { GameFeatureSettings } from '../GameFeatureSettings';
import { createUndoController } from '../undoController';

const base: GameFeatureSettings = {
  mode: 'pvp',
  aiLevel: 2,
  timer: 'off',
  tournamentTimer: 'off',
  shotClock: 'off',
  centerRule: 'off',
};

function setup(settings: Partial<GameFeatureSettings>) {
  const resumeAutomatedPlay = jest.fn();
  const session = new FeatureSession('6', { ...base, ...settings });
  const undoBtn = { disabled: true } as HTMLButtonElement;
  const undo = createUndoController(
    { undoBtn },
    {
      getSession: () => session,
      isAnimating: () => false,
      isAiThinking: () => false,
      cancelAiWork: () => {},
      clearAnim: () => {},
      resetTurnCaptures: () => {},
      clearMoveFeedback: () => {},
      hideResultModal: () => {},
      hideResignOfferModal: () => {},
      clearPendingResignPlayer: () => {},
      startTimersIfNotGameOver: () => {},
      resumeAutomatedPlay,
      updateUI: () => {},
    },
  );
  const play = (): void => {
    undo.pushSnapshot();
    session.applyMove(session.getEngine().getLegalMoves()[0]!);
  };
  return { session, undoBtn, undo, play, resumeAutomatedPlay };
}

describe('Undo and the clocks', () => {
  it('Undo takes the move back but never gives time back (match timer)', () => {
    const { session, undo, play } = setup({ timer: '2' });
    play();
    for (let i = 0; i < 10; i += 1) session.timerTick();
    expect(session.getGlobalMatchRemaining()).toBe(110);
    undo.undo();
    expect(session.getMoveCount()).toBe(0);
    expect(session.getGlobalMatchRemaining()).toBe(110);
  });

  it('Undo never gives time back (tournament clocks)', () => {
    const { session, undo, play } = setup({ tournamentTimer: '2' });
    play();
    for (let i = 0; i < 7; i += 1) session.timerTick();
    const p1 = session.getP1Clock();
    const p2 = session.getP2Clock();
    undo.undo();
    expect(session.getP1Clock()).toBe(p1);
    expect(session.getP2Clock()).toBe(p2);
  });

  it('after Undo the player to move starts with a full shot clock', () => {
    const { session, undo, play } = setup({ shotClock: '30' });
    play();
    for (let i = 0; i < 20; i += 1) session.timerTick();
    undo.undo();
    expect(session.getShotRemaining()).toBe(30);
  });

  it('a game lost on time cannot be reopened with Undo (match timer)', () => {
    const { session, undoBtn, undo, play } = setup({ timer: '2' });
    play();
    for (let i = 0; i < 120; i += 1) session.timerTick();
    expect(session.isGameOver()).toBe(true);
    undo.syncButtonState();
    expect(undoBtn.disabled).toBe(true);
    undo.undo();
    expect(session.isGameOver()).toBe(true);
  });

  it('a game lost on the shot clock cannot be reopened with Undo', () => {
    const { session, undoBtn, undo, play } = setup({ shotClock: '30' });
    play();
    for (let i = 0; i < 30; i += 1) session.timerTick();
    expect(session.getDisplayedReason()).toBe('Shot clock expired.');
    undo.syncButtonState();
    expect(undoBtn.disabled).toBe(true);
    undo.undo();
    expect(session.isGameOver()).toBe(true);
  });

  it('after Undo the shell is asked to resume automated play (AI to move must not be left waiting)', () => {
    const { session, undo, play, resumeAutomatedPlay } = setup({ mode: 'pve' });
    session.setStartingPlayer('BLUE');
    play();
    expect(resumeAutomatedPlay).not.toHaveBeenCalled();
    undo.undo();
    expect(session.getEngine().getState().currentPlayer).toBe('BLUE');
    expect(resumeAutomatedPlay).toHaveBeenCalledTimes(1);
  });

  it('a normal game over (no clock) can still be taken back', () => {
    const { session, undo, play } = setup({});
    play();
    session.endGameByFeature('RED', 'Black resigned.');
    undo.undo();
    expect(session.isGameOver()).toBe(false);
    expect(session.getMoveCount()).toBe(0);
  });
});
