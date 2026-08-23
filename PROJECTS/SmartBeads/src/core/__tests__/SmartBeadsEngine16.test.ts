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

  it('allows collinear captures on the left triangular wing (LT→LB over LM, LT→A20 over LIT)', () => {
    const engineA = new SmartBeadsEngine('16');
    clearBoard(engineA);
    const boardA = engineA.getState().board;
    const idA = (label: string) => boardA.intersections.find((point) => point.label === label)!.id;
    boardA.intersections.find((point) => point.label === 'LT')!.occupant = 'RED';
    boardA.intersections.find((point) => point.label === 'LM')!.occupant = 'BLUE';
    engineA.getState().currentPlayer = 'RED';
    expect(engineA.getLegalMoves().some((m) => m.from === idA('LT') && m.to === idA('LB'))).toBe(true);
    engineA.applyMove({ from: idA('LT'), to: idA('LB') });
    expect(engineA.getState().board.intersections.find((p) => p.label === 'LB')?.occupant).toBe('RED');
    expect(engineA.getState().board.intersections.find((p) => p.label === 'LM')?.occupant).toBeUndefined();
    expect(engineA.getState().captures.RED).toBe(1);

    const engineB = new SmartBeadsEngine('16');
    clearBoard(engineB);
    const boardB = engineB.getState().board;
    const idB = (label: string) => boardB.intersections.find((point) => point.label === label)!.id;
    boardB.intersections.find((point) => point.label === 'LT')!.occupant = 'RED';
    boardB.intersections.find((point) => point.label === 'LIT')!.occupant = 'BLUE';
    engineB.getState().currentPlayer = 'RED';
    expect(engineB.getLegalMoves().some((m) => m.from === idB('LT') && m.to === idB('A20'))).toBe(true);
    engineB.applyMove({ from: idB('LT'), to: idB('A20') });
    expect(engineB.getState().board.intersections.find((p) => p.label === 'A20')?.occupant).toBe('RED');
    expect(engineB.getState().board.intersections.find((p) => p.label === 'LIT')?.occupant).toBeUndefined();
  });

  it('allows collinear captures on the right triangular wing (RT→RB over RM, RT→A24 over RIT)', () => {
    const engineA = new SmartBeadsEngine('16');
    clearBoard(engineA);
    const boardA = engineA.getState().board;
    const idA = (label: string) => boardA.intersections.find((point) => point.label === label)!.id;
    boardA.intersections.find((point) => point.label === 'RT')!.occupant = 'RED';
    boardA.intersections.find((point) => point.label === 'RM')!.occupant = 'BLUE';
    engineA.getState().currentPlayer = 'RED';
    expect(engineA.getLegalMoves().some((m) => m.from === idA('RT') && m.to === idA('RB'))).toBe(true);
    engineA.applyMove({ from: idA('RT'), to: idA('RB') });
    expect(engineA.getState().board.intersections.find((p) => p.label === 'RB')?.occupant).toBe('RED');
    expect(engineA.getState().board.intersections.find((p) => p.label === 'RM')?.occupant).toBeUndefined();
    expect(engineA.getState().captures.RED).toBe(1);

    const engineB = new SmartBeadsEngine('16');
    clearBoard(engineB);
    const boardB = engineB.getState().board;
    const idB = (label: string) => boardB.intersections.find((point) => point.label === label)!.id;
    boardB.intersections.find((point) => point.label === 'RT')!.occupant = 'RED';
    boardB.intersections.find((point) => point.label === 'RIT')!.occupant = 'BLUE';
    engineB.getState().currentPlayer = 'RED';
    expect(engineB.getLegalMoves().some((m) => m.from === idB('RT') && m.to === idB('A24'))).toBe(true);
    engineB.applyMove({ from: idB('RT'), to: idB('A24') });
    expect(engineB.getState().board.intersections.find((p) => p.label === 'A24')?.occupant).toBe('RED');
    expect(engineB.getState().board.intersections.find((p) => p.label === 'RIT')?.occupant).toBeUndefined();
  });

  it('allows collinear captures from the grid into the wings across the junction (A20→LT over LIT, A20→LB over LIB)', () => {
    const engineA = new SmartBeadsEngine('16');
    clearBoard(engineA);
    const boardA = engineA.getState().board;
    const idA = (label: string) => boardA.intersections.find((point) => point.label === label)!.id;
    boardA.intersections.find((point) => point.label === 'A20')!.occupant = 'RED';
    boardA.intersections.find((point) => point.label === 'LIT')!.occupant = 'BLUE';
    engineA.getState().currentPlayer = 'RED';
    expect(engineA.getLegalMoves().some((m) => m.from === idA('A20') && m.to === idA('LT'))).toBe(true);
    engineA.applyMove({ from: idA('A20'), to: idA('LT') });
    expect(engineA.getState().board.intersections.find((p) => p.label === 'LT')?.occupant).toBe('RED');
    expect(engineA.getState().board.intersections.find((p) => p.label === 'LIT')?.occupant).toBeUndefined();

    const engineB = new SmartBeadsEngine('16');
    clearBoard(engineB);
    const boardB = engineB.getState().board;
    const idB = (label: string) => boardB.intersections.find((point) => point.label === label)!.id;
    boardB.intersections.find((point) => point.label === 'A20')!.occupant = 'RED';
    boardB.intersections.find((point) => point.label === 'LIB')!.occupant = 'BLUE';
    engineB.getState().currentPlayer = 'RED';
    expect(engineB.getLegalMoves().some((m) => m.from === idB('A20') && m.to === idB('LB'))).toBe(true);
    engineB.applyMove({ from: idB('A20'), to: idB('LB') });
    expect(engineB.getState().board.intersections.find((p) => p.label === 'LB')?.occupant).toBe('RED');
    expect(engineB.getState().board.intersections.find((p) => p.label === 'LIB')?.occupant).toBeUndefined();
  });

  it('allows multi-jump capture sequences crossing the triangle-to-rectangle junction (LT→A20 over LIT, then A20→LM over LIM)', () => {
    const engine = new SmartBeadsEngine('16');
    clearBoard(engine);
    const board = engine.getState().board;
    const id = (label: string) => board.intersections.find((point) => point.label === label)!.id;

    board.intersections.find((point) => point.label === 'LT')!.occupant = 'RED';
    board.intersections.find((point) => point.label === 'LIT')!.occupant = 'BLUE';
    board.intersections.find((point) => point.label === 'LIM')!.occupant = 'BLUE';
    // Spare Ebony bead on the far side: without it both victims are the whole army,
    // the chain wins by elimination, and the turn never hands over.
    board.intersections.find((point) => point.label === 'A44')!.occupant = 'BLUE';
    engine.getState().currentPlayer = 'RED';

    // Step 1: Jump from LT to A20 over LIT
    expect(engine.getLegalMoves().some((m) => m.from === id('LT') && m.to === id('A20'))).toBe(true);
    engine.applyMove({ from: id('LT'), to: id('A20') });

    // Sits in chain on A20
    expect(engine.getChainPieceId()).toBe(id('A20'));
    expect(engine.getState().currentPlayer).toBe('RED');

    // Step 2: Continue from A20 to LM over LIM
    const followUp = engine.getLegalMoves();
    expect(followUp.some((m) => m.from === id('A20') && m.to === id('LM'))).toBe(true);
    engine.applyMove({ from: id('A20'), to: id('LM') });

    // Turn is complete
    expect(engine.getChainPieceId()).toBeNull();
    expect(engine.getState().currentPlayer).toBe('BLUE');
    expect(engine.getState().captures.RED).toBe(2);
    expect(board.intersections.find((p) => p.label === 'LT')?.occupant).toBeUndefined();
    expect(board.intersections.find((p) => p.label === 'LIT')?.occupant).toBeUndefined();
    expect(board.intersections.find((p) => p.label === 'LIM')?.occupant).toBeUndefined();
    expect(board.intersections.find((p) => p.label === 'LM')?.occupant).toBe('RED');
  });

  it('rejects a non-collinear triangle-corner hop that only looks like a capture', () => {
    const engine = new SmartBeadsEngine('16');
    clearBoard(engine);
    const board = engine.getState().board;
    const id = (label: string) => board.intersections.find((point) => point.label === label)!.id;

    board.intersections.find((point) => point.label === 'LT')!.occupant = 'RED';
    board.intersections.find((point) => point.label === 'LIT')!.occupant = 'BLUE';
    engine.getState().currentPlayer = 'RED';
    expect(() => engine.applyMove({ from: id('LT'), to: id('LIM') })).toThrow(/Illegal move/);
  });
});
