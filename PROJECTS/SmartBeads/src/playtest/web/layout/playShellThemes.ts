/** Play look — 5 complete + 5 light boards (charcoal sides) + side shell (7). Lovable OKLCH. */

import { BEAD_SET_THEMES, DEFAULT_BEAD_SET_ID } from './beadSetThemes';
import {
  LOVABLE_COMPLETE_BOARD_THEMES,
  LOVABLE_LIGHT_BOARD_THEMES,
  LOVABLE_SHELL,
  type LovableBoardTokens,
} from './lovableOklchTokens';

export type CompleteLookId = '1' | '2' | '3' | '6' | '14';
export type LightBoardLookId = '4' | '15' | '16' | '17' | '18';
export type BoardLookThemeId = CompleteLookId | LightBoardLookId;
export type PlayShellThemeId = BoardLookThemeId | '7';
export type PlayLookGroup = 'complete' | 'light-charcoal' | 'side-only';
export type PlayBoardMatchMode = 'matched' | 'side-only';

/** Which Look preview row was clicked (same swatch id can mean different pairings). */
export type PlayLookRow = 'dark-charcoal' | 'light-charcoal' | 'dark-same';

/** Complete boards that also appear in the "Matched" (same-colour-sides) row
 * (2026-09-19) — all 5 complete boards, kept as its own type in case a future
 * board is complete-only and not matched-eligible. */
export type MatchedSideLookId = CompleteLookId;

export const COMPLETE_LOOK_IDS: readonly CompleteLookId[] = ['1', '2', '3', '6', '14'];
export const LIGHT_BOARD_LOOK_IDS: readonly LightBoardLookId[] = ['4', '15', '16', '17', '18'];
export const MATCHED_SIDE_LOOK_IDS: readonly MatchedSideLookId[] = ['1', '2', '3', '6', '14'];

const COMPLETE_TOKEN_INDEX: Record<CompleteLookId, number> = {
  '1': 0,
  '2': 1,
  '3': 2,
  '6': 3,
  '14': 4,
};

const LIGHT_TOKEN_INDEX: Record<LightBoardLookId, number> = {
  '4': 0,
  '15': 1,
  '16': 2,
  '17': 3,
  '18': 4,
};

// '9' (Soft Blush) and '10' (Pale Sage) removed 2026-09-19 — kept alongside the
// earlier '8'/'11'/'13' removals so old stored values migrate away cleanly.
const REMOVED_LIGHT_BOARD_LOOK_IDS = new Set(['8', '9', '10', '11', '13']);

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

const DEFAULT_BEADS = BEAD_SET_THEMES[DEFAULT_BEAD_SET_ID];

const CHARCOAL_SIDE = {
  label: 'Charcoal + gold accents',
  bodyBackground: 'oklch(0.11 0.01 60)',
  sideCardBackground: 'linear-gradient(165deg, oklch(0.16 0.012 60), oklch(0.11 0.01 60))',
  sideCardBorder: LOVABLE_SHELL.border,
  sideCardGlow: `inset 0 1px 0 ${LOVABLE_SHELL.gold}28`,
  playAiBg: 'oklch(0.13 0.012 60)',
  playAiBorder: LOVABLE_SHELL.border,
  playHumanBg: `${LOVABLE_SHELL.gold}18`,
  playHumanBorder: `${LOVABLE_SHELL.gold}52`,
  playHumanAccent: LOVABLE_SHELL.gold,
  railBg: 'oklch(0.13 0.012 60)',
} as const;

function buildBoardThemeFromTokens(
  id: PlayShellThemeId,
  t: LovableBoardTokens,
  lookGroup: PlayLookGroup,
): PlayShellTheme {
  return {
    id,
    label: t.label,
    lookGroup,
    surfaceTop: t.surface,
    surfaceBottom: t.shadow,
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
    LOVABLE_COMPLETE_BOARD_THEMES[COMPLETE_TOKEN_INDEX[id]],
    'complete',
  );
}

function buildLightBoardTheme(id: LightBoardLookId): PlayShellTheme {
  return buildBoardThemeFromTokens(
    id,
    LOVABLE_LIGHT_BOARD_THEMES[LIGHT_TOKEN_INDEX[id]],
    'light-charcoal',
  );
}

function buildCharcoalSideTheme(): PlayShellTheme {
  return {
    id: '7',
    label: CHARCOAL_SIDE.label,
    lookGroup: 'side-only',
    surfaceTop: LOVABLE_COMPLETE_BOARD_THEMES[0].surface,
    surfaceBottom: LOVABLE_COMPLETE_BOARD_THEMES[0].shadow,
    frameOuter: LOVABLE_COMPLETE_BOARD_THEMES[0].surface,
    frameInner: LOVABLE_COMPLETE_BOARD_THEMES[0].shadow,
    lineColor: LOVABLE_SHELL.gold,
    edgeGlowRgba: 'rgba(0,0,0,0)',
    creamHorizontalStops: FLAT_CREAM_STOPS,
    creamVerticalStops: FLAT_CREAM_STOPS,
    bodyBackground: CHARCOAL_SIDE.bodyBackground,
    sideCardBackground: CHARCOAL_SIDE.sideCardBackground,
    sideCardBorder: CHARCOAL_SIDE.sideCardBorder,
    sideCardGlow: CHARCOAL_SIDE.sideCardGlow,
    playAiBg: CHARCOAL_SIDE.playAiBg,
    playAiBorder: CHARCOAL_SIDE.playAiBorder,
    playHumanBg: CHARCOAL_SIDE.playHumanBg,
    playHumanBorder: CHARCOAL_SIDE.playHumanBorder,
    playHumanAccent: CHARCOAL_SIDE.playHumanAccent,
    creamBead: DEFAULT_BEADS.creamBead,
    blackBead: DEFAULT_BEADS.blackBead,
  };
}

export const DEFAULT_BOARD_LOOK_ID: BoardLookThemeId = '1';
export const DEFAULT_SIDE_LOOK_ID: PlayShellThemeId = '1';
export const DEFAULT_PLAY_SHELL_THEME_ID: PlayShellThemeId = DEFAULT_SIDE_LOOK_ID;
export const SIDE_ONLY_LOOK_ID: PlayShellThemeId = '7';
export const DEFAULT_LIGHT_BOARD_LOOK_ID: LightBoardLookId = '4';

export const PLAY_SHELL_THEMES: Record<PlayShellThemeId, PlayShellTheme> = {
  '1': buildCompleteTheme('1'),
  '2': buildCompleteTheme('2'),
  '3': buildCompleteTheme('3'),
  '4': buildLightBoardTheme('4'),
  '6': buildCompleteTheme('6'),
  '7': buildCharcoalSideTheme(),
  '14': buildCompleteTheme('14'),
  '15': buildLightBoardTheme('15'),
  '16': buildLightBoardTheme('16'),
  '17': buildLightBoardTheme('17'),
  '18': buildLightBoardTheme('18'),
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
  const railBg = id === '7' ? CHARCOAL_SIDE.railBg : theme.bodyBackground;
  return {
    railBg,
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
  '4': buildHubRailPalette('4'),
  '6': buildHubRailPalette('6'),
  '7': buildHubRailPalette('7'),
  '14': buildHubRailPalette('14'),
  '15': buildHubRailPalette('15'),
  '16': buildHubRailPalette('16'),
  '17': buildHubRailPalette('17'),
  '18': buildHubRailPalette('18'),
};

export const HUB_CENTRE_PALETTES: Record<BoardLookThemeId, HubCentrePalette> = {
  '1': buildHubCentrePalette('1'),
  '2': buildHubCentrePalette('2'),
  '3': buildHubCentrePalette('3'),
  '4': buildHubCentrePalette('4'),
  '6': buildHubCentrePalette('6'),
  '14': buildHubCentrePalette('14'),
  '15': buildHubCentrePalette('15'),
  '16': buildHubCentrePalette('16'),
  '17': buildHubCentrePalette('17'),
  '18': buildHubCentrePalette('18'),
};

export const PLAY_THEME_STORAGE_KEY = 'sb-play-theme-v2';
export const PLAY_BOARD_LOOK_STORAGE_KEY = 'sb-play-board-look';
export const PLAY_SIDE_LOOK_STORAGE_KEY = 'sb-play-side-look-v3';
const LEGACY_SIDE_LOOK_STORAGE_KEY = 'sb-play-side-look';
const LEGACY_PLAY_THEME_STORAGE_KEY = 'sb-play-theme';

export function isPlayBoardMatchMode(value: string | null | undefined): value is PlayBoardMatchMode {
  return value === 'matched' || value === 'side-only';
}

export function isCompleteLookId(value: string | null | undefined): value is CompleteLookId {
  return value === '1' || value === '2' || value === '3' || value === '6' || value === '14';
}

export function isMatchedSideLookId(value: string | null | undefined): value is MatchedSideLookId {
  return isCompleteLookId(value);
}

export function isLightBoardLookId(value: string | null | undefined): value is LightBoardLookId {
  return value === '4' || value === '15' || value === '16' || value === '17' || value === '18';
}

export function isBoardLookThemeId(value: string | null | undefined): value is BoardLookThemeId {
  return isCompleteLookId(value) || isLightBoardLookId(value);
}

export function isSideOnlyLookId(value: string | null | undefined): value is '7' {
  return value === '7';
}

export function isPlayShellThemeId(value: string | null | undefined): value is PlayShellThemeId {
  return isBoardLookThemeId(value) || value === '7';
}

export function isLookSwatchId(value: string | null | undefined): value is PlayShellThemeId {
  return isCompleteLookId(value) || isLightBoardLookId(value) || value === '7';
}

export function normalizeSideLookId(value: string | null | undefined): PlayShellThemeId {
  if (isPlayShellThemeId(value)) return value;
  return DEFAULT_SIDE_LOOK_ID;
}

export function readPlayBoardMatchMode(): PlayBoardMatchMode {
  return resolveHubBoardMatchForSideLook(readSideLookThemeId());
}

export function resolveBoardMatchForTheme(_themeId: BoardLookThemeId): PlayBoardMatchMode {
  return 'matched';
}

export function resolveHubBoardMatchForSideLook(sideLookId: PlayShellThemeId): PlayBoardMatchMode {
  return isSideOnlyLookId(sideLookId) ? 'side-only' : 'matched';
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
  sideLookId: PlayShellThemeId,
  boardLookId: BoardLookThemeId,
): Pick<PlayShellTheme, 'bodyBackground'> {
  if (isSideOnlyLookId(sideLookId)) {
    return { bodyBackground: PLAY_SHELL_THEMES['7'].bodyBackground };
  }
  return { bodyBackground: PLAY_SHELL_THEMES[boardLookId].bodyBackground };
}

export function resolvePlayLookRowFromButton(btn: HTMLElement): PlayLookRow | null {
  if (btn.closest('.play-theme-swatches--dark-charcoal')) return 'dark-charcoal';
  if (btn.closest('.play-theme-swatches--light-charcoal')) return 'light-charcoal';
  if (btn.closest('.play-theme-swatches--dark-same')) return 'dark-same';
  return null;
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
    const inDarkCharcoal = swatch.closest('.play-theme-swatches--dark-charcoal') !== null;
    const inLightCharcoal = swatch.closest('.play-theme-swatches--light-charcoal') !== null;
    const inDarkSame = swatch.closest('.play-theme-swatches--dark-same') !== null;
    const active =
      (inDarkCharcoal
        && id === boardLookId
        && sideLookId === '7'
        && isCompleteLookId(boardLookId))
      || (inLightCharcoal
        && id === boardLookId
        && sideLookId === '7'
        && isLightBoardLookId(boardLookId))
      || (inDarkSame
        && id === boardLookId
        && sideLookId === boardLookId
        && isMatchedSideLookId(boardLookId));
    swatch.classList.toggle('is-active', Boolean(active));
  }
  }
}

export type PlayLookPreviewWireOptions = {
  isLocked?: () => boolean;
  onApplied?: () => void;
};

/** Wire row-aware swatch clicks on hub (page 1) or board settings (page 2). */
export function wirePlayLookPreviewSetting(
  root: HTMLElement | null,
  options: PlayLookPreviewWireOptions = {},
): void {
  if (!root || typeof document === 'undefined') return;
  for (const btn of root.querySelectorAll<HTMLButtonElement>('.play-theme-swatch')) {
    btn.addEventListener('click', () => {
      if (options.isLocked?.()) return;
      const next = btn.dataset.playTheme;
      const row = resolvePlayLookRowFromButton(btn);
      if (row && next) {
        applyPlayLookFromRow(next, row);
        options.onApplied?.();
        return;
      }
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
  const presentation = resolvePlayShellPresentation(sideLookId, boardLookId);
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
  target.style.setProperty('--panel', isSideOnlyLookId(sideLookId) ? sideTheme.playAiBg : boardTheme.bodyBackground);
  target.style.setProperty(
    '--panel-2',
    isSideOnlyLookId(sideLookId) ? sideTheme.playAiBg : boardTheme.playAiBg,
  );
  target.style.setProperty('--board-frame-bg', boardTheme.surfaceBottom);
  target.style.setProperty('--board-frame-border', boardTheme.lineColor);
}

export function coalesceStoredLookState(): {
  boardLookId: BoardLookThemeId;
  sideLookId: PlayShellThemeId;
} {
  const boardLookId = readStoredBoardLookIdRaw();

  if (isMatchedSideLookId(boardLookId)) {
    let sideStored: string | null = null;
    try {
      sideStored = localStorage.getItem(PLAY_SIDE_LOOK_STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    // Only honour Matched when the stored side actually says so — anything
    // else (including a missing/stale side key) falls back to charcoal.
    return { boardLookId, sideLookId: sideStored === boardLookId ? boardLookId : '7' };
  }
  if (isLightBoardLookId(boardLookId)) {
    // Covers boardLookId === '4' too — the older board+side-both-'4' branch this
    // replaced could never run after this check, so it was removed as dead code.
    return { boardLookId, sideLookId: '7' };
  }
  if (isCompleteLookId(boardLookId)) {
    return { boardLookId, sideLookId: '7' };
  }
  return { boardLookId: DEFAULT_BOARD_LOOK_ID, sideLookId: DEFAULT_SIDE_LOOK_ID };
}

export function applyPlayLookState(
  boardLookId: BoardLookThemeId,
  sideLookId: PlayShellThemeId,
): void {
  if (typeof document === 'undefined') return;

  let board = boardLookId;
  let side = sideLookId;
  // Matched (same-colour-sides) is only allowed for the 3 eligible boards, and
  // only when the caller actually asked for board === side — everything else
  // (including those 3 boards paired with any other side) still forces charcoal.
  const isMatchedSelection = isMatchedSideLookId(board) && side === board;
  if (!isMatchedSelection) {
    if (isLightBoardLookId(board)) {
      side = '7';
    } else if (isCompleteLookId(board)) {
      side = '7';
    }
  }

  const boardMatch = resolveHubBoardMatchForSideLook(side);
  const hub = document.getElementById('play-hub');
  const shell = document.getElementById('play-shell');

  for (const el of [hub, shell, document.body]) {
    el?.setAttribute('data-play-board-look', board);
    el?.setAttribute('data-play-side-look', side);
    el?.setAttribute('data-play-theme', side);
    el?.setAttribute('data-play-board-match', boardMatch);
  }

  syncThemeSwatchActive(board, side);
  if (hub) applyHubThemeCssVars(hub, side, board);
  if (shell) applyShellThemeVars(shell, side, board);
  applyShellThemeVars(document.body, side, board);
  document.body.style.background = resolvePlayShellPresentation(side, board).bodyBackground;

  try {
    localStorage.setItem(PLAY_BOARD_LOOK_STORAGE_KEY, board);
    localStorage.setItem(PLAY_SIDE_LOOK_STORAGE_KEY, side);
    // When side is charcoal-only, keep board id in v2 so board can be recovered if primary key is lost
    localStorage.setItem(PLAY_THEME_STORAGE_KEY, side === '7' ? board : side);
    localStorage.setItem('sb-play-board-match', boardMatch);
  } catch {
    /* storage unavailable */
  }
}

export function applyPlayShellThemeCssVars(
  shell: HTMLElement,
  sideLookId: PlayShellThemeId = readSideLookThemeId(),
  boardLookId: BoardLookThemeId = readBoardLookThemeId(),
): void {
  applyShellThemeVars(shell, sideLookId, boardLookId);
}

/** @deprecated Use applyPlayLookState(boardLookId, sideLookId). */
export function applySharedPlayTheme(themeId: PlayShellThemeId): void {
  if (isCompleteLookId(themeId)) {
    applyPlayLookState(themeId, themeId);
    return;
  }
  if (isLightBoardLookId(themeId)) {
    applyPlayLookState(themeId, '7');
    return;
  }
  applyPlayLookState(readStoredBoardLookId(), themeId);
}

/** @deprecated Use applyPlayLookState('1', '1'). */
export function applyFixedPlayLook(): void {
  applyPlayLookState(DEFAULT_BOARD_LOOK_ID, DEFAULT_SIDE_LOOK_ID);
}

export function migrateLegacyPlayThemeId(value: string | null | undefined): PlayShellThemeId | null {
  if (!value) return null;
  if (value === '5' || value === '6') return '7';
  if (isPlayShellThemeId(value)) return value;
  return null;
}

function readStoredBoardLookIdRaw(): BoardLookThemeId {
  try {
    const stored = localStorage.getItem(PLAY_BOARD_LOOK_STORAGE_KEY);
    // Warm Walnut moved from light id '12' to complete id '14' (2026-09-18) —
    // same colours, new group, so migrate rather than falling back to default.
    if (stored === '12') return '14';
    if (stored && REMOVED_LIGHT_BOARD_LOOK_IDS.has(stored)) return DEFAULT_LIGHT_BOARD_LOOK_ID;
    if (isBoardLookThemeId(stored)) return stored;
    const sideStored = localStorage.getItem(PLAY_SIDE_LOOK_STORAGE_KEY);
    const v2 = localStorage.getItem(PLAY_THEME_STORAGE_KEY);
    // v2 stores board id when side is charcoal-only (7) — recover board if primary key lost
    // isBoardLookThemeId already excludes '7' (a side-only id), so no extra check needed.
    if (sideStored === '7' && isBoardLookThemeId(v2)) return v2;
    if (isCompleteLookId(v2) && (sideStored === v2 || sideStored === null)) return v2;
    if (v2 === '7') return DEFAULT_LIGHT_BOARD_LOOK_ID;
    if (v2 === '5' || v2 === '6') return DEFAULT_BOARD_LOOK_ID;
    const legacy = localStorage.getItem(LEGACY_PLAY_THEME_STORAGE_KEY);
    const migrated = migrateLegacyPlayThemeId(legacy);
    if (isBoardLookThemeId(migrated)) return migrated;
    if (migrated === '7') return DEFAULT_LIGHT_BOARD_LOOK_ID;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_BOARD_LOOK_ID;
}

// readStoredSideLookIdRaw() and migrateLegacySideLookId() were removed 2026-09-14 —
// coalesceStoredLookState() never consumed their result (every return path hardcoded
// the side look), so this whole legacy-side-migration path was dead and untested.
// The board theme is the only thing actually read from storage here; side look is
// always forced by the current design (DECISIONS: single charcoal side, id '7').

export function readStoredBoardLookId(): BoardLookThemeId {
  return coalesceStoredLookState().boardLookId;
}

export function readStoredSideLookId(): PlayShellThemeId {
  return coalesceStoredLookState().sideLookId;
}

export function readStoredPlayThemeId(): PlayShellThemeId {
  return readStoredSideLookId();
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

export function readPlayShellThemeId(): PlayShellThemeId {
  return readSideLookThemeId();
}

export function applyPlayLookFromRow(
  swatchId: string,
  row: PlayLookRow,
): {
  boardLookId: BoardLookThemeId;
  sideLookId: PlayShellThemeId;
  boardChanged: boolean;
} {
  const priorBoard = readStoredBoardLookId();
  if (row === 'dark-same' && isMatchedSideLookId(swatchId)) {
    applyPlayLookState(swatchId, swatchId);
    return { boardLookId: swatchId, sideLookId: swatchId, boardChanged: priorBoard !== swatchId };
  }
  if (row === 'dark-charcoal' && isCompleteLookId(swatchId)) {
    applyPlayLookState(swatchId, '7');
    return { boardLookId: swatchId, sideLookId: '7', boardChanged: priorBoard !== swatchId };
  }
  if (row === 'light-charcoal' && isLightBoardLookId(swatchId)) {
    applyPlayLookState(swatchId, '7');
    return { boardLookId: swatchId, sideLookId: '7', boardChanged: priorBoard !== swatchId };
  }
  return { boardLookId: priorBoard, sideLookId: readStoredSideLookId(), boardChanged: false };
}

/** @deprecated Use applyPlayLookFromRow(swatchId, row). */
export function applyPlayLookFromSwatch(swatchId: PlayShellThemeId): {
  boardLookId: BoardLookThemeId;
  sideLookId: PlayShellThemeId;
  boardChanged: boolean;
} {
  if (isCompleteLookId(swatchId)) return applyPlayLookFromRow(swatchId, 'dark-charcoal');
  if (isLightBoardLookId(swatchId)) return applyPlayLookFromRow(swatchId, 'light-charcoal');
  if (isSideOnlyLookId(swatchId)) {
    const boardLookId = readStoredBoardLookId();
    applyPlayLookState(boardLookId, '7');
    return { boardLookId, sideLookId: '7', boardChanged: false };
  }
  return {
    boardLookId: readStoredBoardLookId(),
    sideLookId: readStoredSideLookId(),
    boardChanged: false,
  };
}
