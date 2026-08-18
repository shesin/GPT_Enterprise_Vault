import { SmartBeadsEngine } from '../../core/SmartBeadsEngine';
import {
  BOARD16_EDGE_COUNT,
  BOARD16_NODE_COUNT,
  Board16Sholo,
} from '../Board16Sholo';

describe('Board16Sholo', () => {
  it('matches reference geometry counts (37 nodes, 92 edges)', () => {
    expect(BOARD16_NODE_COUNT).toBe(37);
    expect(BOARD16_EDGE_COUNT).toBe(92);
    expect(Board16Sholo.intersections).toHaveLength(37);
    expect(Board16Sholo.connections).toHaveLength(92);
  });

  it('starts with 16 RED and 16 BLUE on the reference layout', () => {
    const red = Board16Sholo.intersections.filter((point) => point.occupant === 'RED');
    const blue = Board16Sholo.intersections.filter((point) => point.occupant === 'BLUE');
    const empty = Board16Sholo.intersections.filter((point) => point.occupant === undefined);

    expect(red).toHaveLength(16);
    expect(blue).toHaveLength(16);
    expect(empty).toHaveLength(5);

    const emptyLabels = empty.map((point) => point.label).sort();
    expect(emptyLabels).toEqual(['A02', 'A12', 'A22', 'A32', 'A42']);
  });

  it('uses sholo_guti termination with no ply cap', () => {
    expect(Board16Sholo.terminationProfile).toBe('sholo_guti');
    expect(Board16Sholo.maxPlies).toBeNull();
    expect(Board16Sholo.centerNodeIds).toBeUndefined();
  });

  it('gives RED 13 opening legal slides and no captures (reference parity)', () => {
    const engine = new SmartBeadsEngine('16');
    const moves = engine.getLegalMoves();
    const slides = moves.filter((move) => !Board16Sholo.jumpPaths?.some(
      (path) => path.from === move.from && path.to === move.to,
    ));
    const captures = moves.filter((move) => Board16Sholo.jumpPaths?.some(
      (path) => path.from === move.from && path.to === move.to,
    ));

    expect(moves).toHaveLength(13);
    expect(slides).toHaveLength(13);
    expect(captures).toHaveLength(0);
  });

  it('includes wing and diagonal grid connections', () => {
    const byLabel = new Map(Board16Sholo.intersections.map((point) => [point.label!, point.id]));
    const hasEdge = (a: string, b: string): boolean => {
      const i = byLabel.get(a)!;
      const j = byLabel.get(b)!;
      return Board16Sholo.connections.some(
        (edge) => (edge.from === i && edge.to === j) || (edge.from === j && edge.to === i),
      );
    };

    expect(hasEdge('A22', 'A11')).toBe(true);
    expect(hasEdge('A20', 'LIT')).toBe(true);
    expect(hasEdge('A24', 'RIT')).toBe(true);
    expect(hasEdge('LT', 'LM')).toBe(true);
  });
});
