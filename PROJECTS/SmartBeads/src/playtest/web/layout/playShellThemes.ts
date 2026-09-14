/** Play look — 6 complete (board + side, one colour) + charcoal side-only (7). Lovable OKLCH. */

import { BEAD_SET_THEMES, DEFAULT_BEAD_SET_ID } from './beadSetThemes';
import { LOVABLE_BOARD_THEMES, LOVABLE_SHELL } from './lovableOklchTokens';

export type BoardLookThemeId = '1' | '2' | '3' | '4' | '5' | '6';
export type PlayShellThemeId = BoardLookThemeId | '7';
export type PlayLookGroup = 'complete' | 'side-only';
export type PlayBoardMatchMode = 'matched' | 'side-only';

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

function buildCompleteTheme(index: number, id: BoardLookThemeId): PlayShellTheme {
  const t = LOVABLE_BOARD_THEMES[index];
  return {
    id,
    label: t.label,
    lookGroup: 'complete',
    surfaceTop: t.surface,
    surfaceBottom: t.shadow,
    frameOuter: t.surface,
    frameInner: t.shadow,
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

function buildCharcoalSideTheme(): PlayShellTheme {
  return {
    id: '7',
    label: CHARCOAL_SIDE.label,
    lookGroup: 'side-only',
    surfaceTop: LOVABLE_BOARD_THEMES[0].surface,
    surfaceBottom: LOVABLE_BOARD_THEMES[0].shadow,
    frameOuter: LOVABLE_BOARD_THEMES[0].surface,
    frameInner: LOVABLE_BOARD_THEMES[0].shadow,
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

export const PLAY_SHELL_THEMES: Record<PlayShellThemeId, PlayShellTheme> = {
  '1': buildCompleteTheme(0, '1'),
  '2': buildCompleteTheme(1, '2'),
  '3': buildCompleteTheme(2, '3'),
  '4': buildCompleteTheme(3, '4'),
  '5': buildCompleteTheme(4, '5'),
  '6': buildCompleteTheme(5, '6'),
  '7': buildCharcoalSideTheme(),
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
  '5': buildHubRailPalette('5'),
  '6': buildHubRailPalette('6'),
  '7': buildHubRailPalette('7'),
};

export const HUB_CENTRE_PALETTES: Record<BoardLookThemeId, HubCentrePalette> = {
  '1': buildHubCentrePalette('1'),
  '2': buildHubCentrePalette('2'),
  '3': buildHubCentrePalette('3'),
  '4': buildHubCentrePalette('4'),
  '5': buildHubCentrePalette('5'),
  '6': buildHubCentrePalette('6'),
};

export const PLAY_THEME_STORAGE_KEY = 'sb-play-theme-v2';
export const PLAY_BOARD_LOOK_STORAGE_KEY = 'sb-play-board-look';
export const PLAY_SIDE_LOOK_STORAGE_KEY = 'sb-play-side-look-v3';
const LEGACY_SIDE_LOOK_STORAGE_KEY = 'sb-play-side-look';
const LEGACY_PLAY_THEME_STORAGE_KEY = 'sb-play-theme';

export function isPlayBoardMatchMode(value: string | null | undefined): value is PlayBoardMatchMode {
  return value === 'matched' || value === 'side-only';
}

export function isBoardLookThemeId(value: string | null | undefined): value is BoardLookThemeId {
  return value === '1' || value === '2' || value === '3' || value === '4' || value === '5' || value === '6';
}

export function isSideOnlyLookId(value: string | null | undefined): value is '7' {
  return value === '7';
}

export function isPlayShellThemeId(value: string | null | undefined): value is PlayShellThemeId {
  return isBoardLookThemeId(value) || value === '7';
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
  sideLookId: PlayShellThemeId,
): HubCentrePalette {
  if (isSideOnlyLookId(sideLookId)) return HUB_CENTRE_PALETTES[boardLookId];
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

export function syncThemeSwatchActive(
  boardLookId: BoardLookThemeId,
  sideLookId: PlayShellThemeId,
): void {
  if (typeof document === 'undefined') return;
  const root = document.getElementById('play-theme-setting');
  if (!root) return;
  for (const swatch of root.querySelectorAll<HTMLButtonElement>('.play-theme-swatch')) {
    const id = swatch.dataset.playTheme;
    const inCompleteRow = swatch.closest('.play-theme-swatches--complete') !== null;
    const inSideRow = swatch.closest('.play-theme-swatches--side') !== null;
    const active =
      (inCompleteRow && id === boardLookId)
      || (inSideRow && id === sideLookId && isSideOnlyLookId(id));
    swatch.classList.toggle('is-active', active);
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

export function applyPlayLookState(
  boardLookId: BoardLookThemeId,
  sideLookId: PlayShellThemeId,
): void {
  if (typeof document === 'undefined') return;
  const hub = document.getElementById('play-hub');
  const shell = document.getElementById('play-shell');
  const boardMatch = resolveHubBoardMatchForSideLook(sideLookId);

  for (const el of [hub, shell, document.body]) {
    el?.setAttribute('data-play-board-look', boardLookId);
    el?.setAttribute('data-play-side-look', sideLookId);
    el?.setAttribute('data-play-theme', sideLookId);
    el?.setAttribute('data-play-board-match', boardMatch);
  }

  syncThemeSwatchActive(boardLookId, sideLookId);
  if (hub) applyHubThemeCssVars(hub, sideLookId, boardLookId);
  if (shell) applyShellThemeVars(shell, sideLookId, boardLookId);
  applyShellThemeVars(document.body, sideLookId, boardLookId);
  document.body.style.background = resolvePlayShellPresentation(sideLookId, boardLookId).bodyBackground;

  try {
    localStorage.setItem(PLAY_BOARD_LOOK_STORAGE_KEY, boardLookId);
    localStorage.setItem(PLAY_SIDE_LOOK_STORAGE_KEY, sideLookId);
    localStorage.setItem(PLAY_THEME_STORAGE_KEY, sideLookId);
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
  if (isBoardLookThemeId(themeId)) {
    applyPlayLookState(themeId, themeId);
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

export function readStoredBoardLookId(): BoardLookThemeId {
  try {
    const stored = localStorage.getItem(PLAY_BOARD_LOOK_STORAGE_KEY);
    if (isBoardLookThemeId(stored)) return stored;
    const sideStored = localStorage.getItem(PLAY_SIDE_LOOK_STORAGE_KEY);
    const v2 = localStorage.getItem(PLAY_THEME_STORAGE_KEY);
    if (isBoardLookThemeId(v2) && (sideStored === v2 || sideStored === null)) return v2;
    if (v2 === '7' || v2 === '5' || v2 === '6') return DEFAULT_BOARD_LOOK_ID;
    const legacy = localStorage.getItem(LEGACY_PLAY_THEME_STORAGE_KEY);
    const migrated = migrateLegacyPlayThemeId(legacy);
    if (isBoardLookThemeId(migrated)) return migrated;
    if (migrated === '7') return DEFAULT_BOARD_LOOK_ID;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_BOARD_LOOK_ID;
}

function migrateLegacySideLookId(value: string | null | undefined): PlayShellThemeId | null {
  if (!value) return null;
  if (value === '7') return '7';
  if (isBoardLookThemeId(value)) return value;
  if (value === '5' || value === '6') return '7';
  return null;
}

export function readStoredSideLookId(): PlayShellThemeId {
  try {
    const stored = localStorage.getItem(PLAY_SIDE_LOOK_STORAGE_KEY);
    if (stored) return normalizeSideLookId(stored);
    const legacySide = migrateLegacySideLookId(localStorage.getItem(LEGACY_SIDE_LOOK_STORAGE_KEY));
    if (legacySide) return legacySide;
    const v2 = localStorage.getItem(PLAY_THEME_STORAGE_KEY);
    const migratedV2 = migrateLegacySideLookId(v2);
    if (migratedV2) return migratedV2;
    const legacy = localStorage.getItem(LEGACY_PLAY_THEME_STORAGE_KEY);
    const migrated = migrateLegacyPlayThemeId(legacy);
    if (migrated) return migrated;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_SIDE_LOOK_ID;
}

export function readStoredPlayThemeId(): PlayShellThemeId {
  return readStoredSideLookId();
}

export function readBoardLookThemeId(): BoardLookThemeId {
  const stored = readStoredBoardLookId();
  if (typeof document === 'undefined') return stored;
  const shell = document.getElementById('play-shell');
  const hub = document.getElementById('play-hub');
  const fromDom =
    shell?.getAttribute('data-play-board-look') ?? hub?.getAttribute('data-play-board-look');
  if (!isBoardLookThemeId(fromDom)) return stored;
  if (isSideOnlyLookId(readSideLookThemeId()) && fromDom !== stored) return stored;
  return fromDom;
}

export function readSideLookThemeId(): PlayShellThemeId {
  if (typeof document === 'undefined') return DEFAULT_SIDE_LOOK_ID;
  const shell = document.getElementById('play-shell');
  const hub = document.getElementById('play-hub');
  const fromDom =
    shell?.getAttribute('data-play-side-look') ?? hub?.getAttribute('data-play-side-look');
  return normalizeSideLookId(fromDom);
}

export function getPlayShellTheme(id: PlayShellThemeId): PlayShellTheme {
  return PLAY_SHELL_THEMES[id];
}

export function readPlayShellThemeId(): PlayShellThemeId {
  return readSideLookThemeId();
}

export function applyPlayLookFromSwatch(swatchId: PlayShellThemeId): {
  boardLookId: BoardLookThemeId;
  sideLookId: PlayShellThemeId;
  boardChanged: boolean;
} {
  const boardLookId = readStoredBoardLookId();
  if (isBoardLookThemeId(swatchId)) {
    applyPlayLookState(swatchId, swatchId);
    return { boardLookId: swatchId, sideLookId: swatchId, boardChanged: boardLookId !== swatchId };
  }
  applyPlayLookState(boardLookId, swatchId);
  return { boardLookId, sideLookId: swatchId, boardChanged: false };
}
