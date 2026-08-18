import { createRequire } from 'node:module';
import path from 'node:path';
import { SmartBeadsEngine } from '../../core/SmartBeadsEngine';
import { BOARD16_EDGE_COUNT, BOARD16_NODE_COUNT, Board16Sholo } from '../Board16Sholo';

const requireRef = createRequire(path.join(__dirname, 'Board16PrototypeParity.test.ts'));
const refEngine = requireRef(
  path.resolve(process.cwd(), 'PROJECTS/SmartBeads/prototype/board4/sholo-guti-fullturn-engine.cjs'),
);

describe('Board16Sholo prototype parity', () => {
  it('matches headless reference node and edge counts', () => {
    expect(BOARD16_NODE_COUNT).toBe(refEngine.N);
    expect(BOARD16_EDGE_COUNT).toBe(refEngine.ED?.length ?? countRefEdges());
  });

  it('matches reference starting counts and opening move totals', () => {
    const refStart = refEngine.startingBoard();
    const refP1 = refStart.filter((cell: number) => cell === refEngine.P1).length;
    const refP2 = refStart.filter((cell: number) => cell === refEngine.P2).length;
    const refOpening = refEngine.getAllLegalMoves(refStart, refEngine.P1).length;

    const engine = new SmartBeadsEngine('16');
    expect(engine.countPieces('RED')).toBe(refP1);
    expect(engine.countPieces('BLUE')).toBe(refP2);
    expect(engine.getLegalMoves().length).toBe(refOpening);
  });

  it('matches reference collinear capture routes on sample adjacency', () => {
    const byLabel = new Map(Board16Sholo.intersections.map((point) => [point.label!, point.id]));
    const from = byLabel.get('A00')!;
    const over = byLabel.get('A01')!;
    const to = byLabel.get('A02')!;
    const refLand = refEngine.continueCollinear(from, over);

    expect(refLand).toBe(to);
    expect(Board16Sholo.jumpPaths).toEqual(
      expect.arrayContaining([{ from, over, to }]),
    );
  });
});

function countRefEdges(): number {
  let edges = 0;
  for (let i = 0; i < refEngine.N; i++) {
    for (const j of refEngine.ADJ[i]) {
      if (i < j) {
        edges++;
      }
    }
  }
  return edges;
}
