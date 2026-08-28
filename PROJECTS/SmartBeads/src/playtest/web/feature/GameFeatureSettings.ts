/** Shared match settings for production play shell. */

export type GameMode = 'pve' | 'pvp';
export type CenterRule = 'off' | 'endgame' | 'cumulative';
/** Minutes per side (PvP) or shared match budget (PvE). Values are string digits or off. */
export type MatchTimerMinutes = 'off' | '3' | '5' | '10' | '15' | '20' | '25' | '30' | '35';
/** Seconds per turn when enabled. */
export type ShotClockSeconds = 'off' | '30' | '60' | '90' | '120';
export type AiLevel = 1 | 2 | 3;

export interface GameFeatureSettings {
  mode: GameMode;
  aiLevel: AiLevel;
  matchTimer: MatchTimerMinutes;
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

export function parseShotLimit(shotClock: ShotClockSeconds): number {
  return shotClock === 'off' ? 0 : parseInt(shotClock, 10);
}

export function parseMatchSeconds(matchTimer: MatchTimerMinutes): number {
  return matchTimer === 'off' ? 0 : parseInt(matchTimer, 10) * 60;
}

export function formatMatchTimerLabel(value: MatchTimerMinutes): string {
  return value === 'off' ? 'Off' : `${value} min`;
}

export function formatShotClockLabel(value: ShotClockSeconds): string {
  return value === 'off' ? 'Off' : `${value} sec`;
}

export function formatCenterRuleLabel(rule: CenterRule): string {
  if (rule === 'off') return 'Off';
  if (rule === 'endgame') return 'End-Game';
  return 'Cumulative';
}

/** Player-facing AI difficulty names (values 1–3 unchanged in settings). */
export function formatAiLevelLabel(level: AiLevel): string {
  if (level === 1) return 'Casual';
  if (level === 2) return 'Standard';
  return 'Expert';
}
