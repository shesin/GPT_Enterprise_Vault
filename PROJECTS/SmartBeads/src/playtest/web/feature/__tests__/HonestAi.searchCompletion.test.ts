import { PRODUCT_BOARD_ORDER, resolveEngineVariant } from '../../../../config/BoardCatalog';
import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import {
  aiOpponentReplyPlies,
  probeSearchCompletion,
  selectAiTurnPath,
  thinkBudgetForLevel,
} from '../HonestAi';

describe('HonestAi depth-2 search completion', () => {
  it.each(PRODUCT_BOARD_ORDER)('%s: Hard achieves full depth-2 on opening', (boardId) => {
    const variant = resolveEngineVariant(boardId);
    const engine = new SmartBeadsEngine(variant);
    engine.getState().currentPlayer = 'BLUE';
    const snap = engine.exportSnapshot();
    const budgetMs = thinkBudgetForLevel(3, variant);

    const report = probeSearchCompletion(variant, 3, snap, 'BLUE', { budgetMs });
    expect(report.targetReplyPlies).toBe(2);
    expect(report.rootMoveCount).toBeGreaterThan(0);
    expect(report.achievedReplyPlies).toBe(2);
    expect(report.completeAtAchievedDepth).toBe(report.rootMoveCount);

    const path = selectAiTurnPath(variant, 3, snap, 'BLUE', { budgetMs, rng: () => 0 });
    expect(path?.length).toBeGreaterThan(0);
  });

  it.each(PRODUCT_BOARD_ORDER)('%s: Medium achieves depth-1 on opening', (boardId) => {
    const variant = resolveEngineVariant(boardId);
    const engine = new SmartBeadsEngine(variant);
    engine.getState().currentPlayer = 'BLUE';
    const snap = engine.exportSnapshot();

    const report = probeSearchCompletion(variant, 2, snap, 'BLUE', {
      budgetMs: thinkBudgetForLevel(2, variant),
    });
    expect(report.targetReplyPlies).toBe(1);
    expect(report.achievedReplyPlies).toBe(1);
    expect(report.completeAtAchievedDepth).toBe(report.rootMoveCount);
  });

  it('16-bead: root search considers every legal opening move', () => {
    const engine = new SmartBeadsEngine('16');
    engine.getState().currentPlayer = 'BLUE';
    const snap = engine.exportSnapshot();
    const legal = engine.getLegalMoves().length;

    const report = probeSearchCompletion('16', 3, snap, 'BLUE', {
      budgetMs: thinkBudgetForLevel(3, '16'),
    });
    expect(report.rootMoveCount).toBe(legal);
  });

  it('16-bead: Hard depth-2 after several plies (no depth-1 fallback)', () => {
    const engine = new SmartBeadsEngine('16');
    for (let i = 0; i < 6; i += 1) {
      const moves = engine.getLegalMoves();
      if (!moves.length) break;
      engine.applyMove(moves[0]);
      if (engine.getChainPieceId() !== null) engine.endTurn();
    }
    engine.getState().currentPlayer = 'BLUE';
    const snap = engine.exportSnapshot();
    const report = probeSearchCompletion('16', 3, snap, 'BLUE', {
      budgetMs: thinkBudgetForLevel(3, '16'),
    });
    expect(report.targetReplyPlies).toBe(2);
    expect(report.achievedReplyPlies).toBe(2);
    expect(report.completeAtAchievedDepth).toBe(report.rootMoveCount);
  });
});
