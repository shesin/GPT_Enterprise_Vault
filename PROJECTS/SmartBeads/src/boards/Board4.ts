import { BoardDefinition, Connection, Intersection } from '../models/GameState';

/**
 * Board4 — smallest progressive grid variant (4×4).
 *
 * Layout (row-major ids 0–15):
 *   0  1  2  3   RED start (row 1)
 *   4  5  6  7
 *   8  9 10 11
 *  12 13 14 15   BLUE start (row 4)
 *
 * Legal slides: orthogonal only (horizontal / vertical).
 * Center tie-break nodes: the inner 2×2 (5, 6, 9, 10).
 */

const SIZE = 4;
const TOTAL_NODES = SIZE * SIZE;

function buildIntersections(): Intersection[] {
  const intersections: Intersection[] = [];
  for (let id = 0; id < TOTAL_NODES; id++) {
    intersections.push({ id });
  }

  // Row 1 (top): RED
  for (let col = 0; col < SIZE; col++) {
    intersections[col].occupant = 'RED';
  }

  // Row 4 (bottom): BLUE
  const lastRowStart = (SIZE - 1) * SIZE;
  for (let col = 0; col < SIZE; col++) {
    intersections[lastRowStart + col].occupant = 'BLUE';
  }

  return intersections;
}

/** Orthogonal edges only — keeps movement graph config-driven for future NxN boards. */
function buildConnections(): Connection[] {
  const connections: Connection[] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const id = row * SIZE + col;
      if (col + 1 < SIZE) {
        connections.push({ from: id, to: id + 1 });
      }
      if (row + 1 < SIZE) {
        connections.push({ from: id, to: id + SIZE });
      }
    }
  }
  return connections;
}

/** Inner 2×2 for even-sized grids (works the same pattern for 6×6, etc.). */
function centerNodeIdsForEvenGrid(size: number): number[] {
  const lo = size / 2 - 1;
  const hi = size / 2;
  return [
    lo * size + lo,
    lo * size + hi,
    hi * size + lo,
    hi * size + hi,
  ];
}

export const Board4: BoardDefinition = {
  name: 'SmartBeads-4x4',
  intersections: buildIntersections(),
  connections: buildConnections(),
  centerNodeIds: centerNodeIdsForEvenGrid(SIZE),
  maxPlies: 40,
};
