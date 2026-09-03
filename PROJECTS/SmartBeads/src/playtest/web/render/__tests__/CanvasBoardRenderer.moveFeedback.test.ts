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
      lastMove: { from: 9, to: 6, player: 'BLUE' },
      capturePulses: [{ nodeId: 12, progress: 0.25 }],
    })).not.toThrow();
  });

  it('uses amber for cream selection/legal targets; lime last-move on black beads and empty squares', () => {
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
      lastMove: { from: 9, to: 6, player: 'BLUE' },
      capturePulses: [],
    });

    expect(strokeStyles.some((s) => s.includes('255, 95, 25'))).toBe(true);
    expect(strokeStyles.some((s) => s.includes('60,184,154'))).toBe(false);
  });

  it('draws lime last-move ring on black bead, not on cream bead', () => {
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

    const engine = new SmartBeadsEngine('8x4x6');
    const board = engine.getState().board;
    const blue = board.intersections.find((n) => n.occupant === 'BLUE');
    expect(blue).toBeDefined();
    const canvas = {
      width: 560,
      height: 560,
      getContext: () => ctx,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 560, height: 560 }),
    } as unknown as HTMLCanvasElement;

    drawCanvasBoard(canvas, {
      board,
      currentPlayer: 'RED',
      gameOver: false,
      selectedId: null,
      legalTargets: [],
      chainPieceId: null,
      anim: null,
      turnPulse: 0,
      lastMove: { from: blue!.id, to: blue!.id, player: 'BLUE' },
      capturePulses: [],
    });

    expect(strokeStyles.some((s) => s.includes('180, 255, 80'))).toBe(true);
  });

  it('does not draw amber ring on to-move piece until user selects it', () => {
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

    const engine = new SmartBeadsEngine('8x4x6');
    const board = engine.getState().board;
    const canvas = {
      width: 560,
      height: 560,
      getContext: () => ctx,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 560, height: 560 }),
    } as unknown as HTMLCanvasElement;

    drawCanvasBoard(canvas, {
      board,
      currentPlayer: 'BLUE',
      gameOver: false,
      selectedId: null,
      legalTargets: [],
      chainPieceId: null,
      anim: null,
      turnPulse: 0,
      lastMove: null,
      capturePulses: [],
    });

    expect(strokeStyles.some((s) => s.includes('255, 95, 25'))).toBe(false);
  });

  it('suppresses lime under cream bead on final animation frame (t=1)', () => {
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
    const cream = board.intersections.find((n) => n.occupant === 'RED');
    const emptyTarget = board.intersections.find((n) => !n.occupant && n.id !== cream?.id);
    expect(cream).toBeDefined();
    expect(emptyTarget).toBeDefined();

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
      selectedId: null,
      legalTargets: [],
      chainPieceId: null,
      anim: {
        from: cream!.id,
        to: emptyTarget!.id,
        player: 'RED',
        t: 1,
        duration: 200,
      },
      turnPulse: 0,
      lastMove: { from: emptyTarget!.id, to: cream!.id, player: 'BLUE' },
      capturePulses: [],
    });

    expect(strokeStyles.some((s) => s.includes('180, 255, 80'))).toBe(false);
  });

  it('draws no lime trail when cream (RED) moved', () => {
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
    const cream = board.intersections.find((n) => n.occupant === 'RED');
    const emptyTarget = board.intersections.find((n) => !n.occupant);
    expect(cream).toBeDefined();
    expect(emptyTarget).toBeDefined();

    const movedBoard = structuredClone(board);
    movedBoard.intersections[cream!.id].occupant = undefined;
    movedBoard.intersections[emptyTarget!.id].occupant = 'RED';

    const canvas = {
      width: 420,
      height: 560,
      getContext: () => ctx,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 560 }),
    } as unknown as HTMLCanvasElement;

    drawCanvasBoard(canvas, {
      board: movedBoard,
      currentPlayer: 'BLUE',
      gameOver: false,
      selectedId: null,
      legalTargets: [],
      chainPieceId: null,
      anim: null,
      turnPulse: 0,
      lastMove: { from: cream!.id, to: emptyTarget!.id, player: 'RED' },
      capturePulses: [],
    });

    expect(strokeStyles.some((s) => s.includes('180, 255, 80'))).toBe(false);
  });
});
