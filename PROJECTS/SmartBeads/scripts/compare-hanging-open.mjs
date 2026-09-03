/**
 * Compare prototype vs production on the hanging two-click (A41 → A42).
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { clickPrototypeNode, liveSnap, openingSlideNodes } from './lib/live-ply.mjs';

const PROD = process.env.SMARTBEADS_URL || 'http://localhost:5173/';
const PROTO = 'file:///' + path
  .join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'prototype',
    'board4',
    'SHOLO_GUTI_WITH_FEATURE.html',
  )
  .replace(/\\/g, '/');

function occ(snap) {
  if (!snap) return {};
  const nodes = snap.occupants || snap;
  return Object.fromEntries(
    (Array.isArray(nodes) ? nodes : []).map((n) => [n.label || n.id, n.occupant || n || '.']),
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  console.log('=== PRODUCTION A41→A42 ===');
  await page.goto(PROD, { waitUntil: 'networkidle' });
  await page.waitForSelector('#board');
  await page.selectOption('#board-select', '16');
  await page.selectOption('#start-mode-select', 'pve');
  await page.selectOption('#ai-level-select', '2');
  await page.selectOption('#match-timer-select', 'off');
  await page.selectOption('#shot-clock-select', 'off');
  await page.locator('#restart-btn').click();
  await page.waitForTimeout(400);
  const slide = await openingSlideNodes(page, '16', 'A41', 'A42');
  const t0 = await liveSnap(page);
  await clickPrototypeNode(page, slide.from);
  await page.waitForTimeout(150);
  await clickPrototypeNode(page, slide.to);
  const times = [50, 300, 800, 1600];
  for (const ms of times) {
    await page.waitForTimeout(ms === 50 ? 50 : ms - (times[times.indexOf(ms) - 1] || 0));
    const s = await liveSnap(page);
    const a41 = s.occupants.find((n) => n.label === 'A41');
    const a42 = s.occupants.find((n) => n.label === 'A42');
    const a43 = s.occupants.find((n) => n.label === 'A43');
    console.log(
      `t+${ms} turns=${s.moveCount} player=${s.currentPlayer} ivory=${s.occupants.filter((n) => n.occupant === 'RED').length} ebony=${s.occupants.filter((n) => n.occupant === 'BLUE').length} A41=${a41?.occupant || '.'} A42=${a42?.occupant || '.'} A43=${a43?.occupant || '.'}`,
    );
  }

  console.log('\n=== PROTOTYPE LIVE CLICKS A41→A42 ===');
  await page.goto(PROTO, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    window.__SHOLO_GUTI_FEATURE__.setOptions({
      mode: 'pve',
      aiLevel: 2,
      matchTimer: 'off',
      shotClock: 'off',
      centerRule: 'off',
    });
  });
  await page.waitForTimeout(400);
  const protoSlide = await page.evaluate(() => {
    const api = window.__SHOLO_GUTI_FEATURE__;
    const from = api.NODE_INDEX.A41;
    const to = api.NODE_INDEX.A42;
    const canvas = document.getElementById('board');
    const [x0, y0] = (function toXY(x, y) {
      return [40 + (y / 8) * (canvas.width - 80), 36 + ((10 - x) / 12) * (canvas.height - 72)];
    })(api.NODES[from].x, api.NODES[from].y);
    const [x1, y1] = (function toXY(x, y) {
      return [40 + (y / 8) * (canvas.width - 80), 36 + ((10 - x) / 12) * (canvas.height - 72)];
    })(api.NODES[to].x, api.NODES[to].y);
    return { from, to, x0, y0, x1, y1, cw: canvas.width, ch: canvas.height };
  });
  const box = await page.locator('#board').boundingBox();
  await page.mouse.click(box.x + (protoSlide.x0 / protoSlide.cw) * box.width, box.y + (protoSlide.y0 / protoSlide.ch) * box.height);
  await page.waitForTimeout(200);
  await page.mouse.click(box.x + (protoSlide.x1 / protoSlide.cw) * box.width, box.y + (protoSlide.y1 / protoSlide.ch) * box.height);
  const protoMarks = [50, 300, 800, 1600];
  let elapsed = 0;
  for (const ms of protoMarks) {
    await page.waitForTimeout(ms - elapsed);
    elapsed = ms;
    const s = await page.evaluate(() => {
      const api = window.__SHOLO_GUTI_FEATURE__;
      const b = api.getBoard();
      const n = (id) => {
        const v = b[api.NODE_INDEX[id]];
        return v === api.P1 ? 'RED' : v === api.P2 ? 'BLUE' : '.';
      };
      const ivory = b.filter((x) => x === api.P1).length;
      const ebony = b.filter((x) => x === api.P2).length;
      return {
        turns: api.getMetrics().moveCount,
        player: api.getTurn() === api.P1 ? 'RED' : 'BLUE',
        ivory,
        ebony,
        A41: n('A41'),
        A42: n('A42'),
        A43: n('A43'),
      };
    });
    console.log(
      `proto t+${ms} turns=${s.turns} player=${s.player} ivory=${s.ivory} ebony=${s.ebony} A41=${s.A41} A42=${s.A42} A43=${s.A43}`,
    );
  }
  await page.goto(PROTO, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  const proto = await page.evaluate(() => {
    const api = window.__SHOLO_GUTI_FEATURE__;
    api.setOptions({ mode: 'pve', aiLevel: 2, matchTimer: 'off', shotClock: 'off', centerRule: 'off' });
    const i41 = api.NODE_INDEX.A41;
    const i42 = api.NODE_INDEX.A42;
    const i43 = api.NODE_INDEX.A43;
    const results = [];
    for (let t = 0; t < 20; t++) {
      api.resetGame();
      const b = api.getBoard();
      const after = api.applyMove(b, { from: i41, to: i42, captured: null });
      api.forceBoard(after, api.P2);
      const path = api.selectAITurn(2, after);
      const first = path && path[0];
      results.push({
        from: first ? api.NODES[first.from].id : null,
        to: first ? api.NODES[first.to].id : null,
        captured: first ? first.captured !== null : null,
        pathLen: path ? path.length : 0,
      });
    }
    return results;
  });
  const cap = proto.filter((r) => r.captured).length;
  const slides = proto.filter((r) => r.captured === false).length;
  console.log('captures', cap, 'slides', slides);
  console.log('samples', JSON.stringify(proto.slice(0, 8)));

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
