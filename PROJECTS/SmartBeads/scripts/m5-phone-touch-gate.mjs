/**
 * Phone touch gate (B4/B6 pre-check, emulated): on the densest board (16-bead, 37 nodes) every node must be
 * hit by a real touch tap at phone sizes, and a tap slightly off-centre must still pick the nearest node.
 * Prints the measured node spacing in CSS px. Needs the dev server (default http://localhost:5173/) and Chromium.
 * This does NOT replace B6 (Shekhar's real-phone check); it proves the geometry the touch code relies on.
 */
import { chromium } from 'playwright';
import { playShellUrl } from './lib/play-shell-setup.mjs';
import { resetBoardViaTestApi } from './lib/play-shell-setup.mjs';

if (process.env.SB_BROWSER && process.env.SB_BROWSER !== 'chromium') {
  console.log('SKIP  phone touch gate runs in Chromium only (mobile emulation)');
  process.exit(0);
}
const URL = playShellUrl();
const SIZES = [[360, 740], [390, 844], [412, 915]];
const MIN_SPACING = Number(process.env.SB_MIN_NODE_SPACING ?? 28);
const annotate = (m) => process.env.GITHUB_ACTIONS && console.log('::error::' + String(m).replace(/\n/g, ' ').slice(0, 800));
let failed = 0;

const browser = await chromium.launch();
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#board');
  await resetBoardViaTestApi(page, '16', 'pvp');
  const res = await page.evaluate(async () => {
    const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
    const { hitTestNode } = await import('/PROJECTS/SmartBeads/src/playtest/web/render/CanvasBoardRenderer.ts');
    const { projectIntersectionOnCanvas } = await import('/PROJECTS/SmartBeads/src/playtest/web/layout/boardProjection.ts');
    const board = new SmartBeadsEngine('16').getState().board;
    const canvas = document.getElementById('board');
    const r = canvas.getBoundingClientRect();
    const pts = board.intersections.map((n) => {
      const p = projectIntersectionOnCanvas(n, canvas.width, canvas.height, board);
      return { x: r.left + (p.x * r.width) / canvas.width, y: r.top + (p.y * r.height) / canvas.height };
    });
    let minD = Infinity;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) minD = Math.min(minD, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
    // nearest neighbour per node, and a tap 12 CSS px (max 35% of the gap) toward it must still hit this node
    const bad = [];
    pts.forEach((p, i) => {
      let nn = -1, nd = Infinity;
      pts.forEach((q, j) => { if (j !== i) { const d = Math.hypot(p.x - q.x, p.y - q.y); if (d < nd) { nd = d; nn = j; } } });
      const q = pts[nn];
      const k = Math.min(0.35, 12 / nd); // finger error: 12 CSS px (about 3 mm) toward the nearest neighbour, at most 35% of the gap
      const tx = p.x + (q.x - p.x) * k, ty = p.y + (q.y - p.y) * k;
      if (hitTestNode(canvas, board, p.x, p.y) !== i) bad.push(`centre ${i}`);
      else { const hh = hitTestNode(canvas, board, tx, ty); if (hh !== i) bad.push(`offset ${i}->${hh}(nn ${nn},d${nd.toFixed(0)})`); }
    });
    return { nodes: pts.length, minD, bad, boardW: r.width, boardH: r.height, scrollW: document.documentElement.scrollWidth };
  });
  const ok = res.nodes === 37 && res.bad.length === 0 && res.minD >= MIN_SPACING && res.scrollW <= w;
  console.log(`${ok ? 'CONFIRMED' : 'UNCONFIRMED'}  16-bead touch ${w}x${h}: nodes=${res.nodes} minSpacing=${res.minD.toFixed(1)}px board=${res.boardW.toFixed(0)}x${res.boardH.toFixed(0)} scrollW=${res.scrollW} bad=[${res.bad.join(',')}]`);
  if (!ok) { failed++; annotate(`16-bead touch ${w}x${h} minSpacing=${res.minD.toFixed(1)} bad=${res.bad.join(',')}`); }
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
