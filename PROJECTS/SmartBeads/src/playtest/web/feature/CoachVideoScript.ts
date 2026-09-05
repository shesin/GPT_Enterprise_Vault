/**
 * Video 1 — Basics on 7-bead · 4×5 (~2 min).
 * Three slides, three single captures, double chain, triple chain.
 * Ends when the triple capture completes. Amber/lime highlights before each scripted move.
 */

import type { ProductBoardId } from '../../../config/BoardCatalog';
import type { Player } from '../../../models/GameState';
import type { CenterRule, GameFeatureSettings, MatchTimerMinutes, ShotClockSeconds } from './GameFeatureSettings';

export const COACH_VIDEO_BOARD_ID = '7x4x5' as const satisfies ProductBoardId;

/** ~2:00 — ends when the triple capture completes. */
export const COACH_VIDEO_DURATION_MS = 120_000;

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
  /** Board snapshot immediately before this move (explicit setup keyframe time). */
  setupAtMs: number;
}

export interface CoachVideoSpeech {
  atMs: number;
  text: string;
}

/** Show cream bead selected + amber legal targets (like live play). */
export interface CoachVideoHighlight {
  atMs: number;
  keyframeAtMs: number;
  selectedId: number;
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
  highlights: CoachVideoHighlight[];
}

function occ20(): (Player | undefined)[] {
  return Array.from({ length: 20 }, () => undefined);
}

function withOcc(pairs: readonly [number, Player][]): (Player | undefined)[] {
  const o = occ20();
  for (const [id, player] of pairs) o[id] = player;
  return o;
}

function kf(
  atMs: number,
  pairs: readonly [number, Player][],
  captures: { RED: number; BLUE: number } = { RED: 0, BLUE: 0 },
  chainPieceId: number | null = null,
): CoachVideoKeyframe {
  return {
    atMs,
    occupants: withOcc(pairs),
    captures,
    currentPlayer: 'RED',
    chainPieceId,
  };
}

/** Segment starts for replay-voice lookup. */
export const COACH_VIDEO_SEGMENT_STARTS_MS = [0, 36_000, 72_000, 94_000] as const;

const ANCHOR: readonly [number, Player][] = [[15, 'BLUE'], [19, 'BLUE']];

export const COACH_VIDEO: CoachVideoScript = {
  boardId: COACH_VIDEO_BOARD_ID,
  durationMs: COACH_VIDEO_DURATION_MS,
  title: 'How to play',
  intro: '7-bead board. Watch three moves, three captures, then double and triple chain. Likewise you can capture four, five, or more beads in one turn while the chain stays open.',
  points: [
    'Move — slide one step to an empty node.',
    'Single capture — jump over one neighbour bead.',
    'Double capture — same bead jumps twice.',
    'Triple capture — same bead jumps three times; likewise four, five, or more while the chain stays open.',
  ],
  keyframes: [
    kf(0, [[12, 'RED'], [16, 'RED'], [17, 'RED'], ...ANCHOR]),
    kf(14_500, [[8, 'RED'], [16, 'RED'], [17, 'RED'], ...ANCHOR]),
    kf(15_000, [[16, 'RED'], [17, 'RED'], [18, 'RED'], ...ANCHOR]),
    kf(24_500, [[12, 'RED'], [17, 'RED'], [18, 'RED'], ...ANCHOR]),
    kf(25_000, [[17, 'RED'], [16, 'RED'], [12, 'RED'], ...ANCHOR]),
    kf(34_500, [[13, 'RED'], [16, 'RED'], [12, 'RED'], ...ANCHOR]),
    kf(36_000, [[12, 'RED'], [8, 'BLUE'], [16, 'RED'], [17, 'RED'], [19, 'BLUE']]),
    kf(50_500, [[4, 'RED'], [16, 'RED'], [17, 'RED'], [19, 'BLUE']], { RED: 1, BLUE: 0 }),
    kf(51_000, [[8, 'RED'], [5, 'BLUE'], [16, 'RED'], [17, 'RED'], [19, 'BLUE']]),
    kf(65_500, [[2, 'RED'], [16, 'RED'], [17, 'RED'], [19, 'BLUE']], { RED: 1, BLUE: 0 }),
    kf(63_000, [[17, 'RED'], [13, 'BLUE'], [16, 'RED'], [12, 'RED'], [19, 'BLUE']]),
    kf(80_500, [[9, 'RED'], [16, 'RED'], [12, 'RED'], [19, 'BLUE']], { RED: 1, BLUE: 0 }),
    kf(72_000, [[12, 'RED'], [8, 'BLUE'], [5, 'BLUE'], [16, 'RED'], [19, 'BLUE']]),
    kf(84_500, [[4, 'RED'], [5, 'BLUE'], [16, 'RED'], [19, 'BLUE']], { RED: 1, BLUE: 0 }, 4),
    kf(92_500, [[6, 'RED'], [16, 'RED'], [19, 'BLUE']], { RED: 2, BLUE: 0 }),
    kf(94_000, [[12, 'RED'], [8, 'BLUE'], [5, 'BLUE'], [10, 'BLUE'], [16, 'RED'], [19, 'BLUE']]),
    kf(106_500, [[4, 'RED'], [5, 'BLUE'], [10, 'BLUE'], [16, 'RED'], [19, 'BLUE']], { RED: 1, BLUE: 0 }, 4),
    kf(110_500, [[6, 'RED'], [10, 'BLUE'], [16, 'RED'], [19, 'BLUE']], { RED: 2, BLUE: 0 }, 6),
    kf(117_000, [[14, 'RED'], [16, 'RED'], [19, 'BLUE']], { RED: 3, BLUE: 0 }),
  ],
  speeches: [
    { atMs: 5_000, text: 'Move. Slide one step along a line to an empty node.' },
    { atMs: 41_000, text: 'Single capture. Jump over one neighbour onto the empty node beyond.' },
    { atMs: 77_000, text: 'Double capture. The same bead can jump again for a second capture.' },
    {
      atMs: 99_000,
      text: 'Triple capture. The same bead can keep jumping while captures stay open. Likewise you can capture four, five, or more beads in one turn.',
    },
  ],
  highlights: [
    { atMs: 8_000, keyframeAtMs: 0, selectedId: 12 },
    { atMs: 18_000, keyframeAtMs: 15_000, selectedId: 16 },
    { atMs: 28_000, keyframeAtMs: 25_000, selectedId: 17 },
    { atMs: 44_000, keyframeAtMs: 36_000, selectedId: 12 },
    { atMs: 54_000, keyframeAtMs: 51_000, selectedId: 8 },
    { atMs: 64_000, keyframeAtMs: 63_000, selectedId: 17 },
    { atMs: 80_000, keyframeAtMs: 72_000, selectedId: 12 },
    { atMs: 86_000, keyframeAtMs: 84_500, selectedId: 4 },
    { atMs: 102_000, keyframeAtMs: 94_000, selectedId: 12 },
    { atMs: 108_000, keyframeAtMs: 106_500, selectedId: 4 },
    { atMs: 112_000, keyframeAtMs: 110_500, selectedId: 6 },
  ],
  moves: [
    { atMs: 11_000, setupAtMs: 0, from: 12, to: 8, player: 'RED' },
    { atMs: 21_000, setupAtMs: 15_000, from: 16, to: 12, player: 'RED' },
    { atMs: 31_000, setupAtMs: 25_000, from: 17, to: 13, player: 'RED' },
    { atMs: 47_000, setupAtMs: 36_000, from: 12, to: 4, player: 'RED' },
    { atMs: 57_000, setupAtMs: 51_000, from: 8, to: 2, player: 'RED' },
    { atMs: 67_000, setupAtMs: 63_000, from: 17, to: 9, player: 'RED' },
    { atMs: 83_000, setupAtMs: 72_000, from: 12, to: 4, player: 'RED' },
    { atMs: 89_000, setupAtMs: 84_500, from: 4, to: 6, player: 'RED' },
    { atMs: 105_000, setupAtMs: 94_000, from: 12, to: 4, player: 'RED' },
    { atMs: 109_000, setupAtMs: 106_500, from: 4, to: 6, player: 'RED' },
    { atMs: 113_000, setupAtMs: 110_500, from: 6, to: 14, player: 'RED' },
  ],
};

export function findCoachKeyframeAt(
  ms: number,
  keyframes: readonly CoachVideoKeyframe[],
  moves: readonly CoachVideoMove[] = [],
): CoachVideoKeyframe {
  const candidates: CoachVideoKeyframe[] = [keyframes[0]];
  for (const kfEntry of keyframes) {
    if (kfEntry.atMs <= ms) candidates.push(kfEntry);
  }
  for (const move of moves) {
    if (move.atMs <= ms) {
      const post = keyframes.find((entry) => entry.atMs > move.atMs);
      if (post) candidates.push(post);
    }
  }
  return candidates.reduce((best, entry) => (entry.atMs >= best.atMs ? entry : best));
}

export function findCoachKeyframeByTime(
  atMs: number,
  keyframes: readonly CoachVideoKeyframe[],
): CoachVideoKeyframe {
  let best = keyframes[0];
  for (const entry of keyframes) {
    if (entry.atMs <= atMs && entry.atMs >= best.atMs) best = entry;
  }
  return best;
}

export function findCoachSetupKeyframeForMove(
  move: CoachVideoMove,
  keyframes: readonly CoachVideoKeyframe[],
  moves: readonly CoachVideoMove[],
): CoachVideoKeyframe {
  return findCoachKeyframeByTime(move.setupAtMs, keyframes);
}

export function coachSpeechForTime(ms: number, script: CoachVideoScript = COACH_VIDEO): string {
  if (ms < COACH_VIDEO_SEGMENT_STARTS_MS[1]) return script.speeches[0].text;
  if (ms < COACH_VIDEO_SEGMENT_STARTS_MS[2]) return script.speeches[1].text;
  if (ms < COACH_VIDEO_SEGMENT_STARTS_MS[3]) return script.speeches[2].text;
  return script.speeches[3].text;
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
