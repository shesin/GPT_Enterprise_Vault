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
});
