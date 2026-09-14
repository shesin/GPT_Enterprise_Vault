/**
 * Browser verification — Look preview three rows + Lovable light compare swatches.
 * Requires: npm run web:smartbeads (http://localhost:5173/)
 */
import { chromium } from 'playwright';
import { playShellUrl } from './lib/play-shell-setup.mjs';

const URL = playShellUrl();
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function readShellLook(page) {
  return page.evaluate(() => {
    const shell = document.getElementById('play-shell');
    return {
      board: shell?.getAttribute('data-play-board-look'),
      side: shell?.getAttribute('data-play-side-look'),
      match: shell?.getAttribute('data-play-board-match'),
      boardLook: localStorage.getItem('sb-play-board-look'),
      sideLook: localStorage.getItem('sb-play-side-look-v3'),
    };
  });
}

async function clickSwatch(page, rowClass, themeId) {
  await page.locator(`.${rowClass} .play-theme-swatch[data-play-theme="${themeId}"]`).click();
  await page.waitForTimeout(150);
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#play-theme-setting', { timeout: 15000 });

    const labels = await page.locator('#play-theme-setting .play-theme-group-label').allTextContents();
    record(
      'three row labels',
      labels.length === 3
        && labels[0].includes('charcol side panel')
        && labels[1].includes('charcoal side panel')
        && labels[2].includes('same side panel'),
      labels.join(' | '),
    );

    const darkCharcoalIds = await page.locator('.play-theme-swatches--dark-charcoal .play-theme-swatch').evaluateAll(
      (nodes) => nodes.map((n) => n.getAttribute('data-play-theme')),
    );
    record(
      'dark-charcoal row swatches (no forest green)',
      JSON.stringify(darkCharcoalIds) === JSON.stringify(['1', '2', '3', '6']),
      darkCharcoalIds.join(','),
    );

    const lightIds = await page.locator('.play-theme-swatches--light-charcoal .play-theme-swatch').evaluateAll(
      (nodes) => nodes.map((n) => n.getAttribute('data-play-theme')),
    );
    record(
      'light-charcoal row includes lovable compare swatches',
      JSON.stringify(lightIds) === JSON.stringify(['4', '9', '10', '12']),
      lightIds.join(','),
    );

    const sideRow = await page.locator('.play-theme-swatches--side').count();
    record('no standalone charcoal-only row', sideRow === 0, `count=${sideRow}`);

    await page.evaluate(() => {
      localStorage.setItem('sb-play-board-look', '1');
      localStorage.setItem('sb-play-side-look-v3', '1');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#play-theme-setting', { timeout: 15000 });

    await clickSwatch(page, 'play-theme-swatches--dark-charcoal', '6');
    let look = await readShellLook(page);
    record(
      'purple night in dark-charcoal → board 6 + charcoal side',
      look.board === '6' && look.side === '7' && look.match === 'side-only',
      JSON.stringify(look),
    );

    await clickSwatch(page, 'play-theme-swatches--dark-same', '6');
    look = await readShellLook(page);
    record(
      'purple night in dark-same → matched board 6 + side 6',
      look.board === '6' && look.side === '6' && look.match === 'matched',
      JSON.stringify(look),
    );

    await clickSwatch(page, 'play-theme-swatches--light-charcoal', '12');
    look = await readShellLook(page);
    const walnutFrame = await page.evaluate(() =>
      getComputedStyle(document.getElementById('play-shell')).getPropertyValue('--board-frame-border').trim(),
    );
    record(
      'warm walnut → board 12 + charcoal side',
      look.board === '12' && look.side === '7',
      JSON.stringify(look),
    );
    record(
      'warm walnut frame token on shell',
      walnutFrame === 'oklch(0.76 0.055 80)',
      walnutFrame || '(empty)',
    );

    const activeWalnut = await page.locator(
      '.play-theme-swatches--light-charcoal .play-theme-swatch[data-play-theme="12"].is-active',
    ).count();
    record('active swatch highlights clicked light row only', activeWalnut === 1, `active=${activeWalnut}`);

    const removed = await page.locator(
      '.play-theme-swatches--light-charcoal .play-theme-swatch[data-play-theme="8"],'
      + '.play-theme-swatches--light-charcoal .play-theme-swatch[data-play-theme="11"],'
      + '.play-theme-swatches--light-charcoal .play-theme-swatch[data-play-theme="13"]',
    ).count();
    record('removed light swatches absent from UI', removed === 0, `count=${removed}`);

    console.log('\n--- LOOK PREVIEW BROWSER SUMMARY ---');
    results.forEach((r) => console.log(`${r.ok ? 'CONFIRMED' : 'UNCONFIRMED'}  ${r.name}`));
    if (results.some((r) => !r.ok)) process.exit(1);
  } catch (err) {
    console.error('UNCONFIRMED  browser session failed:', err.stack || err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
