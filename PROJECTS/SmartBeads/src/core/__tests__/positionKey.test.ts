import {
  AI_REPETITION_SOFT_PENALTY,
  buildPositionKey,
  isThreefoldRepetition,
  REPETITION_DRAW_THRESHOLD,
  repetitionPenaltyForPosition,
} from '../positionKey';
import { SmartBeadsEngine } from '../SmartBeadsEngine';

describe('positionKey / 3-fold threshold', () => {
  it('keys occupancies, side to move, and open chain bead', () => {
    const engine = new SmartBeadsEngine('6');
    const snap = engine.exportSnapshot();
    const base = buildPositionKey(snap.state, snap.chainPieceId);
    expect(base).toContain('|RED|none');

    snap.state.currentPlayer = 'BLUE';
    expect(buildPositionKey(snap.state, snap.chainPieceId)).not.toBe(base);
  });

  it('draws on the third occurrence only', () => {
    expect(isThreefoldRepetition(1)).toBe(false);
    expect(isThreefoldRepetition(2)).toBe(false);
    expect(isThreefoldRepetition(REPETITION_DRAW_THRESHOLD)).toBe(true);
  });
});

describe('AI repetition soft penalty', () => {
  it('returns zero when history is absent', () => {
    const engine = new SmartBeadsEngine('6');
    const snap = engine.exportSnapshot();
    expect(repetitionPenaltyForPosition(snap.state, snap.chainPieceId, undefined)).toBe(0);
  });

  it('penalizes revisiting a once-seen position', () => {
    const engine = new SmartBeadsEngine('6');
    const snap = engine.exportSnapshot();
    const key = buildPositionKey(snap.state, snap.chainPieceId);
    expect(repetitionPenaltyForPosition(snap.state, snap.chainPieceId, { [key]: 1 }))
      .toBe(AI_REPETITION_SOFT_PENALTY * 2);
  });
});
