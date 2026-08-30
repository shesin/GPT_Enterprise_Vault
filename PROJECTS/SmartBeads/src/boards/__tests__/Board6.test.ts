import { SmartBeadsEngine } from '../../core/SmartBeadsEngine';
import {
  BOARD6_CENTER_NODE_IDS,
  BOARD6_EDGE_COUNT,
  BOARD6_JUMP_COUNT,
  BOARD6_NODE_COUNT,
  Board6,
} from '../Board6';

describe('Board6 (6-bead · 4×4 full box cross)', () => {
  it('matches reference geometry counts (16 nodes, 42 edges, 48 jumps)', () => {
    expect(BOARD6_NODE_COUNT).toBe(16);
    expect(BOARD6_EDGE_COUNT).toBe(42);
    expect(BOARD6_JUMP_COUNT).toBe(48);
    expect(Board6.intersections).toHaveLength(16);
    expect(Board6.connections).toHaveLength(42);
    expect(Board6.jumpPaths).toHaveLength(48);
  });

  it('starts with 6 RED and 6 BLUE on the reference layout', () => {
    const red = Board6.intersections.filter((point) => point.occupant === 'RED');
    const blue = Board6.intersections.filter((point) => point.occupant === 'BLUE');
    const empty = Board6.intersections.filter((point) => point.occupant === undefined);

    expect(red.map((point) => point.id).sort((a, b) => a - b)).toEqual([8, 11, 12, 13, 14, 15]);
    expect(blue.map((point) => point.id).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 7]);
    expect(empty.map((point) => point.id).sort((a, b) => a - b)).toEqual([5, 6, 9, 10]);
  });

  it('uses sholo_guti termination with no ply cap and inner 2×2 center nodes', () => {
    expect(Board6.terminationProfile).toBe('sholo_guti');
    expect(Board6.maxPlies).toBeNull();
    expect(Board6.centerNodeIds).toEqual(BOARD6_CENTER_NODE_IDS);
  });

  it('gives RED 10 opening legal moves (reference parity)', () => {
    const engine = new SmartBeadsEngine('6');
    expect(engine.getLegalMoves()).toHaveLength(10);
  });

  it('includes full box cross diagonal connections', () => {
    const hasEdge = (a: number, b: number): boolean =>
      Board6.connections.some(
        (edge) => (edge.from === a && edge.to === b) || (edge.from === b && edge.to === a),
      );

    expect(hasEdge(0, 5)).toBe(true);
    expect(hasEdge(1, 4)).toBe(true);
    expect(hasEdge(5, 10)).toBe(true);
    expect(hasEdge(6, 9)).toBe(true);
  });
});
