/**
 * Live flow gate (real Chrome, real clicks): the combinations that unit tests cannot see.
 * Each scenario reproduces a defect found by the 2026-10-01 whole-code audit (AUDIT § 13) or guards a
 * flow that had no automated test: Undo x clocks, Undo x AI, setting change mid-game, resign, phone
 * layout, render-loop survival, blocked storage.
 * Requires the dev server (m2-2step-npm-gate.mjs starts it) and Playwright's Chromium.
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium, firefox, webkit } from 'playwright';
import { playShellUrl } from './lib/play-shell-setup.mjs';
import { clickNode } from './lib/project-node.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const URL = playShellUrl();
const ENGINES = { chromium, firefox, webkit };
const ENGINE = process.env.SB_BROWSER || 'chromium';
const results = [];

const annotate = (msg) => { if (process.env.GITHUB_ACTIONS) console.log('::error::' + String(msg).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').slice(0, 900)); };
function record(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) annotate(`UNCONFIRMED ${name}${detail ? ' — ' + detail : ''}`);
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


/** Online play needs the game server; the Vite dev server proxies /api and /ws to it on port 3001. */
async function ensureGameServer() {
  const up = async () => {
    try {
      const r = await fetch('http://127.0.0.1:3001/api/nothing');
      return r.status === 404;
    } catch {
      return false;
    }
  };
  if (await up()) return null;
  const child = spawn('npx', ['tsx', 'PROJECTS/SmartBeads/server/main.ts'], {
    cwd: REPO_ROOT,
    shell: true,
    env: { ...process.env, PORT: '3001' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    if (await up()) return child;
    await sleep(500);
  }
  throw new Error('game server did not start on port 3001');
}

function stopGameServer(child) {
  if (!child) return;
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill();
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

    // 1b. Clocks follow real time: one throttled callback after a long gap (a hidden tab) still ends the game.
    {
      const { ctx, page } = await open(browser, { clock: true });
      await startPvp(page, { timer: '2' });
      await humanMove(page, '6x4');
      await page.clock.fastForward(130_000); // fires each timer at most once, like a throttled hidden tab
      await page.waitForTimeout(300);
      const over = await sess(page, () => window.__SB_TEST__.session.isGameOver());
      const reason = await sess(page, () => window.__SB_TEST__.session.getDisplayedReason());
      record(
        'Clocks: 130 s of real time passing in one throttled callback still expires the 2-minute timer',
        over && /Timer expired/.test(reason ?? ''),
        `over=${over} reason=${reason}`,
      );
      await ctx.close();
    }

    // 1b2. Watch AI stops by itself after 3 minutes of real time and asks "Still watching?" (A23).
    {
      const { ctx, page } = await open(browser, {
        init: () => {
          const real = Date.now.bind(Date);
          window.__timeJump = 0;
          Date.now = () => real() + window.__timeJump;
        },
      });
      await page.evaluate(() => window.__SB_TEST__.enterFromHub('6x4', 'spectate', 'spectate'));
      const moves = () => page.evaluate(() => window.__SB_TEST__.session.getMoveCount());
      const barShown = () => page.evaluate(() => !document.getElementById('watch-idle-bar').hidden);
      const moving = await waitFor(page, () => window.__SB_TEST__.session.getMoveCount() > 0, undefined, 15_000);
      const barEarly = await barShown();
      await page.evaluate(() => { window.__timeJump = 190_000; }); // 3 minutes 10 s pass
      const barLate = await waitFor(page, () => !document.getElementById('watch-idle-bar').hidden, undefined, 15_000);
      const stopped = await moves();
      await sleep(6000);
      const stillStopped = (await moves()) === stopped;
      if (barLate) await page.locator('#watch-idle-btn').click();
      const resumed = await waitFor(page, (n) => window.__SB_TEST__.session.getMoveCount() > n, stopped, 15_000);
      const barGone = !(await barShown());
      record(
        'Watch AI: moves, then after 3 minutes shows "Still watching?" and stops; Tap to continue resumes',
        moving && !barEarly && barLate && stillStopped && resumed && barGone,
        `moving=${moving} barEarly=${barEarly} barLate=${barLate} stillStopped=${stillStopped} resumed=${resumed} barGone=${barGone}`,
      );
      await ctx.close();
    }

    // 1c. Phone tap targets (W4): every visible control can be hit by a 44 x 44 px finger area, on the start page and in the game.
    {
      const tapAudit = () =>
        document.evaluate
          ? [...document.querySelectorAll('button, a[href], select, input:not([type=hidden]), summary, [role=button]')]
              .filter((el) => {
                const r = el.getBoundingClientRect();
                const c = getComputedStyle(el);
                return r.width > 4 && r.height > 4 && c.visibility !== 'hidden' && c.display !== 'none' && !el.disabled;
              })
              .filter((el) => {
                const r = el.getBoundingClientRect();
                if (r.width >= 43.5 && r.height >= 43.5) return false;
                const cx = r.left + r.width / 2;
                const cy = r.top + r.height / 2;
                // the 4 corners of a 44 px box around the centre must still land on this control
                return ![[-21, -21], [21, -21], [-21, 21], [21, 21]].every(([dx, dy]) => {
                  const hit = document.elementFromPoint(cx + dx, cy + dy);
                  return hit && (hit === el || el.contains(hit));
                });
              })
              .map((el) => `${el.tagName}#${el.id}.${String(el.className).slice(0, 30)} ${el.getBoundingClientRect().width.toFixed(0)}x${el.getBoundingClientRect().height.toFixed(0)}`)
          : [];
      const { ctx, page } = await open(browser, { viewport: { width: 375, height: 812 } });
      await page.goto(URL.replace(/[?&]play=1/, ''), { waitUntil: 'networkidle' }); // the real start page (hub)
      await page.waitForTimeout(300);
      const hubSmall = await page.evaluate(tapAudit);
      await page.goto(URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('#board');
      await page.selectOption('#hub-mode-select', 'pvp', { force: true });
      await page.locator('#restart-btn').click();
      await page.waitForTimeout(500);
      const gameSmall = await page.evaluate(tapAudit);
      record(
        'Phone tap targets: no control smaller than a 44 px finger area (start page and in game)',
        hubSmall.length === 0 && gameSmall.length === 0,
        `hub=${JSON.stringify(hubSmall)} game=${JSON.stringify(gameSmall)}`,
      );
      await ctx.close();
    }

    // 1d. Keyboard play (W3): a whole move with Tab / arrows / Enter, no mouse.
    {
      const { ctx, page } = await open(browser);
      await startPvp(page);
      const mv = await page.evaluate(() => {
        const m = window.__SB_TEST__.session.getEngine().getLegalMoves()[0];
        return { from: m.from, to: m.to };
      });
      const before = (await snap(page)).moveCount;
      await page.focus('#board');
      const focusVisible = await page.evaluate(() => document.activeElement?.id === 'board');
      const focusAt = async () => (await snap(page)).keyboardFocusId;
      const dist = async (id, target) => {
        const sn = (await snap(page)).screenNodes;
        const a = sn.find((n) => n.id === id);
        const b = sn.find((n) => n.id === target);
        return Math.hypot(a.x - b.x, a.y - b.y);
      };
      // walk the focus ring to a node using only arrow keys (hill-climb on screen distance)
      const walkTo = async (target) => {
        for (let i = 0; i < 80 && (await focusAt()) !== target; i++) {
          const cur = await focusAt();
          const d0 = await dist(cur, target);
          let moved = false;
          for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) {
            await page.keyboard.press(key);
            const now = await focusAt();
            if (now === cur) continue;
            if ((await dist(now, target)) < d0) {
              moved = true;
              break;
            }
            await page.keyboard.press({ ArrowRight: 'ArrowLeft', ArrowLeft: 'ArrowRight', ArrowDown: 'ArrowUp', ArrowUp: 'ArrowDown' }[key]);
          }
          if (!moved) return false;
        }
        return (await focusAt()) === target;
      };
      const reachedFrom = await walkTo(mv.from);
      await page.keyboard.press('Enter');
      const selected = (await snap(page)).selectedId === mv.from;
      const reachedTo = await walkTo(mv.to);
      await page.keyboard.press('Space');
      await sleep(700);
      const after = await snap(page);
      const spoken = await page.evaluate(() => document.getElementById('board-focus-status')?.textContent ?? '');
      record(
        'Keyboard: Tab-focus the board, arrows reach a bead, Enter picks it, arrows + Space place it',
        focusVisible && reachedFrom && selected && reachedTo && after.moveCount === before + 1 && spoken.length > 0,
        `focus=${focusVisible} reachedFrom=${reachedFrom} selected=${selected} reachedTo=${reachedTo} moves ${before}->${after.moveCount} spoken="${spoken}"`,
      );
      await ctx.close();
    }

    // 1e. Phone landscape (W1): the board fills the height, nothing scrolls, every control stays on screen.
    {
      const sizes = [[740, 360], [667, 375], [844, 390]];
      const problems = [];
      for (const [w, h] of sizes) {
        const { ctx, page } = await open(browser, { viewport: { width: w, height: h } });
        await startPvp(page);
        await page.waitForTimeout(300);
        const m = await page.evaluate(() => {
          const b = document.getElementById('board').getBoundingClientRect();
          const ids = ['resign-btn', 'undo-btn', 'restart-btn', 'sfx-mute-btn', 'home-btn'];
          const off = ids.filter((id) => {
            const r = document.getElementById(id).getBoundingClientRect();
            return r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight;
          });
          return { boardH: b.height, scrollH: document.documentElement.scrollHeight, scrollW: document.documentElement.scrollWidth, off };
        });
        if (m.scrollH > h || m.scrollW > w) problems.push(`${w}x${h} scrolls (${m.scrollW}x${m.scrollH})`);
        if (m.boardH < h * 0.8) problems.push(`${w}x${h} board only ${m.boardH.toFixed(0)} px tall`);
        if (m.off.length) problems.push(`${w}x${h} off screen: ${m.off.join(',')}`);
        await ctx.close();
      }
      record('Phone landscape: board uses at least 80% of the height, no scrolling, all controls on screen (740x360, 667x375, 844x390)', problems.length === 0, problems.join('; '));
    }

    // 1f. Online play (A4/A9): two real browsers play one game through the server, with resignation.
    {
      const gameServer = await ensureGameServer();
      try {
        const hubUrl = URL.replace(/[?&]play=1/, '');
        const a = await open(browser);
        await a.page.goto(hubUrl, { waitUntil: 'networkidle' });
        await a.page.locator('.hub-mode-tile[data-hub-mode="pvp-online"]').click();
        const lobbyShown = await a.page.locator('#online-lobby').isVisible();
        await a.page.selectOption('#online-board-select', '6x4');
        await a.page.locator('#online-create-btn').click();
        await a.page.waitForFunction(() => /Room [A-Z2-9]{5}/.test(document.getElementById('online-bar-text')?.textContent ?? ''), null, { timeout: 8000 });
        const barA1 = await a.page.locator('#online-bar-text').textContent();
        const code = /Room ([A-Z2-9]{5})/.exec(barA1 ?? '')?.[1] ?? '';
        const waiting = /waiting for your friend/.test(barA1 ?? '');

        const b = await open(browser);
        await b.page.goto(hubUrl, { waitUntil: 'networkidle' });
        await b.page.locator('.hub-mode-tile[data-hub-mode="pvp-online"]').click();
        await b.page.fill('#online-code-input', code);
        await b.page.locator('#online-join-btn').click();
        await b.page.waitForFunction(() => /friend is thinking|your turn/.test(document.getElementById('online-bar-text')?.textContent ?? ''), null, { timeout: 8000 });
        await a.page.waitForFunction(() => /your turn/.test(document.getElementById('online-bar-text')?.textContent ?? ''), null, { timeout: 8000 });

        // B (black) cannot move on cream's turn: clicks do nothing
        const mvB = await b.page.evaluate(() => {
          const m = window.__SB_TEST__.session.getEngine().getLegalMoves()[0];
          return { from: m.from, to: m.to };
        });
        await clickNode(b.page, '6x4', mvB.from);
        await clickNode(b.page, '6x4', mvB.to);
        await sleep(300);
        const bCannot = (await snap(b.page)).moveCount === 0;

        // A (cream) plays a real move with two clicks; B sees it
        const mvA = await a.page.evaluate(() => {
          const m = window.__SB_TEST__.session.getEngine().getLegalMoves()[0];
          return { from: m.from, to: m.to };
        });
        await clickNode(a.page, '6x4', mvA.from);
        await clickNode(a.page, '6x4', mvA.to);
        const bSees = await waitFor(b.page, () => window.__SB_TEST__.snapshot().moveCount === 1 && window.__SB_TEST__.snapshot().currentPlayer === 'BLUE', undefined, 8000);
        const bTurn = await waitFor(b.page, () => /your turn/.test(document.getElementById('online-bar-text')?.textContent ?? ''), undefined, 8000);

        // B refreshes the page: it must land back in the same room with the same game
        await b.page.reload({ waitUntil: 'domcontentloaded' });
        const resumed = await waitFor(b.page, (c) => /your turn/.test(document.getElementById('online-bar-text')?.textContent ?? '') && document.getElementById('online-bar-text').textContent.includes(c) && window.__SB_TEST__.snapshot().moveCount === 1, code, 10000);

        // B resigns on its turn; A is asked and declines: B loses, both screens show the end
        b.page.once('dialog', (d) => d.accept());
        await b.page.locator('#resign-btn').click();
        const offerShown = await waitFor(a.page, () => getComputedStyle(document.getElementById('resign-offer-modal')).display !== 'none', undefined, 8000);
        await a.page.locator('#resign-decline-btn').click();
        const aOver = await waitFor(a.page, () => window.__SB_TEST__.session.isGameOver(), undefined, 8000);
        const bOver = await waitFor(b.page, () => window.__SB_TEST__.session.isGameOver(), undefined, 8000);
        const winner = await a.page.evaluate(() => window.__SB_TEST__.session.getDisplayedWinner());

        record(
          'Online: two browsers play through the server (create, join by code, turn lock, move sync, reload rejoin, resignation)',
          lobbyShown && waiting && code.length === 5 && bCannot && bSees && bTurn && resumed && offerShown && aOver && bOver && winner === 'RED',
          `lobby=${lobbyShown} waiting=${waiting} code=${code} bCannot=${bCannot} bSees=${bSees} bTurn=${bTurn} resumed=${resumed} offer=${offerShown} aOver=${aOver} bOver=${bOver} winner=${winner}`,
        );
        await a.ctx.close();
        await b.ctx.close();
        // 1g. A closed browser is "Opponent disconnected", never a loss; coming back clears it (A23).
        {
                const a = await open(browser);
        await a.page.goto(hubUrl, { waitUntil: 'networkidle' });
        await a.page.locator('.hub-mode-tile[data-hub-mode="pvp-online"]').click();
        await a.page.selectOption('#online-board-select', '6x4');
        await a.page.locator('#online-create-btn').click();
        await a.page.waitForFunction(() => /Room [A-Z2-9]{5}/.test(document.getElementById('online-bar-text')?.textContent ?? ''), null, { timeout: 8000 });
        const code = /Room ([A-Z2-9]{5})/.exec((await a.page.locator('#online-bar-text').textContent()) ?? '')?.[1] ?? '';
        const b = await open(browser);
        await b.page.goto(hubUrl, { waitUntil: 'networkidle' });
        await b.page.locator('.hub-mode-tile[data-hub-mode="pvp-online"]').click();
        await b.page.fill('#online-code-input', code);
        await b.page.locator('#online-join-btn').click();
        await a.page.waitForFunction(() => /your turn/.test(document.getElementById('online-bar-text')?.textContent ?? ''), null, { timeout: 8000 });
        const onlineBefore = !/disconnected/.test((await a.page.locator('#online-bar-text').textContent()) ?? '');
        await b.page.close();
        const showsGone = await waitFor(a.page, () => /Opponent disconnected/.test(document.getElementById('online-bar-text')?.textContent ?? ''), undefined, 10000);
        const notOver = !(await a.page.evaluate(() => window.__SB_TEST__.session.isGameOver()));
        const b2 = await b.ctx.newPage();
        await b2.goto(hubUrl, { waitUntil: 'domcontentloaded' });
        const backShown = await waitFor(a.page, () => !/disconnected/.test(document.getElementById('online-bar-text')?.textContent ?? '') && /your turn/.test(document.getElementById('online-bar-text')?.textContent ?? ''), undefined, 10000);
        record(
          'Online: a closed browser shows "Opponent disconnected" (game not lost); rejoining clears it',
          code.length === 5 && onlineBefore && showsGone && notOver && backShown,
          `code=${code} onlineBefore=${onlineBefore} showsGone=${showsGone} notOver=${notOver} backShown=${backShown}`,
        );
        await a.ctx.close();
        await b.ctx.close();
        }
      } finally {
        stopGameServer(gameServer);
      }
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
      // Audit 2026-10-03: the loop asked for a 60 Hz animation frame forever even when it drew only once a
      // second, keeping a phone's CPU awake. At rest the page must also stop asking for frames.
      await page.evaluate(() => {
        window.__frames = 0;
        const raf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (cb) => {
          window.__frames += 1;
          return raf(cb);
        };
      });
      await sleep(3000);
      const idleFrames = await page.evaluate(() => window.__frames);
      record('Idle: no 60 Hz animation-frame requests while nothing moves (at most about 1 per second)', idleFrames <= 10, `${idleFrames} frame requests in 3 s (selected piece)`);
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

    // 7b. The pulsing opening rings repaint the whole board; that must stay at about 30 per second at most.
    {
      const { ctx, page } = await open(browser);
      await startPvp(page);
      await page.evaluate(() => {
        window.__ringDraws = 0;
        const P = CanvasRenderingContext2D.prototype;
        const good = P.clearRect;
        P.clearRect = function (...a) {
          window.__ringDraws += 1;
          return good.apply(this, a);
        };
      });
      await page.evaluate(() => (window.__ringDraws = 0));
      await sleep(3000);
      const ringDraws = await page.evaluate(() => window.__ringDraws);
      const rings = await page.evaluate(() => window.__SB_TEST__.session.shouldShowTurnStartRings());
      record('Opening rings: board repainted at most ~30 times per second', rings && ringDraws <= 110, `${ringDraws} repaints in 3 s, rings showing=${rings}`);
      await ctx.close();
    }

    // 7c. A look changed in another tab shows at once (the idle repaint is only every 5 s, so this must not rely on it).
    {
      const { ctx, page } = await open(browser);
      const other = await ctx.newPage();
      await other.goto(URL, { waitUntil: 'networkidle' });
      const before = await page.evaluate(() => document.getElementById('play-shell').getAttribute('data-play-board-look'));
      const next = ['25', '1', '5'].find((id) => id !== before);
      await other.evaluate((id) => localStorage.setItem('sb-play-board-look', id), next);
      await sleep(1500);
      const after = await page.evaluate(() => document.getElementById('play-shell').getAttribute('data-play-board-look'));
      record('Cross-tab look sync: a look picked in another tab shows within 1.5 s', after === next, `before=${before} expected=${next} after=${after}`);
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

    // 11. Dialogs manage focus: focus moves in, Tab stays inside, Escape closes the result box, focus returns.
    {
      const { ctx, page } = await open(browser);
      await startPvp(page);
      page.once('dialog', (d) => d.accept());
      await page.locator('#resign-btn').click();
      await page.waitForSelector('#resign-offer-modal', { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(150);
      const inside = () =>
        page.evaluate(() => document.getElementById('resign-offer-modal').contains(document.activeElement));
      const focusMoved = await inside();
      let trapped = true;
      for (let i = 0; i < 6; i += 1) {
        await page.keyboard.press('Tab');
        if (!(await inside())) trapped = false;
      }
      await page.keyboard.press('Shift+Tab');
      if (!(await inside())) trapped = false;
      await page.locator('#resign-agree-btn').click();
      await page.waitForSelector('#result-modal', { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(150);
      const resultFocus = await page.evaluate(() => document.getElementById('result-modal').contains(document.activeElement));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const closed = !(await page.locator('#result-modal').isVisible());
      record('Dialogs: focus moves in, Tab stays inside, Escape closes the result box', focusMoved && trapped && resultFocus && closed, `moved=${focusMoved} trapped=${trapped} resultFocus=${resultFocus} closed=${closed}`);
      await ctx.close();
    }

    // 12. Menu button: asks when a game is under way, then returns to the start page.
    {
      const { ctx, page } = await open(browser);
      await startPvp(page);
      await humanMove(page, '6x4');
      page.once('dialog', (d) => d.dismiss());
      await page.locator('#home-btn').click();
      await page.waitForTimeout(300);
      const stayed = await page.locator('#play-shell').isVisible();
      page.once('dialog', (d) => d.accept());
      await page.locator('#home-btn').click();
      await page.waitForTimeout(400);
      const atHub = await page.locator('#play-hub').isVisible();
      record('Menu button: Cancel stays in the game, OK returns to the start page', stayed && atHub, `stayed=${stayed} atHub=${atHub}`);
      await ctx.close();
    }

    // 13. Hub: first screen on a phone shows the Play buttons; board names carry the star meaning; no Google requests.
    for (const vp of [{ width: 375, height: 812 }, { width: 360, height: 640 }]) {
      const reqs = [];
      const ctx = await browser.newContext({ viewport: vp });
      const page = await ctx.newPage();
      page.on('request', (r) => reqs.push(r.url()));
      await page.goto(URL.replace(/[?&]play=1/, ''), { waitUntil: 'networkidle' });
      await page.waitForSelector('.hub-mode-tile');
      const top = await page.evaluate(() => {
        const b = [...document.querySelectorAll('.hub-mode-tile')].find((t) => t.dataset.hubMode === 'pve').getBoundingClientRect();
        return { top: Math.round(b.top), bottom: Math.round(b.bottom), ih: innerHeight };
      });
      const info = await page.evaluate(() => ({
        legend: !!document.getElementById('hub-star-legend')?.offsetParent,
        starLabel: document.querySelector('.hub-board-tile[data-board-id="6x4"]')?.getAttribute('aria-label') ?? '',
        board: document.getElementById('hub-current-board')?.textContent ?? '',
      }));
      const google = reqs.filter((u) => /googleapis|gstatic/.test(u)).length;
      record(
        `Hub ${vp.width}x${vp.height}: Play vs AI visible on the first screen, star legend, accessible star text, no Google requests`,
        top.bottom <= top.ih && info.legend && /recommended 3 of 3/.test(info.starLabel) && /6-bead/.test(info.board) && google === 0,
        `playButton=${JSON.stringify(top)} ${JSON.stringify(info)} google=${google}`,
      );
      await ctx.close();
    }

    // 14. Contrast of small text in every look (WCAG AA 4.5:1), measured on the real page.
    // Uses the start page (the swatches are only wired there; with ?play=1 a click does nothing, which would make this check vacuous).
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      await page.goto(URL.replace(/[?&]play=1/, ''), { waitUntil: 'networkidle' });
      await page.waitForSelector('.hub-mode-tile');
      const low = await page.evaluate(async () => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 1;
        const cx = cv.getContext('2d', { willReadFrequently: true });
        const parse = (c) => {
          cx.clearRect(0, 0, 1, 1);
          cx.globalCompositeOperation = 'copy';
          cx.fillStyle = c;
          cx.fillRect(0, 0, 1, 1);
          const d = cx.getImageData(0, 0, 1, 1).data;
          return [d[0], d[1], d[2], d[3] / 255];
        };
        const lum = ([r, g, b]) => {
          const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
        const effBg = (el) => {
          const layers = [];
          for (let e = el; e; e = e.parentElement) {
            const b = parse(getComputedStyle(e).backgroundColor);
            if (b[3] > 0) layers.push(b);
            if (b[3] >= 0.99) break;
          }
          let base = parse(getComputedStyle(document.body).backgroundColor).slice(0, 3);
          if (layers.length && layers[layers.length - 1][3] >= 0.99) base = layers.pop().slice(0, 3);
          for (const l of layers.reverse()) base = over(l, base);
          return base;
        };
        const ratio = (el) => {
          const fg0 = parse(getComputedStyle(el).color);
          const bg = effBg(el);
          const a = lum(over(fg0, bg));
          const b = lum(bg);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        };
        const sels = ['.play-label', '#settings-panel h2', '.play-block-row .val', '#cream-panel-name', '.tiny'];
        const out = [];
        const seen = new Set();
        const swatches = [...document.querySelectorAll('#hub-play-theme-setting .play-theme-swatch')];
        for (const sw of swatches) {
          // Pick the look on the start page, enter a game (which applies the stored look), measure, go back.
          sw.click();
          const looked = document.querySelector('#hub-play-theme-setting .play-theme-swatch.is-active')?.getAttribute('aria-label');
          seen.add(looked);
          [...document.querySelectorAll('.hub-mode-tile')].find((t) => t.dataset.hubMode === 'pvp').click();
          await new Promise((r) => setTimeout(r, 500));
          for (const s of sels) {
            const el = [...document.querySelectorAll(s)].find((e) => e.offsetParent);
            if (el) {
              const r = ratio(el);
              if (r < 4.5) out.push(`${sw.getAttribute('aria-label')} ${s} ${r.toFixed(2)}`);
            }
          }
          document.getElementById('home-btn').click();
          await new Promise((r) => setTimeout(r, 300));
        }
        if (seen.size < 9) out.push(`only ${seen.size} distinct looks were applied`);
        return out;
      });
      record('All 9 looks are applied and their small panel text meets 4.5:1 contrast', low.length === 0, low.join('; '));
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
  annotate('m3-flow-gate crashed: ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});
