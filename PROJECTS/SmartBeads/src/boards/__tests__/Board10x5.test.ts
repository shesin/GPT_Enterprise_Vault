import { SmartBeadsEngine } from '../../core/SmartBeadsEngine';
import {
  BOARD10X5_CENTER_NODE_IDS,
  BOARD10X5_EDGE_COUNT,
  BOARD10X5_JUMP_COUNT,
  BOARD10X5_NODE_COUNT,
  Board10x5,
} from '../Board10x5';

describe('Board10x5 (10-bead · 5×5)', () => {
  it('matches reference geometry counts (25 nodes, 72 edges, 96 jumps)', () => {
    expect(BOARD10X5_NODE_COUNT).toBe(25);
    expect(BOARD10X5_EDGE_COUNT).toBe(72);
    expect(BOARD10X5_JUMP_COUNT).toBe(96);
    expect(Board10x5.intersections).toHaveLength(25);
    expect(Board10x5.connections).toHaveLength(72);
    expect(Board10x5.jumpPaths).toHaveLength(96);
  });

  it('starts with 10 RED and 10 BLUE on two-file camps with empty centre file', () => {
    const red = Board10x5.intersections.filter((point) => point.occupant === 'RED');
    const blue = Board10x5.intersections.filter((point) => point.occupant === 'BLUE');
    const empty = Board10x5.intersections.filter((point) => point.occupant === undefined);

    expect(red.map((point) => point.id).sort((a, b) => a - b)).toEqual([0, 1, 5, 6, 10, 11, 15, 16, 20, 21]);
    expect(blue.map((point) => point.id).sort((a, b) => a - b)).toEqual([3, 4, 8, 9, 13, 14, 18, 19, 23, 24]);
    expect(empty.map((point) => point.id).sort((a, b) => a - b)).toEqual([2, 7, 12, 17, 22]);
  });

  it('uses sholo_guti termination with centre node index 12 (A22)', () => {
    expect(Board10x5.terminationProfile).toBe('sholo_guti');
    expect(Board10x5.maxPlies).toBeNull();
    expect(Board10x5.centerNodeIds).toEqual(BOARD10X5_CENTER_NODE_IDS);
    expect(Board10x5.intersections[12].label).toBe('A22');
    expect(Board10x5.intersections[12].x).toBe(4);
    expect(Board10x5.intersections[12].y).toBe(4);
  });

  it('gives RED 13 opening legal moves (reference parity)', () => {
    const engine = new SmartBeadsEngine('10x5');
    expect(engine.getLegalMoves()).toHaveLength(13);
  });
});
