import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import { drawCanvasBoard } from '../CanvasBoardRenderer';

function recordingContext(): CanvasRenderingContext2D {
  const gradient = {
    addColorStop: () => {},
  };
  const ctx = {
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    closePath: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    stroke: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
    setLineDash: () => {},
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

function fakeCanvas(width: number, height: number): HTMLCanvasElement {
  return {
    width,
    height,
    getContext: () => recordingContext(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
  } as unknown as HTMLCanvasElement;
}

describe('CanvasBoardRenderer move feedback', () => {
  it('draws with last-move highlight and capture pulse without throwing', () => {
    const engine = new SmartBeadsEngine('6x3x5');
    const board = engine.getState().board;
    const canvas = fakeCanvas(420, 560);

    expect(() => drawCanvasBoard(canvas, {
      board,
      currentPlayer: 'RED',
      gameOver: false,
      selectedId: null,
      legalTargets: [],
      chainPieceId: null,
      anim: null,
      turnPulse: 0,
      lastMove: { from: 9, to: 6 },
      capturePulses: [{ nodeId: 12, progress: 0.25 }],
    })).not.toThrow();
  });

  it('uses amber rings for legal targets and lime for last-move rings', () => {
    const strokeStyles: string[] = [];
    const gradient = { addColorStop: () => {} };
    const ctx = {
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      closePath: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      stroke: () => {},
      fill: () => {},
      save: () => {},
      restore: () => {},
      setLineDash: () => {},
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      get strokeStyle() { return strokeStyles[strokeStyles.length - 1] ?? ''; },
      set strokeStyle(v: string) { strokeStyles.push(v); },
    } as unknown as CanvasRenderingContext2D;

    const engine = new SmartBeadsEngine('6x3x5');
    const board = engine.getState().board;
    const emptyTarget = board.intersections.findIndex((n) => !n.occupant);
    const canvas = {
      width: 420,
      height: 560,
      getContext: () => ctx,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 560 }),
    } as unknown as HTMLCanvasElement;

    drawCanvasBoard(canvas, {
      board,
      currentPlayer: 'RED',
      gameOver: false,
      selectedId: board.intersections.findIndex((n) => n.occupant === 'RED'),
      legalTargets: emptyTarget >= 0 ? [emptyTarget] : [],
      chainPieceId: null,
      anim: null,
      turnPulse: 0,
      lastMove: { from: 9, to: 6 },
      capturePulses: [],
    });

    expect(strokeStyles.some((s) => s.includes('255, 95, 25'))).toBe(true);
    expect(strokeStyles.some((s) => s.includes('180, 255, 80'))).toBe(true);
    expect(strokeStyles.some((s) => s.includes('60,184,154'))).toBe(false);
  });
});
