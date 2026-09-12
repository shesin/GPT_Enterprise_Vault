import {
  DEFAULT_PRODUCT_BOARD,
  listProductBoards,
  ProductBoardId,
  type BoardCatalogEntry,
} from '../../config/BoardCatalog';
import type { GameFeatureSettings } from './feature/GameFeatureSettings';
import {
  applySharedPlayTheme,
  isPlayBoardMatchMode,
  isPlayShellThemeId,
  type PlayBoardMatchMode,
  type PlayShellThemeId,
} from './layout/playShellThemes';

export type HubLaunchAction = 'play' | 'coach' | 'spectate';

/** Hub mode tile values — `pvp-online` is not a live engine mode until Phase 2. */
export type HubModeValue = 'pve' | 'spectate' | 'pvp' | 'pvp-online';

const HUB_MODE_TILES: ReadonlyArray<{ value: HubModeValue; label: string; disabled?: boolean }> = [
  { value: 'pve', label: 'Play vs AI' },
  { value: 'spectate', label: 'Watch AI vs AI' },
  { value: 'pvp', label: 'Play with a Friend (Same Device)' },
  { value: 'pvp-online', label: 'Play with a Friend (Online)', disabled: true },
];

const HUB_MODE_HELP_LINES = [
  'Play vs AI — You vs the computer. Pick board and difficulty on the board page.',
  'Watch AI vs AI — Two AIs play; you watch. Good for learning pace and rules.',
  'Play with a Friend (Same Device) — Pass the phone after each turn. No room code needed.',
  'Play with a Friend (Online) — Create or join a room on another device. Coming soon until Phase 2.',
] as const;

export const HUB_MODE_HELP_ALL = HUB_MODE_HELP_LINES.join('\n\n');

const HUB_RAIL_NOTICES: Record<string, string> = {
  community: 'Community — forums, clubs, and friends list coming soon.',
  tournaments: 'Tournaments — online brackets coming after play with a friend online.',
};

function boardTileLabel(entry: BoardCatalogEntry): { primary: string; secondary: string } {
  const parts = entry.displayName.split(' · ');
  return {
    primary: parts[0] ?? entry.displayName,
    secondary: parts[1] ?? entry.lattice,
  };
}

function populateHubBoardSelect(select: HTMLSelectElement, boardId: ProductBoardId): void {
  select.innerHTML = '';
  for (const entry of listProductBoards()) {
    const opt = document.createElement('option');
    opt.value = entry.id;
    opt.textContent = entry.displayName;
    select.appendChild(opt);
  }
  select.value = boardId;
}

function populateHubBoardGrid(
  grid: HTMLElement,
  boardSelect: HTMLSelectElement,
  selectedId: ProductBoardId,
  onSelect: (boardId: ProductBoardId) => void,
): void {
  grid.innerHTML = '';
  for (const entry of listProductBoards()) {
    const { primary, secondary } = boardTileLabel(entry);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hub-board-tile';
    btn.dataset.boardId = entry.id;
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', String(entry.id === selectedId));
    if (entry.id === selectedId) btn.classList.add('is-selected');
    btn.innerHTML = `
      <span class="hub-board-tile-icon" aria-hidden="true"></span>
      <span class="hub-board-tile-label">${primary}</span>
      <span class="hub-board-tile-sub">${secondary}</span>
    `;
    btn.addEventListener('click', () => onSelect(entry.id));
    grid.appendChild(btn);
  }
}

function syncBoardTileSelection(grid: HTMLElement, boardId: ProductBoardId): void {
  for (const tile of grid.querySelectorAll<HTMLButtonElement>('.hub-board-tile')) {
    const selected = tile.dataset.boardId === boardId;
    tile.classList.toggle('is-selected', selected);
    tile.setAttribute('aria-selected', String(selected));
  }
}

function populateHubModeGrid(
  grid: HTMLElement,
  onLaunch: (hubMode: HubModeValue) => void,
): void {
  grid.innerHTML = '';
  for (const tile of HUB_MODE_TILES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hub-mode-tile';
    btn.dataset.hubMode = tile.value;
    btn.textContent = '';
    btn.disabled = tile.disabled === true;
    if (tile.disabled) {
      btn.title = 'Online play coming soon';
    }
    btn.innerHTML = `<span class="hub-mode-tile-icon" aria-hidden="true"></span><span>${tile.label}</span>`;
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      onLaunch(tile.value);
    });
    grid.appendChild(btn);
  }
}

function resolveEngineMode(hubValue: HubModeValue): GameFeatureSettings['mode'] {
  if (hubValue === 'spectate') return 'spectate';
  if (hubValue === 'pvp' || hubValue === 'pvp-online') return 'pvp';
  return 'pve';
}

function wireHubRailNotice(): void {
  const notice = document.getElementById('hub-rail-notice');
  const noticeText = document.getElementById('hub-rail-notice-text');
  const dismiss = document.getElementById('hub-rail-notice-dismiss');
  if (!notice || !noticeText) return;

  function hideNotice(): void {
    notice!.classList.add('is-hidden');
    noticeText!.textContent = '';
  }

  function showNotice(message: string): void {
    noticeText!.textContent = message;
    notice!.classList.remove('is-hidden');
  }

  dismiss?.addEventListener('click', hideNotice);

  for (const link of document.querySelectorAll<HTMLButtonElement>('.hub-sidebar-link[data-hub-nav]')) {
    link.addEventListener('click', () => {
      const message = HUB_RAIL_NOTICES[link.dataset.hubNav ?? ''];
      if (message) showNotice(message);
    });
  }
}

function wireHubModeHelp(helpBtn: HTMLButtonElement, helpText: HTMLParagraphElement): void {
  helpText.textContent = HUB_MODE_HELP_ALL;

  helpBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = helpText.hidden;
    helpText.hidden = !willOpen;
    helpBtn.setAttribute('aria-expanded', String(willOpen));
    helpBtn.classList.toggle('is-open', willOpen);
  });
}

function parseHubPlayTheme(raw: string | null): PlayShellThemeId {
  if (isPlayShellThemeId(raw)) return raw;
  return '2';
}

function readHubBoardMatchFromUi(): PlayBoardMatchMode {
  const selected = document.querySelector<HTMLInputElement>(
    '#hub-play-theme-setting input[name="hub-play-board-match"]:checked',
  );
  return isPlayBoardMatchMode(selected?.value) ? selected.value : 'side-only';
}

function wireHubThemePicker(): void {
  const hubThemeSetting = document.getElementById('hub-play-theme-setting');
  if (!hubThemeSetting) return;

  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('playTheme') ?? params.get('hubTheme');
  const fromStore = (() => {
    try {
      const playTheme = localStorage.getItem('sb-play-theme');
      if (isPlayShellThemeId(playTheme)) return playTheme;
      const legacyHub = localStorage.getItem('sb-hub-theme');
      if (legacyHub === '4') return '1';
      if (isPlayShellThemeId(legacyHub)) return legacyHub;
      return null;
    } catch {
      return null;
    }
  })();
  let boardMatch: PlayBoardMatchMode = 'side-only';
  try {
    const fromUrlMatch = params.get('playBoardMatch');
    if (isPlayBoardMatchMode(fromUrlMatch)) boardMatch = fromUrlMatch;
    else {
      const storedMatch = localStorage.getItem('sb-play-board-match');
      if (isPlayBoardMatchMode(storedMatch)) boardMatch = storedMatch;
    }
  } catch {
    boardMatch = 'side-only';
  }
  applySharedPlayTheme(parseHubPlayTheme(fromUrl ?? fromStore), boardMatch);

  for (const swatch of hubThemeSetting.querySelectorAll<HTMLButtonElement>('.play-theme-swatch')) {
    swatch.addEventListener('click', () => {
      const themeId = swatch.dataset.playTheme;
      if (isPlayShellThemeId(themeId)) applySharedPlayTheme(themeId, readHubBoardMatchFromUi());
    });
  }
  for (const input of hubThemeSetting.querySelectorAll<HTMLInputElement>('input[name="hub-play-board-match"]')) {
    input.addEventListener('change', () => {
      if (input.checked && isPlayBoardMatchMode(input.value)) {
        const themeId = document.getElementById('play-hub')?.getAttribute('data-play-theme');
        if (isPlayShellThemeId(themeId)) applySharedPlayTheme(themeId, input.value);
      }
    });
  }
}

export function bootstrapPlayHub(
  enterPlay: (boardId: ProductBoardId, mode: GameFeatureSettings['mode'], action: HubLaunchAction) => void,
): void {
  const boardSelect = document.getElementById('hub-board-select') as HTMLSelectElement | null;
  const modeSelect = document.getElementById('hub-mode-select') as HTMLSelectElement | null;
  const boardGrid = document.getElementById('hub-board-grid');
  const modeGrid = document.getElementById('hub-mode-grid');
  const lessonBasic = document.getElementById('hub-lesson-basic') as HTMLButtonElement | null;
  const helpBtn = document.getElementById('hub-mode-help-btn') as HTMLButtonElement | null;
  const helpText = document.getElementById('hub-mode-help-text') as HTMLParagraphElement | null;
  if (!boardSelect || !modeSelect || !boardGrid || !modeGrid) return;

  let selectedBoardId: ProductBoardId = DEFAULT_PRODUCT_BOARD;

  function setSelectedBoard(boardId: ProductBoardId): void {
    selectedBoardId = boardId;
    boardSelect!.value = boardId;
    syncBoardTileSelection(boardGrid, boardId);
  }

  function launchHubMode(hubMode: HubModeValue): void {
    if (hubMode === 'pvp-online') return;
    modeSelect!.value = hubMode;
    const mode = resolveEngineMode(hubMode);
    const action: HubLaunchAction = mode === 'spectate' ? 'spectate' : 'play';
    enterPlay(selectedBoardId, mode, action);
  }

  populateHubBoardSelect(boardSelect, selectedBoardId);
  populateHubBoardGrid(boardGrid, boardSelect, selectedBoardId, setSelectedBoard);
  populateHubModeGrid(modeGrid, launchHubMode);

  if (helpBtn && helpText) {
    wireHubModeHelp(helpBtn, helpText);
  }

  lessonBasic?.addEventListener('click', () => {
    enterPlay(selectedBoardId, 'pve', 'coach');
  });

  wireHubRailNotice();
  wireHubThemePicker();

  const coachParam = new URLSearchParams(window.location.search).get('coach');
  if (coachParam === '1' || coachParam === 'start') {
    document.getElementById('hub-section-lesson')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    lessonBasic?.focus();
  }
}
