import { Board10x5 } from '../../../../boards/Board10x5';
import { Board12x6x5 } from '../../../../boards/Board12x6x5';
import { Board16Sholo } from '../../../../boards/Board16Sholo';
import { Board6 } from '../../../../boards/Board6';
import { Board6x3x5 } from '../../../../boards/Board6x3x5';
import { Board7 } from '../../../../boards/Board7';
import { Board8x4x6 } from '../../../../boards/Board8x4x6';
import { BoardDefinition } from '../../../../models/GameState';
import { getBoardCanvasSize } from '../boardVisualProfile';
import { projectIntersectionOnCanvas } from '../boardProjection';
import {
  protoGridStretch,
  protoPortrait45,
  protoSholo16,
  protoSquare5,
  protoSquareFit,
} from '../prototypeProjectionOracle';
import { listTurnHighlightNodeIds } from '../../render/CanvasBoardRenderer';

function dist(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function assertMatchesPrototype(
  board: BoardDefinition,
  proto: (x: number, y: number) => { x: number; y: number },
): void {
  const size = getBoardCanvasSize(board.name);
  for (const node of board.intersections) {
    if (node.x === undefined || node.y === undefined) {
      throw new Error(`node ${node.id} missing lattice`);
    }
    const got = projectIntersectionOnCanvas(node, size.width, size.height, board);
    const expected = proto(node.x, node.y);
    const delta = dist(got, expected);
    if (delta >= 0.51) {
      throw new Error(
        `${board.name} ${node.label ?? node.id} prod=(${got.x.toFixed(2)},${got.y.toFixed(2)}) proto=(${expected.x.toFixed(2)},${expected.y.toFixed(2)}) d=${delta.toFixed(3)}`,
      );
    }
  }
}

describe('production projection vs prototype HTML toXY', () => {
  it('16-bead matches SHOLO_GUTI_WITH_FEATURE.html', () => {
    const { width: w, height: h } = getBoardCanvasSize(Board16Sholo.name);
    expect([w, h]).toEqual([500, 680]);
    assertMatchesPrototype(Board16Sholo, (x, y) => protoSholo16(x, y, w, h));
  });

  it('12-bead matches SHOLO_GUTI_12_BEAD_6x5_WITH_FEATURE.html', () => {
    const { width: w, height: h } = getBoardCanvasSize(Board12x6x5.name);
    expect([w, h]).toEqual([560, 560]);
    assertMatchesPrototype(Board12x6x5, (x, y) => protoGridStretch(x, y, w, h, 5, 6));
  });

  it('10-bead matches SHOLO_GUTI_10_BEAD_WITH_FEATURE.html', () => {
    const { width: w, height: h } = getBoardCanvasSize(Board10x5.name);
    expect([w, h]).toEqual([560, 560]);
    assertMatchesPrototype(Board10x5, (x, y) => protoSquare5(x, y, w, h));
  });

  it('8-bead matches SHOLO_GUTI_8_BEAD_4x6_HOURGLASS_WITH_FEATURE.html', () => {
    const { width: w, height: h } = getBoardCanvasSize(Board8x4x6.name);
    expect([w, h]).toEqual([560, 560]);
    assertMatchesPrototype(Board8x4x6, (x, y) => protoGridStretch(x, y, w, h, 4, 6));
  });

  it('7-bead matches SHOLO_GUTI_7_BEAD_WITH_FEATURE.html', () => {
    const { width: w, height: h } = getBoardCanvasSize(Board7.name);
    expect([w, h]).toEqual([560, 560]);
    assertMatchesPrototype(Board7, (x, y) => protoPortrait45(x, y, w, h));
  });

  it('6×4 matches SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html', () => {
    const { width: w, height: h } = getBoardCanvasSize(Board6.name);
    expect([w, h]).toEqual([560, 560]);
    assertMatchesPrototype(Board6, (x, y) => protoSquareFit(x, y, w, h, 4, 4));
  });

  it('6×3×5 matches SHOLO_GUTI_6_BEAD_WITH_FEATURE.html', () => {
    const { width: w, height: h } = getBoardCanvasSize(Board6x3x5.name);
    expect([w, h]).toEqual([560, 560]);
    assertMatchesPrototype(Board6x3x5, (x, y) => protoSquareFit(x, y, w, h, 3, 5));
  });
});

describe('natural play geometry (prototype hit radius 22)', () => {
  const boards: BoardDefinition[] = [
    Board16Sholo,
    Board12x6x5,
    Board10x5,
    Board8x4x6,
    Board7,
    Board6,
    Board6x3x5,
  ];

  it.each(boards)('$name nodes stay on canvas and uniquely hittable', (board) => {
    const { width, height } = getBoardCanvasSize(board.name);
    const pts = board.intersections.map((node) => {
      const pt = projectIntersectionOnCanvas(node, width, height, board);
      return { node, pt };
    });

    for (const { node, pt } of pts) {
      expect(pt.x).toBeGreaterThanOrEqual(0);
      expect(pt.y).toBeGreaterThanOrEqual(0);
      expect(pt.x).toBeLessThanOrEqual(width);
      expect(pt.y).toBeLessThanOrEqual(height);
    }

    let minPair = Infinity;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        minPair = Math.min(minPair, dist(pts[i].pt, pts[j].pt));
      }
    }
    expect(minPair).toBeGreaterThan(8);
  });
});

describe('whose-turn highlight is one side only', () => {
  it('P1 turn never highlights Ebony, P2 turn never highlights Ivory', () => {
    const board = Board16Sholo;
    const p1 = listTurnHighlightNodeIds(board, 'RED', null);
    const p2 = listTurnHighlightNodeIds(board, 'BLUE', null);
    expect(p1.length).toBe(16);
    expect(p2.length).toBe(16);
    expect(p1.every((id) => board.intersections[id].occupant === 'RED')).toBe(true);
    expect(p2.every((id) => board.intersections[id].occupant === 'BLUE')).toBe(true);
    expect(p1.some((id) => p2.includes(id))).toBe(false);
  });
});
