import { Intersection } from '../../../models/GameState';

/** Default lattice projection matching SHOLO_GUTI_WITH_FEATURE.html / 16-bead canvas. */
export const SHOLO_LATTICE_PROJECTION = {
  padX: 40,
  padY: 36,
  latticeYSpan: 8,
  latticeXBase: 10,
  latticeXSpan: 12,
  widthInset: 80,
  heightInset: 72,
} as const;

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

export function projectIntersectionOnCanvas(
  intersection: Intersection,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number } {
  if (intersection.x === undefined || intersection.y === undefined) {
    throw new Error(`Intersection ${intersection.id} has no layout coordinates`);
  }
  return projectLatticeIntersection(intersection.x, intersection.y, canvasWidth, canvasHeight);
}
