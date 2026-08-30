import { BoardDefinition, Connection, Intersection, JumpPath } from '../models/GameState';

/**
 * 6-bead · 4×4 board (locked V1 #2).
 * Geometry and starting layout match prototype/board4/SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html
 * and cursor-index-fullturn-engine.cjs (`fullBoxCross` — both diagonals in every 2×2 cell).
 */

const ROWS = 4;
const COLS = 4;

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
  const adjacency = Array.from({ length: nodes.length }, () => [] as number[]);

  const link = (i: number, j: number): void => {
    if (!adjacency[i].includes(j)) {
      adjacency[i].push(j);
    }
    if (!adjacency[j].includes(i)) {
      adjacency[j].push(i);
    }
  };

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const u = r * COLS + c;
      if (c + 1 < COLS) {
        link(u, u + 1);
      }
      if (r + 1 < ROWS) {
        link(u, u + COLS);
      }
    }
  }

  for (let r = 0; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS - 1; c++) {
      const tl = r * COLS + c;
      link(tl, tl + COLS + 1);
      link(tl + 1, tl + COLS);
    }
  }

  return adjacency;
}

function buildJumpPaths(adjacency: number[][]): JumpPath[] {
  const jumpPaths: JumpPath[] = [];
  for (let from = 0; from < adjacency.length; from++) {
    for (const over of adjacency[from]) {
      const r1 = Math.floor(from / COLS);
      const c1 = from % COLS;
      const r2 = Math.floor(over / COLS);
      const c2 = over % COLS;
      const tr = r2 + (r2 - r1);
      const tc = c2 + (c2 - c1);
      if (tr < 0 || tr >= ROWS || tc < 0 || tc >= COLS) {
        continue;
      }
      const to = tr * COLS + tc;
      if (adjacency[over].includes(to)) {
        jumpPaths.push({ from, over, to });
      }
    }
  }
  return jumpPaths;
}

function startingOccupant(id: number): 'RED' | 'BLUE' | undefined {
  // Cream (RED / human) on bottom ranks; ebony (BLUE) on top — production shell convention.
  const red = new Set([8, 11, 12, 13, 14, 15]);
  const blue = new Set([0, 1, 2, 3, 4, 7]);
  if (red.has(id)) {
    return 'RED';
  }
  if (blue.has(id)) {
    return 'BLUE';
  }
  return undefined;
}

function buildIntersections(nodes: NodeSpec[]): Intersection[] {
  return nodes.map((node, id) => ({
    id,
    label: node.id,
    x: node.x,
    y: node.y,
    occupant: startingOccupant(id),
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

const NODE_SPECS = buildNodeSpecs();
const ADJACENCY = buildAdjacency(NODE_SPECS);

/** Reference parity: 16 nodes, 42 undirected edges, 48 jump routes. */
export const BOARD6_NODE_COUNT = NODE_SPECS.length;
export const BOARD6_EDGE_COUNT = buildConnections(ADJACENCY).length;
export const BOARD6_JUMP_COUNT = buildJumpPaths(ADJACENCY).length;
export const BOARD6_CENTER_NODE_IDS = [5, 6, 9, 10];

export const Board6: BoardDefinition = {
  name: 'SmartBeads-6x4x4',
  intersections: buildIntersections(NODE_SPECS),
  connections: buildConnections(ADJACENCY),
  jumpPaths: buildJumpPaths(ADJACENCY),
  centerNodeIds: BOARD6_CENTER_NODE_IDS,
  maxPlies: null,
  terminationProfile: 'sholo_guti',
};
