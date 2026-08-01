import { SmartBeadsEngine } from '../../core/SmartBeadsEngine';
import { renderBoard4, buildGameSummary } from '../HumanVsAiRunner';
import { executeAiRandomMove } from '../../simulation/SelfPlayRunner';

describe('HumanVsAiRunner Utilities', () => {
  it('renders a 4x4 text board representation correctly', () => {
    const engine = new SmartBeadsEngine('4');
    const boardText = renderBoard4(engine.getState().board);

    expect(boardText).toContain('--- Board4 State ---');
    expect(boardText).toContain('0:R');
    expect(boardText).toContain('12:B');
    expect(boardText).toContain('4:.');
  });

  it('builds a valid GameSummary using shared GameResult metrics', () => {
    const engine = new SmartBeadsEngine('4');

    // Simulate 5 AI moves
    for (let i = 0; i < 5; i++) {
      if (engine.getState().gameOver) break;
      executeAiRandomMove(engine);
    }

    const summary = buildGameSummary(engine, 'RED');

    expect(summary.startingPlayer).toBe('RED');
    expect(summary.totalPlies).toBe(engine.getState().moveCount);
    expect(summary.redRemainingPieces).toBe(engine.countPieces('RED'));
    expect(summary.blueRemainingPieces).toBe(engine.countPieces('BLUE'));
    expect(['Capture victory', 'No legal moves', 'Ply limit']).toContain(summary.terminationReason);
  });
});
