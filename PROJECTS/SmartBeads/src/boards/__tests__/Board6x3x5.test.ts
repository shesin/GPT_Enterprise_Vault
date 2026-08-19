import { SmartBeadsEngine } from '../../core/SmartBeadsEngine';
import {
  BOARD6X3X5_CENTER_NODE_IDS,
  BOARD6X3X5_EDGE_COUNT,
  BOARD6X3X5_JUMP_COUNT,
  BOARD6X3X5_NODE_COUNT,
  Board6x3x5,
} from '../Board6x3x5';

describe('Board6x3x5 (6-bead · 3×5)', () => {
  it('matches reference geometry counts (15 nodes, 38 edges, 40 jumps)', () => {
    expect(BOARD6X3X5_NODE_COUNT).toBe(15);
    expect(BOARD6X3X5_EDGE_COUNT).toBe(38);
    expect(BOARD6X3X5_JUMP_COUNT).toBe(40);
    expect(Board6x3x5.intersections).toHaveLength(15);
    expect(Board6x3x5.connections).toHaveLength(38);
    expect(Board6x3x5.jumpPaths).toHaveLength(40);
  });

  it('starts with 6 RED bottom and 6 BLUE top on the reference layout', () => {
    const red = Board6x3x5.intersections.filter((point) => point.occupant === 'RED');
    const blue = Board6x3x5.intersections.filter((point) => point.occupant === 'BLUE');
    const empty = Board6x3x5.intersections.filter((point) => point.occupant === undefined);

    expect(red.map((point) => point.id).sort((a, b) => a - b)).toEqual([9, 10, 11, 12, 13, 14]);
    expect(blue.map((point) => point.id).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(empty.map((point) => point.id).sort((a, b) => a - b)).toEqual([6, 7, 8]);
  });

  it('uses sholo_guti termination with single centre node index 7', () => {
    expect(Board6x3x5.terminationProfile).toBe('sholo_guti');
    expect(Board6x3x5.maxPlies).toBeNull();
    expect(Board6x3x5.centerNodeIds).toEqual(BOARD6X3X5_CENTER_NODE_IDS);
    expect(Board6x3x5.intersections[7].label).toBe('A21');
  });

  it('gives RED 7 opening legal moves (reference parity)', () => {
    const engine = new SmartBeadsEngine('6x3x5');
    expect(engine.getLegalMoves()).toHaveLength(7);
  });

  it('includes diagonal Alquerque connections on the 3×5 lattice', () => {
    const hasEdge = (a: number, b: number): boolean =>
      Board6x3x5.connections.some(
        (edge) => (edge.from === a && edge.to === b) || (edge.from === b && edge.to === a),
      );

    expect(hasEdge(0, 4)).toBe(true);
    expect(hasEdge(1, 3)).toBe(true);
    expect(hasEdge(7, 4)).toBe(true);
  });
});
