/**
 * Live browser capture/geometry gate.
 * Sets a position in the running shell, then drives REAL mouse clicks on the real
 * canvas and reads the real session state. Engine-only Jest proof is separate;
 * this file is the "does it actually work on screen" half.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { clickPrototypeNode, liveSnap } from './lib/live-ply.mjs';

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

async function setup(page, catalogId) {
  await page.waitForFunction(() => document.querySelectorAll('#board-select option').length > 0);
  await page.evaluate(() => document.getElementById('start-screen-overlay')?.classList.add('hidden'));
  await page.selectOption('#board-select', catalogId);
  await page.selectOption('#game-mode-select', 'pvp');
  await page.selectOption('#match-timer-select', 'off');
  await page.selectOption('#shot-clock-select', 'off');
  await page.locator('#restart-btn').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__SB_TEST__.forceStarter('RED'));
}

/** Pick a capture route on this board, preferring the requested labels. */
async function pickRoute(page, variant, want) {
  return page.evaluate(async ({ v, want }) => {
    const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
    const engine = new SmartBeadsEngine(v);
    const board = engine.getState().board;
    const byLabel = (l) => board.intersections.find((p) => p.label === l);
    const paths = board.jumpPaths || [];
    let chosen = paths[0];
    if (want) {
      const from = byLabel(want[0]);
      const over = byLabel(want[1]);
      const to = byLabel(want[2]);
      chosen = paths.find((p) => p.from === from.id && p.over === over.id && p.to === to.id);
      if (!chosen) throw new Error(`no jump path ${want.join('/')}`);
    }
    const neighbours = new Set();
    for (const c of board.connections) {
      for (const [a, b] of [[c.from, c.to], [c.to, c.from]]) {
        if ([chosen.from, chosen.over, chosen.to].includes(a)) neighbours.add(b);
      }
    }
    const spare = board.intersections.find(
      (p) => ![chosen.from, chosen.over, chosen.to].includes(p.id) && !neighbours.has(p.id),
    );
    const pack = (id) => {
      const n = board.intersections[id];
      return { id: n.id, label: n.label, x: n.x, y: n.y };
    };
    return {
      from: pack(chosen.from),
      over: pack(chosen.over),
      to: pack(chosen.to),
      spare: spare ? pack(spare.id) : null,
    };
  }, { v: variant, want: want || null });
}

/** Place an isolated capture in the LIVE session and repaint the real canvas. */
async function armPosition(page, ivory, ebony) {
  await page.evaluate(({ ivory, ebony }) => {
    const t = window.__SB_TEST__;
    const state = t.session.getEngine().getState();
    for (const point of state.board.intersections) point.occupant = undefined;
    for (const id of ivory) state.board.intersections[id].occupant = 'RED';
    for (const id of ebony) state.board.intersections[id].occupant = 'BLUE';
    state.currentPlayer = 'RED';
    state.captures.RED = 0;
    state.captures.BLUE = 0;
    state.moveCount = 0;
    state.gameOver = false;
    state.winner = undefined;
    state.endReason = undefined;
    t.updateUI();
  }, { ivory, ebony });
  await page.waitForTimeout(120);
}

async function waitFor(page, predicate, maxMs = 3000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const snap = await liveSnap(page);
    if (predicate(snap)) return snap;
    await page.waitForTimeout(30);
  }
  return liveSnap(page);
}

/** Two real clicks: arm the bead, then click the empty landing intersection. */
async function clickCapture(page, route, shots) {
  await armPosition(page, [route.from.id], route.spare ? [route.over.id, route.spare.id] : [route.over.id]);
  if (shots?.before) await page.locator('#board').screenshot({ path: shots.before });

  // 1. Click the piece to select it
  await clickPrototypeNode(page, route.from);
  await page.waitForTimeout(120);
  const selected = await liveSnap(page);
  if (shots?.selected) await page.locator('#board').screenshot({ path: shots.selected });

  // 2. Clicking the enemy bead itself must be inert (no move, no deselect)
  await clickPrototypeNode(page, route.over);
  await page.waitForTimeout(100);

  // 3. Click the empty landing intersection to execute the capture
  await clickPrototypeNode(page, route.to);
  const after = await waitFor(page, (s) => s.moveCount >= 1 && !s.animating);
  if (shots?.after) await page.locator('#board').screenshot({ path: shots.after });
  return { selected, after };
}

function captureOk(route, selected, after) {
  const at = (id) => after.occupants.find((n) => n.id === id)?.occupant ?? null;
  return (
    selected.selectedId === route.from.id
    && at(route.over.id) === null
    && at(route.to.id) === 'RED'
    && at(route.from.id) === null
    && after.moveCount === 1
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#board');

  const snapDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'evidence-capture');
  fs.mkdirSync(snapDir, { recursive: true });

  for (const { catalogId, variant } of BOARDS) {
    await setup(page, catalogId);
    const route = await pickRoute(page, variant);
    const { selected, after } = await clickCapture(page, route, {
      before: path.join(snapDir, `${catalogId}-0-armed.png`),
      selected: path.join(snapDir, `${catalogId}-1-selected.png`),
      after: path.join(snapDir, `${catalogId}-2-captured.png`),
    });
    const at = (id) => after.occupants.find((n) => n.id === id)?.occupant ?? null;
    record(
      `${catalogId} live two-click landing capture (${route.from.label} -> ${route.to.label} jumping ${route.over.label})`,
      captureOk(route, selected, after),
      JSON.stringify({
        selected: selected.selectedId,
        victim: at(route.over.id),
        landing: at(route.to.id),
        turns: after.moveCount,
        player: after.currentPlayer,
      }),
    );
  }

  // 16-bead junction, both directions, driven by real clicks.
  // Restart per route so each capture starts from a clean armed position.
  for (const want of [
    ['LT', 'LIT', 'A20'],
    ['LB', 'LIB', 'A20'],
    ['LM', 'LIM', 'A20'],
    ['A20', 'LIT', 'LT'],
    ['A20', 'LIB', 'LB'],
    ['A20', 'LIM', 'LM'],
    ['RT', 'RIT', 'A24'],
    ['A24', 'RIB', 'RB'],
  ]) {
    await setup(page, '16');
    const route = await pickRoute(page, '16', want);
    const { selected, after } = await clickCapture(page, route);
    record(
      `16 junction live capture ${want[0]} x${want[1]} -> ${want[2]}`,
      captureOk(route, selected, after),
      JSON.stringify({ turns: after.moveCount, landing: after.occupants.find((n) => n.label === want[2])?.occupant ?? null }),
    );
  }

  // Multi-jump across the junction, plus the Finish chain button (capture optionality).
  await setup(page, '16');
  const chain = await page.evaluate(async () => {
    const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
    const board = new SmartBeadsEngine('16').getState().board;
    const byLabel = (l) => board.intersections.find((p) => p.label === l);
    const pack = (l) => {
      const n = byLabel(l);
      return { id: n.id, label: n.label, x: n.x, y: n.y };
    };
    return { LT: pack('LT'), LIT: pack('LIT'), A20: pack('A20'), A21: pack('A21'), A22: pack('A22'), A44: pack('A44') };
  });

  await armPosition(page, [chain.LT.id], [chain.LIT.id, chain.A21.id, chain.A44.id]);
  await clickPrototypeNode(page, chain.LT);
  await page.waitForTimeout(120);
  // Clicking enemy bead is inert
  await clickPrototypeNode(page, chain.LIT);
  await page.waitForTimeout(100);
  // Click landing square A20
  await clickPrototypeNode(page, chain.A20);
  const midChain = await waitFor(page, (s) => s.uiState === 'chain' && !s.animating);
  record(
    '16 junction multi-jump: first hop opens the chain on A20',
    midChain.uiState === 'chain' && midChain.chainPieceId === chain.A20.id,
    JSON.stringify({ uiState: midChain.uiState, chainPieceId: midChain.chainPieceId }),
  );
  const finishVisible = await page.locator('#finish-btn').isVisible();
  record('16 capture optionality: Finish chain button is offered mid-chain', finishVisible, `visible=${finishVisible}`);

  // Clicking enemy bead is inert mid-chain
  await clickPrototypeNode(page, chain.A21);
  await page.waitForTimeout(100);
  // Click landing square A22
  await clickPrototypeNode(page, chain.A22);
  const chainDone = await waitFor(page, (s) => s.moveCount >= 1 && s.uiState !== 'chain' && !s.animating);
  record(
    '16 junction multi-jump: second hop lands on A22 and ends the turn',
    chainDone.occupants.find((n) => n.label === 'A22')?.occupant === 'RED'
      && chainDone.occupants.find((n) => n.label === 'LIT')?.occupant == null
      && chainDone.occupants.find((n) => n.label === 'A21')?.occupant == null
      && chainDone.chainPieceId == null
      && chainDone.currentPlayer === 'BLUE',
    JSON.stringify({ a22: chainDone.occupants.find((n) => n.label === 'A22')?.occupant ?? null, player: chainDone.currentPlayer }),
  );

  // Optional stop: same opening, but press Finish instead of continuing.
  await armPosition(page, [chain.LT.id], [chain.LIT.id, chain.A21.id, chain.A44.id]);
  await clickPrototypeNode(page, chain.LT);
  await page.waitForTimeout(120);
  await clickPrototypeNode(page, chain.A20);
  await waitFor(page, (s) => s.uiState === 'chain' && !s.animating);
  await page.locator('#finish-btn').click();
  const stopped = await waitFor(page, (s) => s.uiState !== 'chain' && !s.animating);
  record(
    '16 capture optionality: Finish stops the chain with a capture still available',
    stopped.chainPieceId == null
      && stopped.currentPlayer === 'BLUE'
      && stopped.occupants.find((n) => n.label === 'A20')?.occupant === 'RED'
      && stopped.occupants.find((n) => n.label === 'A21')?.occupant === 'BLUE',
    JSON.stringify({ player: stopped.currentPlayer, a20: stopped.occupants.find((n) => n.label === 'A20')?.occupant ?? null }),
  );

  // Live browser check: Diagonal cross-apex capture LIB -> A20 -> A11 (exact user screenshot scenario)
  await setup(page, '16');
  const crossApex = await page.evaluate(async () => {
    const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
    const board = new SmartBeadsEngine('16').getState().board;
    const byLabel = (l) => board.intersections.find((p) => p.label === l);
    const pack = (l) => {
      const n = byLabel(l);
      return { id: n.id, label: n.label, x: n.x, y: n.y };
    };
    return { LIB: pack('LIB'), A20: pack('A20'), A11: pack('A11'), A44: pack('A44') };
  });
  await armPosition(page, [crossApex.LIB.id], [crossApex.A20.id, crossApex.A44.id]);
  await clickPrototypeNode(page, crossApex.LIB);
  await page.waitForTimeout(120);
  // Clicking enemy bead is inert
  await clickPrototypeNode(page, crossApex.A20);
  await page.waitForTimeout(100);
  // Click landing square A11 to execute diagonal capture
  await clickPrototypeNode(page, crossApex.A11);
  const capturedApex = await waitFor(page, (s) => s.moveCount >= 1 && !s.animating);
  record(
    '16 diagonal cross-apex capture: LIB jumps over A20 to land on A11 in live browser',
    capturedApex.occupants.find((n) => n.label === 'A11')?.occupant === 'RED'
      && capturedApex.occupants.find((n) => n.label === 'A20')?.occupant == null
      && capturedApex.occupants.find((n) => n.label === 'LIB')?.occupant == null,
    JSON.stringify({ a11: capturedApex.occupants.find((n) => n.label === 'A11')?.occupant ?? null, a20: capturedApex.occupants.find((n) => n.label === 'A20')?.occupant ?? null }),
  );

  // Clicking an immobile own bead must not leave a different bead armed.
  await setup(page, '6x4');
  const stale = await page.evaluate(async () => {
    const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
    const board = new SmartBeadsEngine('6').getState().board;
    const pack = (n) => ({ id: n.id, label: n.label, x: n.x, y: n.y });
    const path = board.jumpPaths[0];
    const neighbours = (id) => board.connections
      .filter((c) => c.from === id || c.to === id)
      .map((c) => (c.from === id ? c.to : c.from));
    const busy = [path.from, path.over, path.to];
    const boxed = board.intersections.find(
      (p) => !busy.includes(p.id) && neighbours(p.id).every((n) => !busy.includes(n)),
    );
    return {
      mover: pack(board.intersections[path.from]),
      victim: pack(board.intersections[path.over]),
      boxed: pack(boxed),
      wall: neighbours(boxed.id),
    };
  });
  await armPosition(page, [stale.mover.id, stale.boxed.id, ...stale.wall], [stale.victim.id]);
  await clickPrototypeNode(page, stale.mover);
  await page.waitForTimeout(120);
  const armed = await liveSnap(page);
  await clickPrototypeNode(page, stale.boxed);
  await page.waitForTimeout(200);
  const afterStale = await liveSnap(page);
  record(
    '6x4 clicking an immobile own bead clears the armed bead instead of leaving it live',
    armed.selectedId === stale.mover.id && afterStale.selectedId !== stale.mover.id && afterStale.moveCount === 0,
    JSON.stringify({ armed: armed.selectedId, after: afterStale.selectedId, turns: afterStale.moveCount }),
  );

  // Live browser check: opponent beads are completely inert to idle clicks across all 7 boards
  for (const { catalogId } of BOARDS) {
    await setup(page, catalogId);
    await clickPrototypeNode(page, { x: 50, y: 50 }); // click neutral area
    await page.waitForTimeout(100);
    const idleSnapBefore = await liveSnap(page);
    const enemyNode = idleSnapBefore.occupants.find((n) => n.occupant === 'BLUE');
    if (enemyNode) {
      await clickPrototypeNode(page, enemyNode);
      await page.waitForTimeout(150);
      const idleSnapAfter = await liveSnap(page);
      record(
        `${catalogId} opponent bead is completely inert: idle click on enemy bead does not select or move`,
        idleSnapAfter.selectedId === null && idleSnapAfter.moveCount === 0,
        JSON.stringify({ selectedId: idleSnapAfter.selectedId, moveCount: idleSnapAfter.moveCount }),
      );
    }
  }

  console.log('\n--- CAPTURE GEOMETRY ---');
  results.forEach((r) => console.log(`${r.ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${r.name}`));
  await browser.close();
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch((e) => {
  console.error('UNCONFIRMED', e);
  process.exit(1);
});
