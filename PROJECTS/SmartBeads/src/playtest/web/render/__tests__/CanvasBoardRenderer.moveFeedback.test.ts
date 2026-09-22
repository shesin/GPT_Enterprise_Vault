import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import * as moveHintAuraThemes from '../../layout/moveHintAuraThemes';
import { drawCanvasBoard } from '../CanvasBoardRenderer';

beforeEach(() => {
  jest.spyOn(moveHintAuraThemes, 'readMoveHintAuraStyle').mockReturnValue('off');
});

afterEach(() => {
  jest.restoreAllMocks();
});

function baseCtxMethods() {
  const gradient = { addColorStop: () => {} };
  return {
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
}

function recordingContext(): CanvasRenderingContext2D {
  return baseCtxMethods() as unknown as CanvasRenderingContext2D;
}

/** Shared by every test below that asserts on which stroke colours got drawn
 * (2026-09-22 audit — was a ~20-line fake ctx hand-copied in 7 places). */
function recordingContextWithStrokeStyles(): { ctx: CanvasRenderingContext2D; strokeStyles: string[] } {
  const strokeStyles: string[] = [];
  const ctx = {
    ...baseCtxMethods(),
    get strokeStyle() { return strokeStyles[strokeStyles.length - 1] ?? ''; },
    set strokeStyle(v: string) { strokeStyles.push(v); },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, strokeStyles };
}

function fakeCanvas(width: number, height: number, ctx: CanvasRenderingContext2D = recordingContext()): HTMLCanvasElement {
  return {
    width,
    height,
    getContext: () => ctx,
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

  it('does not draw amber ring on idle board when it is not cream turn', () => {
    const { ctx, strokeStyles } = recordingContextWithStrokeStyles();
    const engine = new SmartBeadsEngine('8x4x6');
    const board = engine.getState().board;
    const canvas = fakeCanvas(560, 560, ctx);

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

  it('does not draw turn rings when showTurnStartRings is false (deselect after pick)', () => {
    const { ctx, strokeStyles } = recordingContextWithStrokeStyles();
    const engine = new SmartBeadsEngine('8x4x6');
    const board = engine.getState().board;
    const canvas = fakeCanvas(560, 560, ctx);

    drawCanvasBoard(canvas, {
      board,
      currentPlayer: 'BLUE',
      gameOver: false,
      selectedId: null,
      legalTargets: [],
      chainPieceId: null,
      anim: null,
      turnPulse: 0,
      showTurnStartRings: false,
      lastMove: null,
      capturePulses: [],
    });

    expect(strokeStyles.some((s) => s.includes('180, 255, 80'))).toBe(false);
    expect(strokeStyles.some((s) => s.includes('255, 95, 25'))).toBe(false);
  });

  it('off aura draws no move-hint rings or glow', () => {
    const { ctx, strokeStyles } = recordingContextWithStrokeStyles();
    const engine = new SmartBeadsEngine('8x4x6');
    const board = engine.getState().board;
    const canvas = fakeCanvas(560, 560, ctx);

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
      moveHintAura: 'off',
    });

    expect(strokeStyles.some((s) => s.includes('255, 215, 100'))).toBe(false);
    expect(strokeStyles.some((s) => s.includes('255, 95, 25'))).toBe(false);
    expect(strokeStyles.some((s) => s.includes('180, 255, 80'))).toBe(false);
  });

  it('gold-fill aura draws a muted-gold ring only — no wash over the bead, not cream or lime', () => {
    const { ctx, strokeStyles } = recordingContextWithStrokeStyles();
    const engine = new SmartBeadsEngine('8x4x6');
    const board = engine.getState().board;
    const canvas = fakeCanvas(560, 560, ctx);

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
      moveHintAura: 'gold-fill',
    });

    // Ring uses Lovable's soft gold (221, 192, 140) — paler than this board's
    // own center-plate gold, so the two don't collide near center.
    expect(strokeStyles.some((s) => s.includes('221, 192, 140'))).toBe(true);
    expect(strokeStyles.some((s) => s.includes('255, 228, 140'))).toBe(false);
    expect(strokeStyles.some((s) => s.includes('180, 255, 80'))).toBe(false);
    expect(strokeStyles.some((s) => s.includes('255, 95, 25'))).toBe(false);
  });

  it('black-gold-fill aura draws the deep bronze-gold ring, not the paler gold-fill colour', () => {
    const { ctx, strokeStyles } = recordingContextWithStrokeStyles();
    const engine = new SmartBeadsEngine('8x4x6');
    const board = engine.getState().board;
    const canvas = fakeCanvas(560, 560, ctx);

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
      moveHintAura: 'black-gold-fill',
    });

    // Mid-tone gold (163, 132, 79) — darker than the plain gold-fill ring so
    // it stays visible on light boards where the paler gold nearly disappears.
    expect(strokeStyles.some((s) => s.includes('163, 132, 79'))).toBe(true);
    expect(strokeStyles.some((s) => s.includes('221, 192, 140'))).toBe(false);
  });

  it('black beads get lamp-lit rim highlight on dark boards', () => {
    const { ctx, strokeStyles } = recordingContextWithStrokeStyles();
    const engine = new SmartBeadsEngine('8x4x6');
    const board = engine.getState().board;
    const canvas = fakeCanvas(560, 560, ctx);

    drawCanvasBoard(canvas, {
      board,
      currentPlayer: 'RED',
      gameOver: false,
      selectedId: null,
      legalTargets: [],
      chainPieceId: null,
      anim: null,
      turnPulse: 0,
      lastMove: null,
      capturePulses: [],
      moveHintAura: 'off',
    });

    expect(strokeStyles.some((s) => s.includes('255, 255, 255'))).toBe(true);
  });

  it('does not throw when a captured black bead fully fades out (radius reaches 0)', () => {
    const ctx = {
      ...baseCtxMethods(),
      // Mirrors the real CanvasRenderingContext2D: a negative radius throws.
      arc: (_x: number, _y: number, radius: number) => {
        if (radius < 0) {
          throw new DOMException(`The radius provided (${radius}) is negative.`, 'IndexSizeError');
        }
      },
    } as unknown as CanvasRenderingContext2D;

    const engine = new SmartBeadsEngine('8x4x6');
    const board = engine.getState().board;
    const blue = board.intersections.find((n) => n.occupant === 'BLUE');
    expect(blue).toBeDefined();
    const canvas = fakeCanvas(560, 560, ctx);

    // anim.t past ~0.714 clamps the capture fade to 0 — the exact moment that
    // threw "radius (-0.5) is negative" for a captured black bead in production.
    expect(() => drawCanvasBoard(canvas, {
      board,
      currentPlayer: 'RED',
      gameOver: false,
      selectedId: null,
      legalTargets: [],
      chainPieceId: null,
      anim: {
        from: blue!.id,
        to: blue!.id,
        captured: blue!.id,
        capturedPlayer: 'BLUE',
        player: 'RED',
        t: 0.95,
        duration: 200,
      },
      turnPulse: 0,
      lastMove: null,
      capturePulses: [],
    })).not.toThrow();
  });
});
