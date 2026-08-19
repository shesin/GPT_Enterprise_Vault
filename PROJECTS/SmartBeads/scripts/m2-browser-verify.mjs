/**
 * M2 — browser verification for 16-bead feature shell (Playwright).
 * Requires: npm run web:smartbeads (http://localhost:5173/)
 */
import { chromium } from 'playwright';

const URL = process.env.SMARTBEADS_URL || 'http://localhost:5173/';
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function clickCanvasNear(page, nodeIndex) {
  const box = await page.evaluate((i) => {
    const { SmartBeadsEngine } = window.__vite_ssr_exports__ || {};
    return (async () => {
      const { SmartBeadsEngine: Eng } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      const eng = new Eng('16');
      const node = eng.getState().board.intersections[i];
      const canvas = document.getElementById('board');
      if (!canvas || node.x === undefined || node.y === undefined) return null;
      const w = canvas.width;
      const h = canvas.height;
      const px = 40 + (node.y / 8) * (w - 80);
      const py = 36 + ((10 - node.x) / 12) * (h - 72);
      const rect = canvas.getBoundingClientRect();
      const sx = rect.width / w;
      const sy = rect.height / h;
      return { x: rect.left + px * sx, y: rect.top + py * sy };
    })();
  }, nodeIndex);
  const coords = await box;
  if (!coords) throw new Error(`node ${nodeIndex} coords missing`);
  await page.mouse.click(coords.x, coords.y);
  await page.waitForTimeout(450);
}

async function waitForHumanTurn(page, maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const status = await page.locator('#status').textContent();
    if (status && /P1 turn|select a piece/i.test(status)) return true;
    if (await page.locator('#result-modal').isVisible()) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#board', { timeout: 15000 });

    record('3-column shell layout', await page.locator('.shell').isVisible(), 'shell visible');
    record('left player panel', await page.locator('#pill-p1').isVisible(), 'Ivory pill');
    record('right settings panel', await page.locator('#game-mode-select').isVisible(), 'settings select');
    record('canvas board (not SVG)', await page.evaluate(() => document.getElementById('board')?.tagName === 'CANVAS'), 'canvas element');

    const pieces = await page.locator('#p1-pieces').textContent();
    record('starting pieces 16+16', pieces === '16' && (await page.locator('#p2-pieces').textContent()) === '16', `P1=${pieces}`);

    // Slide via UI
    const slide = await page.evaluate(async () => {
      const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      const eng = new SmartBeadsEngine('16');
      const board = eng.getState().board;
      const isJump = (m) => board.jumpPaths?.some((p) => p.from === m.from && p.to === m.to);
      return eng.getLegalMoves().find((m) => !isJump(m)) || null;
    });
    if (slide) {
      await clickCanvasNear(page, slide.from);
      await clickCanvasNear(page, slide.to);
      await waitForHumanTurn(page);
    }
    const turnsAfterSlide = await page.locator('#turn-count').textContent();
    record('normal slide + turn advance', turnsAfterSlide !== '0', `turns=${turnsAfterSlide}`);

    // Settings visible
    record('PvE/PvP mode select', await page.locator('#game-mode-select option[value="pvp"]').count() === 1, 'pvp option');
    record('AI level select', await page.locator('#ai-level-select').isVisible(), 'ai levels');
    record('match timer select', await page.locator('#match-timer-select option[value="20"]').count() === 1, '20 min');
    record('shot clock select', await page.locator('#shot-clock-select option[value="5"]').count() === 1, '5 sec');
    record('center rule off/endgame', (
      await page.locator('#center-rule-select option[value="off"]').count() === 1
      && await page.locator('#center-rule-select option[value="endgame"]').count() === 1
    ), 'center options');
    record('BGM controls', await page.locator('#bgm-play').isVisible() && await page.locator('#bgm-vol').isVisible(), 'bgm ui');
    record('BGM track count', (await page.locator('#bgm-select option').count()) >= 21, '20 tracks + placeholder');

    // Finish chain button exists
    record('finish chain button present', await page.locator('#finish-btn').count() === 1, 'finish-btn');
    record('undo button present', await page.locator('#undo-btn').count() === 1, 'undo-btn');
    record('result modal present', await page.locator('#result-modal').count() === 1, 'modal');

    // Capture chain via engine-in-browser (UI arbitrary board setup not exposed)
    const capture = await page.evaluate(async () => {
      const { SmartBeadsEngine } = await import('/PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts');
      const eng = new SmartBeadsEngine('16');
      const b = eng.getState().board;
      const id = (label) => b.intersections.find((p) => p.label === label).id;
      for (const p of b.intersections) p.occupant = undefined;
      b.intersections.find((p) => p.label === 'A00').occupant = 'RED';
      b.intersections.find((p) => p.label === 'A01').occupant = 'BLUE';
      b.intersections.find((p) => p.label === 'A03').occupant = 'BLUE';
      b.intersections.find((p) => p.label === 'A44').occupant = 'BLUE';
      eng.applyMove({ from: id('A00'), to: id('A02') });
      return { caps: eng.getState().captures.RED, chain: eng.getChainPieceId() };
    });
    record('M1 capture chain (engine)', capture.caps === 1 && capture.chain === 2, `caps=${capture.caps} chain=${capture.chain}`);

    // AI responds after human move
    await page.locator('#restart-btn').click();
    await page.waitForTimeout(500);
    if (slide) {
      await clickCanvasNear(page, slide.from);
      await clickCanvasNear(page, slide.to);
      await page.waitForTimeout(1200);
    }
    const p2CapsAfterAi = await page.locator('#p2-caps').textContent();
    const turnAfterAi = await page.locator('#turn-count').textContent();
    record('AI takes turn after human slide', parseInt(turnAfterAi || '0', 10) >= 2, `turns=${turnAfterAi} p2caps=${p2CapsAfterAi}`);

    // PvP mode disables AI level
    await page.selectOption('#game-mode-select', 'pvp');
    await page.waitForTimeout(400);
    record('PvP disables AI level', await page.locator('#ai-level-select').isDisabled(), 'ai disabled');
    record('PvP shows Human for P2', (await page.locator('#p2-role').textContent()) === '(Human)', await page.locator('#p2-role').textContent());

    // Active player pill
    await page.selectOption('#game-mode-select', 'pve');
    await page.locator('#restart-btn').click();
    await page.waitForTimeout(400);
    record('active pill on P1 at start', await page.locator('#pill-p1.active').isVisible(), 'pill-p1 active');

    // Center display off
    record('center off display', (await page.locator('#p1-center').textContent()) === 'Off', await page.locator('#p1-center').textContent());

    console.log('\n--- M2 SUMMARY ---');
    results.forEach((r) => console.log(`${r.ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${r.name}`));
    const failed = results.filter((r) => !r.ok);
    if (failed.length) process.exit(1);
  } catch (err) {
    console.error('UNCONFIRMED  browser session failed:', err.stack || err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
