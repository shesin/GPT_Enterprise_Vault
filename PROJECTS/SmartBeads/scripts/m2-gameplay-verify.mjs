/**
 * Live-session tests against prototype oracles.
 * Clicks use prototype toXY, not production's own projector (avoids tautology).
 * Requires: npm run web:smartbeads
 */
import { chromium } from 'playwright';
import {
  clickPrototypeNode,
  emptyNodesAreNotPieces,
  isolatedFromSnaps,
  liveSnap,
  openingSlideNodes,
  timingWindow,
  waitForHumanPlyCommitted,
} from './lib/live-ply.mjs';

const URL = process.env.SMARTBEADS_URL || 'http://localhost:5173/';

const BOARDS = [
  { catalogId: '16', variant: '16' },
  { catalogId: '12x6x5', variant: '12x6x5' },
  { catalogId: '10x5', variant: '10x5' },
  { catalogId: '8x4x6', variant: '8x4x6' },
  { catalogId: '7x4x5', variant: '7' },
  { catalogId: '6x4', variant: '6' },
  { catalogId: '6x3x5', variant: '6x3x5' },
];

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function snap(page) {
  return liveSnap(page);
}

async function samplePiecePixels(page) {
  return page.evaluate(async () => {
    const {
      protoSholo16,
      protoSquare5,
      protoGridStretch,
      protoPortrait45,
      protoSquareFit,
    } = await import('/PROJECTS/SmartBeads/src/playtest/web/layout/prototypeProjectionOracle.ts');
    const snap = window.__SB_TEST__.snapshot();
    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const name = snap.boardName;
    const proto = (x, y) => {
      if (name === 'Sholo-Guti-16x5x5') return protoSholo16(x, y, w, h);
      if (name === 'SmartBeads-10x5') return protoSquare5(x, y, w, h);
      if (name === 'SmartBeads-12x6x5') return protoGridStretch(x, y, w, h, 5, 6);
      if (name === 'SmartBeads-8x4x6') return protoGridStretch(x, y, w, h, 4, 6);
      if (name === 'SmartBeads-7x4x5') return protoPortrait45(x, y, w, h);
      if (name === 'SmartBeads-6x4x4') return protoSquareFit(x, y, w, h, 4, 4);
      if (name === 'SmartBeads-6x3x5') return protoSquareFit(x, y, w, h, 3, 5);
      throw new Error(name);
    };
    const ivory = [];
    const ebony = [];
    for (const n of snap.occupants) {
      const p = proto(n.x, n.y);
      const px = ctx.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data;
      const lum = (px[0] + px[1] + px[2]) / 3;
      if (n.occupant === 'RED') ivory.push(lum);
      if (n.occupant === 'BLUE') ebony.push(lum);
    }
    const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
    return {
      ivory: avg(ivory),
      ebony: avg(ebony),
      ivoryMin: Math.min(...ivory),
      ebonyMax: Math.max(...ebony),
    };
  });
}

async function setupBoard(page, catalogId, mode) {
  await page.selectOption('#board-select', catalogId);
  await page.selectOption('#game-mode-select', mode);
  await page.selectOption('#match-timer-select', 'off');
  await page.selectOption('#shot-clock-select', 'off');
  await page.locator('#restart-btn').click();
  await page.waitForTimeout(500);
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#board');

    const hook = await snap(page);
    record('live test hook present', !!hook, hook ? hook.boardName : 'missing __SB_TEST__');

    for (const { catalogId, variant } of BOARDS) {
      await setupBoard(page, catalogId, 'pve');
      const afterSelect = await snap(page);
      record(`${catalogId} live board loaded`, afterSelect?.moveCount === 0 && afterSelect?.currentPlayer === 'RED', JSON.stringify({
        player: afterSelect?.currentPlayer,
        moves: afterSelect?.moveCount,
        name: afterSelect?.boardName,
      }));

      const aspect2 = await page.evaluate(() => {
        const c = document.getElementById('board');
        const r = c.getBoundingClientRect();
        return Math.abs(c.width / c.height - r.width / r.height);
      });
      await page.waitForTimeout(400);
      const aspect3 = await page.evaluate(() => {
        const c = document.getElementById('board');
        const r = c.getBoundingClientRect();
        return Math.abs(c.width / c.height - r.width / r.height);
      });
      record(`${catalogId} display aspect matches bitmap`, aspect2 < 0.08 && aspect3 < 0.08, `d1=${aspect2.toFixed(4)} d2=${aspect3.toFixed(4)}`);

      const pixels = await samplePiecePixels(page);
      record(
        `${catalogId} Ivory brighter than Ebony at prototype pixels`,
        pixels.ivory > pixels.ebony + 40 && pixels.ivoryMin > pixels.ebonyMax,
        JSON.stringify(pixels),
      );
      const emptyPx = await emptyNodesAreNotPieces(page);
      record(
        `${catalogId} empty nodes do not look like Ivory beads`,
        emptyPx.ok,
        JSON.stringify(emptyPx.bad),
      );

      const blues = afterSelect.occupants.filter((n) => n.occupant === 'BLUE');
      for (const blue of blues.slice(0, 3)) {
        await clickPrototypeNode(page, blue);
      }
      const afterBlueClicks = await snap(page);
      record(
        `${catalogId} PvE cannot play Ebony (3 opponent clicks)`,
        afterBlueClicks.selectedId === null
          && afterBlueClicks.moveCount === 0
          && afterBlueClicks.currentPlayer === 'RED',
        JSON.stringify({
          selected: afterBlueClicks.selectedId,
          turns: afterBlueClicks.moveCount,
          player: afterBlueClicks.currentPlayer,
        }),
      );

      const hangFrom = catalogId === '16' ? 'A41' : undefined;
      const hangTo = catalogId === '16' ? 'A42' : undefined;
      const slide = await openingSlideNodes(page, variant, hangFrom, hangTo);
      const beforePly = await snap(page);
      const timing = await timingWindow(page);
      await clickPrototypeNode(page, slide.from);
      await page.waitForTimeout(120);
      const selected = await snap(page);
      record(
        `${catalogId} P1 click selects Ivory only`,
        selected.selectedId === slide.from.id && selected.currentPlayer === 'RED',
        JSON.stringify({ selected: selected.selectedId, expect: slide.from.id }),
      );
      await clickPrototypeNode(page, slide.to);
      const committed = await waitForHumanPlyCommitted(page);
      const afterHuman = committed.snap;
      const iso = await isolatedFromSnaps(page, beforePly, afterHuman, {
        from: slide.from.id,
        to: slide.to.id,
      }, 'RED');
      record(
        `${catalogId} two clicks = isolated Ivory ply (AI has not moved)`,
        !committed.tooLate
          && afterHuman.moveCount === 1
          && afterHuman.currentPlayer === 'BLUE'
          && afterHuman.canHumanAct === false
          && iso.ok,
        iso.detail,
      );

      await page.waitForTimeout(timing.AI_REPLY_DELAY_MS + timing.HUMAN_JUMP_ANIM_MS + 200);
      const afterAi = await snap(page);
      record(
        `${catalogId} AI reply is a later ply`,
        afterAi.moveCount >= 2 && afterAi.currentPlayer === 'RED',
        JSON.stringify({ turns: afterAi.moveCount, player: afterAi.currentPlayer }),
      );
    }

    console.log('\n--- PROTOTYPE LIVE PARITY ---');
    results.forEach((r) => console.log(`${r.ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${r.name}`));
    if (results.some((r) => !r.ok)) process.exit(1);
  } catch (err) {
    console.error('UNCONFIRMED  live parity failed:', err.stack || err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
