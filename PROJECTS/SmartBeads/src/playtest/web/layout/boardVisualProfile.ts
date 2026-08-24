/** Canvas layout + centre decoration — ported from prototype/board4 SHOLO_GUTI_*_WITH_FEATURE.html. */

export type ProjectionKind =
  | 'sholo16'
  | 'square5'
  | 'grid-stretch'
  | 'square-fit'
  | 'portrait45';

export interface LatticePoint {
  x: number;
  y: number;
}

export interface BoardVisualProfile {
  projection: ProjectionKind;
  canvasWidth: number;
  canvasHeight: number;
  /** Amber filled squares behind centre nodes (lattice coords). */
  centerSquares?: LatticePoint[];
  /** Amber band + line between two lattice points (waist). */
  centerLine?: [LatticePoint, LatticePoint];
  /** Nodes that receive amber rings / highlight dots (canvas only). */
  centerRingPoints?: LatticePoint[];
  /** 6×4 prototype uses vertical turn wash; others use horizontal. */
  turnWashAxis?: 'horizontal' | 'vertical';
}

const SQUARE_CANVAS = { canvasWidth: 560, canvasHeight: 560 } as const;
const SHOLO16_CANVAS = { canvasWidth: 560, canvasHeight: 700 } as const;

const PROFILES: Record<string, BoardVisualProfile> = {
  'Sholo-Guti-16x5x5': {
    projection: 'sholo16',
    ...SHOLO16_CANVAS,
    centerSquares: [{ x: 4, y: 4 }],
    centerRingPoints: [{ x: 4, y: 4 }],
  },
  'SmartBeads-6x4x4': {
    projection: 'square-fit',
    ...SQUARE_CANVAS,
    turnWashAxis: 'vertical',
    centerSquares: [
      { x: 2, y: 2 },
      { x: 4, y: 2 },
      { x: 2, y: 4 },
      { x: 4, y: 4 },
    ],
    centerRingPoints: [
      { x: 2, y: 2 },
      { x: 4, y: 2 },
      { x: 2, y: 4 },
      { x: 4, y: 4 },
    ],
  },
  'SmartBeads-6x3x5': {
    projection: 'square-fit',
    ...SQUARE_CANVAS,
    centerSquares: [{ x: 2, y: 4 }],
    centerRingPoints: [{ x: 2, y: 4 }],
  },
  'SmartBeads-10x5': {
    projection: 'square5',
    ...SQUARE_CANVAS,
    centerSquares: [{ x: 4, y: 4 }],
    centerRingPoints: [{ x: 4, y: 4 }],
  },
  'SmartBeads-12x6x5': {
    projection: 'grid-stretch',
    ...SQUARE_CANVAS,
    centerSquares: [
      { x: 4, y: 4 },
      { x: 4, y: 6 },
    ],
    centerRingPoints: [
      { x: 4, y: 4 },
      { x: 4, y: 6 },
    ],
  },
  'SmartBeads-8x4x6': {
    projection: 'grid-stretch',
    ...SQUARE_CANVAS,
    centerSquares: [
      { x: 2, y: 4 },
      { x: 4, y: 4 },
      { x: 2, y: 6 },
      { x: 4, y: 6 },
    ],
    centerRingPoints: [
      { x: 2, y: 4 },
      { x: 4, y: 4 },
      { x: 2, y: 6 },
      { x: 4, y: 6 },
    ],
  },
  'SmartBeads-7x4x5': {
    projection: 'portrait45',
    ...SQUARE_CANVAS,
    centerSquares: [
      { x: 2, y: 4 },
      { x: 4, y: 4 },
    ],
    centerRingPoints: [
      { x: 2, y: 4 },
      { x: 4, y: 4 },
    ],
  },
};

export function getBoardVisualProfile(boardName: string): BoardVisualProfile {
  return PROFILES[boardName] ?? { projection: 'grid-stretch', ...SQUARE_CANVAS };
}

export function getBoardCanvasSize(boardName: string): { width: number; height: number } {
  const profile = getBoardVisualProfile(boardName);
  return { width: profile.canvasWidth, height: profile.canvasHeight };
}

