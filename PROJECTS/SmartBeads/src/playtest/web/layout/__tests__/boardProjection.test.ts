import { Board10x5 } from '../../../../boards/Board10x5';
import { Board12x6x5 } from '../../../../boards/Board12x6x5';
import { Board16Sholo } from '../../../../boards/Board16Sholo';
import { Board6 } from '../../../../boards/Board6';
import { Board6x3x5 } from '../../../../boards/Board6x3x5';
import { Board7 } from '../../../../boards/Board7';
import { Board8x4x6 } from '../../../../boards/Board8x4x6';
import { getBoardCanvasSize, getBoardVisualProfile } from '../boardVisualProfile';
import { projectIntersectionOnCanvas, projectLatticePointOnCanvas } from '../boardProjection';

describe('boardVisualProfile', () => {
  it('maps each V1 board to a distinct projection and canvas size', () => {
    expect(getBoardVisualProfile(Board16Sholo.name)).toMatchObject({
      projection: 'sholo16',
      canvasWidth: 560,
      canvasHeight: 700,
    });
    expect(getBoardVisualProfile(Board6.name)).toMatchObject({
      projection: 'square-fit',
      canvasWidth: 560,
      canvasHeight: 560,
      turnWashAxis: 'vertical',
    });
    expect(getBoardVisualProfile(Board6x3x5.name).projection).toBe('square-fit');
    expect(getBoardVisualProfile(Board10x5.name).projection).toBe('square5');
    expect(getBoardVisualProfile(Board12x6x5.name).projection).toBe('grid-stretch');
    expect(getBoardVisualProfile(Board8x4x6.name).projection).toBe('grid-stretch');
    expect(getBoardVisualProfile(Board7.name).projection).toBe('portrait45');
  });

  it('declares explicit centre ring points per prototype (not engine fallback)', () => {
    expect(getBoardVisualProfile(Board16Sholo.name).centerRingPoints).toEqual([{ x: 4, y: 4 }]);
    expect(getBoardVisualProfile(Board12x6x5.name).centerRingPoints).toEqual([
      { x: 4, y: 4 },
      { x: 4, y: 6 },
    ]);
    expect(getBoardVisualProfile(Board10x5.name).centerRingPoints).toEqual([{ x: 4, y: 4 }]);
    expect(getBoardVisualProfile(Board8x4x6.name).centerRingPoints).toHaveLength(4);
    expect(getBoardVisualProfile(Board7.name).centerRingPoints).toEqual([
      { x: 2, y: 4 },
      { x: 4, y: 4 },
    ]);
    expect(getBoardVisualProfile(Board6.name).centerRingPoints).toHaveLength(4);
    expect(getBoardVisualProfile(Board6x3x5.name).centerRingPoints).toEqual([{ x: 2, y: 4 }]);
  });

  it('declares amber center square plates for all boards', () => {
    expect(getBoardVisualProfile(Board16Sholo.name).centerSquares).toEqual([{ x: 4, y: 4 }]);
    expect(getBoardVisualProfile(Board12x6x5.name).centerSquares).toEqual([
      { x: 4, y: 4 },
      { x: 4, y: 6 },
    ]);
    expect(getBoardVisualProfile(Board10x5.name).centerSquares).toEqual([{ x: 4, y: 4 }]);
    expect(getBoardVisualProfile(Board8x4x6.name).centerSquares).toHaveLength(4);
    expect(getBoardVisualProfile(Board7.name).centerSquares).toEqual([
      { x: 2, y: 4 },
      { x: 4, y: 4 },
    ]);
    expect(getBoardVisualProfile(Board6.name).centerSquares).toHaveLength(4);
    expect(getBoardVisualProfile(Board6x3x5.name).centerSquares).toEqual([{ x: 2, y: 4 }]);
  });

  it('uses square canvas for non-16 boards', () => {
    for (const name of [
      Board6.name,
      Board6x3x5.name,
      Board10x5.name,
      Board12x6x5.name,
      Board8x4x6.name,
      Board7.name,
    ]) {
      expect(getBoardCanvasSize(name)).toEqual({ width: 560, height: 560 });
    }
  });
});

describe('boardProjection per-board parity', () => {
  it('10-bead centre node maps to canvas centre file on 560 square', () => {
    const node = Board10x5.intersections[12];
    const pt = projectIntersectionOnCanvas(node, 560, 560, Board10x5);
    const sq = projectLatticePointOnCanvas(4, 4, 560, 560, Board10x5);
    expect(Math.hypot(pt.x - sq.x, pt.y - sq.y)).toBeLessThan(1);
  });

  it('6×4 square-fit centres the grid in canvas', () => {
    const corners = Board6.intersections.filter((n) => n.x === 0 && n.y === 0);
    expect(corners).toHaveLength(1);
    const pt = projectIntersectionOnCanvas(corners[0], 560, 560, Board6);
    expect(pt.x).toBeGreaterThanOrEqual(44);
    expect(pt.y).toBeGreaterThanOrEqual(44);
  });

  it('16-bead maps top-left corner node RT to top-left padding on 560×700', () => {
    const node = Board16Sholo.intersections.find((n) => n.x === 12 && n.y === 0);
    expect(node).toBeDefined();
    const pt = projectIntersectionOnCanvas(node!, 560, 700, Board16Sholo);
    expect(pt.x).toBeCloseTo(40, 0);
    expect(pt.y).toBeCloseTo(36, 0);
  });

  it('16-bead junction diagonals are perfectly collinear on canvas', () => {
    const byLabel = new Map(Board16Sholo.intersections.map((n) => [n.label!, n]));
    const lib = projectIntersectionOnCanvas(byLabel.get('LIB')!, 560, 700, Board16Sholo);
    const a20 = projectIntersectionOnCanvas(byLabel.get('A20')!, 560, 700, Board16Sholo);
    const a11 = projectIntersectionOnCanvas(byLabel.get('A11')!, 560, 700, Board16Sholo);

    // LIB -> A20 vector and A20 -> A11 vector must have identical direction on canvas
    const dx1 = a20.x - lib.x;
    const dy1 = a20.y - lib.y;
    const dx2 = a11.x - a20.x;
    const dy2 = a11.y - a20.y;
    expect(Math.abs(dx1 * dy2 - dy1 * dx2)).toBeLessThan(1e-6);
  });

  it('16-bead central 5x5 grid covers prominent area on canvas (480px width, 314px height)', () => {
    const byLabel = new Map(Board16Sholo.intersections.map((n) => [n.label!, n]));
    const a00 = projectIntersectionOnCanvas(byLabel.get('A00')!, 560, 700, Board16Sholo);
    const a04 = projectIntersectionOnCanvas(byLabel.get('A04')!, 560, 700, Board16Sholo);
    const a40 = projectIntersectionOnCanvas(byLabel.get('A40')!, 560, 700, Board16Sholo);

    const gridWidth = Math.abs(a40.x - a00.x);
    const gridHeight = Math.abs(a04.y - a00.y);
    expect(gridWidth).toBeCloseTo(480, 0);
    expect(gridHeight).toBeCloseTo(314, 0);
  });
});

