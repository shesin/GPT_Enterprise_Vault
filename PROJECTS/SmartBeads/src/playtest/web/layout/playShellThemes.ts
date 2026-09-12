/** Unified board + side panel presets — preview until locked in DECISIONS. */

export type PlayShellThemeId = '1' | '2' | '3';

/** matched = board + side share theme colour; side-only = previous preview (side changes, board stays green). */
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
  /** Board canvas gradient — matched to side panel for this theme. */
  surfaceTop: string;
  surfaceBottom: string;
  edgeGlowRgba: string;
  creamHorizontalStops: readonly CreamHalfStop[];
  creamVerticalStops: readonly CreamHalfStop[];
  creamBead: BeadShade;
  blackBead: BeadShade;
  /** Page + settings column — same palette as board for this theme. */
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

const CAMP_EDGE_CREAM: readonly CreamHalfStop[] = [
  [0, 'rgba(255,245,220,0.22)'],
  [0.15, 'rgba(255,245,220,0.10)'],
  [0.28, 'rgba(255,245,220,0)'],
  [1, 'rgba(0,0,0,0)'],
];
const CAMP_EDGE_CREAM_V: readonly CreamHalfStop[] = [
  [0, 'rgba(0,0,0,0)'],
  [0.72, 'rgba(255,245,220,0)'],
  [0.85, 'rgba(255,245,220,0.10)'],
  [1, 'rgba(255,245,220,0.22)'],
];

const CLASSIC_BEADS = {
  creamBead: { highlight: '#fffaf0', mid: '#ebe2cf', shadow: '#b7ab92' },
  blackBead: { highlight: '#5a4538', mid: '#241812', shadow: '#0a0604' },
} as const;

const CLASSIC_DARK_TOP = '#1a4030';
const CLASSIC_DARK_BOTTOM = '#123528';
/** Side column — warm green from earlier warm-parchment preview (not brown). */
const WARM_SIDE_TOP = '#1c261e';
const WARM_SIDE_BOTTOM = '#122820';

const CLASSIC_BODY_BG =
  'radial-gradient(ellipse at top, #284b3d, transparent 60%), linear-gradient(165deg, #12281f, #0b1813)';

const WARM_PARCHMENT_CREAM_H: readonly CreamHalfStop[] = [
  [0, 'rgba(255,242,215,0.20)'],
  [0.33, 'rgba(255,242,215,0.08)'],
  [0.45, 'rgba(255,242,215,0)'],
  [1, 'rgba(0,0,0,0)'],
];
const WARM_PARCHMENT_CREAM_V: readonly CreamHalfStop[] = [
  [0, 'rgba(0,0,0,0)'],
  [0.55, 'rgba(255,242,215,0)'],
  [0.67, 'rgba(255,242,215,0.10)'],
  [1, 'rgba(255,242,215,0.20)'],
];

export const PLAY_SHELL_THEMES: Record<PlayShellThemeId, PlayShellTheme> = {
  '1': {
    id: '1',
    label: 'Classic Dark',
    surfaceTop: CLASSIC_DARK_TOP,
    surfaceBottom: CLASSIC_DARK_BOTTOM,
    edgeGlowRgba: 'rgba(235, 226, 207, 0.42)',
    creamHorizontalStops: CAMP_EDGE_CREAM,
    creamVerticalStops: CAMP_EDGE_CREAM_V,
    bodyBackground: CLASSIC_BODY_BG,
    sideCardBackground: `linear-gradient(165deg, ${CLASSIC_DARK_TOP}, ${CLASSIC_DARK_BOTTOM})`,
    sideCardBorder: 'rgba(212, 168, 75, 0.22)',
    sideCardGlow: '0 0 14px rgba(235, 226, 207, 0.18), inset 0 0 0 1px rgba(235, 226, 207, 0.08)',
    playAiBg: 'rgba(20, 14, 10, 0.92)',
    playAiBorder: 'rgba(60, 45, 38, 0.55)',
    playHumanBg: 'rgba(76, 175, 80, 0.14)',
    playHumanBorder: 'rgba(114, 191, 119, 0.4)',
    playHumanAccent: '#4caf50',
    ...CLASSIC_BEADS,
  },
  '2': {
    id: '2',
    label: 'Warm parchment',
    surfaceTop: CLASSIC_DARK_TOP,
    surfaceBottom: CLASSIC_DARK_BOTTOM,
    edgeGlowRgba: 'rgba(230, 210, 170, 0.44)',
    creamHorizontalStops: WARM_PARCHMENT_CREAM_H,
    creamVerticalStops: WARM_PARCHMENT_CREAM_V,
    bodyBackground:
      'radial-gradient(ellipse at top, rgba(255,242,215,0.10), transparent 55%), radial-gradient(ellipse at top, #284b3d, transparent 60%), linear-gradient(165deg, #12281f, #0b1813)',
    sideCardBackground: `linear-gradient(165deg, ${WARM_SIDE_TOP}, ${WARM_SIDE_BOTTOM})`,
    sideCardBorder: 'rgba(230, 210, 170, 0.28)',
    sideCardGlow: '0 0 14px rgba(230, 210, 170, 0.18), inset 0 1px 0 rgba(255, 242, 215, 0.08), inset 0 -1px 0 rgba(255, 242, 215, 0.08)',
    playAiBg: 'rgba(22, 16, 12, 0.94)',
    playAiBorder: 'rgba(70, 55, 42, 0.55)',
    playHumanBg: 'rgba(255, 242, 215, 0.1)',
    playHumanBorder: 'rgba(212, 190, 150, 0.45)',
    playHumanAccent: '#c4a86a',
    ...CLASSIC_BEADS,
  },
  '3': {
    id: '3',
    label: 'Camp edge glow',
    surfaceTop: CLASSIC_DARK_TOP,
    surfaceBottom: CLASSIC_DARK_BOTTOM,
    edgeGlowRgba: 'rgba(255, 245, 220, 0.48)',
    creamHorizontalStops: CAMP_EDGE_CREAM,
    creamVerticalStops: CAMP_EDGE_CREAM_V,
    bodyBackground:
      'radial-gradient(ellipse at top, rgba(255,245,220,0.14), transparent 45%), radial-gradient(ellipse at bottom, rgba(255,245,220,0.12), transparent 45%), linear-gradient(165deg, #12281f, #0b1813)',
    sideCardBackground: `linear-gradient(165deg, ${CLASSIC_DARK_TOP}, ${CLASSIC_DARK_BOTTOM})`,
    sideCardBorder: 'rgba(212, 168, 75, 0.22)',
    sideCardGlow:
      '0 0 18px rgba(255, 245, 220, 0.28), inset 0 12px 20px -10px rgba(255, 245, 220, 0.18), inset 0 -12px 20px -10px rgba(255, 245, 220, 0.18)',
    playAiBg: 'rgba(18, 14, 10, 0.92)',
    playAiBorder: 'rgba(60, 45, 38, 0.55)',
    playHumanBg: 'linear-gradient(180deg, rgba(76, 175, 80, 0.08) 0%, rgba(255, 245, 220, 0.16) 100%)',
    playHumanBorder: 'rgba(255, 245, 220, 0.35)',
    playHumanAccent: '#4caf50',
    ...CLASSIC_BEADS,
  },
};

export function isPlayBoardMatchMode(value: string | null | undefined): value is PlayBoardMatchMode {
  return value === 'matched' || value === 'side-only';
}

export function readPlayBoardMatchMode(): PlayBoardMatchMode {
  if (typeof document === 'undefined') return 'side-only';
  const shell = document.getElementById('play-shell');
  const hub = document.getElementById('play-hub');
  const fromDom = shell?.getAttribute('data-play-board-match') ?? hub?.getAttribute('data-play-board-match');
  return isPlayBoardMatchMode(fromDom) ? fromDom : 'side-only';
}

/** Hub rails = side panel preview (always follows swatch). */
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

/** Hub centre = board area preview (classic green in side-only). */
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
    railBg: '#1a4030',
    text: '#e8f0ea',
    muted: '#9bb5a6',
    border: 'rgba(212, 168, 75, 0.22)',
    borderSoft: 'rgba(212, 168, 75, 0.12)',
    brand: '#72bf77',
    accent: '#4caf50',
    accentSoft: 'rgba(76, 175, 80, 0.14)',
    accentRing: 'rgba(114, 191, 119, 0.4)',
  },
  '2': {
    railBg: '#1c261e',
    text: '#eceae6',
    muted: '#b8a894',
    border: 'rgba(230, 210, 170, 0.28)',
    borderSoft: 'rgba(230, 210, 170, 0.14)',
    brand: '#e6d4a8',
    accent: '#c4a86a',
    accentSoft: 'rgba(255, 242, 215, 0.12)',
    accentRing: 'rgba(212, 190, 150, 0.45)',
  },
  '3': {
    railBg: '#123528',
    text: '#e8f0ea',
    muted: '#9bb5a6',
    border: 'rgba(212, 168, 75, 0.22)',
    borderSoft: 'rgba(255, 245, 220, 0.12)',
    brand: '#e5c158',
    accent: '#d4a84b',
    accentSoft: 'rgba(255, 245, 220, 0.16)',
    accentRing: 'rgba(255, 245, 220, 0.35)',
  },
};

export const HUB_CENTRE_PALETTES: Record<PlayShellThemeId, HubCentrePalette> = {
  '1': {
    pageBg: '#12281f',
    centreBg: '#1a3128',
    cardBg: '#1f4a38',
    cardHover: '#245542',
    centreText: '#faf9f7',
    centreMuted: '#a8a49c',
  },
  '2': {
    pageBg: '#12281f',
    centreBg: '#1c2a24',
    cardBg: '#234036',
    cardHover: '#2a4a3e',
    centreText: '#f5efe6',
    centreMuted: '#a89882',
  },
  '3': {
    pageBg: '#0b1813',
    centreBg: '#1a4030',
    cardBg: '#1f4a38',
    cardHover: '#245542',
    centreText: '#faf9f7',
    centreMuted: '#a8a49c',
  },
};

export function resolveHubCentrePalette(
  themeId: PlayShellThemeId,
  mode: PlayBoardMatchMode,
): HubCentrePalette {
  if (mode === 'matched') return HUB_CENTRE_PALETTES[themeId];
  return HUB_CENTRE_PALETTES['1'];
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

export interface BoardCanvasLook {
  surfaceTop: string;
  surfaceBottom: string;
  creamHorizontalStops: readonly CreamHalfStop[];
  creamVerticalStops: readonly CreamHalfStop[];
  edgeGlowRgba: string;
}

/** Board canvas — side-only is always snapshot green; matched applies the swatch to the board. */
export function resolveBoardCanvasLook(
  themeId: PlayShellThemeId,
  mode: PlayBoardMatchMode,
): BoardCanvasLook {
  const theme = getPlayShellTheme(themeId);
  const classic = getPlayShellTheme('1');
  if (mode === 'matched') {
    return {
      surfaceTop: theme.surfaceTop,
      surfaceBottom: theme.surfaceBottom,
      creamHorizontalStops: theme.creamHorizontalStops,
      creamVerticalStops: theme.creamVerticalStops,
      edgeGlowRgba: theme.edgeGlowRgba,
    };
  }
  return {
    surfaceTop: classic.surfaceTop,
    surfaceBottom: classic.surfaceBottom,
    creamHorizontalStops: classic.creamHorizontalStops,
    creamVerticalStops: classic.creamVerticalStops,
    edgeGlowRgba: classic.edgeGlowRgba,
  };
}

/** Page background for the active preview mode. Side panel chrome always follows themeId. */
export function resolvePlayShellPresentation(
  themeId: PlayShellThemeId,
  mode: PlayBoardMatchMode,
): Pick<PlayShellTheme, 'bodyBackground'> {
  const theme = getPlayShellTheme(themeId);
  const classic = getPlayShellTheme('1');
  if (mode === 'matched') return { bodyBackground: theme.bodyBackground };
  return { bodyBackground: classic.bodyBackground };
}

export const PLAY_BOARD_MATCH_RADIO_NAMES = ['hub-play-board-match', 'play-board-match'] as const;

export function syncBoardMatchRadios(boardMatch: PlayBoardMatchMode): void {
  if (typeof document === 'undefined') return;
  for (const name of PLAY_BOARD_MATCH_RADIO_NAMES) {
    for (const input of document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)) {
      input.checked = input.value === boardMatch;
    }
  }
}

export function syncThemeSwatchActive(themeId: PlayShellThemeId): void {
  if (typeof document === 'undefined') return;
  for (const rootId of ['hub-play-theme-setting', 'play-theme-setting'] as const) {
    const root = document.getElementById(rootId);
    if (!root) continue;
    for (const swatch of root.querySelectorAll<HTMLButtonElement>('.play-theme-swatch')) {
      swatch.classList.toggle('is-active', swatch.dataset.playTheme === themeId);
    }
  }
}

/** Hub + board share theme attrs, swatches, radios, storage, and page background. */
export function applySharedPlayTheme(
  themeId: PlayShellThemeId,
  boardMatch: PlayBoardMatchMode,
): void {
  if (typeof document === 'undefined') return;
  const hub = document.getElementById('play-hub');
  const shell = document.getElementById('play-shell');
  hub?.setAttribute('data-play-theme', themeId);
  hub?.setAttribute('data-play-board-match', boardMatch);
  shell?.setAttribute('data-play-theme', themeId);
  shell?.setAttribute('data-play-board-match', boardMatch);
  document.body.setAttribute('data-play-theme', themeId);
  document.body.setAttribute('data-play-board-match', boardMatch);
  syncThemeSwatchActive(themeId);
  syncBoardMatchRadios(boardMatch);
  if (hub) applyHubThemeCssVars(hub, themeId, boardMatch);
  if (shell) applyPlayShellThemeCssVars(shell, themeId, boardMatch);
  else if (hub && typeof document !== 'undefined') {
    document.body.style.background = resolvePlayShellPresentation(themeId, boardMatch).bodyBackground;
  }
  try {
    localStorage.setItem('sb-play-theme', themeId);
    localStorage.setItem('sb-play-board-match', boardMatch);
  } catch {
    /* storage unavailable */
  }
}

export function applyPlayShellThemeCssVars(
  shell: HTMLElement,
  themeId: PlayShellThemeId,
  mode: PlayBoardMatchMode = readPlayBoardMatchMode(),
): void {
  const theme = getPlayShellTheme(themeId);
  const presentation = resolvePlayShellPresentation(themeId, mode);
  shell.style.setProperty('--side-card-bg', theme.sideCardBackground);
  shell.style.setProperty('--side-card-border', theme.sideCardBorder);
  shell.style.setProperty('--side-card-glow', theme.sideCardGlow);
  shell.style.setProperty('--play-ai-bg', theme.playAiBg);
  shell.style.setProperty('--play-ai-border', theme.playAiBorder);
  shell.style.setProperty('--play-human-bg', theme.playHumanBg);
  shell.style.setProperty('--play-human-border', theme.playHumanBorder);
  shell.style.setProperty('--play-human-accent', theme.playHumanAccent);
  if (typeof document !== 'undefined') {
    document.body.style.background = presentation.bodyBackground;
  }
}

export function isPlayShellThemeId(value: string | null | undefined): value is PlayShellThemeId {
  return value === '1' || value === '2' || value === '3';
}

export function getPlayShellTheme(id: PlayShellThemeId): PlayShellTheme {
  return PLAY_SHELL_THEMES[id];
}

export function readPlayShellThemeId(): PlayShellThemeId {
  if (typeof document === 'undefined') return '1';
  const shell = document.getElementById('play-shell');
  const fromDom = shell?.getAttribute('data-play-theme');
  if (isPlayShellThemeId(fromDom)) return fromDom;
  return '1';
}
