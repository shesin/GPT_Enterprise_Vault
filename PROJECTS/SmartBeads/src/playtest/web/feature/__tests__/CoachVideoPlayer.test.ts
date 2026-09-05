import { CoachVideoPlayer } from '../CoachVideoPlayer';
import { COACH_VIDEO, type CoachVideoHighlight, type CoachVideoKeyframe, type CoachVideoMove, type CoachVideoSpeech } from '../CoachVideoScript';

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
    expect(applied).toEqual([0, 14500]);

    player.destroy();
  });

  it('fires speech and highlight cues while playing', () => {
    const spoken: string[] = [];
    const highlights: number[] = [];
    const player = new CoachVideoPlayer(COACH_VIDEO, makeCallbacks({
      onSpeak: (speech) => spoken.push(speech.text),
      onApplyHighlight: (h) => highlights.push(h.selectedId),
    }));

    player.play();
    jest.advanceTimersByTime(8100);
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
    jest.advanceTimersByTime(11_050);
    expect(moves).toHaveLength(1);
    expect(moves[0].from).toBe(12);

    finishMove?.();
    jest.advanceTimersByTime(200);
    expect(player.getTimeMs()).toBeGreaterThan(11_000);

    player.destroy();
  });
});

function makeCallbacks(overrides: Partial<Parameters<typeof CoachVideoPlayer>[1]> = {}) {
  return {
    onTimeChange: jest.fn(),
    onApplyKeyframe: jest.fn() as (keyframe: CoachVideoKeyframe) => void,
    onApplyHighlight: jest.fn() as (highlight: CoachVideoHighlight) => void,
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
