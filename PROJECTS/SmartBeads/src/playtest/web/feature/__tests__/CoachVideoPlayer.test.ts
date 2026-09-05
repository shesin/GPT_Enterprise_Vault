import { CoachVideoPlayer } from '../CoachVideoPlayer';
import { COACH_VIDEO, type CoachVideoKeyframe, type CoachVideoMove, type CoachVideoSpeech } from '../CoachVideoScript';

describe('CoachVideoPlayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('seeks to the nearest keyframe and tracks fired cues', () => {
    const applied: number[] = [];
    const player = new CoachVideoPlayer(COACH_VIDEO, makeCallbacks({
      onApplyKeyframe: (kf) => applied.push(kf.atMs),
    }));

    player.seek(5000);
    expect(applied).toEqual([0]);

    player.seek(12000);
    expect(applied).toEqual([0, 13500]);

    player.destroy();
  });

  it('fires speech cues while playing', () => {
    const spoken: string[] = [];
    const player = new CoachVideoPlayer(COACH_VIDEO, makeCallbacks({
      onSpeak: (speech) => spoken.push(speech.text),
    }));

    player.play();
    jest.advanceTimersByTime(5100);
    expect(spoken[0]).toMatch(/Move/i);

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
    jest.advanceTimersByTime(10_050);
    expect(moves).toHaveLength(1);
    expect(moves[0].from).toBe(13);

    jest.advanceTimersByTime(500);
    expect(moves).toHaveLength(1);

    finishMove?.();
    jest.advanceTimersByTime(200);
    expect(player.getTimeMs()).toBeGreaterThan(10_000);

    player.destroy();
  });
});

function makeCallbacks(overrides: Partial<Parameters<typeof CoachVideoPlayer>[1]> = {}) {
  return {
    onTimeChange: jest.fn(),
    onApplyKeyframe: jest.fn() as (keyframe: CoachVideoKeyframe) => void,
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
