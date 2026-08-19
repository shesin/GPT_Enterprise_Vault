import { BoardDefinition, Connection, Intersection, JumpPath } from '../models/GameState';

/**
 * 8-bead · 4×6 hourglass board (locked V1 #6).
 * Geometry and starting layout match prototype/board4/SHOLO_GUTI_8_BEAD_4x6_HOURGLASS_WITH_FEATURE.html
 * and sholo-f1a-8-4x6-fullturn-engine.cjs — 24-node hourglass waist (not full Alquerque rectangle camps).
 */

const ROWS = 6;
const COLS = 4;

const GRID_LINK_DIRS: ReadonlyArray<[number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/** P1=RED, P2=BLUE, 0=empty — matches headless engine startingBoard(). */
const START_LAYOUT: ReadonlyArray<ReadonlyArray<0 | 1 | 2>> = [
  [1, 1, 2, 2],
  [1, 0, 0, 2],
  [1, 0, 0, 2],
  [1, 0, 0, 2],
  [1, 0, 0, 2],
  [1, 1, 2, 2],
];

interface NodeSpec {
  id: string;
  x: number;
  y: number;
}

function buildNodeSpecs(): NodeSpec[] {
  const nodes: NodeSpec[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      nodes.push({ id: `A${r}${c}`, x: 2 * c, y: 2 * r });
    }
  }
  return nodes;
}

function buildAdjacency(nodes: NodeSpec[]): number[][] {
  const indexByLabel = new Map(nodes.map((node, index) => [node.id, index]));
  const adjacency = Array.from({ length: nodes.length }, () => [] as number[]);

  const link = (a: string, b: string): void => {
    const i = indexByLabel.get(a)!;
    const j = indexByLabel.get(b)!;
    if (!adjacency[i].includes(j)) {
      adjacency[i].push(j);
    }
    if (!adjacency[j].includes(i)) {
      adjacency[j].push(i);
    }
  };

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of GRID_LINK_DIRS) {
        const r2 = r + dr;
        const c2 = c + dc;
        if (r2 < 0 || r2 >= ROWS || c2 < 0 || c2 >= COLS) {
          continue;
        }
        link(`A${r}${c}`, `A${r2}${c2}`);
      }
    }
  }

  return adjacency;
}

function sameDir(dx: number, dy: number, ex: number, ey: number): boolean {
  return dx * ey === dy * ex && dx * ex + dy * ey > 0;
}

function continueCollinear(
  from: number,
  over: number,
  nodes: NodeSpec[],
  adjacency: number[][],
): number {
  const a = nodes[from];
  const b = nodes[over];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (const landing of adjacency[over]) {
    const c = nodes[landing];
    if (sameDir(dx, dy, c.x - b.x, c.y - b.y)) {
      return landing;
    }
  }
  return -1;
}

function startingOccupant(row: number, col: number): 'RED' | 'BLUE' | undefined {
  const cell = START_LAYOUT[row][col];
  if (cell === 1) {
    return 'RED';
  }
  if (cell === 2) {
    return 'BLUE';
  }
  return undefined;
}

function buildIntersections(nodes: NodeSpec[]): Intersection[] {
  return nodes.map((node, id) => {
    const row = Math.floor(id / COLS);
    const col = id % COLS;
    return {
      id,
      label: node.id,
      x: node.x,
      y: node.y,
      occupant: startingOccupant(row, col),
    };
  });
}

function buildConnections(adjacency: number[][]): Connection[] {
  const connections: Connection[] = [];
  for (let from = 0; from < adjacency.length; from++) {
    for (const to of adjacency[from]) {
      if (from < to) {
        connections.push({ from, to });
      }
    }
  }
  return connections;
}

function buildJumpPaths(nodes: NodeSpec[], adjacency: number[][]): JumpPath[] {
  const jumpPaths: JumpPath[] = [];
  for (let from = 0; from < nodes.length; from++) {
    for (const over of adjacency[from]) {
      const landing = continueCollinear(from, over, nodes, adjacency);
      if (landing >= 0) {
        jumpPaths.push({ from, over, to: landing });
      }
    }
  }
  return jumpPaths;
}

function buildCenterNodeIds(nodes: NodeSpec[]): number[] {
  const ids: number[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if ((node.x === 2 || node.x === 4) && (node.y === 4 || node.y === 6)) {
      ids.push(i);
    }
  }
  return ids;
}

const NODE_SPECS = buildNodeSpecs();
const ADJACENCY = buildAdjacency(NODE_SPECS);

/** Reference parity: 24 nodes, 68 undirected edges; centre nodes A21,A22,A31,A32 (indices 9,10,13,14). */
export const BOARD8X4X6_NODE_COUNT = NODE_SPECS.length;
export const BOARD8X4X6_EDGE_COUNT = buildConnections(ADJACENCY).length;
export const BOARD8X4X6_JUMP_COUNT = buildJumpPaths(NODE_SPECS, ADJACENCY).length;
export const BOARD8X4X6_CENTER_NODE_IDS = buildCenterNodeIds(NODE_SPECS);
export const BOARD8X4X6_EMPTY_WAIST_IDS = [5, 6, 9, 10, 13, 14, 17, 18];

export const Board8x4x6: BoardDefinition = {
  name: 'SmartBeads-8x4x6',
  intersections: buildIntersections(NODE_SPECS),
  connections: buildConnections(ADJACENCY),
  jumpPaths: buildJumpPaths(NODE_SPECS, ADJACENCY),
  centerNodeIds: BOARD8X4X6_CENTER_NODE_IDS,
  maxPlies: null,
  terminationProfile: 'sholo_guti',
};
