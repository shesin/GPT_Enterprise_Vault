import { BoardDefinition, Connection, Intersection, JumpPath } from '../models/GameState';

/**
 * 16-bead Sholo Guti reference board (37-point full-stretch 5×5 + wings).
 * Geometry and starting layout match prototype/board4/sholo-guti-fullturn-engine.cjs
 * and SHOLO_GUTI.html — ported for production only; no shared runtime code.
 */

interface NodeSpec {
  id: string;
  x: number;
  y: number;
}

const GRID_LINK_DIRS: ReadonlyArray<[number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

const WING_LINKS: ReadonlyArray<[string, string]> = [
  ['RT', 'RM'],
  ['RM', 'RB'],
  ['RIT', 'RIM'],
  ['RIM', 'RIB'],
  ['RT', 'RIT'],
  ['RIT', 'A24'],
  ['RB', 'RIB'],
  ['RIB', 'A24'],
  ['A24', 'RIM'],
  ['RIM', 'RM'],
  ['LT', 'LM'],
  ['LM', 'LB'],
  ['LIT', 'LIM'],
  ['LIM', 'LIB'],
  ['LT', 'LIT'],
  ['LIT', 'A20'],
  ['LB', 'LIB'],
  ['LIB', 'A20'],
  ['A20', 'LIM'],
  ['LIM', 'LM'],
];

function buildNodeSpecs(): NodeSpec[] {
  const nodes: NodeSpec[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      nodes.push({ id: `A${r}${c}`, x: 2 * c, y: 2 * r });
    }
  }
  const wings: NodeSpec[] = [
    { id: 'LT', x: -4, y: 0 },
    { id: 'LM', x: -4, y: 4 },
    { id: 'LB', x: -4, y: 8 },
    { id: 'LIT', x: -2, y: 2 },
    { id: 'LIM', x: -2, y: 4 },
    { id: 'LIB', x: -2, y: 6 },
    { id: 'RT', x: 12, y: 0 },
    { id: 'RM', x: 12, y: 4 },
    { id: 'RB', x: 12, y: 8 },
    { id: 'RIT', x: 10, y: 2 },
    { id: 'RIM', x: 10, y: 4 },
    { id: 'RIB', x: 10, y: 6 },
  ];
  return nodes.concat(wings);
}

function sameDir(dx: number, dy: number, ex: number, ey: number): boolean {
  return dx * ey === dy * ex && dx * ex + dy * ey > 0;
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

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      for (const [dr, dc] of GRID_LINK_DIRS) {
        const r2 = r + dr;
        const c2 = c + dc;
        if (r2 < 0 || r2 > 4 || c2 < 0 || c2 > 4) {
          continue;
        }
        link(`A${r}${c}`, `A${r2}${c2}`);
      }
    }
  }

  for (const [a, b] of WING_LINKS) {
    link(a, b);
  }

  return adjacency;
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
  if (node.id.startsWith('L') || (node.id.startsWith('A') && (node.x === 0 || node.x === 2))) {
    return 'RED';
  }
  if (node.id.startsWith('R') || (node.id.startsWith('A') && (node.x === 6 || node.x === 8))) {
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

function buildCenterNodeIds(nodes: NodeSpec[]): number[] {
  const centreIndex = nodes.findIndex((node) => node.id === 'A22');
  if (centreIndex < 0) {
    throw new Error('16-bead centre node A22 missing from board spec');
  }
  return [centreIndex];
}

/** Reference parity: 37 nodes, 92 undirected edges. */
export const BOARD16_NODE_COUNT = NODE_SPECS.length;
export const BOARD16_EDGE_COUNT = buildConnections(ADJACENCY).length;
export const BOARD16_CENTER_NODE_IDS = buildCenterNodeIds(NODE_SPECS);

export const Board16Sholo: BoardDefinition = {
  name: 'Sholo-Guti-16x5x5',
  intersections: buildIntersections(NODE_SPECS),
  connections: buildConnections(ADJACENCY),
  jumpPaths: buildJumpPaths(NODE_SPECS, ADJACENCY),
  centerNodeIds: BOARD16_CENTER_NODE_IDS,
  maxPlies: null,
  terminationProfile: 'sholo_guti',
};
