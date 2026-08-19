import { BoardDefinition, Connection, Intersection, JumpPath } from '../models/GameState';

/**
 * 6-bead · 3×5 board (locked V1 #3).
 * Geometry and starting layout match prototype/board4/SHOLO_GUTI_6_BEAD_WITH_FEATURE.html
 * and sholo-6-bead-fullturn-engine.cjs — 15-node Alquerque lattice, top–bottom camps.
 */

const ROWS = 5;
const COLS = 3;

const GRID_LINK_DIRS: ReadonlyArray<[number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
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

function startingOccupant(node: NodeSpec): 'RED' | 'BLUE' | undefined {
  // P2 (BLUE) rows 1–2 top; row 3 empty; P1 (RED) rows 4–5 bottom (prototype y=0,2 / 6,8).
  if (node.y === 0 || node.y === 2) {
    return 'BLUE';
  }
  if (node.y === 6 || node.y === 8) {
    return 'RED';
  }
  return undefined;
}

function buildIntersections(nodes: NodeSpec[]): Intersection[] {
  return nodes.map((node, id) => ({
    id,
    label: node.id,
    x: node.x,
    y: node.y,
    occupant: startingOccupant(node),
  }));
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

const NODE_SPECS = buildNodeSpecs();
const ADJACENCY = buildAdjacency(NODE_SPECS);

/** Reference parity: 15 nodes, 38 undirected edges; centre node A21 (index 7). */
export const BOARD6X3X5_NODE_COUNT = NODE_SPECS.length;
export const BOARD6X3X5_EDGE_COUNT = buildConnections(ADJACENCY).length;
export const BOARD6X3X5_JUMP_COUNT = buildJumpPaths(NODE_SPECS, ADJACENCY).length;
export const BOARD6X3X5_CENTER_NODE_IDS = [7];

export const Board6x3x5: BoardDefinition = {
  name: 'SmartBeads-6x3x5',
  intersections: buildIntersections(NODE_SPECS),
  connections: buildConnections(ADJACENCY),
  jumpPaths: buildJumpPaths(NODE_SPECS, ADJACENCY),
  centerNodeIds: BOARD6X3X5_CENTER_NODE_IDS,
  maxPlies: null,
  terminationProfile: 'sholo_guti',
};
