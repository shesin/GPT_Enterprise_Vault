import { shellTimerShouldSkip } from '../clockPolicy';
import { FeatureSession } from '../FeatureSession';
import { GameFeatureSettings } from '../GameFeatureSettings';
import { runAiTurn } from '../../PlayController';

const base: GameFeatureSettings = {
  mode: 'pve',
  aiLevel: 2,
  matchTimer: 'off',
  shotClock: 'off',
  centerRule: 'off',
};

describe('shell clock policy (AI think must not freeze timers)', () => {
  it('does not skip ticks while aiThinking or animating', () => {
    expect(shellTimerShouldSkip({
      gameOver: false,
      aiThinking: true,
      animating: true,
    })).toBe(false);
  });

  it('skips only when the game is over', () => {
    expect(shellTimerShouldSkip({
      gameOver: true,
      aiThinking: true,
      animating: false,
    })).toBe(true);
  });
});

describe('shot clock during AI turn (agent-verified)', () => {
  it('shot remaining declines across ticks on BLUE turn before AI finishes', () => {
    const session = new FeatureSession('6x3x5', {
      ...base,
      shotClock: '30',
    });
    const slide = session.getEngine().getLegalMoves().find((m) => {
      const jump = session.getEngine().getState().board.jumpPaths?.some(
        (j) => j.from === m.from && j.to === m.to,
      );
      return !jump;
    });
    expect(slide).toBeDefined();
    session.applyMove(slide!);
    expect(session.getEngine().getState().currentPlayer).toBe('BLUE');
    session.resetTurnClock();
    expect(session.getShotRemaining()).toBe(30);

    // Simulate shell interval while AI is "thinking" (no move applied yet).
    for (let i = 0; i < 5; i++) {
      if (shellTimerShouldSkip({
        gameOver: session.isGameOver(),
        aiThinking: true,
        animating: false,
      })) break;
      session.timerTick();
    }
    expect(session.getShotRemaining()).toBe(25);
    expect(session.isGameOver()).toBe(false);
  });

  it('shot clock to 0 on BLUE awards Ivory (RED) even if AI has not moved', () => {
    const session = new FeatureSession('8x4x6', {
      ...base,
      shotClock: '10',
    });
    const slide = session.getEngine().getLegalMoves().find((m) => {
      const jump = session.getEngine().getState().board.jumpPaths?.some(
        (j) => j.from === m.from && j.to === m.to,
      );
      return !jump;
    });
    expect(slide).toBeDefined();
    session.applyMove(slide!);
    expect(session.getEngine().getState().currentPlayer).toBe('BLUE');
    session.resetTurnClock();
    for (let i = 0; i < 10; i++) {
      expect(shellTimerShouldSkip({
        gameOver: session.isGameOver(),
        aiThinking: true,
        animating: false,
      })).toBe(false);
      session.timerTick();
    }
    expect(session.isGameOver()).toBe(true);
    expect(session.getDisplayedWinner()).toBe('RED');
    expect(session.getDisplayedReason()).toContain('Shot clock');
  });

  it('PvP match timer depletes RED chess clock while RED to move', () => {
    const session = new FeatureSession('16', {
      ...base,
      mode: 'pvp',
      matchTimer: '3',
    });
    session.resetTurnClock();
    const before = session.getP1Clock();
    expect(before).toBeGreaterThan(0);
    for (let i = 0; i < 5; i++) session.timerTick();
    expect(session.getP1Clock()).toBe(before - 5);
    expect(session.getEngine().getState().currentPlayer).toBe('RED');
  });
});

describe('AI turn completes under shot clock pressure', () => {
  it('runAiTurn still works after several ticks on BLUE', () => {
    const session = new FeatureSession('6x3x5', {
      ...base,
      shotClock: '30',
    });
    const slide = session.getEngine().getLegalMoves().find((m) => {
      const jump = session.getEngine().getState().board.jumpPaths?.some(
        (j) => j.from === m.from && j.to === m.to,
      );
      return !jump;
    });
    session.applyMove(slide!);
    session.resetTurnClock();
    for (let i = 0; i < 3; i++) session.timerTick();
    const hops = runAiTurn(session);
    expect(hops.length).toBeGreaterThan(0);
    expect(session.getEngine().getState().currentPlayer).toBe('RED');
  });
});
