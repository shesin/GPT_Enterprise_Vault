import { SmartBeadsEngine } from '../SmartBeadsEngine';
import { listBoardVariants, resolveBoard } from '../../config/BoardConfig';
import { Board4 } from '../../boards/Board4';
import { Board5 } from '../../boards/Board5';
import { Board6 } from '../../boards/Board6';
import { Board6x3x5 } from '../../boards/Board6x3x5';
import { Board10x5 } from '../../boards/Board10x5';
import { Board12x6x5 } from '../../boards/Board12x6x5';
import { Board8x4x6 } from '../../boards/Board8x4x6';
import { Board7 } from '../../boards/Board7';

describe('SmartBeadsEngine', () => {
  it('lists the configured board variants', () => {
    expect(listBoardVariants()).toEqual(['4', '5', '6', '7', '16', '6x3x5', '10x5', '12x6x5', '8x4x6']);
  });

  it('defines Board7 as a 7-bead 4×5 with sholo_guti rules', () => {
    expect(Board7.intersections).toHaveLength(20);
    expect(Board7.centerNodeIds).toEqual([9, 10]);
    expect(Board7.maxPlies).toBeNull();
    expect(Board7.terminationProfile).toBe('sholo_guti');

    const red = Board7.intersections.filter((point) => point.occupant === 'RED');
    const blue = Board7.intersections.filter((point) => point.occupant === 'BLUE');

    expect(red).toHaveLength(7);
    expect(blue).toHaveLength(7);
  });

  it('defines Board8x4x6 as an 8-bead 4×6 with sholo_guti rules', () => {
    expect(Board8x4x6.intersections).toHaveLength(24);
    expect(Board8x4x6.centerNodeIds).toEqual([9, 10, 13, 14]);
    expect(Board8x4x6.maxPlies).toBeNull();
    expect(Board8x4x6.terminationProfile).toBe('sholo_guti');

    const red = Board8x4x6.intersections.filter((point) => point.occupant === 'RED');
    const blue = Board8x4x6.intersections.filter((point) => point.occupant === 'BLUE');

    expect(red).toHaveLength(8);
    expect(blue).toHaveLength(8);
  });

  it('defines Board12x6x5 as a 12-bead 6×5 lattice with sholo_guti rules', () => {
    expect(Board12x6x5.intersections).toHaveLength(30);
    expect(Board12x6x5.centerNodeIds).toEqual([12, 17]);
    expect(Board12x6x5.maxPlies).toBeNull();
    expect(Board12x6x5.terminationProfile).toBe('sholo_guti');

    const red = Board12x6x5.intersections.filter((point) => point.occupant === 'RED');
    const blue = Board12x6x5.intersections.filter((point) => point.occupant === 'BLUE');

    expect(red).toHaveLength(12);
    expect(blue).toHaveLength(12);
  });

  it('defines Board10x5 as a 10-bead 5×5 lattice with sholo_guti rules', () => {
    expect(Board10x5.intersections).toHaveLength(25);
    expect(Board10x5.centerNodeIds).toEqual([12]);
    expect(Board10x5.maxPlies).toBeNull();
    expect(Board10x5.terminationProfile).toBe('sholo_guti');

    const red = Board10x5.intersections.filter((point) => point.occupant === 'RED');
    const blue = Board10x5.intersections.filter((point) => point.occupant === 'BLUE');

    expect(red).toHaveLength(10);
    expect(blue).toHaveLength(10);
  });

  it('defines Board4 as a 4x4 grid with RED on row 1 and BLUE on row 4', () => {
    expect(Board4.intersections).toHaveLength(16);
    expect(Board4.centerNodeIds).toEqual([5, 6, 9, 10]);
    expect(Board4.maxPlies).toBe(40);

    const red = Board4.intersections.filter((point) => point.occupant === 'RED');
    const blue = Board4.intersections.filter((point) => point.occupant === 'BLUE');

    expect(red.map((point) => point.id)).toEqual([0, 1, 2, 3]);
    expect(blue.map((point) => point.id)).toEqual([12, 13, 14, 15]);

    const ids = new Set(Board4.intersections.map((point) => point.id));
    for (const connection of Board4.connections) {
      expect(ids.has(connection.from)).toBe(true);
      expect(ids.has(connection.to)).toBe(true);
    }
  });

  it('defines Board6 as a 6-bead 4×4 full box cross with sholo_guti rules', () => {
    expect(Board6.intersections).toHaveLength(16);
    expect(Board6.centerNodeIds).toEqual([5, 6, 9, 10]);
    expect(Board6.maxPlies).toBeNull();
    expect(Board6.terminationProfile).toBe('sholo_guti');

    const red = Board6.intersections.filter((point) => point.occupant === 'RED');
    const blue = Board6.intersections.filter((point) => point.occupant === 'BLUE');

    expect(red).toHaveLength(6);
    expect(blue).toHaveLength(6);
  });

  it('defines Board6x3x5 as a 6-bead 3×5 lattice with sholo_guti rules', () => {
    expect(Board6x3x5.intersections).toHaveLength(15);
    expect(Board6x3x5.centerNodeIds).toEqual([7]);
    expect(Board6x3x5.maxPlies).toBeNull();
    expect(Board6x3x5.terminationProfile).toBe('sholo_guti');

    const red = Board6x3x5.intersections.filter((point) => point.occupant === 'RED');
    const blue = Board6x3x5.intersections.filter((point) => point.occupant === 'BLUE');

    expect(red).toHaveLength(6);
    expect(blue).toHaveLength(6);
  });

  it.each([
    ['4', Board4],
    ['5', Board5],
    ['6', Board6],
    ['7', Board7],
  ] as const)('initializes variant %s from the board registry', (variant, expectedBoard) => {
    const engine = new SmartBeadsEngine(variant);
    const state = engine.getState();

    expect(engine.getVariant()).toBe(variant);
    expect(state.board).toEqual(expectedBoard);
    expect(state.currentPlayer).toBe('RED');
    expect(state.moveCount).toBe(0);
    expect(state.captures).toEqual({ RED: 0, BLUE: 0 });
    expect(state.gameOver).toBe(false);
  });

  it('counts remaining pieces for each player accurately', () => {
    const engine = new SmartBeadsEngine('4');

    // Initial state on Board4: 4 RED pieces and 4 BLUE pieces
    expect(engine.countPieces('RED')).toBe(4);
    expect(engine.countPieces('BLUE')).toBe(4);

    // Set up a capture scenario
    const state = engine.getState();
    for (const point of state.board.intersections) {
      point.occupant = undefined;
    }
    state.board.intersections.find((point) => point.id === 0)!.occupant = 'RED';
    state.board.intersections.find((point) => point.id === 4)!.occupant = 'BLUE';

    expect(engine.countPieces('RED')).toBe(1);
    expect(engine.countPieces('BLUE')).toBe(1);

    // RED captures BLUE at 4 landing on 8
    engine.applyMove({ from: 0, to: 8 });

    expect(engine.countPieces('RED')).toBe(1);
    expect(engine.countPieces('BLUE')).toBe(0);
  });

  it('gives each game an independent board copy', () => {
    const template = resolveBoard('4');
    const engineA = new SmartBeadsEngine('4');
    const engineB = new SmartBeadsEngine('4');
    const emptyId = template.intersections.find((point) => point.occupant === undefined)!.id;

    engineA.getState().board.intersections.find((point) => point.id === emptyId)!.occupant = 'RED';

    expect(template.intersections.find((point) => point.id === emptyId)!.occupant).toBeUndefined();
    expect(engineB.getState().board.intersections.find((point) => point.id === emptyId)!.occupant).toBeUndefined();
    expect(engineA.getState().board.intersections.find((point) => point.id === emptyId)!.occupant).toBe('RED');
  });

  it('generates legal orthogonal slides for RED from the opening', () => {
    const engine = new SmartBeadsEngine('4');
    const moves = engine.getLegalMoves();

    expect(moves.length).toBeGreaterThan(0);
    expect(moves).toEqual(
      expect.arrayContaining([
        { from: 0, to: 4 },
        { from: 1, to: 5 },
        { from: 2, to: 6 },
        { from: 3, to: 7 },
      ]),
    );

    for (const move of moves) {
      const from = engine.getState().board.intersections.find((point) => point.id === move.from);
      const to = engine.getState().board.intersections.find((point) => point.id === move.to);
      expect(from?.occupant).toBe('RED');
      expect(to?.occupant).toBeUndefined();
    }
  });

  it('applies a legal slide and swaps the current player', () => {
    const engine = new SmartBeadsEngine('4');
    const state = engine.getState();

    engine.applyMove({ from: 0, to: 4 });

    expect(state.board.intersections.find((point) => point.id === 0)?.occupant).toBeUndefined();
    expect(state.board.intersections.find((point) => point.id === 4)?.occupant).toBe('RED');
    expect(state.currentPlayer).toBe('BLUE');
    expect(state.moveCount).toBe(1);
    expect(state.gameOver).toBe(false);
  });

  it('rejects illegal moves', () => {
    const engine = new SmartBeadsEngine('4');
    expect(() => engine.applyMove({ from: 0, to: 5 })).toThrow(/Illegal move/);
  });

  it('does not end the game at the ply count when maxPlies is null (unlimited)', () => {
    const engine = new SmartBeadsEngine('4');
    const state = engine.getState();
    state.board.maxPlies = null;
    state.moveCount = 40;

    engine.applyMove({ from: 0, to: 4 });

    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeUndefined();
    expect(state.currentPlayer).toBe('BLUE');
  });

  it('does not end the game when maxPlies is 0 (unlimited)', () => {
    const engine = new SmartBeadsEngine('4');
    const state = engine.getState();
    state.board.maxPlies = 0;
    state.moveCount = 40;

    engine.applyMove({ from: 0, to: 4 });

    expect(state.gameOver).toBe(false);
  });

  it('ends the game exactly when moveCount reaches maxPlies', () => {
    const engine = new SmartBeadsEngine('4');
    const state = engine.getState();
    state.moveCount = 39;

    engine.applyMove({ from: 0, to: 4 });

    expect(state.moveCount).toBe(40);
    expect(state.gameOver).toBe(true);
    expect(state.winner).toBeDefined();
  });

  it('awards the win to the player with more captures at the ply limit', () => {
    const engine = new SmartBeadsEngine('4');
    const state = engine.getState();
    state.moveCount = 39;
    state.captures.RED = 3;
    state.captures.BLUE = 1;

    engine.applyMove({ from: 0, to: 4 });

    expect(state.gameOver).toBe(true);
    expect(state.winner).toBe('RED');
  });

  it('uses center-node control as a tie-breaker when captures are equal', () => {
    const engine = new SmartBeadsEngine('4');
    const state = engine.getState();
    state.moveCount = 39;
    state.captures.RED = 2;
    state.captures.BLUE = 2;

    // Clear default occupants that would otherwise sit on non-center squares only.
    for (const point of state.board.intersections) {
      point.occupant = undefined;
    }
    state.board.intersections.find((point) => point.id === 0)!.occupant = 'RED';
    state.board.intersections.find((point) => point.id === 5)!.occupant = 'BLUE';
    state.board.intersections.find((point) => point.id === 6)!.occupant = 'BLUE';
    state.board.intersections.find((point) => point.id === 9)!.occupant = 'RED';

    engine.applyMove({ from: 0, to: 4 });

    // Centers after move: 5 BLUE, 6 BLUE, 9 RED → BLUE leads 2–1
    expect(state.winner).toBe('BLUE');
  });

  it('defines orthogonal jumpPaths on Board4', () => {
    expect(Board4.jumpPaths?.length).toBeGreaterThan(0);
    expect(Board4.jumpPaths).toEqual(
      expect.arrayContaining([
        { from: 0, over: 4, to: 8 },
        { from: 8, over: 4, to: 0 },
        { from: 1, over: 2, to: 3 },
      ]),
    );
  });

  it('includes optional capture jumps alongside slides', () => {
    const engine = new SmartBeadsEngine('4');
    const state = engine.getState();

    for (const point of state.board.intersections) {
      point.occupant = undefined;
    }
    state.board.intersections.find((point) => point.id === 0)!.occupant = 'RED';
    state.board.intersections.find((point) => point.id === 4)!.occupant = 'BLUE';

    const moves = engine.getLegalMoves();

    expect(moves).toEqual(
      expect.arrayContaining([
        { from: 0, to: 1 },
        { from: 0, to: 8 },
      ]),
    );
  });

  it('applies a capture jump, removes the jumped bead, and updates captures', () => {
    const engine = new SmartBeadsEngine('4');
    const state = engine.getState();

    for (const point of state.board.intersections) {
      point.occupant = undefined;
    }
    state.board.intersections.find((point) => point.id === 0)!.occupant = 'RED';
    state.board.intersections.find((point) => point.id === 4)!.occupant = 'BLUE';

    engine.applyMove({ from: 0, to: 8 });

    expect(state.board.intersections.find((point) => point.id === 0)?.occupant).toBeUndefined();
    expect(state.board.intersections.find((point) => point.id === 4)?.occupant).toBeUndefined();
    expect(state.board.intersections.find((point) => point.id === 8)?.occupant).toBe('RED');
    expect(state.captures.RED).toBe(1);
    expect(state.currentPlayer).toBe('BLUE');
    expect(engine.getChainPieceId()).toBeNull();
  });

  it('keeps the turn for multi-jump continuation and allows voluntary endTurn', () => {
    const engine = new SmartBeadsEngine('4');
    const state = engine.getState();

    for (const point of state.board.intersections) {
      point.occupant = undefined;
    }
    // RED at 0 can jump over BLUE at 4 to 8, then over BLUE at 9 to 10.
    state.board.intersections.find((point) => point.id === 0)!.occupant = 'RED';
    state.board.intersections.find((point) => point.id === 4)!.occupant = 'BLUE';
    state.board.intersections.find((point) => point.id === 9)!.occupant = 'BLUE';

    engine.applyMove({ from: 0, to: 8 });

    expect(state.captures.RED).toBe(1);
    expect(state.currentPlayer).toBe('RED');
    expect(engine.getChainPieceId()).toBe(8);
    expect(engine.getLegalMoves()).toEqual([{ from: 8, to: 10 }]);

    engine.endTurn();

    expect(engine.getChainPieceId()).toBeNull();
    expect(state.currentPlayer).toBe('BLUE');
    expect(state.captures.RED).toBe(1);
    expect(state.board.intersections.find((point) => point.id === 9)?.occupant).toBe('BLUE');
  });

  it('completes a multi-jump chain when the player continues capturing', () => {
    const engine = new SmartBeadsEngine('4');
    const state = engine.getState();

    for (const point of state.board.intersections) {
      point.occupant = undefined;
    }
    state.board.intersections.find((point) => point.id === 0)!.occupant = 'RED';
    state.board.intersections.find((point) => point.id === 4)!.occupant = 'BLUE';
    state.board.intersections.find((point) => point.id === 9)!.occupant = 'BLUE';

    engine.applyMove({ from: 0, to: 8 });
    engine.applyMove({ from: 8, to: 10 });

    expect(state.captures.RED).toBe(2);
    expect(state.board.intersections.find((point) => point.id === 4)?.occupant).toBeUndefined();
    expect(state.board.intersections.find((point) => point.id === 9)?.occupant).toBeUndefined();
    expect(state.board.intersections.find((point) => point.id === 10)?.occupant).toBe('RED');
    expect(engine.getChainPieceId()).toBeNull();
    expect(state.currentPlayer).toBe('BLUE');
  });

  it('rejects endTurn when no capture chain is in progress', () => {
    const engine = new SmartBeadsEngine('4');
    expect(() => engine.endTurn()).toThrow(/no capture chain/);
  });
});
