/** Shared match settings for production play shell. */

import type { ProductBoardId } from '../../../config/BoardCatalog';
import { getCatalogEntry } from '../../../config/BoardCatalog';
import type { Player } from '../../../models/GameState';

export type GameMode = 'pve' | 'pvp' | 'spectate' | 'coach';

/** Human (cream) vs AI — includes interactive Coach lessons. */
export function isHumanVsAiMode(mode: GameMode): boolean {
  return mode === 'pve' || mode === 'coach';
}
export type CenterRule = 'off' | 'endgame' | 'cumulative';
/** Shared game timer (minutes) or off. */
export type TimerMinutes = 'off' | '3' | '5' | '10' | '15' | '20' | '25' | '30' | '35';
/** @deprecated use TimerMinutes */
export type MatchTimerMinutes = TimerMinutes;
/** Seconds per turn when enabled. */
export type ShotClockSeconds = 'off' | '30' | '60' | '90' | '120';
export type AiLevel = 1 | 2 | 3 | 4 | 5;

/** Default coach-watch board (8-bead · 4×6). */
export const COACH_DEFAULT_BOARD_ID = '8x4x6' as const;
/** @deprecated use COACH_DEFAULT_BOARD_ID */
export const SPECTATE_BOARD_ID = COACH_DEFAULT_BOARD_ID;
/** Pause after each animated move completes (ms) — 10+ bead boards. */
export const SPECTATE_INTER_MOVE_DELAY_MS = 10_000;
/** Watch AI vs AI — 6-, 7-, and 8-bead boards. */
export const SPECTATE_INTER_MOVE_DELAY_SMALL_BOARD_MS = 5_000;

export function spectateInterMoveDelayMs(boardId: ProductBoardId): number {
  const beadCount = getCatalogEntry(boardId)?.beadCount;
  if (beadCount !== undefined && beadCount <= 8) {
    return SPECTATE_INTER_MOVE_DELAY_SMALL_BOARD_MS;
  }
  return SPECTATE_INTER_MOVE_DELAY_MS;
}
/** Coach vs AI: amber select + legal targets before each automated hop (ms). */
export const COACH_MOVE_PREVIEW_MS = 450;

export interface GameFeatureSettings {
  mode: GameMode;
  aiLevel: AiLevel;
  /** Coach watch: cream-side AI (RED). Ignored outside spectate mode. */
  coachRedLevel?: AiLevel;
  /** Coach watch: black-side AI (BLUE). Ignored outside spectate mode. */
  coachBlueLevel?: AiLevel;
  /** Shared timer — expiry uses captures → centre → beads on board. */
  timer: TimerMinutes;
  /** Human vs Human only — per-player chess clocks; centre off; flag fall = loss. */
  tournamentTimer: TimerMinutes;
  shotClock: ShotClockSeconds;
  centerRule: CenterRule;
}

export interface BgmTrack {
  label: string;
  url: string;
}

/** Same track list as SHOLO_GUTI_WITH_FEATURE.html */
export const BGM_TRACKS: BgmTrack[] = [
  { label: 'Bubble Gum Puzzler', url: 'http://soundimage.org/wp-content/uploads/2017/08/Bubble-Gum-Puzzler.mp3' },
  { label: 'Bubble Gum Puzzler 2', url: 'http://soundimage.org/wp-content/uploads/2017/08/Bubble-Gum-Puzzler-2.mp3' },
  { label: 'Cool Puzzler', url: 'http://soundimage.org/wp-content/uploads/2017/07/Cool-Puzzler.mp3' },
  { label: 'Sky Puzzle', url: 'http://soundimage.org/wp-content/uploads/2017/06/Sky-Puzzle.mp3' },
  { label: 'Mind Bender', url: 'http://soundimage.org/wp-content/uploads/2017/06/Mind-Bender.mp3' },
  { label: 'Puzzle Dreams', url: 'http://soundimage.org/wp-content/uploads/2017/05/Puzzle-Dreams.mp3' },
  { label: 'Puzzle Dreams 3', url: 'http://soundimage.org/wp-content/uploads/2017/05/Puzzle-Dreams-3.mp3' },
  { label: 'Mysterious Puzzle', url: 'http://soundimage.org/wp-content/uploads/2014/10/Mysterious-Puzzle.mp3' },
  { label: '8-Bit Puzzler', url: 'http://soundimage.org/wp-content/uploads/2017/03/8-Bit-Puzzler.mp3' },
  { label: 'Puzzle Game 5', url: 'http://soundimage.org/wp-content/uploads/2014/12/Puzzle-Game-5.mp3' },
  { label: 'Happy Puzzler', url: 'http://soundimage.org/wp-content/uploads/2017/09/Happy-Puzzler.mp3' },
  { label: 'Puzzle Action', url: 'http://soundimage.org/wp-content/uploads/2017/08/Puzzle-Action.mp3' },
  { label: 'Puzzle Technica', url: 'https://soundimage.org/wp-content/uploads/2021/11/Puzzle-Technica.mp3' },
  { label: "Cool Puzzle Groovin' 2", url: 'https://soundimage.org/wp-content/uploads/2021/08/Cool-Puzzle-Groovin-2.mp3' },
  { label: 'Quirky Quarks', url: 'https://soundimage.org/wp-content/uploads/2021/08/Quirky-Quarks.mp3' },
  { label: 'Drifting Things', url: 'http://soundimage.org/wp-content/uploads/2018/01/Drifting-Things.mp3' },
  { label: 'Wind Up Things', url: 'http://soundimage.org/wp-content/uploads/2018/01/Wind-Up-Things.mp3' },
  { label: 'Carnival Games', url: 'http://soundimage.org/wp-content/uploads/2018/07/Carnival-Games.mp3' },
  { label: 'Far Away Puzzle Places', url: 'http://soundimage.org/wp-content/uploads/2018/07/Far-Away-Puzzle-Places.mp3' },
  { label: 'Thought Puzzles', url: 'http://soundimage.org/wp-content/uploads/2017/09/Thought-Puzzles.mp3' },
];

/** Shipped default BGM — Cool Puzzle Groovin' 2 @ 30% volume. */
export const DEFAULT_BGM_LABEL = "Cool Puzzle Groovin' 2";
export const DEFAULT_BGM_VOLUME = 0.3;

export function getDefaultBgmTrack(): BgmTrack {
  return BGM_TRACKS.find((t) => t.label === DEFAULT_BGM_LABEL) ?? BGM_TRACKS[0];
}

export function parseShotLimit(shotClock: ShotClockSeconds): number {
  return shotClock === 'off' ? 0 : parseInt(shotClock, 10);
}

export function parseTimerSeconds(timer: TimerMinutes): number {
  return timer === 'off' ? 0 : parseInt(timer, 10) * 60;
}

/** @deprecated use parseTimerSeconds */
export const parseMatchSeconds = parseTimerSeconds;

export function formatTimerLabel(value: TimerMinutes): string {
  return value === 'off' ? 'Off' : `${value} min`;
}

/** @deprecated use formatTimerLabel */
export const formatMatchTimerLabel = formatTimerLabel;

/** Settings dropdown — recommended option shows e.g. `20 (best)`. */
export function formatTimerOptionLabel(
  value: TimerMinutes,
  best?: TimerMinutes,
): string {
  if (value === 'off') return 'Off';
  if (best && value === best) return `${value} (best)`;
  return `${value} min`;
}

/** @deprecated use formatTimerOptionLabel */
export const formatMatchTimerOptionLabel = formatTimerOptionLabel;

export function isTournamentTimerActive(settings: GameFeatureSettings): boolean {
  return settings.mode === 'pvp' && parseTimerSeconds(settings.tournamentTimer) > 0;
}

export function isSharedTimerActive(settings: GameFeatureSettings): boolean {
  return parseTimerSeconds(settings.timer) > 0 && !isTournamentTimerActive(settings);
}

export function effectiveCenterRule(settings: GameFeatureSettings): CenterRule {
  if (isTournamentTimerActive(settings)) return 'off';
  return settings.centerRule;
}

/** Timer and tournament timer are mutually exclusive; tournament forces centre off. */
export function normalizeTimerSettings(settings: GameFeatureSettings): GameFeatureSettings {
  let next = { ...settings };
  if (next.mode !== 'pvp') {
    next.tournamentTimer = 'off';
  }
  if (isTournamentTimerActive(next)) {
    return { ...next, timer: 'off', centerRule: 'off' };
  }
  if (parseTimerSeconds(next.timer) > 0) {
    return { ...next, tournamentTimer: 'off' };
  }
  return next;
}

export function formatShotClockLabel(value: ShotClockSeconds): string {
  return value === 'off' ? 'Off' : `${value} sec`;
}

/** Settings dropdown — recommended option shows e.g. `120 (best)`. */
export function formatShotClockOptionLabel(
  value: ShotClockSeconds,
  best?: ShotClockSeconds,
): string {
  if (value === 'off') return 'Off';
  if (best && value === best) return `${value} (best)`;
  return `${value} sec`;
}

export function formatCenterRuleLabel(rule: CenterRule): string {
  if (rule === 'off') return 'Off';
  if (rule === 'endgame') return 'End-Game';
  return 'Cumulative';
}

/** Shipped UI — Human vs AI and coach watch both offer levels 1–3 only. */
export const MAX_UI_AI_LEVEL = 3 as const;
export const HUMAN_PVE_MAX_AI_LEVEL = MAX_UI_AI_LEVEL;
export const COACH_MAX_AI_LEVEL = MAX_UI_AI_LEVEL;

/** Player-facing AI difficulty names (UI levels 1–3). */
export function formatAiLevelLabel(level: AiLevel): string {
  if (level === 1) return 'Casual';
  if (level === 2) return 'Standard';
  if (level === 3) return 'Expert';
  if (level === 4) return 'Super Expert';
  return 'Super Expert+';
}

export function clampUiAiLevel(raw: number): AiLevel {
  const n = Number.isFinite(raw) ? Math.round(raw) : 2;
  return Math.min(MAX_UI_AI_LEVEL, Math.max(1, n)) as AiLevel;
}

export function aiLevelForActingPlayer(settings: GameFeatureSettings, player: Player): AiLevel {
  if (settings.mode === 'spectate') {
    return player === 'RED'
      ? clampUiAiLevel(settings.coachRedLevel ?? 3)
      : clampUiAiLevel(settings.coachBlueLevel ?? 2);
  }
  return clampUiAiLevel(settings.aiLevel);
}

export function buildCoachWatchSettings(
  overrides: Partial<GameFeatureSettings> = {},
): GameFeatureSettings {
  return {
    mode: 'spectate',
    aiLevel: 3,
    coachRedLevel: 3,
    coachBlueLevel: 2,
    timer: 'off',
    tournamentTimer: 'off',
    shotClock: 'off',
    centerRule: 'off',
    ...overrides,
  };
}

/** @deprecated use buildCoachWatchSettings */
export function buildSpectateSettings(
  overrides: Partial<GameFeatureSettings> = {},
): GameFeatureSettings {
  return buildCoachWatchSettings(overrides);
}

export function formatAiLevelSelectOption(level: AiLevel, numericLabels = false): string {
  return numericLabels ? String(level) : formatAiLevelLabel(level);
}

export function populateAiLevelSelect(
  select: HTMLSelectElement,
  maxLevel: AiLevel,
  selected?: AiLevel,
  numericLabels = false,
): void {
  select.innerHTML = '';
  for (let level = 1; level <= maxLevel; level += 1) {
    const opt = document.createElement('option');
    const lv = level as AiLevel;
    opt.value = String(lv);
    opt.textContent = formatAiLevelSelectOption(lv, numericLabels);
    if (selected !== undefined && lv === selected) opt.selected = true;
    select.appendChild(opt);
  }
}
