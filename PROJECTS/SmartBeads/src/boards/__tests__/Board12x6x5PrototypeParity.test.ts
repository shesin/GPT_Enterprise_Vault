import { createRequire } from 'node:module';
import path from 'node:path';
import { SmartBeadsEngine } from '../../core/SmartBeadsEngine';
import {
  BOARD12X6X5_EDGE_COUNT,
  BOARD12X6X5_JUMP_COUNT,
  BOARD12X6X5_NODE_COUNT,
  Board12x6x5,
} from '../Board12x6x5';

const requireRef = createRequire(path.join(__dirname, 'Board12x6x5PrototypeParity.test.ts'));
const refEngine = requireRef(
  path.resolve(process.cwd(), 'PROJECTS/SmartBeads/prototype/board4/sholo-d4-12-6x5-fullturn-engine.cjs'),
);

describe('Board12x6x5 prototype parity', () => {
  it('matches headless reference node, edge, and jump counts', () => {
    expect(BOARD12X6X5_NODE_COUNT).toBe(refEngine.N);
    expect(BOARD12X6X5_EDGE_COUNT).toBe(countRefEdges());
    expect(BOARD12X6X5_JUMP_COUNT).toBe(countRefJumps());
  });

  it('matches reference starting counts and opening move totals', () => {
    const refStart = refEngine.startingBoard();
    const refP1 = refStart.filter((cell: number) => cell === refEngine.P1).length;
    const refP2 = refStart.filter((cell: number) => cell === refEngine.P2).length;
    const refOpening = refEngine.getAllLegalMoves(refStart, refEngine.P1).length;

    const engine = new SmartBeadsEngine('12x6x5');
    expect(engine.countPieces('RED')).toBe(refP1);
    expect(engine.countPieces('BLUE')).toBe(refP2);
    expect(engine.getLegalMoves().length).toBe(refOpening);
  });

  it('matches reference collinear capture routes on sample adjacency', () => {
    const byLabel = new Map(Board12x6x5.intersections.map((point) => [point.label!, point.id]));
    const from = byLabel.get('A00')!;
    const over = byLabel.get('A01')!;
    const to = byLabel.get('A02')!;
    const refLand = refEngine.continueCollinear(from, over);

    expect(refLand).toBe(to);
    expect(Board12x6x5.jumpPaths).toEqual(
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

function countRefJumps(): number {
  let jumps = 0;
  for (let from = 0; from < refEngine.N; from++) {
    for (const over of refEngine.ADJ[from]) {
      if (refEngine.continueCollinear(from, over) >= 0) {
        jumps++;
      }
    }
  }
  return jumps;
}
