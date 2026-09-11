import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import { buildPositionKey, repetitionPenaltyForPosition } from '../../../../core/positionKey';
import { generateTurnEnds } from '../HonestAi';
import { honestAiTurnEndsDeadlineMs } from './honestAiTestBudget';

describe('HonestAi repetition steer', () => {
  it('scores repeating candidate turns higher penalty than non-repeating alternatives', () => {
    const engine = new SmartBeadsEngine('6');
    for (const node of engine.getState().board.intersections) {
      node.occupant = undefined;
    }
    const board = engine.getState().board;
    const id = (label: string) => board.intersections.find((p) => p.label === label)!.id;

    board.intersections.find((p) => p.label === 'A22')!.occupant = 'RED';
    board.intersections.find((p) => p.label === 'A23')!.occupant = 'BLUE';
    engine.getState().currentPlayer = 'BLUE';

    const snap = engine.exportSnapshot();
    const forward = { from: id('A23'), to: id('A33') };
    const back = { from: id('A23'), to: id('A13') };

    const afterForward = new SmartBeadsEngine('6');
    afterForward.loadSnapshot(snap);
    afterForward.applyMove(forward);
    const forwardSnap = afterForward.exportSnapshot();
    const repeatKey = buildPositionKey(forwardSnap.state, forwardSnap.chainPieceId);
    snap.positionHistory = { [repeatKey]: 1 };

    const ends = generateTurnEnds(
      '6',
      snap,
      'BLUE',
      32,
      honestAiTurnEndsDeadlineMs(5_000),
    );
    const forwardEnd = ends.find((e) => e.path.length === 1 && e.path[0].to === forward.to);
    const backEnd = ends.find((e) => e.path.length === 1 && e.path[0].to === back.to);
    expect(forwardEnd).toBeDefined();
    expect(backEnd).toBeDefined();

    const forwardPen = repetitionPenaltyForPosition(
      forwardEnd!.snapshot.state,
      forwardEnd!.snapshot.chainPieceId,
      snap.positionHistory,
    );
    const backPen = repetitionPenaltyForPosition(
      backEnd!.snapshot.state,
      backEnd!.snapshot.chainPieceId,
      snap.positionHistory,
    );

    expect(forwardPen).toBeGreaterThan(0);
    expect(backPen).toBe(0);
    expect(forwardPen).toBeGreaterThan(backPen);
  });
});
