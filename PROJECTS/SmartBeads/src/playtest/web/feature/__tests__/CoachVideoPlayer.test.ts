import { CoachVideoPlayer } from '../CoachVideoPlayer';
import { COACH_VIDEO, COACH_VIDEO_RESIGN_SEGMENT_START_MS, COACH_VIDEO_WIN_SEGMENT_START_MS, COACH_WIN_CONGRATS_CUE_MS, COACH_WIN_CONGRATS_PHASE_MS, type CoachVideoCue, type CoachVideoHighlight, type CoachVideoKeyframe, type CoachVideoMove, type CoachVideoSegmentBanner, type CoachVideoSpeech } from '../CoachVideoScript';

describe('CoachVideoPlayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('seeks to the nearest keyframe', () => {
    const applied: number[] = [];
    const player = new CoachVideoPlayer(COACH_VIDEO, makeCallbacks({
      onApplyKeyframe: (kf) => applied.push(kf.atMs),
    }));

    player.seek(5000);
    expect(applied).toEqual([0]);

    player.seek(12000);
    expect(applied).toEqual([0, 11400]);

    player.destroy();
  });

  it('fires speech when a scripted move starts', () => {
    const spoken: string[] = [];
    const highlights: number[] = [];
    const player = new CoachVideoPlayer(COACH_VIDEO, makeCallbacks({
      onSpeak: (speech) => spoken.push(speech.text),
      onApplyHighlight: (h) => highlights.push(h.selectedId),
    }));

    player.play();
    jest.advanceTimersByTime(6_600);
    expect(spoken[0]).toMatch(/Move/i);
    expect(highlights[0]).toBe(12);

    player.destroy();
  });

  it('pauses timeline until a scripted move animation completes', () => {
    const moves: CoachVideoMove[] = [];
    let finishMove: (() => void) | null = null;
    const player = new CoachVideoPlayer(COACH_VIDEO, makeCallbacks({
      onPlayMove: (move, onDone) => {
        moves.push(move);
        finishMove = onDone;
      },
    }));

    player.play();
    jest.advanceTimersByTime(6_550);
    expect(moves).toHaveLength(1);
    expect(moves[0].from).toBe(12);

    finishMove?.();
    jest.advanceTimersByTime(200);
    expect(player.getTimeMs()).toBeGreaterThan(6_500);

    player.destroy();
  });

  it('shows the move banner when playback starts', () => {
    const banners: Array<CoachVideoSegmentBanner | null> = [];
    const player = new CoachVideoPlayer(COACH_VIDEO, makeCallbacks({
      onApplySegmentBanner: (banner) => banners.push(banner),
    }));

    player.seek(0);
    expect(banners.at(-1)?.title).toBe('MOVE');

    banners.length = 0;
    player.play();
    expect(banners.at(-1)?.title).toBe('MOVE');

    player.destroy();
  });

  it('holds the timeline before win until releaseWinSegment is called', () => {
    const player = new CoachVideoPlayer(COACH_VIDEO, makeCallbacks());

    player.seek(COACH_VIDEO_WIN_SEGMENT_START_MS - 100);
    player.play();
    jest.advanceTimersByTime(500);
    expect(player.getTimeMs()).toBeLessThan(COACH_VIDEO_WIN_SEGMENT_START_MS);

    player.releaseWinSegment();
    jest.advanceTimersByTime(500);
    expect(player.getTimeMs()).toBeGreaterThanOrEqual(COACH_VIDEO_WIN_SEGMENT_START_MS);

    player.destroy();
  });

  it('applies scripted cues when seeking into ending segments', () => {
    const cues: Array<CoachVideoCue | null> = [];
    const player = new CoachVideoPlayer(COACH_VIDEO, makeCallbacks({
      onApplyCue: (cue) => cues.push(cue),
    }));

    player.seek(COACH_WIN_CONGRATS_CUE_MS + 100);
    expect(cues.at(-1)?.kind).toBe('result');
    if (cues.at(-1)?.kind === 'result') {
      expect(cues.at(-1)?.phase).toBe('congrats');
    }

    player.seek(COACH_WIN_CONGRATS_CUE_MS + COACH_WIN_CONGRATS_PHASE_MS + 100);
    expect(cues.at(-1)?.kind).toBe('hideModals');

    player.destroy();
  });

  it('fires every cue that shares the same timestamp', () => {
    const cues: CoachVideoCue[] = [];
    const player = new CoachVideoPlayer(COACH_VIDEO, makeCallbacks({
      onApplyCue: (cue) => cues.push(cue!),
    }));

    player.seek(COACH_VIDEO_RESIGN_SEGMENT_START_MS);
    player.play();
    jest.advanceTimersByTime(400);

    const kinds = cues.map((c) => c.kind);
    expect(kinds).toContain('boardFocus');
    expect(kinds).toContain('resignOffer');

    player.destroy();
  });
});

function makeCallbacks(overrides: Partial<Parameters<typeof CoachVideoPlayer>[1]> = {}) {
  return {
    onTimeChange: jest.fn(),
    onApplyKeyframe: jest.fn() as (keyframe: CoachVideoKeyframe) => void,
    onApplyHighlight: jest.fn() as (highlight: CoachVideoHighlight) => void,
    onApplyCue: jest.fn(),
    onApplySegmentBanner: jest.fn(),
    onPlayMove: jest.fn((_move: CoachVideoMove, onDone: () => void) => onDone()) as (
      move: CoachVideoMove,
      onDone: () => void,
    ) => void,
    onSpeak: jest.fn() as (speech: CoachVideoSpeech) => void,
    onPlayingChange: jest.fn(),
    onEnded: jest.fn(),
    ...overrides,
  };
}
