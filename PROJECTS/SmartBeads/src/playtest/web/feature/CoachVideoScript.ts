/**
 * Video 1 — Basics on 7-bead · 4×5 (~1:57 total).
 * Voice fires when each demo move starts; ending modals are watch-only snapshots.
 */

import type { ProductBoardId } from '../../../config/BoardCatalog';
import type { Player } from '../../../models/GameState';
import type { CenterRule, GameFeatureSettings, MatchTimerMinutes, ShotClockSeconds } from './GameFeatureSettings';

export const COACH_VIDEO_BOARD_ID = '7x4x5' as const satisfies ProductBoardId;

/** Basics (moves + captures) end before win/draw/resign appendix. */
export const COACH_VIDEO_BASICS_END_MS = 56_220;

/** Pause after each slide demo before the next highlight or segment banner. */
export const COACH_POST_DEMO_PAUSE_MS = 3_000;

/** Win waits until triple voice finishes + post pause (see CoachVideoPlayer win gate). */
export const COACH_VIDEO_TRIPLE_DEMO_MS = 54_100;

export const COACH_VIDEO_TRIPLE_SPEECH_TEXT =
  'Triple capture. The same bead can keep jumping while captures stay open. Likewise you can capture four, five, or more beads in one turn while the chain stays open.';

export function estimateCoachSpeechMs(text: string, rate = 0.92): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil((words / (2.4 * rate)) * 1000);
}

export const COACH_VIDEO_TRIPLE_SPEECH_ESTIMATE_MS = estimateCoachSpeechMs(COACH_VIDEO_TRIPLE_SPEECH_TEXT);

/** Earliest win segment — playback may hold here until triple voice ends + 3 s. */
export const COACH_VIDEO_WIN_SEGMENT_START_MS =
  COACH_VIDEO_TRIPLE_DEMO_MS + COACH_VIDEO_TRIPLE_SPEECH_ESTIMATE_MS + COACH_POST_DEMO_PAUSE_MS;

export const COACH_WIN_SPEECH_TEXT =
  'Win. Capture all opponent beads to win. If your opponent captures all of yours, they win.';

export const COACH_WIN_SPEECH_ESTIMATE_MS = estimateCoachSpeechMs(COACH_WIN_SPEECH_TEXT);

/** Win demo: glowing board (10 s max) then congratulations modal (6 s). */
export const COACH_WIN_BOARD_PHASE_MS = 10_000;
export const COACH_WIN_CONGRATS_PHASE_MS = 6_000;

export const COACH_WIN_SEGMENT_DURATION_MS =
  COACH_WIN_BOARD_PHASE_MS + COACH_WIN_CONGRATS_PHASE_MS + 1_000;

export const COACH_WIN_CONGRATS_CUE_MS = COACH_VIDEO_WIN_SEGMENT_START_MS + COACH_WIN_BOARD_PHASE_MS;

export const COACH_VIDEO_RESIGN_SEGMENT_START_MS =
  COACH_VIDEO_WIN_SEGMENT_START_MS + COACH_WIN_SEGMENT_DURATION_MS;

export const COACH_RESIGN_SPEECH_TEXT =
  'Resign. If a player resigns and the opponent declines, the resigning player loses. If the opponent agrees, it is a draw.';

export const COACH_RESIGN_DECLINED_CONGRATS_SPEECH =
  'Black bead won as white bead resign got declined.';

export const COACH_RESIGN_SPEECH_ESTIMATE_MS = estimateCoachSpeechMs(COACH_RESIGN_SPEECH_TEXT);

export const COACH_RESIGN_MODAL_PHASE_MS = 3_000;

export const COACH_RESIGN_CONGRATS_PHASE_MS = Math.max(
  COACH_RESIGN_MODAL_PHASE_MS,
  estimateCoachSpeechMs(COACH_RESIGN_DECLINED_CONGRATS_SPEECH),
);

/** Glow below-board when intro says "Resign." */
export const COACH_RESIGN_UI_START_MS = COACH_VIDEO_RESIGN_SEGMENT_START_MS + 300;

export const COACH_RESIGN_CLOSE_UI_MS =
  COACH_RESIGN_UI_START_MS + COACH_RESIGN_MODAL_PHASE_MS;

/** Beat after intro voice before congrats modal. */
export const COACH_RESIGN_POST_INTRO_MS = 500;

export const COACH_RESIGN_DECLINE_CONGRATS_MS =
  COACH_VIDEO_RESIGN_SEGMENT_START_MS
  + COACH_RESIGN_SPEECH_ESTIMATE_MS
  + COACH_RESIGN_POST_INTRO_MS;

export const COACH_RESIGN_SEGMENT_DURATION_MS =
  COACH_RESIGN_SPEECH_ESTIMATE_MS
  + COACH_RESIGN_POST_INTRO_MS
  + COACH_RESIGN_CONGRATS_PHASE_MS
  + 1_000;

/** Total timeline length (ending appendix included). */
export const COACH_VIDEO_DURATION_MS =
  COACH_VIDEO_RESIGN_SEGMENT_START_MS + COACH_RESIGN_SEGMENT_DURATION_MS + 1_000;

/** @deprecated use COACH_VIDEO_RESIGN_SEGMENT_START_MS */
const COACH_RESIGN_SEGMENT_START_MS = COACH_VIDEO_RESIGN_SEGMENT_START_MS;

/** Amber highlight appears this long before the scripted move plays. */
export const COACH_HIGHLIGHT_LEAD_MS = 1_500;

/** MOVE banner minimum on-screen time (capped before next segment). */
export const COACH_MOVE_BANNER_MIN_MS = 8_000;

/** Capture segment banner minimum on-screen time. */
export const COACH_CAPTURE_BANNER_MIN_MS = 5_000;

/** Keep banner visible this long after the demo move starts. */
export const COACH_SEGMENT_BANNER_TAIL_MS = 2_000;

/** Default top banner visible time (non-MOVE segments). */
export const COACH_SEGMENT_BANNER_HOLD_MS = 3_000;

/** @deprecated use COACH_MOVE_BANNER_MIN_MS */
export const COACH_MOVE_BANNER_HOLD_MS = COACH_MOVE_BANNER_MIN_MS;

/** @deprecated voice is tied to scripted move start times */
export const COACH_MOVE_SPEECH_DELAY_MS = 0;

/** @deprecated voice is tied to scripted move start times */
export const COACH_CAPTURE_SPEECH_DELAY_MS = 0;

/** @deprecated use move-linked speech */
export const COACH_SEGMENT_SPEECH_DELAY_MS = 0;

/** @deprecated use COACH_VIDEO_BOARD_ID */
export const COACH_LESSON_BOARD_ID = COACH_VIDEO_BOARD_ID;

export interface CoachVideoKeyframe {
  atMs: number;
  occupants: readonly (Player | undefined)[];
  captures: { RED: number; BLUE: number };
  currentPlayer: Player;
  chainPieceId: number | null;
  /** Coach win demo — pulse + amber ring on these cream beads. */
  glowNodeIds?: readonly number[];
}

export interface CoachVideoMove {
  atMs: number;
  from: number;
  to: number;
  player: Player;
  /** Board snapshot immediately before this move (explicit setup keyframe time). */
  setupAtMs: number;
  /** Spoken when this move animation starts (basics segments). */
  speech?: string;
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

/** Scripted UI overlay during ending segments (watch-only). */
export type CoachVideoCue =
  | { atMs: number; kind: 'hideModals' }
  | { atMs: number; kind: 'resignOffer'; resigning: Player; snapshot?: boolean }
  | {
      atMs: number;
      kind: 'result';
      winner: Player | 'DRAW';
      reason?: string;
      captures?: { RED: number; BLUE: number };
      snapshot?: boolean;
      phase?:
        | 'congrats'
        | 'resignDeclinedStatement'
        | 'resignDeclinedCongrats'
        | 'resignAgreedStatement'
        | 'resignAgreedCongrats';
    }
  | { atMs: number; kind: 'closeResignOffer' }
  | { atMs: number; kind: 'showBanner'; title: string; durationMs?: number }
  | { atMs: number; kind: 'boardFocus'; selectedId: number; targetIds: readonly number[] };

/** Big title card at the top when each segment starts. */
export interface CoachVideoSegmentBanner {
  atMs: number;
  title: string;
  subtitle?: string;
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
  cues: CoachVideoCue[];
  segmentBanners: CoachVideoSegmentBanner[];
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
  glowNodeIds?: readonly number[],
): CoachVideoKeyframe {
  return {
    atMs,
    occupants: withOcc(pairs),
    captures,
    currentPlayer: 'RED',
    chainPieceId,
    glowNodeIds,
  };
}

/** Segment starts for replay-voice lookup (basics then endings). */
export const COACH_VIDEO_BASICS_SEGMENT_STARTS_MS = [0, 19_100, 37_940, 48_100] as const;
export const COACH_VIDEO_ENDING_SEGMENT_STARTS_MS = [
  COACH_VIDEO_WIN_SEGMENT_START_MS,
  COACH_VIDEO_RESIGN_SEGMENT_START_MS,
] as const;
export const COACH_VIDEO_SEGMENT_STARTS_MS = [
  ...COACH_VIDEO_BASICS_SEGMENT_STARTS_MS,
  ...COACH_VIDEO_ENDING_SEGMENT_STARTS_MS,
] as const;

export const COACH_VIDEO_SEGMENT_BANNERS: CoachVideoSegmentBanner[] = [
  { atMs: 0, title: 'MOVE', subtitle: '★ SMARTBEADS COACH ★' },
  { atMs: 19_100, title: 'SINGLE CAPTURE' },
  { atMs: 37_940, title: 'DOUBLE CAPTURE' },
  { atMs: 48_100, title: 'TRIPLE CAPTURE' },
  { atMs: COACH_VIDEO_WIN_SEGMENT_START_MS, title: 'WIN' },
  { atMs: COACH_VIDEO_RESIGN_SEGMENT_START_MS, title: 'RESIGN' },
];

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
    'Win — capture all opponent beads to win.',
    'Resign — if a player resigns and the opponent declines, the resigning player loses; if the opponent agrees, it is a draw.',
  ],
  keyframes: [
    kf(0, [[12, 'RED'], [16, 'RED'], [17, 'RED'], ...ANCHOR]),
    kf(6_700, [[8, 'RED'], [16, 'RED'], [17, 'RED'], ...ANCHOR]),
    kf(10_000, [[16, 'RED'], [17, 'RED'], [18, 'RED'], ...ANCHOR]),
    kf(11_400, [[12, 'RED'], [17, 'RED'], [18, 'RED'], ...ANCHOR]),
    kf(14_900, [[17, 'RED'], [16, 'RED'], [12, 'RED'], ...ANCHOR]),
    kf(16_100, [[13, 'RED'], [16, 'RED'], [12, 'RED'], ...ANCHOR]),
    kf(19_100, [[12, 'RED'], [8, 'BLUE'], [16, 'RED'], [17, 'RED'], [19, 'BLUE']]),
    kf(25_380, [[4, 'RED'], [16, 'RED'], [17, 'RED'], [19, 'BLUE']], { RED: 1, BLUE: 0 }),
    kf(28_000, [[8, 'RED'], [5, 'BLUE'], [16, 'RED'], [17, 'RED'], [19, 'BLUE']]),
    kf(32_680, [[2, 'RED'], [16, 'RED'], [17, 'RED'], [19, 'BLUE']], { RED: 1, BLUE: 0 }),
    kf(32_940, [[17, 'RED'], [13, 'BLUE'], [16, 'RED'], [12, 'RED'], [19, 'BLUE']]),
    kf(34_940, [[9, 'RED'], [16, 'RED'], [12, 'RED'], [19, 'BLUE']], { RED: 1, BLUE: 0 }),
    kf(37_940, [[12, 'RED'], [8, 'BLUE'], [5, 'BLUE'], [16, 'RED'], [19, 'BLUE']]),
    kf(44_220, [[4, 'RED'], [5, 'BLUE'], [16, 'RED'], [19, 'BLUE']], { RED: 1, BLUE: 0 }, 4),
    kf(45_100, [[6, 'RED'], [16, 'RED'], [19, 'BLUE']], { RED: 2, BLUE: 0 }),
    kf(48_100, [[12, 'RED'], [8, 'BLUE'], [5, 'BLUE'], [10, 'BLUE'], [16, 'RED'], [19, 'BLUE']]),
    kf(54_480, [[4, 'RED'], [5, 'BLUE'], [10, 'BLUE'], [16, 'RED'], [19, 'BLUE']], { RED: 1, BLUE: 0 }, 4),
    kf(54_880, [[6, 'RED'], [10, 'BLUE'], [16, 'RED'], [19, 'BLUE']], { RED: 2, BLUE: 0 }, 6),
    kf(56_220, [[14, 'RED'], [16, 'RED'], [19, 'BLUE']], { RED: 3, BLUE: 0 }),
    kf(
      COACH_VIDEO_WIN_SEGMENT_START_MS,
      [[4, 'RED'], [8, 'RED']],
      { RED: 2, BLUE: 0 },
      null,
      [4, 8],
    ),
    kf(
      COACH_VIDEO_RESIGN_SEGMENT_START_MS,
      [[4, 'RED'], [8, 'RED'], [12, 'BLUE'], [16, 'BLUE']],
      { RED: 2, BLUE: 2 },
    ),
  ],
  speeches: [
    {
      atMs: COACH_VIDEO_WIN_SEGMENT_START_MS,
      text: COACH_WIN_SPEECH_TEXT,
    },
    {
      atMs: COACH_VIDEO_RESIGN_SEGMENT_START_MS,
      text: COACH_RESIGN_SPEECH_TEXT,
    },
    {
      atMs: COACH_RESIGN_DECLINE_CONGRATS_MS,
      text: COACH_RESIGN_DECLINED_CONGRATS_SPEECH,
    },
  ],
  highlights: [
    { atMs: 5_000, keyframeAtMs: 0, selectedId: 12 },
    { atMs: 9_700, keyframeAtMs: 10_000, selectedId: 16 },
    { atMs: 14_400, keyframeAtMs: 14_900, selectedId: 17 },
    { atMs: 23_600, keyframeAtMs: 19_100, selectedId: 12 },
    { atMs: 28_380, keyframeAtMs: 28_000, selectedId: 8 },
    { atMs: 33_160, keyframeAtMs: 32_940, selectedId: 17 },
    { atMs: 42_440, keyframeAtMs: 37_940, selectedId: 12 },
    { atMs: 44_320, keyframeAtMs: 44_220, selectedId: 4 },
    { atMs: 52_600, keyframeAtMs: 48_100, selectedId: 12 },
    { atMs: 54_080, keyframeAtMs: 54_480, selectedId: 4 },
    { atMs: 54_780, keyframeAtMs: 54_880, selectedId: 6 },
  ],
  moves: [
    { atMs: 6_500, setupAtMs: 0, from: 12, to: 8, player: 'RED', speech: 'Move. Slide one step along a line to an empty node.' },
    { atMs: 11_200, setupAtMs: 10_000, from: 16, to: 12, player: 'RED' },
    { atMs: 15_900, setupAtMs: 14_900, from: 17, to: 13, player: 'RED' },
    {
      atMs: 25_100,
      setupAtMs: 19_100,
      from: 12,
      to: 4,
      player: 'RED',
      speech: 'Single capture. Jump over one neighbour onto the empty node beyond.',
    },
    { atMs: 29_880, setupAtMs: 28_000, from: 8, to: 2, player: 'RED' },
    { atMs: 34_660, setupAtMs: 32_940, from: 17, to: 9, player: 'RED' },
    {
      atMs: 43_940,
      setupAtMs: 37_940,
      from: 12,
      to: 4,
      player: 'RED',
      speech: 'Double capture. The same bead can jump again for a second capture.',
    },
    { atMs: 44_820, setupAtMs: 44_220, from: 4, to: 6, player: 'RED' },
    {
      atMs: COACH_VIDEO_TRIPLE_DEMO_MS,
      setupAtMs: 48_100,
      from: 12,
      to: 4,
      player: 'RED',
      speech: COACH_VIDEO_TRIPLE_SPEECH_TEXT,
    },
    { atMs: 54_980, setupAtMs: 54_480, from: 4, to: 6, player: 'RED' },
    { atMs: 55_860, setupAtMs: 54_880, from: 6, to: 14, player: 'RED' },
  ],
  cues: [
    {
      atMs: COACH_WIN_CONGRATS_CUE_MS,
      kind: 'result',
      winner: 'RED',
      captures: { RED: 2, BLUE: 0 },
      snapshot: true,
      phase: 'congrats',
    },
    {
      atMs: COACH_WIN_CONGRATS_CUE_MS + COACH_WIN_CONGRATS_PHASE_MS,
      kind: 'hideModals',
    },
    {
      atMs: COACH_RESIGN_UI_START_MS,
      kind: 'boardFocus',
      selectedId: 4,
      targetIds: [12, 16],
    },
    { atMs: COACH_RESIGN_UI_START_MS, kind: 'resignOffer', resigning: 'RED', snapshot: true },
    { atMs: COACH_RESIGN_CLOSE_UI_MS, kind: 'closeResignOffer' },
    {
      atMs: COACH_RESIGN_DECLINE_CONGRATS_MS,
      kind: 'result',
      winner: 'BLUE',
      captures: { RED: 2, BLUE: 2 },
      snapshot: true,
      phase: 'resignDeclinedCongrats',
    },
    {
      atMs: COACH_RESIGN_DECLINE_CONGRATS_MS + COACH_RESIGN_CONGRATS_PHASE_MS,
      kind: 'hideModals',
    },
  ],
  segmentBanners: COACH_VIDEO_SEGMENT_BANNERS,
};

export function findCoachKeyframeAt(
  ms: number,
  keyframes: readonly CoachVideoKeyframe[],
  _moves: readonly CoachVideoMove[] = [],
): CoachVideoKeyframe {
  if (ms >= COACH_VIDEO_RESIGN_SEGMENT_START_MS) {
    let best = keyframes[0];
    for (const entry of keyframes) {
      if (
        entry.atMs <= ms
        && entry.atMs >= COACH_VIDEO_RESIGN_SEGMENT_START_MS
        && entry.atMs >= best.atMs
      ) {
        best = entry;
      }
    }
    if (best.atMs >= COACH_VIDEO_RESIGN_SEGMENT_START_MS) return best;
  }

  if (ms >= COACH_VIDEO_WIN_SEGMENT_START_MS) {
    let best = keyframes[0];
    for (const entry of keyframes) {
      if (
        entry.atMs <= ms
        && entry.atMs >= COACH_VIDEO_WIN_SEGMENT_START_MS
        && entry.atMs >= best.atMs
      ) {
        best = entry;
      }
    }
    if (best.atMs >= COACH_VIDEO_WIN_SEGMENT_START_MS) return best;
  }

  return findCoachKeyframeByTime(ms, keyframes);
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
  _moves: readonly CoachVideoMove[],
): CoachVideoKeyframe {
  return findCoachKeyframeByTime(move.setupAtMs, keyframes);
}

/** Board state immediately after a scripted hop (next keyframe after setup). */
export function findCoachKeyframeAfterMove(
  move: CoachVideoMove,
  keyframes: readonly CoachVideoKeyframe[],
): CoachVideoKeyframe {
  let best: CoachVideoKeyframe | null = null;
  for (const entry of keyframes) {
    if (entry.atMs > move.setupAtMs) {
      if (!best || entry.atMs < best.atMs) best = entry;
    }
  }
  return best ?? findCoachKeyframeByTime(move.setupAtMs, keyframes);
}

export function coachSegmentBannerUntilMs(
  banner: CoachVideoSegmentBanner,
  banners: readonly CoachVideoSegmentBanner[] = COACH_VIDEO.segmentBanners,
  moves: readonly CoachVideoMove[] = COACH_VIDEO.moves,
  speeches: readonly CoachVideoSpeech[] = COACH_VIDEO.speeches,
): number {
  const idx = banners.findIndex((b) => b.atMs === banner.atMs && b.title === banner.title);
  const nextBanner = idx >= 0 ? banners[idx + 1] : banners.find((b) => b.atMs > banner.atMs);
  const nextCap = nextBanner?.atMs ?? Number.POSITIVE_INFINITY;

  const demoMove = moves.find((m) => m.atMs >= banner.atMs && m.speech);
  if (demoMove) {
    const afterMove = demoMove.atMs + COACH_SEGMENT_BANNER_TAIL_MS;
    const minHold = banner.title === 'MOVE'
      ? banner.atMs + COACH_MOVE_BANNER_MIN_MS
      : banner.title.includes('CAPTURE')
        ? banner.atMs + COACH_CAPTURE_BANNER_MIN_MS
        : banner.atMs + COACH_SEGMENT_BANNER_HOLD_MS;
    return Math.min(nextCap, Math.max(afterMove, minHold));
  }
  if (banner.title === 'WIN') {
    return Math.min(banner.atMs + COACH_WIN_BOARD_PHASE_MS, nextCap);
  }
  if (banner.title === 'RESIGN') {
    return Math.min(
      COACH_VIDEO_RESIGN_SEGMENT_START_MS + COACH_RESIGN_SPEECH_ESTIMATE_MS,
      nextCap,
    );
  }
  const endingSpeech = speeches.find((s) => s.atMs >= banner.atMs);
  if (endingSpeech) return Math.min(endingSpeech.atMs, nextCap);
  return Math.min(banner.atMs + COACH_SEGMENT_BANNER_HOLD_MS, nextCap);
}

export function coachBannerHoldMs(banner: CoachVideoSegmentBanner): number {
  return coachSegmentBannerUntilMs(banner) - banner.atMs;
}

export function findCoachSegmentBannerAtTime(
  ms: number,
  banners: readonly CoachVideoSegmentBanner[] = COACH_VIDEO.segmentBanners,
): CoachVideoSegmentBanner | null {
  let active: CoachVideoSegmentBanner | null = null;
  for (const banner of banners) {
    const untilMs = coachSegmentBannerUntilMs(banner, banners);
    if (banner.atMs <= ms && ms < untilMs) active = banner;
  }
  return active;
}

export function findCoachCueAtTime(ms: number, cues: readonly CoachVideoCue[] = COACH_VIDEO.cues): CoachVideoCue | null {
  let latest: CoachVideoCue | null = null;
  for (const cue of cues) {
    if (cue.atMs <= ms) latest = cue;
  }
  return latest;
}

export function coachSpeechForTime(ms: number, script: CoachVideoScript = COACH_VIDEO): string {
  for (let i = script.speeches.length - 1; i >= 0; i--) {
    if (script.speeches[i].atMs <= ms) return script.speeches[i].text;
  }
  let lastMoveSpeech = '';
  for (const move of script.moves) {
    if (move.speech && move.atMs <= ms) lastMoveSpeech = move.speech;
  }
  return lastMoveSpeech;
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
