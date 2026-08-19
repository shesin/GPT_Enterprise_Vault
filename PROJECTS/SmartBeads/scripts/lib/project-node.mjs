/** Shared canvas click helper for Playwright — uses real mouse events on #board. */

const VARIANT_BY_CATALOG = {
  '16': '16',
  '12x6x5': '12x6x5',
  '10x5': '10x5',
  '8x4x6': '8x4x6',
  '7x4x5': '7',
  '6x4': '6',
  '6x3x5': '6x3x5',
};

function resolveVariant(catalogId) {
  const v = VARIANT_BY_CATALOG[catalogId];
  if (!v) throw new Error(`unknown catalog board: ${catalogId}`);
  return v;
}

export async function projectNode(page, catalogId, nodeIndex) {
  const variant = resolveVariant(catalogId);
  return page.evaluate(
    async ({ v, i }) => {
      const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      const { projectIntersectionOnCanvas } = await import(
        '/PROJECTS/SmartBeads/src/playtest/web/layout/boardProjection.ts'
      );
      const eng = new SmartBeadsEngine(v);
      const board = eng.getState().board;
      const node = board.intersections[i];
      const canvas = document.getElementById('board');
      if (!canvas || node.x === undefined || node.y === undefined) return null;
      const pt = projectIntersectionOnCanvas(node, canvas.width, canvas.height, board);
      return { x: pt.x, y: pt.y, cw: canvas.width, ch: canvas.height };
    },
    { v: variant, i: nodeIndex },
  );
}

/** Click a node using Playwright real pointer events (matches human play). */
export async function clickNode(page, catalogId, nodeIndex) {
  const pt = await projectNode(page, catalogId, nodeIndex);
  if (!pt) throw new Error(`node ${nodeIndex} coords missing`);
  const box = await page.locator('#board').boundingBox();
  if (!box) throw new Error('canvas bounding box missing');
  const x = box.x + (pt.x / pt.cw) * box.width;
  const y = box.y + (pt.y / pt.ch) * box.height;
  await page.mouse.click(x, y);
  await page.waitForTimeout(80);
}

export async function verifyHitTest(page, catalogId, nodeIndex) {
  const variant = resolveVariant(catalogId);
  return page.evaluate(
    async ({ v, i }) => {
      const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      const { hitTestNode } = await import('/PROJECTS/SmartBeads/src/playtest/web/render/CanvasBoardRenderer.ts');
      const { projectIntersectionOnCanvas } = await import(
        '/PROJECTS/SmartBeads/src/playtest/web/layout/boardProjection.ts'
      );
      const eng = new SmartBeadsEngine(v);
      const board = eng.getState().board;
      const node = board.intersections[i];
      const canvas = document.getElementById('board');
      const pt = projectIntersectionOnCanvas(node, canvas.width, canvas.height, board);
      const rect = canvas.getBoundingClientRect();
      const clientX = rect.left + (pt.x * rect.width) / canvas.width;
      const clientY = rect.top + (pt.y * rect.height) / canvas.height;
      return hitTestNode(canvas, board, clientX, clientY) === i;
    },
    { v: variant, i: nodeIndex },
  );
}
