export type Player = 'RED' | 'BLUE';

export interface Intersection {
  id: number;
  occupant?: Player;
  /** Layout coordinate for rendering (board-specific units). */
  x?: number;
  y?: number;
  /** Original node label from the reference board (e.g. A22, LT). */
  label?: string;
}

/** How a completed match is resolved when limits or terminal positions are reached. */
export type TerminationProfile = 'ply_limit' | 'sholo_guti';

export interface Connection {
  from: number;
  to: number;
}

/**
 * Straight-line capture geometry on the board graph.
 * Occupancy is checked at runtime; this only defines legal jump routes.
 */
export interface JumpPath {
  from: number;
  over: number;
  to: number;
}

/**
 * Board geometry + optional match rules.
 * Larger grids (5x5, 6x6) add new BoardDefinition variants; the engine stays unchanged.
 */
export interface BoardDefinition {
  name: string;
  intersections: Intersection[];
  connections: Connection[];
  /** Optional capture routes (from → over opponent → empty to). */
  jumpPaths?: JumpPath[];
  /** Nodes used for center-control tie-break when captures are equal. */
  centerNodeIds?: number[];
  /**
   * Soft move limit. `null`, `undefined`, or `0` = unlimited.
   * When moveCount reaches this value, the game ends and a winner is evaluated.
   */
  maxPlies?: number | null;
  /**
   * Match termination behaviour. Default `ply_limit` (SmartBeads 4×4 lab).
   * `sholo_guti` = elimination + stalemate; one ply per completed turn.
   */
  terminationProfile?: TerminationProfile;
}

/** Independent copy so each game can mutate occupants without sharing templates. */
export function cloneBoardDefinition(board: BoardDefinition): BoardDefinition {
  return {
    name: board.name,
    intersections: board.intersections.map((intersection) => ({ ...intersection })),
    // Geometry (connections, jumpPaths) is never mutated after a board is built — share it instead of
    // copying 200+ objects per snapshot (hot path in AI search). Only occupants differ between clones.
    connections: board.connections,
    jumpPaths: board.jumpPaths,
    centerNodeIds: board.centerNodeIds ? [...board.centerNodeIds] : undefined,
    maxPlies: board.maxPlies,
    terminationProfile: board.terminationProfile,
  };
}

export interface GameState {
  board: BoardDefinition;
  currentPlayer: Player;
  moveCount: number;
  captures: Record<Player, number>;
  winner?: Player | 'DRAW';
  gameOver: boolean;
  /** Human-readable end reason when gameOver (e.g. elimination, stalemate). */
  endReason?: string;
}

/** Slide or single capture hop along a board route. Multi-jump = sequential Moves. */
export interface Move {
  from: number;
  to: number;
}

/** Adjacent intersection ids joined by a legal connection. */
export function getConnectedIds(board: BoardDefinition, pointId: number): number[] {
  return (adjacencyFor(board)[pointId] ?? []).slice();
}

// Geometry indexes, built once per geometry array (shared by every clone of a board).
const adjacencyCache = new WeakMap<object, number[][]>();
const jumpFromCache = new WeakMap<object, JumpPath[][]>();
const jumpByEndsCache = new WeakMap<object, Map<number, JumpPath>>();

function adjacencyFor(board: BoardDefinition): number[][] {
  let adj = adjacencyCache.get(board.connections);
  if (!adj) {
    adj = [];
    for (const connection of board.connections) {
      (adj[connection.from] ??= []).push(connection.to);
      (adj[connection.to] ??= []).push(connection.from);
    }
    adjacencyCache.set(board.connections, adj);
  }
  return adj;
}

/** Jump routes starting at `from`, in board definition order. */
export function getJumpPathsFrom(board: BoardDefinition, from: number): readonly JumpPath[] {
  const paths = board.jumpPaths;
  if (!paths) return [];
  let byFrom = jumpFromCache.get(paths);
  if (!byFrom) {
    byFrom = [];
    for (const path of paths) (byFrom[path.from] ??= []).push(path);
    jumpFromCache.set(paths, byFrom);
  }
  return byFrom[from] ?? [];
}

/** Lookup by id; throws if the board graph is inconsistent. */
export function requireIntersection(board: BoardDefinition, id: number): Intersection {
  const direct = board.intersections[id];
  if (direct && direct.id === id) return direct;
  const point = board.intersections.find((intersection) => intersection.id === id);
  if (!point) {
    throw new Error(`Unknown intersection id: ${id}`);
  }
  return point;
}

/** Geometry-only jump route for a from→to hop, if the board defines one. */
export function findJumpPath(
  board: BoardDefinition,
  from: number,
  to: number,
): JumpPath | undefined {
  const paths = board.jumpPaths;
  if (!paths) return undefined;
  let byEnds = jumpByEndsCache.get(paths);
  if (!byEnds) {
    byEnds = new Map();
    for (const path of paths) {
      const key = path.from * 65536 + path.to;
      if (!byEnds.has(key)) byEnds.set(key, path); // first match, like Array.find
    }
    jumpByEndsCache.set(paths, byEnds);
  }
  return byEnds.get(from * 65536 + to);
}

/** True when a positive maxPlies is configured and the limit has been reached. */
export function hasReachedPlyLimit(
  maxPlies: number | null | undefined,
  moveCount: number,
): boolean {
  return typeof maxPlies === 'number' && maxPlies > 0 && moveCount >= maxPlies;
}
