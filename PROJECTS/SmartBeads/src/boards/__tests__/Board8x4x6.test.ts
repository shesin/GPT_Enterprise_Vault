import { SmartBeadsEngine } from '../../core/SmartBeadsEngine';
import {
  BOARD8X4X6_CENTER_NODE_IDS,
  BOARD8X4X6_EDGE_COUNT,
  BOARD8X4X6_EMPTY_WAIST_IDS,
  BOARD8X4X6_JUMP_COUNT,
  BOARD8X4X6_NODE_COUNT,
  Board8x4x6,
} from '../Board8x4x6';

describe('Board8x4x6 (8-bead · 4×6 hourglass)', () => {
  it('matches reference geometry counts (24 nodes, 68 edges, 88 jumps)', () => {
    expect(BOARD8X4X6_NODE_COUNT).toBe(24);
    expect(BOARD8X4X6_EDGE_COUNT).toBe(68);
    expect(BOARD8X4X6_JUMP_COUNT).toBe(88);
    expect(Board8x4x6.intersections).toHaveLength(24);
    expect(Board8x4x6.connections).toHaveLength(68);
    expect(Board8x4x6.jumpPaths).toHaveLength(88);
  });

  it('starts with 8 RED and 8 BLUE on hourglass rank camps', () => {
    const red = Board8x4x6.intersections.filter((point) => point.occupant === 'RED');
    const blue = Board8x4x6.intersections.filter((point) => point.occupant === 'BLUE');
    const empty = Board8x4x6.intersections.filter((point) => point.occupant === undefined);

    expect(red).toHaveLength(8);
    expect(blue).toHaveLength(8);
    expect(empty.map((point) => point.id).sort((a, b) => a - b)).toEqual(BOARD8X4X6_EMPTY_WAIST_IDS);
  });

  it('uses sholo_guti termination with centre nodes 9, 10, 13, 14', () => {
    expect(Board8x4x6.terminationProfile).toBe('sholo_guti');
    expect(Board8x4x6.maxPlies).toBeNull();
    expect(Board8x4x6.centerNodeIds).toEqual(BOARD8X4X6_CENTER_NODE_IDS);
    expect(Board8x4x6.centerNodeIds).toEqual([9, 10, 13, 14]);
    expect(Board8x4x6.intersections[9].label).toBe('A21');
    expect(Board8x4x6.intersections[10].label).toBe('A22');
    expect(Board8x4x6.intersections[13].label).toBe('A31');
    expect(Board8x4x6.intersections[14].label).toBe('A32');
  });

  it('gives RED 16 opening legal moves (reference parity)', () => {
    const engine = new SmartBeadsEngine('8x4x6');
    expect(engine.getLegalMoves()).toHaveLength(16);
  });
});
