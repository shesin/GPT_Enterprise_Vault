import { SmartBeadsEngine } from '../../core/SmartBeadsEngine';
import {
  BOARD7_CENTER_NODE_IDS,
  BOARD7_EDGE_COUNT,
  BOARD7_EMPTY_WAIST_IDS,
  BOARD7_JUMP_COUNT,
  BOARD7_NODE_COUNT,
  Board7,
} from '../Board7';

describe('Board7 (7-bead · 4×5 hourglass)', () => {
  it('matches reference geometry counts (20 nodes, 55 edges, 68 jumps)', () => {
    expect(BOARD7_NODE_COUNT).toBe(20);
    expect(BOARD7_EDGE_COUNT).toBe(55);
    expect(BOARD7_JUMP_COUNT).toBe(68);
    expect(Board7.intersections).toHaveLength(20);
    expect(Board7.connections).toHaveLength(55);
    expect(Board7.jumpPaths).toHaveLength(68);
  });

  it('starts with 7 RED and 7 BLUE on hourglass rank camps', () => {
    const red = Board7.intersections.filter((point) => point.occupant === 'RED');
    const blue = Board7.intersections.filter((point) => point.occupant === 'BLUE');
    const empty = Board7.intersections.filter((point) => point.occupant === undefined);

    expect(red).toHaveLength(7);
    expect(blue).toHaveLength(7);
    expect(empty.map((point) => point.id).sort((a, b) => a - b)).toEqual(BOARD7_EMPTY_WAIST_IDS);
  });

  it('uses sholo_guti termination with centre nodes 9 and 10', () => {
    expect(Board7.terminationProfile).toBe('sholo_guti');
    expect(Board7.maxPlies).toBeNull();
    expect(Board7.centerNodeIds).toEqual(BOARD7_CENTER_NODE_IDS);
    expect(Board7.centerNodeIds).toEqual([9, 10]);
    expect(Board7.intersections[9].label).toBe('A21');
    expect(Board7.intersections[10].label).toBe('A22');
  });

  it('gives RED 13 opening legal moves (reference parity)', () => {
    const engine = new SmartBeadsEngine('7');
    expect(engine.getLegalMoves()).toHaveLength(13);
  });
});
