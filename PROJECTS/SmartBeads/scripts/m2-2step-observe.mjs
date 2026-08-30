/**
 * Two-click gate — what a person sees after select + destination.
 * App occupancy rules: firstMoveInvariants.ts (Jest, no DOM).
 * This file only checks that the live web shell honors the same ply.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  clickPrototypeNode,
  emptyNodesAreNotPieces,
  isolatedFromSnaps,
  liveSnap,
  occupancyUnchanged,
  openingSlideNodes,
  timingWindow,
  waitForHumanPlyCommitted,
  waitForAiTurnComplete,
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

async function setup(page, catalogId, mode) {
  await page.waitForFunction(() => document.querySelectorAll('#board-select option').length > 0);
  await page.evaluate(() => document.getElementById('start-screen-overlay')?.classList.add('hidden'));
  await page.selectOption('#board-select', catalogId);
  await page.selectOption('#game-mode-select', mode);
  await page.selectOption('#match-timer-select', 'off');
  await page.selectOption('#shot-clock-select', 'off');
  await page.locator('#restart-btn').click();
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__SB_TEST__.forceStarter('RED'));
}

async function twoClicks(page, variant, selectShotPath, fromLabel, toLabel) {
  const start = await liveSnap(page);
  const slide = await openingSlideNodes(page, variant, fromLabel, toLabel);
  await clickPrototypeNode(page, slide.from);
  await page.waitForTimeout(120);
  if (selectShotPath) {
    await page.locator('#board').screenshot({ path: selectShotPath });
  }
  const selected = await liveSnap(page);
  await clickPrototypeNode(page, slide.to);
  await page.waitForTimeout(50);
  const inFlight = await liveSnap(page);
  const committed = await waitForHumanPlyCommitted(page);
  return { start, slide, selected, inFlight, after: committed.snap, tooLate: committed.tooLate };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#board');
  const timing = await timingWindow(page);
  record(
    'observe window is after slide lands and before AI reply starts',
    timing.HUMAN_PLY_OBSERVE_MS > timing.HUMAN_SLIDE_ANIM_MS
      && timing.HUMAN_PLY_OBSERVE_MS < timing.HUMAN_SLIDE_ANIM_MS + timing.AI_REPLY_DELAY_MS
      && timing.AI_REPLY_DELAY_MS === 40
      && timing.HUMAN_SLIDE_ANIM_MS === 200,
    JSON.stringify(timing),
  );

  const snapDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'evidence-2step');
  fs.mkdirSync(snapDir, { recursive: true });

  for (const { catalogId, variant } of BOARDS) {
    await setup(page, catalogId, 'pvp');
    const emptyStart = await emptyNodesAreNotPieces(page);
    record(
      `${catalogId} empty nodes do not look like Ivory beads`,
      emptyStart.ok,
      JSON.stringify(emptyStart.bad),
    );
    await page.locator('#board').screenshot({ path: path.join(snapDir, `${catalogId}-0-start.png`) });

    const hangFrom = catalogId === '16' ? 'A41' : undefined;
    const hangTo = catalogId === '16' ? 'A42' : undefined;
    const pvp = await twoClicks(
      page,
      variant,
      path.join(snapDir, `${catalogId}-1-selected.png`),
      hangFrom,
      hangTo,
    );
    const selectDiff = await occupancyUnchanged(page, pvp.start, pvp.selected);
    record(
      `${catalogId} click 1 selects only — occupancy unchanged`,
      pvp.selected.selectedId === pvp.slide.from.id
        && pvp.selected.moveCount === 0
        && selectDiff.length === 0,
      JSON.stringify({ selected: pvp.selected.selectedId, diff: selectDiff }),
    );
    record(
      `${catalogId} dest click: slide starts, AI has not applied`,
      pvp.inFlight.moveCount < 2
        && (pvp.inFlight.moveCount === 0 ? pvp.inFlight.animating === true : true),
      JSON.stringify({
        animating: pvp.inFlight.animating,
        moveCount: pvp.inFlight.moveCount,
        animFrom: pvp.inFlight.animFrom,
        animTo: pvp.inFlight.animTo,
      }),
    );
    const pvpIso = await isolatedFromSnaps(page, pvp.start, pvp.after, {
      from: pvp.slide.from.id,
      to: pvp.slide.to.id,
    }, 'RED');
    record(
      `${catalogId} PvP two clicks = isolated Ivory slide`,
      !pvp.tooLate
        && pvp.selected.selectedId === pvp.slide.from.id
        && pvp.after.moveCount === 1
        && pvp.after.currentPlayer === 'BLUE'
        && pvpIso.ok,
      pvpIso.detail,
    );

    await setup(page, catalogId, 'pve');
    const pve = await twoClicks(page, variant, null, hangFrom, hangTo);
    const pveIso = await isolatedFromSnaps(page, pve.start, pve.after, {
      from: pve.slide.from.id,
      to: pve.slide.to.id,
    }, 'RED');
    const destStillIvory = pve.after.occupants.find((n) => n.id === pve.slide.to.id)?.occupant === 'RED';
    record(
      `${catalogId} PvE two clicks: human ply visible, AI has not moved`,
      !pve.tooLate
        && pve.after.moveCount === 1
        && pve.after.currentPlayer === 'BLUE'
        && pve.after.canHumanAct === false
        && pveIso.ok
        && destStillIvory,
      `${pveIso.detail}; destIvory=${destStillIvory}; tooLate=${pve.tooLate}`,
    );
    await page.locator('#board').screenshot({ path: path.join(snapDir, `${catalogId}-2-after-human.png`) });
    if (catalogId === '16') {
      const a41 = pve.after.occupants.find((n) => n.label === 'A41');
      const a42 = pve.after.occupants.find((n) => n.label === 'A42');
      record(
        '16 hanging A41→A42: Ivory sits on A42, A41 empty, no capture yet',
        a41?.occupant == null && a42?.occupant === 'RED' && pve.after.moveCount === 1,
        JSON.stringify({ a41: a41?.occupant ?? null, a42: a42?.occupant ?? null, turns: pve.after.moveCount }),
      );
      const aiDone = await waitForAiTurnComplete(page);
      record(
        '16 hanging A41→A42: AI turn completes (not stuck on AI is thinking)',
        !aiDone.stalled
          && aiDone.snap.moveCount >= 2
          && aiDone.snap.aiThinking !== true
          && !/AI is thinking/i.test(aiDone.snap.statusText || '')
          && (aiDone.snap.gameOver === true || aiDone.snap.currentPlayer === 'RED')
          && aiDone.snap.uiState !== 'chain',
        JSON.stringify({
          stalled: aiDone.stalled,
          turns: aiDone.snap.moveCount,
          player: aiDone.snap.currentPlayer,
          uiState: aiDone.snap.uiState,
          aiThinking: aiDone.snap.aiThinking,
          statusText: aiDone.snap.statusText,
        }),
      );
      const afterIso = await isolatedFromSnaps(page, pve.start, aiDone.snap, {
        from: pve.slide.from.id,
        to: pve.slide.to.id,
      }, 'RED');
      record(
        '16 hanging A41→A42: Medium AI capture is a later ply',
        aiDone.snap.moveCount >= 2 && !afterIso.ok,
        JSON.stringify({ turns: aiDone.snap.moveCount, player: aiDone.snap.currentPlayer, stillIsolated: afterIso.ok }),
      );
    }
  }

  console.log('\n--- TWO-CLICK ---');
  results.forEach((r) => console.log(`${r.ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${r.name}`));
  await browser.close();
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch((e) => {
  console.error('UNCONFIRMED', e);
  process.exit(1);
});
