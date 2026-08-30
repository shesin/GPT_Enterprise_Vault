import { listProductBoards, resolveEngineVariant } from '../../../../config/BoardCatalog';
import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import { getBoardCanvasSize } from '../boardVisualProfile';
import { projectIntersectionOnCanvas } from '../boardProjection';

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

describe('cream camp renders toward the bottom on every product board', () => {
  it.each(listProductBoards())('$id RED (cream) beads average lower on canvas than BLUE', (entry) => {
    const engine = new SmartBeadsEngine(resolveEngineVariant(entry.id));
    const board = engine.getState().board;
    const { width, height } = getBoardCanvasSize(board.name);

    const redY: number[] = [];
    const blueY: number[] = [];
    for (const node of board.intersections) {
      if (!node.occupant) continue;
      const { y } = projectIntersectionOnCanvas(node, width, height, board);
      if (node.occupant === 'RED') redY.push(y);
      if (node.occupant === 'BLUE') blueY.push(y);
    }

    expect(redY.length).toBeGreaterThan(0);
    expect(blueY.length).toBeGreaterThan(0);
    expect(mean(redY)).toBeGreaterThan(mean(blueY));
  });
});
