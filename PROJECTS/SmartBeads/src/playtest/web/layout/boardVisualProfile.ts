/** Canvas layout + centre decoration — ported from prototype/board4 SHOLO_GUTI_*_WITH_FEATURE.html. */

export type ProjectionKind =
  'sholo16' | 'square5' | 'grid-stretch' | 'square-fit' | 'square-stretch' | 'portrait45';

export interface LatticePoint {
  x: number;
  y: number;
}

export interface BoardVisualProfile {
  projection: ProjectionKind;
  canvasWidth: number;
  canvasHeight: number;
  /** Nodes that receive amber rings / highlight dots (canvas only). */
  centerRingPoints?: LatticePoint[];
  /** Cream half-tint axis: 6×4 vertical (bottom camp); others horizontal (left camp). */
  turnWashAxis?: 'horizontal' | 'vertical';
}

const SQUARE_CANVAS = { canvasWidth: 560, canvasHeight: 560 } as const;
const SHOLO16_CANVAS = { canvasWidth: 560, canvasHeight: 796 } as const;

const PROFILES: Record<string, BoardVisualProfile> = {
  'Sholo-Guti-16x5x5': {
    projection: 'sholo16',
    ...SHOLO16_CANVAS,
    centerRingPoints: [{ x: 4, y: 4 }],
  },
  'SmartBeads-6x4x4': {
    projection: 'square-fit',
    ...SQUARE_CANVAS,
    turnWashAxis: 'vertical',
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
    centerRingPoints: [{ x: 2, y: 4 }],
  },
  'SmartBeads-10x5': {
    projection: 'square5',
    ...SQUARE_CANVAS,
    centerRingPoints: [{ x: 4, y: 4 }],
  },
  'SmartBeads-12x6x5': {
    projection: 'grid-stretch',
    ...SQUARE_CANVAS,
    centerRingPoints: [
      { x: 4, y: 4 },
      { x: 4, y: 6 },
    ],
  },
  'SmartBeads-8x4x6': {
    projection: 'grid-stretch',
    ...SQUARE_CANVAS,
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
    centerRingPoints: [
      { x: 2, y: 4 },
      { x: 4, y: 4 },
    ],
  },
};

/** Phones: every board is drawn on a taller canvas to use the portrait screen; 'square-fit'
 * boards switch to 'square-stretch' (same axes, stretched), the rest already stretch. */
const PHONE_QUERY = '(max-width: 980px)';
const PHONE_STRETCH_CANVAS = { canvasWidth: 560, canvasHeight: 900 } as const;

function isPhoneWidth(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(PHONE_QUERY).matches
    : false;
}

export function getBoardVisualProfile(boardName: string): BoardVisualProfile {
  const base = PROFILES[boardName] ?? { projection: 'grid-stretch', ...SQUARE_CANVAS };
  if (!isPhoneWidth()) return base;
  const projection = base.projection === 'square-fit' ? 'square-stretch' : base.projection;
  return { ...base, projection, ...PHONE_STRETCH_CANVAS };
}

export function getBoardCanvasSize(boardName: string): { width: number; height: number } {
  const profile = getBoardVisualProfile(boardName);
  return { width: profile.canvasWidth, height: profile.canvasHeight };
}
