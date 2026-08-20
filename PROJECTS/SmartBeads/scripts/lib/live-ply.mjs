/** Live two-click occupancy helpers. Occupancy rules live in firstMoveInvariants.ts (app layer). */
import { clickNode } from './project-node.mjs';

export async function liveSnap(page) {
  return page.evaluate(() => window.__SB_TEST__.snapshot());
}

export async function isolatedFromSnaps(page, start, after, move, mover) {
  return page.evaluate(
    async ({ startOcc, afterOcc, move, mover }) => {
      const { isolatedPly } = await import(
        '/PROJECTS/SmartBeads/src/playtest/web/feature/firstMoveInvariants.ts'
      );
      return isolatedPly(startOcc, afterOcc, move, mover);
    },
    {
      startOcc: start.occupants,
      afterOcc: after.occupants,
      move,
      mover,
    },
  );
}

export async function timingWindow(page) {
  return page.evaluate(async () => {
    const { AI_REPLY_DELAY_MS, HUMAN_PLY_OBSERVE_MS, HUMAN_SLIDE_ANIM_MS, HUMAN_JUMP_ANIM_MS } = await import(
      '/PROJECTS/SmartBeads/src/playtest/web/feature/pveTiming.ts'
    );
    return { AI_REPLY_DELAY_MS, HUMAN_PLY_OBSERVE_MS, HUMAN_SLIDE_ANIM_MS, HUMAN_JUMP_ANIM_MS };
  });
}

/**
 * Wait until the human dest-click has been applied, and fail closed if the
 * AI ply already landed. Do not use a long sleep — that is how hanging
 * captures used to pass as "the human move worked".
 */
export async function waitForHumanPlyCommitted(page, maxMs = 500) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const snap = await liveSnap(page);
    if (snap.moveCount >= 2) {
      return { snap, tooLate: true };
    }
    if (snap.moveCount === 1 && !snap.animating) {
      return { snap, tooLate: false };
    }
    await page.waitForTimeout(16);
  }
  return { snap: await liveSnap(page), tooLate: true };
}

export async function waitForLaterPly(page, minMoves = 2, maxMs = 2500) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const snap = await liveSnap(page);
    if (snap.moveCount >= minMoves && !snap.animating) return snap;
    await page.waitForTimeout(30);
  }
  return liveSnap(page);
}

/**
 * Fail if the shell stays on “AI is thinking…” or leaves a BLUE chain open.
 * moveCount >= 2 is not enough — an optional-stop capture can apply one hop and stall.
 */
export async function waitForAiTurnComplete(page, maxMs = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const snap = await liveSnap(page);
    const thinking = snap.aiThinking === true || /AI is thinking/i.test(snap.statusText || '');
    if (snap.gameOver && !thinking && !snap.animating) {
      return { snap, stalled: false };
    }
    if (
      !thinking
      && !snap.animating
      && snap.currentPlayer === 'RED'
      && snap.uiState !== 'chain'
      && (snap.chainPieceId == null || snap.chainPieceId === undefined)
    ) {
      return { snap, stalled: false };
    }
    await page.waitForTimeout(40);
  }
  return { snap: await liveSnap(page), stalled: true };
}

export async function clickPrototypeNode(page, node) {
  const box = await page.locator('#board').boundingBox();
  if (!box) throw new Error('no canvas box');
  const pt = await page.evaluate(async (node) => {
    const {
      protoSholo16,
      protoSquare5,
      protoGridStretch,
      protoPortrait45,
      protoSquareFit,
    } = await import('/PROJECTS/SmartBeads/src/playtest/web/layout/prototypeProjectionOracle.ts');
    const canvas = document.getElementById('board');
    const name = window.__SB_TEST__.snapshot().boardName;
    const w = canvas.width;
    const h = canvas.height;
    if (name === 'Sholo-Guti-16x5x5') return protoSholo16(node.x, node.y, w, h);
    if (name === 'SmartBeads-10x5') return protoSquare5(node.x, node.y, w, h);
    if (name === 'SmartBeads-12x6x5') return protoGridStretch(node.x, node.y, w, h, 5, 6);
    if (name === 'SmartBeads-8x4x6') return protoGridStretch(node.x, node.y, w, h, 4, 6);
    if (name === 'SmartBeads-7x4x5') return protoPortrait45(node.x, node.y, w, h);
    if (name === 'SmartBeads-6x4x4') return protoSquareFit(node.x, node.y, w, h, 4, 4);
    if (name === 'SmartBeads-6x3x5') return protoSquareFit(node.x, node.y, w, h, 3, 5);
    throw new Error(`no prototype oracle for ${name}`);
  }, node);
  const wh = await page.evaluate(() => {
    const c = document.getElementById('board');
    return { w: c.width, h: c.height };
  });
  await page.mouse.click(box.x + (pt.x / wh.w) * box.width, box.y + (pt.y / wh.h) * box.height);
}

export async function openingSlideNodes(page, variant, fromLabel, toLabel) {
  return page.evaluate(async ({ v, fromLabel, toLabel }) => {
    const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
    const { firstOpeningSlide, moveByLabel } = await import(
      '/PROJECTS/SmartBeads/src/playtest/web/feature/firstMoveInvariants.ts'
    );
    const eng = new SmartBeadsEngine(v);
    const move = fromLabel && toLabel
      ? moveByLabel(eng, fromLabel, toLabel)
      : firstOpeningSlide(eng);
    const from = eng.getState().board.intersections[move.from];
    const to = eng.getState().board.intersections[move.to];
    return {
      from: { id: from.id, x: from.x, y: from.y, label: from.label },
      to: { id: to.id, x: to.x, y: to.y, label: to.label },
    };
  }, { v: variant, fromLabel: fromLabel || null, toLabel: toLabel || null });
}

/** Empty nodes must not paint like Ivory beads (centre highlight used to look like a 17th piece). */
export async function emptyNodesAreNotPieces(page) {
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
    const empty = [];
    for (const n of snap.occupants) {
      const p = proto(n.x, n.y);
      const px = ctx.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data;
      const lum = (px[0] + px[1] + px[2]) / 3;
      if (n.occupant === 'RED') ivory.push(lum);
      if (!n.occupant) empty.push({ id: n.id, lum });
    }
    const ivoryMin = Math.min(...ivory);
    const bad = empty.filter((e) => e.lum > ivoryMin - 25);
    return { ok: bad.length === 0, ivoryMin, bad };
  });
}

export async function occupancyUnchanged(page, before, after) {
  return page.evaluate(
    async ({ startOcc, afterOcc }) => {
      const { occupancyDiff } = await import(
        '/PROJECTS/SmartBeads/src/playtest/web/feature/firstMoveInvariants.ts'
      );
      return occupancyDiff(startOcc, afterOcc);
    },
    { startOcc: before.occupants, afterOcc: after.occupants },
  );
}

/** Two real clicks, then occupancy of the human ply only. Call before waiting for AI. */
export async function playTwoClicksIsolated(page, catalogId, variant, fromLabel, toLabel) {
  const start = await liveSnap(page);
  const slide = await openingSlideNodes(page, variant, fromLabel, toLabel);
  await clickNode(page, catalogId, slide.from.id);
  const selected = await liveSnap(page);
  await clickNode(page, catalogId, slide.to.id);
  const committed = await waitForHumanPlyCommitted(page);
  const after = committed.snap;
  const iso = await isolatedFromSnaps(page, start, after, {
    from: slide.from.id,
    to: slide.to.id,
  }, 'RED');
  const selectDiff = await occupancyUnchanged(page, start, selected);
  return { start, slide, selected, after, iso, selectDiff, tooLate: committed.tooLate };
}
