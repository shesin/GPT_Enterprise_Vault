/** Shared Playwright helpers — hub mode on page 1, board controls on page 2. */

export function playShellUrl(base) {
  const root = base || process.env.SMARTBEADS_URL || 'http://localhost:5173/';
  if (/[?&]play=1(?:&|$)/.test(root)) return root;
  return root.includes('?') ? `${root}&play=1` : `${root}?play=1`;
}

/** Game mode lives on hub `#hub-mode-select` (hidden on board page — force select). */
export async function selectHubMode(page, mode) {
  await page.selectOption('#hub-mode-select', mode, { force: true });
}

/** Wait until direct-play shell is shown (`?play=1`). */
export async function waitForPlayShell(page) {
  await page.waitForFunction(() => {
    const shell = document.getElementById('play-shell');
    return shell && !shell.classList.contains('is-hidden');
  }, { timeout: 15000 });
  await page.waitForSelector('#board', { timeout: 15000 });
}

/** Reset board/mode via __SB_TEST__ — avoids restart btn + switchBoard returning to hub on index.html. */
export async function resetBoardViaTestApi(page, catalogId, mode = 'pve') {
  await page.evaluate(({ catalogId, mode }) => {
    const timer = document.getElementById('timer-select');
    const shot = document.getElementById('shot-clock-select');
    if (timer) timer.value = 'off';
    if (shot) shot.value = 'off';
    const hub = document.getElementById('hub-mode-select');
    if (hub) hub.value = mode;
    const action = mode === 'spectate' ? 'spectate' : 'play';
    window.__SB_TEST__.enterFromHub(catalogId, mode, action);
    window.__SB_TEST__.forceStarter('RED');
  }, { catalogId, mode });
  await page.waitForTimeout(400);
}

export async function setupBoardOnPlayShell(page, catalogId, mode = 'pve') {
  await resetBoardViaTestApi(page, catalogId, mode);
}
