import { SmartBeadsEngine } from '../SmartBeadsEngine';
import { listBoardVariants, resolveBoard } from '../../config/BoardConfig';
import { Board4 } from '../../boards/Board4';
import { Board5 } from '../../boards/Board5';
import { Board7 } from '../../boards/Board7';

describe('SmartBeadsEngine', () => {
  it('lists the configured board variants', () => {
    expect(listBoardVariants()).toEqual(['4', '5', '7']);
  });

  it.each([
    ['4', Board4],
    ['5', Board5],
    ['7', Board7],
  ] as const)('initializes variant %s from the board registry', (variant, expectedBoard) => {
    const engine = new SmartBeadsEngine(variant);
    const state = engine.getState();

    expect(engine.getVariant()).toBe(variant);
    expect(state.board).toEqual(expectedBoard);
    expect(state.currentPlayer).toBe('RED');
    expect(state.moveCount).toBe(0);
    expect(state.gameOver).toBe(false);
  });

  it('gives each game an independent board copy', () => {
    const template = resolveBoard('4');
    const engineA = new SmartBeadsEngine('4');
    const engineB = new SmartBeadsEngine('4');

    engineA.getState().board.intersections.push({ id: 1, occupant: 'RED' });

    expect(template.intersections).toEqual([]);
    expect(engineB.getState().board.intersections).toEqual([]);
    expect(engineA.getState().board.intersections).toEqual([{ id: 1, occupant: 'RED' }]);
  });
});
