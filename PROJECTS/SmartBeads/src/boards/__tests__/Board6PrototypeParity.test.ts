import { createRequire } from 'node:module';
import path from 'node:path';
import { SmartBeadsEngine } from '../../core/SmartBeadsEngine';
import {
  BOARD6_EDGE_COUNT,
  BOARD6_JUMP_COUNT,
  BOARD6_NODE_COUNT,
  Board6,
} from '../Board6';

const requireRef = createRequire(path.join(__dirname, 'Board6PrototypeParity.test.ts'));
const refEngine = requireRef(
  path.resolve(process.cwd(), 'PROJECTS/SmartBeads/prototype/board4/cursor-index-fullturn-engine.cjs'),
);

const FULL_BOX_CROSS_ADJ = buildFullBoxCrossAdjacency(refEngine.ROWS, refEngine.COLS);
const FULL_BOX_CROSS_JUMPS = buildJumps(FULL_BOX_CROSS_ADJ, refEngine.ROWS, refEngine.COLS);

describe('Board6 prototype parity (fullBoxCross 6-bead 4×4)', () => {
  it('matches headless reference node, edge, and jump counts', () => {
    expect(BOARD6_NODE_COUNT).toBe(refEngine.N);
    expect(BOARD6_EDGE_COUNT).toBe(countEdges(FULL_BOX_CROSS_ADJ));
    expect(BOARD6_JUMP_COUNT).toBe(FULL_BOX_CROSS_JUMPS.length);
  });

  it('matches reference starting counts and opening move totals', () => {
    const refStart = refEngine.startingBoard(6);
    const refP1 = refStart.filter((cell: number) => cell === refEngine.P1).length;
    const refP2 = refStart.filter((cell: number) => cell === refEngine.P2).length;
    const refOpening = refEngine.getAllLegalMoves(
      refStart,
      refEngine.P1,
      FULL_BOX_CROSS_ADJ,
      FULL_BOX_CROSS_JUMPS,
    ).length;

    const engine = new SmartBeadsEngine('6');
    expect(engine.countPieces('RED')).toBe(refP1);
    expect(engine.countPieces('BLUE')).toBe(refP2);
    expect(engine.getLegalMoves().length).toBe(refOpening);
  });

  it('matches reference collinear capture routes on sample adjacency', () => {
    expect(Board6.jumpPaths).toEqual(
      expect.arrayContaining([{ from: 0, over: 4, to: 8 }]),
    );
    expect(Board6.jumpPaths).toEqual(
      expect.arrayContaining([{ from: 0, over: 1, to: 2 }]),
    );
  });
});

function buildFullBoxCrossAdjacency(rows: number, cols: number): number[][] {
  const n = rows * cols;
  const adjacency = Array.from({ length: n }, () => [] as number[]);

  const link = (i: number, j: number): void => {
    if (!adjacency[i].includes(j)) {
      adjacency[i].push(j);
    }
    if (!adjacency[j].includes(i)) {
      adjacency[j].push(i);
    }
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = r * cols + c;
      if (c + 1 < cols) {
        link(u, u + 1);
      }
      if (r + 1 < rows) {
        link(u, u + cols);
      }
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tl = r * cols + c;
      link(tl, tl + cols + 1);
      link(tl + 1, tl + cols);
    }
  }

  return adjacency;
}

function buildJumps(adjacency: number[][], rows: number, cols: number): Array<{ from: number; over: number; to: number }> {
  const jumps: Array<{ from: number; over: number; to: number }> = [];
  for (let from = 0; from < adjacency.length; from++) {
    for (const over of adjacency[from]) {
      const r1 = Math.floor(from / cols);
      const c1 = from % cols;
      const r2 = Math.floor(over / cols);
      const c2 = over % cols;
      const tr = r2 + (r2 - r1);
      const tc = c2 + (c2 - c1);
      if (tr < 0 || tr >= rows || tc < 0 || tc >= cols) {
        continue;
      }
      const to = tr * cols + tc;
      if (adjacency[over].includes(to)) {
        jumps.push({ from, over, to });
      }
    }
  }
  return jumps;
}

function countEdges(adjacency: number[][]): number {
  let edges = 0;
  for (let i = 0; i < adjacency.length; i++) {
    for (const j of adjacency[i]) {
      if (i < j) {
        edges++;
      }
    }
  }
  return edges;
}
