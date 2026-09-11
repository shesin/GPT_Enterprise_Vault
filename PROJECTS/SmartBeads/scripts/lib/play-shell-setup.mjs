/** Shared Playwright helpers — hub mode on page 1, board controls on page 2. */

export function playShellUrl(base) {
  const root = base || process.env.SMARTBEADS_URL || 'http://localhost:5173/';
  return root.includes('?') ? `${root}${root.endsWith('?') ? '' : '&'}play=1` : `${root}?play=1`;
}

/** Game mode lives on hub `#hub-mode-select` (hidden while on board page). */
export async function selectHubMode(page, mode) {
  await page.selectOption('#hub-mode-select', mode);
}

export async function setupBoardOnPlayShell(page, catalogId, mode = 'pve') {
  await selectHubMode(page, mode);
  await page.selectOption('#board-select', catalogId);
  const timer = page.locator('#timer-select');
  if (await timer.count()) {
    await page.selectOption('#timer-select', 'off');
    await page.selectOption('#shot-clock-select', 'off');
  }
  await page.locator('#restart-btn').click();
  await page.waitForTimeout(500);
}
