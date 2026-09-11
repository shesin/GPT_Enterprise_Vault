import {
  DEFAULT_PRODUCT_BOARD,
  listProductBoards,
  ProductBoardId,
  type BoardCatalogEntry,
} from '../../config/BoardCatalog';
import type { GameFeatureSettings } from './feature/GameFeatureSettings';

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

const HUB_THEME_IDS = ['1', '2', '3', '4'] as const;
type HubThemeId = (typeof HUB_THEME_IDS)[number];

function parseHubTheme(raw: string | null): HubThemeId {
  if (raw === '2' || raw === '3' || raw === '4') return raw;
  return '1';
}

function applyHubTheme(themeId: HubThemeId): void {
  const hub = document.getElementById('play-hub');
  if (!hub) return;
  hub.setAttribute('data-hub-theme', themeId);
  for (const swatch of document.querySelectorAll<HTMLButtonElement>('.hub-theme-swatch')) {
    swatch.classList.toggle('is-active', swatch.dataset.hubTheme === themeId);
  }
  try {
    localStorage.setItem('sb-hub-theme', themeId);
  } catch {
    /* ignore storage failures */
  }
}

function wireHubThemePicker(): void {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('hubTheme');
  const fromStore = (() => {
    try {
      return localStorage.getItem('sb-hub-theme');
    } catch {
      return null;
    }
  })();
  applyHubTheme(parseHubTheme(fromUrl ?? fromStore));

  for (const swatch of document.querySelectorAll<HTMLButtonElement>('.hub-theme-swatch')) {
    swatch.addEventListener('click', () => {
      const themeId = parseHubTheme(swatch.dataset.hubTheme ?? '1');
      applyHubTheme(themeId);
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
