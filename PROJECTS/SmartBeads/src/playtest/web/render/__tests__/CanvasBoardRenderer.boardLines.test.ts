import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import * as boardLookThemes from '../../layout/boardLookThemes';
import { PLAY_BOARD_LOOK_STORAGE_KEY } from '../../layout/playShellThemes';
import { drawCanvasBoard } from '../CanvasBoardRenderer';

describe('CanvasBoardRenderer board grid lines', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it("uses the board look's own mapped rgba for grid lines, not its raw oklch lineColor", () => {
    // Every board look (including Warm Walnut, '14') now has its own line-colour
    // entry in OWN_COLOUR_LINE_THEMES — see boardLineGoldThemes.ts.
    const store = new Map<string, string>([[PLAY_BOARD_LOOK_STORAGE_KEY, '14']]);
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
      configurable: true,
    });

    jest.spyOn(boardLookThemes, 'getActiveBoardLookTheme').mockReturnValue({
      id: '14',
      label: 'Warm Walnut',
      lookGroup: 'complete',
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

    // Warm Walnut's own mapped colour — oklch(0.76 0.055 80) -> rgb(196, 174, 138).
    // (The centre scoring ring separately still draws in Classic gold by design —
    // see drawCenterRing()/GPT_PROJECT_DECISIONS_05P.md §Center nodes — so this
    // only asserts the grid-line colour itself, not every strokeStyle call.)
    expect(strokeStyles.filter((s) => s.includes('196, 174, 138')).length).toBeGreaterThanOrEqual(1);
    expect(fillStyles.some((s) => typeof s === 'string' && s.includes('196, 174, 138'))).toBe(true);
    expect(strokeStyles).not.toContain('oklch(0.76 0.055 80)');
  });
});
