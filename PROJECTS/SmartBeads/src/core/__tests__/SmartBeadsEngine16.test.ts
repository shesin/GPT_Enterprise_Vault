import { SmartBeadsEngine } from '../SmartBeadsEngine';
import { Board16Sholo } from '../../boards/Board16Sholo';
import { requireIntersection } from '../../models/GameState';

function clearBoard(engine: SmartBeadsEngine): void {
  for (const point of engine.getState().board.intersections) {
    point.occupant = undefined;
  }
}

describe('SmartBeadsEngine — 16-bead Sholo Guti', () => {
  it('initializes RED to move with zero captures', () => {
    const engine = new SmartBeadsEngine('16');
    const state = engine.getState();

    expect(state.currentPlayer).toBe('RED');
    expect(state.moveCount).toBe(0);
    expect(state.captures).toEqual({ RED: 0, BLUE: 0 });
    expect(state.gameOver).toBe(false);
    expect(engine.countPieces('RED')).toBe(16);
    expect(engine.countPieces('BLUE')).toBe(16);
  });

  it('applies a slide, increments one ply, and switches to BLUE', () => {
    const engine = new SmartBeadsEngine('16');
    const opening = engine.getLegalMoves()[0];

    engine.applyMove(opening);

    const state = engine.getState();
    expect(state.moveCount).toBe(1);
    expect(state.currentPlayer).toBe('BLUE');
    expect(state.gameOver).toBe(false);
  });

  it('supports optional capture chains with endTurn', () => {
    const engine = new SmartBeadsEngine('16');
    clearBoard(engine);

    const board = engine.getState().board;
    const id = (label: string) => board.intersections.find((point) => point.label === label)!.id;
    board.intersections.find((point) => point.label === 'A00')!.occupant = 'RED';
    board.intersections.find((point) => point.label === 'A01')!.occupant = 'BLUE';
    board.intersections.find((point) => point.label === 'A03')!.occupant = 'BLUE';

    engine.applyMove({ from: id('A00'), to: id('A02') });

    expect(engine.getChainPieceId()).toBe(id('A02'));
    expect(engine.getState().currentPlayer).toBe('RED');
    expect(engine.getState().moveCount).toBe(0);

    engine.endTurn();

    const state = engine.getState();
    expect(state.moveCount).toBe(1);
    expect(state.currentPlayer).toBe('BLUE');
    expect(state.captures.RED).toBe(1);
    expect(requireIntersection(board, id('A01')).occupant).toBeUndefined();
  });

  it('completes a multi-hop capture chain in one turn', () => {
    const engine = new SmartBeadsEngine('16');
    clearBoard(engine);

    const board = engine.getState().board;
    const id = (label: string) => board.intersections.find((point) => point.label === label)!.id;
    board.intersections.find((point) => point.label === 'A00')!.occupant = 'RED';
    board.intersections.find((point) => point.label === 'A01')!.occupant = 'BLUE';
    board.intersections.find((point) => point.label === 'A03')!.occupant = 'BLUE';
    board.intersections.find((point) => point.label === 'A44')!.occupant = 'BLUE';

    engine.applyMove({ from: id('A00'), to: id('A02') });
    expect(engine.getChainPieceId()).toBe(id('A02'));

    const followUp = engine.getLegalMoves().find((move) => move.to === id('A04'));
    expect(followUp).toBeDefined();
    engine.applyMove(followUp!);

    const state = engine.getState();
    expect(state.captures.RED).toBe(2);
    expect(state.moveCount).toBe(1);
    expect(state.currentPlayer).toBe('BLUE');
    expect(state.gameOver).toBe(false);
    expect(engine.getChainPieceId()).toBeNull();
  });

  it('ends the game by elimination when all enemy pieces are captured', () => {
    const engine = new SmartBeadsEngine('16');
    clearBoard(engine);

    const board = engine.getState().board;
    const id = (label: string) => board.intersections.find((point) => point.label === label)!.id;
    board.intersections.find((point) => point.label === 'A00')!.occupant = 'RED';

    expect(engine.countPieces('BLUE')).toBe(0);
    engine.applyMove({ from: id('A00'), to: id('A10') });

    expect(engine.getState().gameOver).toBe(true);
    expect(engine.getState().winner).toBe('RED');
    expect(engine.getState().endReason).toBe('elimination');
  });

  it('ends the game by stalemate when the player to move has no legal moves', () => {
    const engine = new SmartBeadsEngine('16');
    clearBoard(engine);

    const board = engine.getState().board;
    const id = (label: string) => board.intersections.find((point) => point.label === label)!.id;
    const setBlue = (label: string) => {
      board.intersections.find((point) => point.label === label)!.occupant = 'BLUE';
    };

    board.intersections.find((point) => point.label === 'A22')!.occupant = 'RED';
    for (const label of ['A11', 'A12', 'A13', 'A21', 'A23', 'A31', 'A32', 'A33']) {
      setBlue(label);
    }
    for (const label of ['A00', 'A02', 'A04', 'A20', 'A24', 'A40', 'A42', 'A44']) {
      setBlue(label);
    }
    setBlue('LT');
    board.intersections.find((point) => point.label === 'LM')!.occupant = undefined;

    engine.getState().currentPlayer = 'RED';
    expect(engine.getLegalMoves()).toHaveLength(0);

    engine.getState().currentPlayer = 'BLUE';
    engine.applyMove({ from: id('LT'), to: id('LM') });

    expect(engine.getState().gameOver).toBe(true);
    expect(engine.getState().winner).toBe('BLUE');
    expect(engine.getState().endReason).toBe('stalemate');
  });
});
