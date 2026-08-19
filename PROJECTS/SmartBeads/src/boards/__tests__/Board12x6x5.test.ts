import { SmartBeadsEngine } from '../../core/SmartBeadsEngine';
import {
  BOARD12X6X5_CENTER_NODE_IDS,
  BOARD12X6X5_EDGE_COUNT,
  BOARD12X6X5_JUMP_COUNT,
  BOARD12X6X5_NODE_COUNT,
  Board12x6x5,
} from '../Board12x6x5';

describe('Board12x6x5 (12-bead · 6×5)', () => {
  it('matches reference geometry counts (30 nodes, 89 edges, 124 jumps)', () => {
    expect(BOARD12X6X5_NODE_COUNT).toBe(30);
    expect(BOARD12X6X5_EDGE_COUNT).toBe(89);
    expect(BOARD12X6X5_JUMP_COUNT).toBe(124);
    expect(Board12x6x5.intersections).toHaveLength(30);
    expect(Board12x6x5.connections).toHaveLength(89);
    expect(Board12x6x5.jumpPaths).toHaveLength(124);
  });

  it('starts with 12 RED and 12 BLUE on two-file rank camps', () => {
    const red = Board12x6x5.intersections.filter((point) => point.occupant === 'RED');
    const blue = Board12x6x5.intersections.filter((point) => point.occupant === 'BLUE');
    const empty = Board12x6x5.intersections.filter((point) => point.occupant === undefined);

    expect(red).toHaveLength(12);
    expect(blue).toHaveLength(12);
    expect(empty.map((point) => point.id).sort((a, b) => a - b)).toEqual([2, 7, 12, 17, 22, 27]);
  });

  it('uses sholo_guti termination with centre nodes 12 and 17', () => {
    expect(Board12x6x5.terminationProfile).toBe('sholo_guti');
    expect(Board12x6x5.maxPlies).toBeNull();
    expect(Board12x6x5.centerNodeIds).toEqual(BOARD12X6X5_CENTER_NODE_IDS);
    expect(Board12x6x5.centerNodeIds).toEqual([12, 17]);
    expect(Board12x6x5.intersections[12].label).toBe('A22');
    expect(Board12x6x5.intersections[17].label).toBe('A32');
  });

  it('gives RED 16 opening legal moves (reference parity)', () => {
    const engine = new SmartBeadsEngine('12x6x5');
    expect(engine.getLegalMoves()).toHaveLength(16);
  });
});
