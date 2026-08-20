import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import { generateTurnEnds } from '../HonestAi';

describe('HonestAi generateTurnEnds (capture optionality)', () => {
  it('enumerates both optional stop after one hop and the continue hop on the same chain', () => {
    const engine = new SmartBeadsEngine('16');
    for (const point of engine.getState().board.intersections) {
      point.occupant = undefined;
    }
    const board = engine.getState().board;
    const id = (label: string) => board.intersections.find((p) => p.label === label)!.id;
    board.intersections.find((p) => p.label === 'A00')!.occupant = 'BLUE';
    board.intersections.find((p) => p.label === 'A01')!.occupant = 'RED';
    board.intersections.find((p) => p.label === 'A03')!.occupant = 'RED';
    engine.getState().currentPlayer = 'BLUE';

    const ends = generateTurnEnds('16', engine.exportSnapshot(), 'BLUE', 140);
    const from = id('A00');
    const stop = ends.find((e) => e.path.length === 1 && e.path[0].from === from && e.path[0].to === id('A02'));
    const cont = ends.find((e) => e.path.length === 2 && e.path[0].to === id('A02') && e.path[1].to === id('A04'));
    expect(stop).toBeDefined();
    expect(cont).toBeDefined();
    expect(stop!.snapshot.chainPieceId).not.toBeNull();
  });
});
