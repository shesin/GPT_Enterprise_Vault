/**
 * Live flow gate (real Chrome, real clicks): the combinations that unit tests cannot see.
 * Each scenario reproduces a defect found by the 2026-10-01 whole-code audit (AUDIT § 13) or guards a
 * flow that had no automated test: Undo x clocks, Undo x AI, setting change mid-game, resign, phone
 * layout, render-loop survival, blocked storage.
 * Requires the dev server (m2-2step-npm-gate.mjs starts it) and Playwright's Chromium.
 */
import { chromium, firefox, webkit } from 'playwright';
import { playShellUrl } from './lib/play-shell-setup.mjs';
import { clickNode } from './lib/project-node.mjs';

const URL = playShellUrl();
const ENGINES = { chromium, firefox, webkit };
const ENGINE = process.env.SB_BROWSER || 'chromium';
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(browser, { viewport, init, clock } = {}) {
  const ctx = await browser.newContext({ viewport: viewport ?? { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  if (init) await page.addInitScript(init);
  if (clock) await page.clock.install();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#board');
  return { ctx, page, errors };
}

const snap = (page) => page.evaluate(() => window.__SB_TEST__.snapshot());
const sess = (page, fn) => page.evaluate(fn);

/** Human (cream) plays the first legal move with two real clicks. */
async function humanMove(page, catalogId) {
  const mv = await page.evaluate(() => {
    const s = window.__SB_TEST__.session;
    const m = s.getEngine().getLegalMoves()[0];
    return { from: m.from, to: m.to };
  });
  await clickNode(page, catalogId, mv.from);
  await clickNode(page, catalogId, mv.to);
  await sleep(450);
}

async function waitFor(page, fn, arg, ms = 6000) {
  try {
    await page.waitForFunction(fn, arg, { timeout: ms });
    return true;
  } catch {
    return false;
  }
}

async function startPvp(page, extra = {}) {
  await page.selectOption('#hub-mode-select', 'pvp', { force: true });
  if (extra.timer) await page.selectOption('#timer-select', extra.timer, { force: true });
  if (extra.tournament) await page.selectOption('#tournament-timer-select', extra.tournament, { force: true });
  if (extra.shot) await page.selectOption('#shot-clock-select', extra.shot, { force: true });
  await page.locator('#restart-btn').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__SB_TEST__.forceStarter('RED'));
  await page.waitForTimeout(150);
}

async function main() {
  const browser = await ENGINES[ENGINE].launch();
  console.log(`m3-flow-gate engine: ${ENGINE}`);
  try {
    // 1. A game lost on time cannot be reopened with Undo, and Undo never refunds the clock.
    {
      const { ctx, page } = await open(browser, { clock: true });
      await startPvp(page, { timer: '2' });
      await humanMove(page, '6x4');
      await page.clock.runFor(130_000);
      await page.waitForTimeout(300);
      const over = await sess(page, () => window.__SB_TEST__.session.isGameOver());
      const reason = await sess(page, () => window.__SB_TEST__.session.getDisplayedReason());
      const undoDisabled = await page.locator('#undo-btn').isDisabled();
      await page.evaluate(() => document.getElementById('undo-btn').click());
      await page.waitForTimeout(200);
      const stillOver = await sess(page, () => window.__SB_TEST__.session.isGameOver());
      record(
        'Undo: a game lost on time stays lost (button disabled, click ignored)',
        over && /Timer expired/.test(reason ?? '') && undoDisabled && stillOver,
        `over=${over} reason=${reason} undoDisabled=${undoDisabled} stillOver=${stillOver}`,
      );
      await ctx.close();
    }

    // 2. Undo after the AI opened must not leave the game stuck.
    {
      const { ctx, page } = await open(browser);
      await page.selectOption('#hub-mode-select', 'pve', { force: true });
      await page.locator('#restart-btn').click();
      const aiOpened = await waitFor(page, () => {
        const s = window.__SB_TEST__.snapshot();
        return s.moveCount === 1 && s.currentPlayer === 'RED' && !s.aiThinking && !s.animating;
      });
      await page.locator('#undo-btn').click();
      const resumed = await waitFor(page, () => {
        const s = window.__SB_TEST__.snapshot();
        return s.moveCount >= 1 && s.currentPlayer === 'RED' && s.canHumanAct && !s.aiThinking;
      });
      record('Undo after the AI opened: the AI plays again, the human can move', aiOpened && resumed, `aiOpened=${aiOpened} resumed=${resumed}`);
      await ctx.close();
    }

    // 3. Changing a setting mid-game asks first; Cancel keeps the game, OK restarts.
    {
      const { ctx, page } = await open(browser);
      await startPvp(page);
      await humanMove(page, '6x4');
      const before = (await snap(page)).moveCount;
      page.once('dialog', (d) => d.dismiss());
      await page.selectOption('#shot-clock-select', '60', { force: true });
      await page.waitForTimeout(300);
      const keptCount = (await snap(page)).moveCount;
      const restoredValue = await page.locator('#shot-clock-select').inputValue();
      page.once('dialog', (d) => d.accept());
      await page.selectOption('#shot-clock-select', '60', { force: true });
      await page.waitForTimeout(400);
      const afterAccept = (await snap(page)).moveCount;
      record(
        'Setting change mid-game: Cancel keeps the game and the dropdown, OK starts a new game',
        before >= 1 && keptCount === before && restoredValue === 'off' && afterAccept === 0,
        `before=${before} kept=${keptCount} dropdown=${restoredValue} afterAccept=${afterAccept}`,
      );
      // No game under way: no dialog at all.
      let asked = false;
      page.once('dialog', (d) => {
        asked = true;
        d.dismiss();
      });
      await page.selectOption('#shot-clock-select', 'off', { force: true });
      await page.waitForTimeout(300);
      record('Setting change before any move: no dialog', !asked);
      await ctx.close();
    }

    // 4. Chess-clock (tournament) games have no Undo.
    {
      const { ctx, page } = await open(browser);
      await startPvp(page, { tournament: '2' });
      await humanMove(page, '6x4');
      const disabled = await page.locator('#undo-btn').isDisabled();
      record('Tournament clocks: Undo is disabled', disabled);
      await ctx.close();
    }

    // 5. Phone: the shared match timer is visible.
    {
      const { ctx, page } = await open(browser, { viewport: { width: 375, height: 812 } });
      await startPvp(page, { timer: '5' });
      const box = await page.locator('#timer-mmss-p1').boundingBox();
      const text = await page.locator('#timer-mmss-p1').textContent();
      record('Phone 375x812: match timer is visible', !!box && box.height > 10 && /^\d\d:\d\d$/.test(text ?? ''), `box=${JSON.stringify(box)} text=${text}`);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      record('Phone 375x812: no horizontal overflow', sw <= 375, `scrollWidth=${sw}`);
      await ctx.close();
    }

    // 6. Phone landscape: the board keeps its shape.
    {
      const { ctx, page } = await open(browser, { viewport: { width: 740, height: 360 } });
      await startPvp(page);
      const info = await page.evaluate(() => {
        const c = document.getElementById('board');
        const b = c.getBoundingClientRect();
        return { css: b.width / b.height, bitmap: c.width / c.height };
      });
      record('Phone 740x360: board not stretched', Math.abs(info.css / info.bitmap - 1) < 0.15, JSON.stringify(info));
      await ctx.close();
    }

    // 7. Render loop survives a throwing draw; one error bar; idle redraw stays low.
    {
      const { ctx, page } = await open(browser);
      await startPvp(page);
      await humanMove(page, '6x4');
      await page.evaluate(() => {
        window.__draws = 0;
        const P = CanvasRenderingContext2D.prototype;
        window.__good = P.clearRect;
        P.clearRect = function (...a) {
          window.__draws += 1;
          return window.__good.apply(this, a);
        };
      });
      const s = await snap(page);
      await page.evaluate(() => {
        const t = window.__SB_TEST__.session;
        const mv = t.getEngine().getLegalMoves()[0];
        t.selectNode(mv.from);
        window.__SB_TEST__.updateUI();
      });
      await page.evaluate(() => (window.__draws = 0));
      await sleep(3000);
      const idleDraws = await page.evaluate(() => window.__draws);
      record('Idle redraw: at most about 1 per second', idleDraws <= 8, `${idleDraws} draws in 3 s (selected piece, ${s.currentPlayer} to move)`);
      await page.evaluate(() => {
        CanvasRenderingContext2D.prototype.clearRect = function () {
          throw new Error('simulated draw failure');
        };
      });
      await sleep(1200);
      await page.evaluate(() => {
        window.__draws = 0;
        CanvasRenderingContext2D.prototype.clearRect = function (...a) {
          window.__draws += 1;
          return window.__good.apply(this, a);
        };
      });
      await sleep(2500);
      const after = await page.evaluate(() => window.__draws);
      const bars = await page.locator('.sb-error-banner').count();
      record('Render loop survives a throwing draw, one error bar', after >= 1 && bars === 1, `draws after=${after} bars=${bars}`);
      await ctx.close();
    }

    // 8. Blocked localStorage: the page still loads and plays.
    {
      const init = () => {
        const boom = () => {
          throw new DOMException('blocked', 'SecurityError');
        };
        Storage.prototype.getItem = boom;
        Storage.prototype.setItem = boom;
      };
      const { ctx, page, errors } = await open(browser, { init });
      await startPvp(page);
      await humanMove(page, '6x4');
      const moves = (await snap(page)).moveCount;
      const bars = await page.locator('.sb-error-banner').count();
      record('Blocked localStorage: page loads, a move works, no error bar', moves >= 1 && bars === 0 && errors.length === 0, `moves=${moves} bars=${bars} errors=${errors.slice(0, 2).join('|')}`);
      await ctx.close();
    }

    // 9. Resign (PvE and PvP), then New game.
    {
      const { ctx, page } = await open(browser);
      await page.selectOption('#hub-mode-select', 'pve', { force: true });
      await page.evaluate(() => sessionStorage.setItem('sb-test-resign-ai', 'reject'));
      await page.locator('#restart-btn').click();
      await waitFor(page, () => {
        const s = window.__SB_TEST__.snapshot();
        return s.currentPlayer === 'RED' && !s.aiThinking && !s.animating;
      });
      page.once('dialog', (d) => d.accept());
      await page.locator('#resign-btn').click();
      await page.waitForSelector('#result-modal', { state: 'visible', timeout: 5000 });
      const desc = await page.locator('#result-desc').textContent();
      await page.locator('#play-again-btn').click();
      await page.waitForTimeout(500);
      const modalGone = !(await page.locator('#result-modal').isVisible());
      record('PvE resign shows the result; Play again starts clean', /declined the draw/.test(desc ?? '') && modalGone, desc?.trim());
      await ctx.close();
    }
    {
      const { ctx, page } = await open(browser);
      await startPvp(page);
      page.once('dialog', (d) => d.accept());
      await page.locator('#resign-btn').click();
      await page.waitForSelector('#resign-offer-modal', { state: 'visible', timeout: 5000 });
      await page.locator('#resign-agree-btn').click();
      await page.waitForSelector('#result-modal', { state: 'visible', timeout: 5000 });
      const desc = await page.locator('#result-desc').textContent();
      record('PvP resign offer, agree: draw with readable text', /agreed to a draw/.test(desc ?? '') && !/_/.test(desc ?? ''), desc?.trim());
      await ctx.close();
    }

    // 10. Every board launches from the hub in every mode without a page error.
    {
      const { ctx, page, errors } = await open(browser);
      const bad = [];
      for (const board of ['16', '12x6x5', '10x5', '8x4x6', '7x4x5', '6x4', '6x3x5']) {
        for (const mode of ['pve', 'pvp', 'spectate']) {
          await page.evaluate(
            ({ board, mode }) => window.__SB_TEST__.enterFromHub(board, mode, mode === 'spectate' ? 'spectate' : 'play'),
            { board, mode },
          );
          await page.waitForTimeout(250);
          const ok = await page.evaluate((m) => window.__SB_TEST__.session.getSettings().mode === m, mode);
          if (!ok) bad.push(`${board}/${mode}`);
        }
      }
      record('All 7 boards x 3 modes launch without page errors', bad.length === 0 && errors.length === 0, `bad=${bad.join(',')} errors=${errors.slice(0, 2).join('|')}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\nm3-flow-gate: ${results.length - failed.length}/${results.length} confirmed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error('UNCONFIRMED  m3-flow-gate crashed:', e);
  process.exit(1);
});
