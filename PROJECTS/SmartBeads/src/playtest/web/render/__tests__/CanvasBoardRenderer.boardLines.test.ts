import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import * as boardLookThemes from '../../layout/boardLookThemes';
import { CLASSIC_BOARD_LINE_GOLD } from '../../layout/boardLineGoldThemes';
import { drawCanvasBoard } from '../CanvasBoardRenderer';

describe('CanvasBoardRenderer board grid lines', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses locked Classic gold rgba for grid lines, not per-theme oklch lineColor', () => {
    jest.spyOn(boardLookThemes, 'getActiveBoardLookTheme').mockReturnValue({
      id: '12',
      label: 'Warm Walnut',
      lookGroup: 'light-charcoal',
      surfaceTop: 'oklch(0.55 0.075 55)',
      surfaceBottom: 'oklch(0.42 0.07 52)',
      frameOuter: 'oklch(0.32 0.06 50)',
      frameInner: 'oklch(0.18 0.045 48)',
      lineColor: 'oklch(0.76 0.055 80)',
      edgeGlowRgba: 'rgba(0,0,0,0)',
      creamHorizontalStops: [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0)']],
      creamVerticalStops: [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0)']],
      bodyBackground: 'oklch(0.42 0.07 52)',
      sideCardBackground: '',
      sideCardBorder: '',
      sideCardGlow: '',
      playAiBg: '',
      playAiBorder: '',
      playHumanBg: '',
      playHumanBorder: '',
      playHumanAccent: '',
      creamBead: { highlight: '', mid: '', shadow: '' },
      blackBead: { highlight: '', mid: '', shadow: '' },
    });

    const strokeStyles: string[] = [];
    const fillStyles: unknown[] = [];
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
      globalAlpha: 1,
      get strokeStyle() { return strokeStyles[strokeStyles.length - 1] ?? ''; },
      set strokeStyle(v: string) { strokeStyles.push(v); },
      get fillStyle() { return fillStyles[fillStyles.length - 1] ?? ''; },
      set fillStyle(v: unknown) { fillStyles.push(v); },
    } as unknown as CanvasRenderingContext2D;

    const engine = new SmartBeadsEngine('6x3x5');
    const canvas = {
      width: 420,
      height: 560,
      getContext: () => ctx,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 560 }),
    } as unknown as HTMLCanvasElement;

    drawCanvasBoard(canvas, {
      board: engine.getState().board,
      currentPlayer: 'RED',
      gameOver: false,
      selectedId: null,
      legalTargets: [],
      chainPieceId: null,
      anim: null,
      turnPulse: 0,
    });

    expect(strokeStyles).toContain(CLASSIC_BOARD_LINE_GOLD.lineRgba);
    expect(strokeStyles.filter((s) => s.includes('255, 205, 92')).length).toBeGreaterThanOrEqual(1);
    expect(fillStyles.some((s) => typeof s === 'string' && s.includes('255, 205, 92'))).toBe(true);
    expect(strokeStyles).not.toContain('oklch(0.76 0.055 80)');
  });
});
