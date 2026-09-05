/**
 * One continuous Coach video — slide, single capture, double capture on 6×3×5.
 * Each segment: 3 cream + 3 black beads, 5s settle, labelled voice, then demo move.
 */

import type { Player } from '../../../models/GameState';
import type { CenterRule, GameFeatureSettings, MatchTimerMinutes, ShotClockSeconds } from './GameFeatureSettings';

export const COACH_VIDEO_BOARD_ID = '6x3x5' as const;

/** ~48s — three segments with 5s settle + voice before each demo. */
export const COACH_VIDEO_DURATION_MS = 48_000;

/** @deprecated use COACH_VIDEO_BOARD_ID */
export const COACH_LESSON_BOARD_ID = COACH_VIDEO_BOARD_ID;

export interface CoachVideoKeyframe {
  atMs: number;
  occupants: readonly (Player | undefined)[];
  captures: { RED: number; BLUE: number };
  currentPlayer: Player;
  chainPieceId: number | null;
}

export interface CoachVideoMove {
  atMs: number;
  from: number;
  to: number;
  player: Player;
}

export interface CoachVideoSpeech {
  atMs: number;
  text: string;
}

export interface CoachVideoScript {
  boardId: typeof COACH_VIDEO_BOARD_ID;
  durationMs: number;
  title: string;
  intro: string;
  points: string[];
  keyframes: CoachVideoKeyframe[];
  moves: CoachVideoMove[];
  speeches: CoachVideoSpeech[];
}

function occ15(): (Player | undefined)[] {
  return Array.from({ length: 15 }, () => undefined);
}

function withOcc(pairs: readonly [number, Player][]): (Player | undefined)[] {
  const o = occ15();
  for (const [id, player] of pairs) o[id] = player;
  return o;
}

/** Standard coach layout: three black (top) and three cream (bottom). */
const SLIDE_SETUP = withOcc([
  [0, 'BLUE'], [1, 'BLUE'], [2, 'BLUE'],
  [11, 'RED'], [13, 'RED'], [14, 'RED'],
]);

const SLIDE_POST = withOcc([
  [0, 'BLUE'], [1, 'BLUE'], [2, 'BLUE'],
  [11, 'RED'], [10, 'RED'], [14, 'RED'],
]);

const CAPTURE_SETUP = withOcc([
  [0, 'BLUE'], [2, 'BLUE'], [8, 'BLUE'],
  [11, 'RED'], [13, 'RED'], [14, 'RED'],
]);

const CAPTURE_POST = withOcc([
  [0, 'BLUE'], [2, 'BLUE'],
  [5, 'RED'], [13, 'RED'], [14, 'RED'],
]);

const DOUBLE_SETUP = withOcc([
  [0, 'BLUE'], [6, 'BLUE'], [10, 'BLUE'],
  [11, 'RED'], [13, 'RED'], [14, 'RED'],
]);

const DOUBLE_MID = withOcc([
  [0, 'BLUE'], [6, 'BLUE'],
  [9, 'RED'], [13, 'RED'], [14, 'RED'],
]);

const DOUBLE_POST = withOcc([
  [0, 'BLUE'],
  [3, 'RED'], [13, 'RED'], [14, 'RED'],
]);

/** Segment boundary times (ms) — used for replay-voice and panel segment lookup. */
export const COACH_VIDEO_SEGMENT_STARTS_MS = [0, 15_000, 30_000] as const;

export const COACH_VIDEO: CoachVideoScript = {
  boardId: COACH_VIDEO_BOARD_ID,
  durationMs: COACH_VIDEO_DURATION_MS,
  title: 'How to play',
  intro: 'Three cream beads vs three black. Watch each skill in turn.',
  points: [
    'Move — slide one step to an empty node.',
    'Single capture — jump over a neighbour bead.',
    'Double capture — the same bead jumps twice.',
  ],
  keyframes: [
    {
      atMs: 0,
      occupants: SLIDE_SETUP,
      captures: { RED: 0, BLUE: 0 },
      currentPlayer: 'RED',
      chainPieceId: null,
    },
    {
      atMs: 13_500,
      occupants: SLIDE_POST,
      captures: { RED: 0, BLUE: 0 },
      currentPlayer: 'RED',
      chainPieceId: null,
    },
    {
      atMs: 15_000,
      occupants: CAPTURE_SETUP,
      captures: { RED: 0, BLUE: 0 },
      currentPlayer: 'RED',
      chainPieceId: null,
    },
    {
      atMs: 28_500,
      occupants: CAPTURE_POST,
      captures: { RED: 1, BLUE: 0 },
      currentPlayer: 'RED',
      chainPieceId: null,
    },
    {
      atMs: 30_000,
      occupants: DOUBLE_SETUP,
      captures: { RED: 0, BLUE: 0 },
      currentPlayer: 'RED',
      chainPieceId: null,
    },
    {
      atMs: 41_000,
      occupants: DOUBLE_MID,
      captures: { RED: 1, BLUE: 0 },
      currentPlayer: 'RED',
      chainPieceId: 9,
    },
    {
      atMs: 46_500,
      occupants: DOUBLE_POST,
      captures: { RED: 2, BLUE: 0 },
      currentPlayer: 'RED',
      chainPieceId: null,
    },
  ],
  moves: [
    { atMs: 10_000, from: 13, to: 10, player: 'RED' },
    { atMs: 25_000, from: 11, to: 5, player: 'RED' },
    { atMs: 40_000, from: 11, to: 9, player: 'RED' },
    { atMs: 43_000, from: 9, to: 3, player: 'RED' },
  ],
  speeches: [
    {
      atMs: 5_000,
      text: 'Move. Slide one step along a line to an empty node.',
    },
    {
      atMs: 20_000,
      text: 'Single capture. Jump over the neighbour bead onto the empty node beyond.',
    },
    {
      atMs: 35_000,
      text: 'Double capture. The same bead can jump again for a second capture.',
    },
  ],
};

export function findCoachKeyframeAt(ms: number, keyframes: readonly CoachVideoKeyframe[], moves: readonly CoachVideoMove[] = []): CoachVideoKeyframe {
  const candidates: CoachVideoKeyframe[] = [keyframes[0]];
  for (const kf of keyframes) {
    if (kf.atMs <= ms) candidates.push(kf);
  }
  for (const move of moves) {
    if (move.atMs <= ms) {
      const post = keyframes.find((kf) => kf.atMs > move.atMs);
      if (post) candidates.push(post);
    }
  }
  return candidates.reduce((best, kf) => (kf.atMs >= best.atMs ? kf : best));
}

export function findCoachSetupKeyframeForMove(
  move: CoachVideoMove,
  keyframes: readonly CoachVideoKeyframe[],
  moves: readonly CoachVideoMove[],
): CoachVideoKeyframe {
  return findCoachKeyframeAt(Math.max(0, move.atMs - 1), keyframes, moves);
}

export function coachSpeechForTime(ms: number, script: CoachVideoScript = COACH_VIDEO): string {
  if (ms < COACH_VIDEO_SEGMENT_STARTS_MS[1]) return script.speeches[0].text;
  if (ms < COACH_VIDEO_SEGMENT_STARTS_MS[2]) return script.speeches[1].text;
  return script.speeches[2].text;
}

export function formatCoachTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export interface CoachLessonStepSettings {
  centerRule?: CenterRule;
  matchTimer?: MatchTimerMinutes;
  shotClock?: ShotClockSeconds;
}

export function buildCoachLessonSettings(
  stepSettings: CoachLessonStepSettings = {},
): GameFeatureSettings {
  return {
    mode: 'coach',
    aiLevel: 1,
    centerRule: stepSettings.centerRule ?? 'off',
    matchTimer: stepSettings.matchTimer ?? 'off',
    shotClock: stepSettings.shotClock ?? 'off',
  };
}
