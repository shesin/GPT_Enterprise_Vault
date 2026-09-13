/** Unified board + side panel presets — preview until locked in DECISIONS. */

export type PlayShellThemeId = '1' | '2' | '3' | '4' | '5';

/** Board canvas presets — complete row only (1–4). */
export type BoardLookThemeId = '1' | '2' | '3' | '4';

export type PlayLookGroup = 'complete' | 'side-only';

/** matched = board look from complete row; side-only = hub centre locked green while side is 5/6. */
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
  creamHorizontalStops: readonly CreamHalfStop[];
  creamVerticalStops: readonly CreamHalfStop[];
  edgeGlowRgba: string;
}

const CAMP_EDGE_CREAM: readonly CreamHalfStop[] = [
  [0, 'rgba(255,245,220,0.12)'],
  [0.15, 'rgba(255,245,220,0.05)'],
  [0.28, 'rgba(255,245,220,0)'],
  [1, 'rgba(0,0,0,0)'],
];
const CAMP_EDGE_CREAM_V: readonly CreamHalfStop[] = [
  [0, 'rgba(0,0,0,0)'],
  [0.72, 'rgba(255,245,220,0)'],
  [0.85, 'rgba(255,245,220,0.05)'],
  [1, 'rgba(255,245,220,0.12)'],
];

/** Complete (matched) looks — solid board; no asymmetric camp wash. */
const FLAT_CREAM_STOPS: readonly CreamHalfStop[] = [
  [0, 'rgba(0,0,0,0)'],
  [1, 'rgba(0,0,0,0)'],
];

const CLASSIC_BEADS = {
  creamBead: { highlight: '#fffaf0', mid: '#ebe2cf', shadow: '#b7ab92' },
  blackBead: { highlight: '#5a4538', mid: '#241812', shadow: '#0a0604' },
} as const;

const CLASSIC_DARK_TOP = '#0a3828';
const CLASSIC_DARK_BOTTOM = '#052818';

/** Side-only board canvas — always forest green; independent of look swatch. */
export const SIDE_ONLY_BOARD_LOOK: BoardCanvasLook = {
  surfaceTop: CLASSIC_DARK_TOP,
  surfaceBottom: CLASSIC_DARK_BOTTOM,
  creamHorizontalStops: CAMP_EDGE_CREAM,
  creamVerticalStops: CAMP_EDGE_CREAM_V,
  edgeGlowRgba: 'rgba(235, 226, 207, 0.42)',
};

const TEAL_CREAM_H: readonly CreamHalfStop[] = [
  [0, 'rgba(180,230,240,0.16)'],
  [0.35, 'rgba(180,230,240,0.06)'],
  [0.5, 'rgba(180,230,240,0)'],
  [1, 'rgba(0,0,0,0)'],
];
const TEAL_CREAM_V: readonly CreamHalfStop[] = [
  [0, 'rgba(0,0,0,0)'],
  [0.5, 'rgba(180,230,240,0)'],
  [0.65, 'rgba(180,230,240,0.08)'],
  [1, 'rgba(180,230,240,0.14)'],
];

const PLUM_CREAM_H: readonly CreamHalfStop[] = [
  [0, 'rgba(220,180,240,0.14)'],
  [0.35, 'rgba(220,180,240,0.05)'],
  [0.5, 'rgba(220,180,240,0)'],
  [1, 'rgba(0,0,0,0)'],
];
const PLUM_CREAM_V: readonly CreamHalfStop[] = [
  [0, 'rgba(0,0,0,0)'],
  [0.5, 'rgba(220,180,240,0)'],
  [0.65, 'rgba(220,180,240,0.07)'],
  [1, 'rgba(220,180,240,0.12)'],
];

const FOREST_CREAM_H: readonly CreamHalfStop[] = [
  [0, 'rgba(255,242,215,0.18)'],
  [0.33, 'rgba(255,242,215,0.07)'],
  [0.45, 'rgba(255,242,215,0)'],
  [1, 'rgba(0,0,0,0)'],
];
const FOREST_CREAM_V: readonly CreamHalfStop[] = [
  [0, 'rgba(0,0,0,0)'],
  [0.55, 'rgba(255,242,215,0)'],
  [0.67, 'rgba(255,242,215,0.09)'],
  [1, 'rgba(255,242,215,0.18)'],
];

const BROWN_CREAM_H: readonly CreamHalfStop[] = [
  [0, 'rgba(255,220,180,0.14)'],
  [0.35, 'rgba(255,220,180,0.05)'],
  [0.5, 'rgba(255,220,180,0)'],
  [1, 'rgba(0,0,0,0)'],
];
const BROWN_CREAM_V: readonly CreamHalfStop[] = [
  [0, 'rgba(0,0,0,0)'],
  [0.5, 'rgba(255,220,180,0)'],
  [0.65, 'rgba(255,220,180,0.08)'],
  [1, 'rgba(255,220,180,0.14)'],
];

const PARCHMENT_CREAM_H: readonly CreamHalfStop[] = [
  [0, 'rgba(255,242,215,0.20)'],
  [0.33, 'rgba(255,242,215,0.08)'],
  [0.45, 'rgba(255,242,215,0)'],
  [1, 'rgba(0,0,0,0)'],
];
const PARCHMENT_CREAM_V: readonly CreamHalfStop[] = [
  [0, 'rgba(0,0,0,0)'],
  [0.55, 'rgba(255,242,215,0)'],
  [0.67, 'rgba(255,242,215,0.10)'],
  [1, 'rgba(255,242,215,0.20)'],
];

export const DEFAULT_BOARD_LOOK_ID: BoardLookThemeId = '3';
export const DEFAULT_SIDE_LOOK_ID: PlayShellThemeId = '5';
export const DEFAULT_PLAY_SHELL_THEME_ID: PlayShellThemeId = DEFAULT_SIDE_LOOK_ID;

export const PLAY_SHELL_THEMES: Record<PlayShellThemeId, PlayShellTheme> = {
  '1': {
    id: '1',
    label: 'Deep teal / blue-green',
    lookGroup: 'complete',
    surfaceTop: '#0f3d48',
    surfaceBottom: '#0d3842',
    edgeGlowRgba: 'rgba(180, 230, 240, 0.28)',
    creamHorizontalStops: TEAL_CREAM_H,
    creamVerticalStops: TEAL_CREAM_V,
    bodyBackground: '#0a1418',
    sideCardBackground: 'linear-gradient(165deg, #143840, #0f2830)',
    sideCardBorder: 'rgba(201, 162, 78, 0.26)',
    sideCardGlow: 'inset 0 1px 0 rgba(201, 162, 78, 0.10)',
    playAiBg: 'rgba(10, 22, 28, 0.96)',
    playAiBorder: 'rgba(201, 162, 78, 0.18)',
    playHumanBg: 'rgba(201, 162, 78, 0.08)',
    playHumanBorder: 'rgba(201, 162, 78, 0.32)',
    playHumanAccent: '#c9a24e',
    ...CLASSIC_BEADS,
  },
  '2': {
    id: '2',
    label: 'Deep plum / violet',
    lookGroup: 'complete',
    surfaceTop: '#24162b',
    surfaceBottom: '#201226',
    edgeGlowRgba: 'rgba(220, 180, 240, 0.26)',
    creamHorizontalStops: PLUM_CREAM_H,
    creamVerticalStops: PLUM_CREAM_V,
    bodyBackground: '#0e0a12',
    sideCardBackground: 'linear-gradient(165deg, #2a1932, #24162b)',
    sideCardBorder: 'rgba(201, 162, 78, 0.24)',
    sideCardGlow: 'inset 0 1px 0 rgba(201, 162, 78, 0.08)',
    playAiBg: 'rgba(18, 10, 22, 0.96)',
    playAiBorder: 'rgba(201, 162, 78, 0.16)',
    playHumanBg: 'rgba(201, 162, 78, 0.07)',
    playHumanBorder: 'rgba(201, 162, 78, 0.30)',
    playHumanAccent: '#c9a24e',
    ...CLASSIC_BEADS,
  },
  '3': {
    id: '3',
    label: 'Forest & Gold',
    lookGroup: 'complete',
    surfaceTop: CLASSIC_DARK_TOP,
    surfaceBottom: CLASSIC_DARK_BOTTOM,
    edgeGlowRgba: 'rgba(235, 226, 207, 0.42)',
    creamHorizontalStops: FOREST_CREAM_H,
    creamVerticalStops: FOREST_CREAM_V,
    bodyBackground: '#12281f',
    sideCardBackground: 'linear-gradient(165deg, #1a4030, #123528)',
    sideCardBorder: 'rgba(212, 168, 75, 0.22)',
    sideCardGlow: '0 0 14px rgba(235, 226, 207, 0.14), inset 0 0 0 1px rgba(235, 226, 207, 0.06)',
    playAiBg: 'rgba(14, 28, 22, 0.96)',
    playAiBorder: 'rgba(201, 162, 78, 0.18)',
    playHumanBg: 'rgba(201, 162, 78, 0.08)',
    playHumanBorder: 'rgba(201, 162, 78, 0.32)',
    playHumanAccent: '#c9a24e',
    ...CLASSIC_BEADS,
  },
  '4': {
    id: '4',
    label: 'Warm brown',
    lookGroup: 'complete',
    surfaceTop: '#3d2e22',
    surfaceBottom: '#2a1f16',
    edgeGlowRgba: 'rgba(212, 168, 75, 0.32)',
    creamHorizontalStops: BROWN_CREAM_H,
    creamVerticalStops: BROWN_CREAM_V,
    bodyBackground: '#120e0a',
    sideCardBackground: 'linear-gradient(165deg, #352820, #2a1f16)',
    sideCardBorder: 'rgba(201, 162, 78, 0.26)',
    sideCardGlow: 'inset 0 1px 0 rgba(201, 162, 78, 0.08)',
    playAiBg: 'rgba(22, 16, 12, 0.96)',
    playAiBorder: 'rgba(201, 162, 78, 0.18)',
    playHumanBg: 'rgba(201, 162, 78, 0.08)',
    playHumanBorder: 'rgba(201, 162, 78, 0.30)',
    playHumanAccent: '#c9a24e',
    ...CLASSIC_BEADS,
  },
  '5': {
    id: '5',
    label: 'Charcoal + gold accents',
    lookGroup: 'side-only',
    surfaceTop: CLASSIC_DARK_TOP,
    surfaceBottom: CLASSIC_DARK_BOTTOM,
    edgeGlowRgba: 'rgba(201, 162, 78, 0.22)',
    creamHorizontalStops: CAMP_EDGE_CREAM,
    creamVerticalStops: CAMP_EDGE_CREAM_V,
    bodyBackground: '#0e0d0b',
    sideCardBackground: '#121110',
    sideCardBorder: 'rgba(201, 162, 78, 0.32)',
    sideCardGlow: 'inset 0 1px 0 rgba(201, 162, 78, 0.10)',
    playAiBg: '#161412',
    playAiBorder: 'rgba(201, 162, 78, 0.16)',
    playHumanBg: 'rgba(201, 162, 78, 0.07)',
    playHumanBorder: 'rgba(201, 162, 78, 0.34)',
    playHumanAccent: '#c9a24e',
    ...CLASSIC_BEADS,
  },
};

/** Hub centre when board is locked to snapshot green (side-only group). */
export const LOCKED_HUB_CENTRE: HubCentrePalette = {
  pageBg: '#12281f',
  centreBg: '#1a3128',
  cardBg: '#1f4a38',
  cardHover: '#245542',
  centreText: '#faf9f7',
  centreMuted: '#a8a49c',
};

/** Maps pre-v2 swatch ids (forest green / old forest & gold / brown / tan) to v2 ids. */
const LEGACY_V1_THEME_MAP: Record<string, PlayShellThemeId> = {
  '1': '3',
  '2': '5',
  '3': '4',
  '4': '5',
};

export const PLAY_THEME_STORAGE_KEY = 'sb-play-theme-v2';
export const PLAY_BOARD_LOOK_STORAGE_KEY = 'sb-play-board-look';
export const PLAY_SIDE_LOOK_STORAGE_KEY = 'sb-play-side-look';
const LEGACY_PLAY_THEME_STORAGE_KEY = 'sb-play-theme';

export function isPlayBoardMatchMode(value: string | null | undefined): value is PlayBoardMatchMode {
  return value === 'matched' || value === 'side-only';
}

export function isBoardLookThemeId(value: string | null | undefined): value is BoardLookThemeId {
  return value === '1' || value === '2' || value === '3' || value === '4';
}

export function isSideOnlyLookId(value: string | null | undefined): value is '5' {
  return value === '5';
}

/** Retired warm parchment (6) → charcoal side look. */
export function normalizeSideLookId(value: string | null | undefined): PlayShellThemeId {
  if (value === '6') return '5';
  if (isPlayShellThemeId(value)) return value;
  return DEFAULT_SIDE_LOOK_ID;
}

export function readPlayBoardMatchMode(): PlayBoardMatchMode {
  return resolveBoardMatchForTheme(readBoardLookThemeId());
}

export function resolveBoardMatchForTheme(themeId: BoardLookThemeId): PlayBoardMatchMode {
  return 'matched';
}

export function resolveHubBoardMatchForSideLook(sideLookId: PlayShellThemeId): PlayBoardMatchMode {
  return isSideOnlyLookId(sideLookId) ? 'side-only' : 'matched';
}

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

export const HUB_RAIL_PALETTES: Record<PlayShellThemeId, HubRailPalette> = {
  '1': {
    railBg: '#0f2830',
    text: '#e8f2f4',
    muted: '#8aa8b0',
    border: 'rgba(201, 162, 78, 0.26)',
    borderSoft: 'rgba(201, 162, 78, 0.12)',
    brand: '#c9a24e',
    accent: '#c9a24e',
    accentSoft: 'rgba(201, 162, 78, 0.12)',
    accentRing: 'rgba(201, 162, 78, 0.38)',
  },
  '2': {
    railBg: '#24162b',
    text: '#f0e8f4',
    muted: '#a894b8',
    border: 'rgba(201, 162, 78, 0.24)',
    borderSoft: 'rgba(201, 162, 78, 0.12)',
    brand: '#c9a24e',
    accent: '#c9a24e',
    accentSoft: 'rgba(201, 162, 78, 0.12)',
    accentRing: 'rgba(201, 162, 78, 0.38)',
  },
  '3': {
    railBg: '#1a4030',
    text: '#e8f0ea',
    muted: '#9bb5a6',
    border: 'rgba(212, 168, 75, 0.22)',
    borderSoft: 'rgba(212, 168, 75, 0.12)',
    brand: '#c9a24e',
    accent: '#c9a24e',
    accentSoft: 'rgba(201, 162, 78, 0.14)',
    accentRing: 'rgba(201, 162, 78, 0.42)',
  },
  '4': {
    railBg: '#2a2018',
    text: '#f0ebe4',
    muted: '#a89882',
    border: 'rgba(201, 162, 78, 0.26)',
    borderSoft: 'rgba(201, 162, 78, 0.12)',
    brand: '#c9a24e',
    accent: '#c9a24e',
    accentSoft: 'rgba(201, 162, 78, 0.12)',
    accentRing: 'rgba(201, 162, 78, 0.38)',
  },
  '5': {
    railBg: '#121110',
    text: '#f5f0e8',
    muted: '#8a8278',
    border: 'rgba(201, 162, 78, 0.28)',
    borderSoft: 'rgba(201, 162, 78, 0.14)',
    brand: '#c9a24e',
    accent: '#c9a24e',
    accentSoft: 'rgba(201, 162, 78, 0.14)',
    accentRing: 'rgba(201, 162, 78, 0.42)',
  },
};

export const HUB_CENTRE_PALETTES: Record<PlayShellThemeId, HubCentrePalette> = {
  '1': {
    pageBg: '#0a1418',
    centreBg: '#0f2830',
    cardBg: '#1a3a42',
    cardHover: '#204850',
    centreText: '#e8f2f4',
    centreMuted: '#8aa8b0',
  },
  '2': {
    pageBg: '#0e0a12',
    centreBg: '#24162b',
    cardBg: '#321f3d',
    cardHover: '#3c2548',
    centreText: '#f0e8f4',
    centreMuted: '#a894b8',
  },
  '3': {
    pageBg: '#12281f',
    centreBg: '#1a3128',
    cardBg: '#1f4a38',
    cardHover: '#245542',
    centreText: '#faf9f7',
    centreMuted: '#a8a49c',
  },
  '4': {
    pageBg: '#120e0a',
    centreBg: '#2a2018',
    cardBg: '#3a2e24',
    cardHover: '#45362a',
    centreText: '#f0ebe4',
    centreMuted: '#a89882',
  },
  '5': {
    pageBg: '#0e0d0b',
    centreBg: '#141210',
    cardBg: '#161412',
    cardHover: '#1e1b18',
    centreText: '#f5f0e8',
    centreMuted: '#8a8278',
  },
};

export function resolveHubCentrePalette(
  themeId: PlayShellThemeId,
  mode: PlayBoardMatchMode,
): HubCentrePalette {
  if (mode === 'side-only') return LOCKED_HUB_CENTRE;
  return HUB_CENTRE_PALETTES[themeId];
}

export function applyHubThemeCssVars(
  hub: HTMLElement,
  themeId: PlayShellThemeId,
  mode: PlayBoardMatchMode,
): void {
  const rail = HUB_RAIL_PALETTES[themeId];
  const centre = resolveHubCentrePalette(themeId, mode);
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

/** Board canvas from stored board look only — side swatches (5/6) never reach here. */
export function resolveBoardCanvasLook(
  boardLookId: BoardLookThemeId,
  mode: PlayBoardMatchMode = 'matched',
): BoardCanvasLook {
  const theme = getPlayShellTheme(boardLookId);
  return {
    surfaceTop: theme.surfaceTop,
    surfaceBottom: theme.surfaceBottom,
    creamHorizontalStops: FLAT_CREAM_STOPS,
    creamVerticalStops: FLAT_CREAM_STOPS,
    edgeGlowRgba: theme.edgeGlowRgba,
  };
}

export function resolvePlayShellPresentation(
  themeId: PlayShellThemeId,
  mode: PlayBoardMatchMode,
): Pick<PlayShellTheme, 'bodyBackground'> {
  const theme = getPlayShellTheme(themeId);
  return { bodyBackground: theme.bodyBackground };
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

export function applyPlayLookState(
  boardLookId: BoardLookThemeId,
  sideLookId: PlayShellThemeId,
): void {
  if (typeof document === 'undefined') return;
  const hub = document.getElementById('play-hub');
  const shell = document.getElementById('play-shell');
  const boardMatch = resolveBoardMatchForTheme(boardLookId);
  const hubCentreMode = resolveHubBoardMatchForSideLook(sideLookId);

  hub?.setAttribute('data-play-board-look', boardLookId);
  hub?.setAttribute('data-play-side-look', sideLookId);
  shell?.setAttribute('data-play-board-look', boardLookId);
  shell?.setAttribute('data-play-side-look', sideLookId);
  hub?.setAttribute('data-play-theme', sideLookId);
  shell?.setAttribute('data-play-theme', sideLookId);
  hub?.setAttribute('data-play-board-match', boardMatch);
  shell?.setAttribute('data-play-board-match', boardMatch);
  document.body.setAttribute('data-play-board-look', boardLookId);
  document.body.setAttribute('data-play-side-look', sideLookId);
  document.body.setAttribute('data-play-theme', sideLookId);
  document.body.setAttribute('data-play-board-match', boardMatch);

  syncThemeSwatchActive(boardLookId, sideLookId);
  if (hub) applyHubThemeCssVars(hub, sideLookId, hubCentreMode);
  if (shell) applyPlayShellThemeCssVars(shell, sideLookId);
  else if (hub) {
    document.body.style.background = getPlayShellTheme(sideLookId).bodyBackground;
  }

  try {
    localStorage.setItem(PLAY_BOARD_LOOK_STORAGE_KEY, boardLookId);
    localStorage.setItem(PLAY_SIDE_LOOK_STORAGE_KEY, sideLookId);
    localStorage.setItem(PLAY_THEME_STORAGE_KEY, sideLookId);
    localStorage.setItem('sb-play-board-match', boardMatch);
  } catch {
    /* storage unavailable */
  }
}

/** @deprecated Use applyPlayLookState(boardLookId, sideLookId). */
export function applySharedPlayTheme(
  themeId: PlayShellThemeId,
  boardMatch: PlayBoardMatchMode = resolveHubBoardMatchForSideLook(themeId),
): void {
  if (isBoardLookThemeId(themeId)) {
    applyPlayLookState(themeId, themeId);
    return;
  }
  applyPlayLookState(readStoredBoardLookId(), themeId);
}

export function applyPlayShellThemeCssVars(
  shell: HTMLElement,
  sideLookId: PlayShellThemeId,
): void {
  const theme = getPlayShellTheme(sideLookId);
  const presentation = resolvePlayShellPresentation(sideLookId, 'matched');
  shell.style.setProperty('--side-card-bg', theme.sideCardBackground);
  shell.style.setProperty('--side-card-border', theme.sideCardBorder);
  shell.style.setProperty('--side-card-glow', theme.sideCardGlow);
  shell.style.setProperty('--play-ai-bg', theme.playAiBg);
  shell.style.setProperty('--play-ai-border', theme.playAiBorder);
  shell.style.setProperty('--play-human-bg', theme.playHumanBg);
  shell.style.setProperty('--play-human-border', theme.playHumanBorder);
  shell.style.setProperty('--play-human-accent', theme.playHumanAccent);
  if (sideLookId === '5') {
    shell.style.setProperty('--panel', '#121110');
    shell.style.setProperty('--panel-2', '#161412');
  } else {
    shell.style.setProperty('--panel', theme.bodyBackground);
    shell.style.setProperty('--panel-2', theme.playAiBg.startsWith('#') ? theme.playAiBg : theme.bodyBackground);
  }
  if (typeof document !== 'undefined') {
    document.body.style.background = presentation.bodyBackground;
  }
}

export function isPlayShellThemeId(value: string | null | undefined): value is PlayShellThemeId {
  return value === '1' || value === '2' || value === '3' || value === '4' || value === '5';
}

/** Migrate v1 localStorage value only — v2 ids 1–5 pass through; retired 6 → 5. */
export function migrateLegacyPlayThemeId(value: string | null | undefined): PlayShellThemeId | null {
  if (!value) return null;
  if (value === '6') return '5';
  if (LEGACY_V1_THEME_MAP[value]) return LEGACY_V1_THEME_MAP[value];
  if (isPlayShellThemeId(value)) return value;
  return null;
}

export function readStoredBoardLookId(): BoardLookThemeId {
  try {
    const stored = localStorage.getItem(PLAY_BOARD_LOOK_STORAGE_KEY);
    if (isBoardLookThemeId(stored)) return stored;
    const v2 = localStorage.getItem(PLAY_THEME_STORAGE_KEY);
    if (isBoardLookThemeId(v2)) return v2;
    if (v2 === '5' || v2 === '6') return DEFAULT_BOARD_LOOK_ID;
    const legacy = localStorage.getItem(LEGACY_PLAY_THEME_STORAGE_KEY);
    const migrated = migrateLegacyPlayThemeId(legacy);
    if (isBoardLookThemeId(migrated)) return migrated;
    if (migrated === '5') return DEFAULT_BOARD_LOOK_ID;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_BOARD_LOOK_ID;
}

export function readStoredSideLookId(): PlayShellThemeId {
  try {
    const stored = localStorage.getItem(PLAY_SIDE_LOOK_STORAGE_KEY);
    if (stored) return normalizeSideLookId(stored);
    const v2 = localStorage.getItem(PLAY_THEME_STORAGE_KEY);
    if (v2) return normalizeSideLookId(v2);
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
  if (typeof document === 'undefined') return DEFAULT_BOARD_LOOK_ID;
  const shell = document.getElementById('play-shell');
  const hub = document.getElementById('play-hub');
  const fromDom =
    shell?.getAttribute('data-play-board-look') ?? hub?.getAttribute('data-play-board-look');
  if (isBoardLookThemeId(fromDom)) return fromDom;
  return DEFAULT_BOARD_LOOK_ID;
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
  const boardLookId = readBoardLookThemeId();
  if (isBoardLookThemeId(swatchId)) {
    applyPlayLookState(swatchId, swatchId);
    return { boardLookId: swatchId, sideLookId: swatchId, boardChanged: boardLookId !== swatchId };
  }
  applyPlayLookState(boardLookId, swatchId);
  return { boardLookId, sideLookId: swatchId, boardChanged: false };
}
