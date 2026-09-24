/** Play look — 9 complete boards (5 base + 4 light-canvas "Matched"). Every
 * board pairs with its own colour on both board and side panel — there is
 * no separate "side" look any more (the charcoal side-only option and its
 * '7' id were removed entirely 2026-09-24, human request: the docs and
 * code previously disagreed about whether charcoal was still current, and
 * in practice it was unreachable through the UI anyway — see the git
 * history around this date for the full story). Lovable OKLCH. */

import { BEAD_SET_THEMES } from './beadSetThemes';
import {
  LOVABLE_COMPLETE_BOARD_THEMES,
  LOVABLE_SHELL,
  type LovableBoardTokens,
} from './lovableOklchTokens';

export type CompleteLookId = '1' | '2' | '3' | '6' | '14' | '23' | '24' | '25' | '26';
export type BoardLookThemeId = CompleteLookId;
/** Kept as a separate name (not just an alias inline) since many call sites
 * already reference it -- but it is now always exactly BoardLookThemeId,
 * there is no longer a distinct side-only value it could hold. */
export type PlayShellThemeId = BoardLookThemeId;
export type PlayLookGroup = 'complete';

export const COMPLETE_LOOK_IDS: readonly CompleteLookId[] = [
  '1',
  '2',
  '3',
  '6',
  '14',
  '23',
  '24',
  '25',
  '26',
];

const COMPLETE_TOKEN_INDEX: Record<CompleteLookId, number> = {
  '1': 0,
  '2': 1,
  '3': 2,
  '6': 3,
  '14': 4,
  '23': 5,
  '24': 6,
  '25': 7,
  '26': 8,
};

// '4' (Sandy Beige), '15' (Seaglass), '16' (Powder Lilac), '17' (Celadon
// Jade), '18' (Alabaster Pearl) — the charcoal-paired "Light theme" row
// removed 2026-09-21, per human request, once every one of those boards had
// a light-canvas "Matched" replacement (23/24/25/26 above, Sandy Beige
// pending). Kept alongside the earlier removals so old stored values
// migrate away cleanly instead of crashing getPlayShellTheme().
const REMOVED_LIGHT_BOARD_LOOK_IDS = new Set([
  '4',
  '8',
  '9',
  '10',
  '11',
  '13',
  '15',
  '16',
  '17',
  '18',
]);

// '19' (Pearl Gold), '20' (Jade Matched), '21' (Pale Sage), '22' (Sky Blue)
// added and removed within this same session (2026-09-20) — a browser with
// one of these ids already in storage would otherwise crash on load, since
// getPlayShellTheme() has nothing to return for an id no longer in
// PLAY_SHELL_THEMES. Same migration pattern as REMOVED_LIGHT_BOARD_LOOK_IDS.
const REMOVED_COMPLETE_LOOK_IDS = new Set(['19', '20', '21', '22']);

export type CreamHalfStop = readonly [position: number, color: string];

export interface BeadShade {
  highlight: string;
  mid: string;
  shadow: string;
}

export interface PlayShellTheme {
  id: PlayShellThemeId;
  label: string;
  lookGroup: PlayLookGroup;
  surfaceTop: string;
  surfaceBottom: string;
  frameOuter: string;
  frameInner: string;
  lineColor: string;
  edgeGlowRgba: string;
  creamHorizontalStops: readonly CreamHalfStop[];
  creamVerticalStops: readonly CreamHalfStop[];
  creamBead: BeadShade;
  blackBead: BeadShade;
  bodyBackground: string;
  sideCardBackground: string;
  sideCardBorder: string;
  sideCardGlow: string;
  playAiBg: string;
  playAiBorder: string;
  playHumanBg: string;
  playHumanBorder: string;
  playHumanAccent: string;
}

export interface BoardCanvasLook {
  surfaceTop: string;
  surfaceBottom: string;
  frameOuter: string;
  frameInner: string;
  lineColor: string;
  creamHorizontalStops: readonly CreamHalfStop[];
  creamVerticalStops: readonly CreamHalfStop[];
  edgeGlowRgba: string;
}

const FLAT_CREAM_STOPS: readonly CreamHalfStop[] = [
  [0, 'rgba(0,0,0,0)'],
  [1, 'rgba(0,0,0,0)'],
];

// Placeholder only — every real render path overrides this with the live,
// board-dependent bead set via getActiveBeadSet() (see boardLookThemes.ts).
const DEFAULT_BEADS = BEAD_SET_THEMES['white-black'];

function buildBoardThemeFromTokens(
  id: PlayShellThemeId,
  t: LovableBoardTokens,
  lookGroup: PlayLookGroup,
): PlayShellTheme {
  return {
    id,
    label: t.label,
    lookGroup,
    surfaceTop: t.boardSurface ?? t.surface,
    surfaceBottom: t.boardShadow ?? t.shadow,
    frameOuter: t.frameOuter,
    frameInner: t.frameInner,
    lineColor: t.lines,
    edgeGlowRgba: 'rgba(0,0,0,0)',
    creamHorizontalStops: FLAT_CREAM_STOPS,
    creamVerticalStops: FLAT_CREAM_STOPS,
    bodyBackground: t.shadow,
    sideCardBackground: `linear-gradient(165deg, ${t.surface}, ${t.shadow})`,
    sideCardBorder: LOVABLE_SHELL.border,
    sideCardGlow: `inset 0 1px 0 ${t.lines}40`,
    playAiBg: t.shadow,
    playAiBorder: LOVABLE_SHELL.border,
    playHumanBg: `${LOVABLE_SHELL.gold}18`,
    playHumanBorder: `${LOVABLE_SHELL.gold}52`,
    playHumanAccent: LOVABLE_SHELL.gold,
    creamBead: DEFAULT_BEADS.creamBead,
    blackBead: DEFAULT_BEADS.blackBead,
  };
}

function buildCompleteTheme(id: CompleteLookId): PlayShellTheme {
  return buildBoardThemeFromTokens(
    id,
    LOVABLE_COMPLETE_BOARD_THEMES[COMPLETE_TOKEN_INDEX[id]]!,
    'complete',
  );
}

// Celadon Jade Matched (2026-09-24, human request) -- was Classic Green ('1').
export const DEFAULT_BOARD_LOOK_ID: BoardLookThemeId = '25';

export const PLAY_SHELL_THEMES: Record<PlayShellThemeId, PlayShellTheme> = {
  '1': buildCompleteTheme('1'),
  '2': buildCompleteTheme('2'),
  '3': buildCompleteTheme('3'),
  '6': buildCompleteTheme('6'),
  '14': buildCompleteTheme('14'),
  '23': buildCompleteTheme('23'),
  '24': buildCompleteTheme('24'),
  '25': buildCompleteTheme('25'),
  '26': buildCompleteTheme('26'),
};

export interface HubRailPalette {
  railBg: string;
  text: string;
  muted: string;
  border: string;
  borderSoft: string;
  brand: string;
  accent: string;
  accentSoft: string;
  accentRing: string;
}

export interface HubCentrePalette {
  pageBg: string;
  centreBg: string;
  cardBg: string;
  cardHover: string;
  centreText: string;
  centreMuted: string;
}

function buildHubCentrePalette(id: BoardLookThemeId): HubCentrePalette {
  const theme = PLAY_SHELL_THEMES[id];
  return {
    pageBg: theme.bodyBackground,
    centreBg: theme.surfaceTop,
    cardBg: theme.surfaceTop,
    cardHover: theme.surfaceBottom,
    centreText: LOVABLE_SHELL.text,
    centreMuted: LOVABLE_SHELL.muted,
  };
}

function buildHubRailPalette(id: PlayShellThemeId): HubRailPalette {
  const theme = PLAY_SHELL_THEMES[id];
  return {
    railBg: theme.bodyBackground,
    text: LOVABLE_SHELL.text,
    muted: LOVABLE_SHELL.muted,
    border: LOVABLE_SHELL.border,
    borderSoft: `${LOVABLE_SHELL.gold}1f`,
    brand: LOVABLE_SHELL.gold,
    accent: LOVABLE_SHELL.gold,
    accentSoft: `${LOVABLE_SHELL.gold}24`,
    accentRing: `${LOVABLE_SHELL.gold}61`,
  };
}

export const HUB_RAIL_PALETTES: Record<PlayShellThemeId, HubRailPalette> = {
  '1': buildHubRailPalette('1'),
  '2': buildHubRailPalette('2'),
  '3': buildHubRailPalette('3'),
  '6': buildHubRailPalette('6'),
  '14': buildHubRailPalette('14'),
  '23': buildHubRailPalette('23'),
  '24': buildHubRailPalette('24'),
  '25': buildHubRailPalette('25'),
  '26': buildHubRailPalette('26'),
};

export const HUB_CENTRE_PALETTES: Record<BoardLookThemeId, HubCentrePalette> = {
  '1': buildHubCentrePalette('1'),
  '2': buildHubCentrePalette('2'),
  '3': buildHubCentrePalette('3'),
  '6': buildHubCentrePalette('6'),
  '14': buildHubCentrePalette('14'),
  '23': buildHubCentrePalette('23'),
  '24': buildHubCentrePalette('24'),
  '25': buildHubCentrePalette('25'),
  '26': buildHubCentrePalette('26'),
};

export const PLAY_THEME_STORAGE_KEY = 'sb-play-theme-v2';
export const PLAY_BOARD_LOOK_STORAGE_KEY = 'sb-play-board-look';
export const PLAY_SIDE_LOOK_STORAGE_KEY = 'sb-play-side-look-v3';
const LEGACY_PLAY_THEME_STORAGE_KEY = 'sb-play-theme';

export function isCompleteLookId(value: string | null | undefined): value is CompleteLookId {
  return (
    value === '1' ||
    value === '2' ||
    value === '3' ||
    value === '6' ||
    value === '14' ||
    value === '23' ||
    value === '24' ||
    value === '25' ||
    value === '26'
  );
}

export function isBoardLookThemeId(value: string | null | undefined): value is BoardLookThemeId {
  return isCompleteLookId(value);
}

export function isPlayShellThemeId(value: string | null | undefined): value is PlayShellThemeId {
  return isBoardLookThemeId(value);
}

export function isLookSwatchId(value: string | null | undefined): value is PlayShellThemeId {
  return isCompleteLookId(value);
}

export function resolveHubCentrePalette(
  boardLookId: BoardLookThemeId,
  _sideLookId: PlayShellThemeId,
): HubCentrePalette {
  return HUB_CENTRE_PALETTES[boardLookId];
}

export function applyHubThemeCssVars(
  hub: HTMLElement,
  sideLookId: PlayShellThemeId,
  boardLookId: BoardLookThemeId,
): void {
  const rail = HUB_RAIL_PALETTES[sideLookId];
  const centre = resolveHubCentrePalette(boardLookId, sideLookId);
  hub.style.setProperty('--hub-rail-bg', rail.railBg);
  hub.style.setProperty('--hub-text', rail.text);
  hub.style.setProperty('--hub-muted', rail.muted);
  hub.style.setProperty('--hub-border', rail.border);
  hub.style.setProperty('--hub-border-soft', rail.borderSoft);
  hub.style.setProperty('--hub-brand', rail.brand);
  hub.style.setProperty('--hub-accent', rail.accent);
  hub.style.setProperty('--hub-accent-soft', rail.accentSoft);
  hub.style.setProperty('--hub-accent-ring', rail.accentRing);
  hub.style.setProperty('--hub-page-bg', centre.pageBg);
  hub.style.setProperty('--hub-centre-bg', centre.centreBg);
  hub.style.setProperty('--hub-card-bg', centre.cardBg);
  hub.style.setProperty('--hub-card-hover', centre.cardHover);
  hub.style.setProperty('--hub-centre-text', centre.centreText);
  hub.style.setProperty('--hub-centre-muted', centre.centreMuted);
}

export function resolveBoardCanvasLook(boardLookId: BoardLookThemeId): BoardCanvasLook {
  const theme = getPlayShellTheme(boardLookId);
  return {
    surfaceTop: theme.surfaceTop,
    surfaceBottom: theme.surfaceBottom,
    frameOuter: theme.frameOuter,
    frameInner: theme.frameInner,
    lineColor: theme.lineColor,
    creamHorizontalStops: FLAT_CREAM_STOPS,
    creamVerticalStops: FLAT_CREAM_STOPS,
    edgeGlowRgba: theme.edgeGlowRgba,
  };
}

export function resolvePlayShellPresentation(
  boardLookId: BoardLookThemeId,
): Pick<PlayShellTheme, 'bodyBackground'> {
  return { bodyBackground: PLAY_SHELL_THEMES[boardLookId].bodyBackground };
}

export function syncThemeSwatchActive(
  boardLookId: BoardLookThemeId,
  sideLookId: PlayShellThemeId,
): void {
  if (typeof document === 'undefined') return;
  for (const stale of document.querySelectorAll('.play-theme-swatch.is-active')) {
    stale.classList.remove('is-active');
  }
  const roots = document.querySelectorAll<HTMLElement>('[data-play-look-setting]');
  if (roots.length === 0) return;
  for (const root of roots) {
    for (const swatch of root.querySelectorAll<HTMLButtonElement>('.play-theme-swatch')) {
      const id = swatch.dataset.playTheme;
      const active = id === boardLookId && sideLookId === boardLookId && isCompleteLookId(boardLookId);
      swatch.classList.toggle('is-active', Boolean(active));
      // Swatches sit in role="radiogroup" containers as role="radio" buttons —
      // selection was CSS-only (.is-active), invisible to assistive tech
      // (2026-09-22 audit).
      swatch.setAttribute('aria-checked', String(Boolean(active)));
    }
  }
}

export type PlayLookPreviewWireOptions = {
  isLocked?: () => boolean;
  onApplied?: () => void;
};

/** Wire swatch clicks on hub (page 1) or board settings (page 2) -- every
 * swatch pairs board+side with itself, so there's no longer a "which row"
 * distinction to resolve. */
export function wirePlayLookPreviewSetting(
  root: HTMLElement | null,
  options: PlayLookPreviewWireOptions = {},
): void {
  if (!root || typeof document === 'undefined') return;
  for (const btn of root.querySelectorAll<HTMLButtonElement>('.play-theme-swatch')) {
    btn.addEventListener('click', () => {
      if (options.isLocked?.()) return;
      const next = btn.dataset.playTheme;
      if (isLookSwatchId(next)) {
        applyPlayLookFromSwatch(next);
        options.onApplied?.();
      }
    });
  }
}

function applyShellThemeVars(
  target: HTMLElement,
  sideLookId: PlayShellThemeId,
  boardLookId: BoardLookThemeId,
): void {
  const sideTheme = getPlayShellTheme(sideLookId);
  const boardTheme = getPlayShellTheme(boardLookId);
  const presentation = resolvePlayShellPresentation(boardLookId);
  target.style.setProperty('--bg', presentation.bodyBackground);
  target.style.setProperty('--text', LOVABLE_SHELL.text);
  target.style.setProperty('--muted', LOVABLE_SHELL.muted);
  target.style.setProperty('--gold', LOVABLE_SHELL.gold);
  target.style.setProperty('--line', LOVABLE_SHELL.border);
  target.style.setProperty('--side-card-bg', sideTheme.sideCardBackground);
  target.style.setProperty('--side-card-border', sideTheme.sideCardBorder);
  target.style.setProperty('--side-card-glow', sideTheme.sideCardGlow);
  target.style.setProperty('--play-ai-bg', sideTheme.playAiBg);
  target.style.setProperty('--play-ai-border', sideTheme.playAiBorder);
  target.style.setProperty('--play-human-bg', sideTheme.playHumanBg);
  target.style.setProperty('--play-human-border', sideTheme.playHumanBorder);
  target.style.setProperty('--play-human-accent', sideTheme.playHumanAccent);
  target.style.setProperty('--panel', boardTheme.bodyBackground);
  target.style.setProperty('--panel-2', boardTheme.playAiBg);
  target.style.setProperty('--board-frame-bg', boardTheme.surfaceBottom);
  target.style.setProperty('--board-frame-border', boardTheme.lineColor);
}

export function coalesceStoredLookState(): {
  boardLookId: BoardLookThemeId;
  sideLookId: PlayShellThemeId;
} {
  // Every board pairs with itself -- there is no longer a distinct side
  // value to read from storage, so side always mirrors board.
  const boardLookId = readStoredBoardLookIdRaw();
  return { boardLookId, sideLookId: boardLookId };
}

export function applyPlayLookState(
  boardLookId: BoardLookThemeId,
  _sideLookId?: PlayShellThemeId,
): void {
  if (typeof document === 'undefined') return;

  // Side always mirrors board now (charcoal/side-only removed entirely,
  // 2026-09-24) -- the second parameter is accepted only so existing call
  // sites (which all already pass readStoredSideLookId(), itself now just
  // board) don't need updating, but its value is never used.
  const board = boardLookId;
  const side = board;

  const hub = document.getElementById('play-hub');
  const shell = document.getElementById('play-shell');

  for (const el of [hub, shell, document.body]) {
    el?.setAttribute('data-play-board-look', board);
    el?.setAttribute('data-play-side-look', side);
    el?.setAttribute('data-play-theme', side);
    el?.setAttribute('data-play-board-match', 'matched');
  }

  syncThemeSwatchActive(board, side);
  if (hub) applyHubThemeCssVars(hub, side, board);
  if (shell) applyShellThemeVars(shell, side, board);
  applyShellThemeVars(document.body, side, board);
  document.body.style.background = resolvePlayShellPresentation(board).bodyBackground;

  try {
    localStorage.setItem(PLAY_BOARD_LOOK_STORAGE_KEY, board);
    localStorage.setItem(PLAY_SIDE_LOOK_STORAGE_KEY, side);
    localStorage.setItem(PLAY_THEME_STORAGE_KEY, side);
    localStorage.setItem('sb-play-board-match', 'matched');
  } catch {
    /* storage unavailable */
  }
}

export function migrateLegacyPlayThemeId(
  value: string | null | undefined,
): PlayShellThemeId | null {
  if (!value) return null;
  // '5'/'6' as legacy-key values were an old numbering scheme predating the
  // current ids (not to be confused with '6' as a current CompleteLookId,
  // Purple Night) -- previously migrated to charcoal ('7'), now unrecognized
  // since charcoal no longer exists; caller falls back to the default.
  if (value === '5') return null;
  if (isPlayShellThemeId(value)) return value;
  return null;
}

function readStoredBoardLookIdRaw(): BoardLookThemeId {
  try {
    const stored = localStorage.getItem(PLAY_BOARD_LOOK_STORAGE_KEY);
    // Warm Walnut moved from light id '12' to complete id '14' (2026-09-18) —
    // same colours, new group, so migrate rather than falling back to default.
    if (stored === '12') return '14';
    if (stored && REMOVED_LIGHT_BOARD_LOOK_IDS.has(stored)) return DEFAULT_BOARD_LOOK_ID;
    if (stored && REMOVED_COMPLETE_LOOK_IDS.has(stored)) return DEFAULT_BOARD_LOOK_ID;
    if (isBoardLookThemeId(stored)) return stored;
    const v2 = localStorage.getItem(PLAY_THEME_STORAGE_KEY);
    if (isBoardLookThemeId(v2)) return v2;
    const legacy = localStorage.getItem(LEGACY_PLAY_THEME_STORAGE_KEY);
    const migrated = migrateLegacyPlayThemeId(legacy);
    if (isBoardLookThemeId(migrated)) return migrated;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_BOARD_LOOK_ID;
}

export function readStoredBoardLookId(): BoardLookThemeId {
  return coalesceStoredLookState().boardLookId;
}

export function readStoredSideLookId(): PlayShellThemeId {
  return coalesceStoredLookState().sideLookId;
}

/** Storage is source of truth — DOM attrs can drift (hub defaults, HMR, partial updates). */
export function readBoardLookThemeId(): BoardLookThemeId {
  return readStoredBoardLookId();
}

export function readSideLookThemeId(): PlayShellThemeId {
  return readStoredSideLookId();
}

/** Re-apply look when shell/hub attrs drift from localStorage (side panels + CSS vars). */
export function syncPlayLookFromStorageIfDrifted(): boolean {
  if (typeof document === 'undefined') return false;
  const { boardLookId, sideLookId } = coalesceStoredLookState();
  const shell = document.getElementById('play-shell');
  if (!shell) return false;
  // Swatch highlight can drift even when data-* attrs match — always reconcile active row
  syncThemeSwatchActive(boardLookId, sideLookId);
  const boardDom = shell.getAttribute('data-play-board-look');
  const sideDom = shell.getAttribute('data-play-side-look');
  if (boardDom === boardLookId && sideDom === sideLookId) return false;
  applyPlayLookState(boardLookId, sideLookId);
  return true;
}

export function getPlayShellTheme(id: PlayShellThemeId): PlayShellTheme {
  return PLAY_SHELL_THEMES[id];
}

/** Applies a clicked swatch -- every board pairs with itself, there's no
 * other pairing left to choose between. */
export function applyPlayLookFromSwatch(swatchId: PlayShellThemeId): {
  boardLookId: BoardLookThemeId;
  sideLookId: PlayShellThemeId;
  boardChanged: boolean;
} {
  const priorBoard = readStoredBoardLookId();
  if (isCompleteLookId(swatchId)) {
    applyPlayLookState(swatchId, swatchId);
    return { boardLookId: swatchId, sideLookId: swatchId, boardChanged: priorBoard !== swatchId };
  }
  return {
    boardLookId: priorBoard,
    sideLookId: readStoredSideLookId(),
    boardChanged: false,
  };
}
