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
      canvasWidth: 500,
      canvasHeight: 680,
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

  it('16-bead keeps legacy projection constants on 500×680', () => {
    const node = Board16Sholo.intersections.find((n) => n.x === 10 && n.y === 0);
    expect(node).toBeDefined();
    const pt = projectIntersectionOnCanvas(node!, 500, 680, Board16Sholo);
    expect(pt.x).toBeCloseTo(40, 0);
    expect(pt.y).toBeCloseTo(36, 0);
  });
});
