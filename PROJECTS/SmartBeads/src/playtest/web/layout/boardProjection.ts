import { BoardDefinition, Intersection } from '../../../models/GameState';
import { getBoardVisualProfile, ProjectionKind } from './boardVisualProfile';

/** Default lattice projection matching 16-bead canvas (x in [-4, 12], y in [0, 8]). */
export const SHOLO_LATTICE_PROJECTION = {
  padX: 40,
  padY: 36,
  latticeYSpan: 8,
  latticeXBase: 12,
  latticeXSpan: 16,
  widthInset: 80,
  heightInset: 72,
} as const;

export function getLatticeBounds(board: BoardDefinition): { maxX: number; maxY: number } {
  let maxX = 0;
  let maxY = 0;
  for (const node of board.intersections) {
    if (node.x !== undefined) maxX = Math.max(maxX, node.x);
    if (node.y !== undefined) maxY = Math.max(maxY, node.y);
  }
  return { maxX, maxY };
}

export function projectLatticeIntersection(
  x: number,
  y: number,
  viewWidth: number,
  viewHeight: number,
  params: typeof SHOLO_LATTICE_PROJECTION = SHOLO_LATTICE_PROJECTION,
): { x: number; y: number } {
  return {
    x: params.padX + (y / params.latticeYSpan) * (viewWidth - params.widthInset),
    y: params.padY + ((params.latticeXBase - x) / params.latticeXSpan) * (viewHeight - params.heightInset),
  };
}

function projectWithKind(
  x: number,
  y: number,
  viewWidth: number,
  viewHeight: number,
  kind: ProjectionKind,
  bounds: { maxX: number; maxY: number },
): { x: number; y: number } {
  switch (kind) {
    case 'sholo16':
      return projectLatticeIntersection(x, y, viewWidth, viewHeight);
    case 'square5': {
      const pad = 44;
      return {
        x: pad + (y / 8) * (viewWidth - pad * 2),
        y: pad + ((8 - x) / 8) * (viewHeight - pad * 2),
      };
    }
    case 'grid-stretch': {
      const pad = 44;
      const { maxX, maxY } = bounds;
      return {
        x: pad + (y / maxY) * (viewWidth - pad * 2),
        y: pad + ((maxX - x) / maxX) * (viewHeight - pad * 2),
      };
    }
    case 'square-fit': {
      const pad = 44;
      const { maxX, maxY } = bounds;
      const innerW = viewWidth - pad * 2;
      const innerH = viewHeight - pad * 2;
      const pitch = Math.min(innerW / maxX, innerH / maxY);
      const gridW = maxX * pitch;
      const gridH = maxY * pitch;
      const ox = pad + (innerW - gridW) / 2;
      const oy = pad + (innerH - gridH) / 2;
      return {
        x: ox + (x / maxX) * gridW,
        y: oy + (y / maxY) * gridH,
      };
    }
    case 'portrait45': {
      const pad = 44;
      return {
        x: pad + (y / 8) * (viewWidth - pad * 2),
        y: pad + ((6 - x) / 6) * (viewHeight - pad * 2),
      };
    }
    default:
      return projectLatticeIntersection(x, y, viewWidth, viewHeight);
  }
}

export function projectIntersectionOnCanvas(
  intersection: Intersection,
  canvasWidth: number,
  canvasHeight: number,
  board?: BoardDefinition,
): { x: number; y: number } {
  if (intersection.x === undefined || intersection.y === undefined) {
    throw new Error(`Intersection ${intersection.id} has no layout coordinates`);
  }
  if (!board) {
    return projectLatticeIntersection(intersection.x, intersection.y, canvasWidth, canvasHeight);
  }
  const profile = getBoardVisualProfile(board.name);
  const bounds = getLatticeBounds(board);
  return projectWithKind(intersection.x, intersection.y, canvasWidth, canvasHeight, profile.projection, bounds);
}

/** Project a raw lattice coordinate (for centre overlays). */
export function projectLatticePointOnCanvas(
  latticeX: number,
  latticeY: number,
  canvasWidth: number,
  canvasHeight: number,
  board: BoardDefinition,
): { x: number; y: number } {
  const profile = getBoardVisualProfile(board.name);
  const bounds = getLatticeBounds(board);
  return projectWithKind(latticeX, latticeY, canvasWidth, canvasHeight, profile.projection, bounds);
}
