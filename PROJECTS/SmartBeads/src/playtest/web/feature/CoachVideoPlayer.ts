import type { CoachVideoKeyframe, CoachVideoMove, CoachVideoScript, CoachVideoSpeech } from './CoachVideoScript';
import { findCoachKeyframeAt, findCoachSetupKeyframeForMove } from './CoachVideoScript';

const TICK_MS = 50;

export interface CoachVideoPlayerCallbacks {
  onTimeChange: (ms: number) => void;
  onApplyKeyframe: (keyframe: CoachVideoKeyframe) => void;
  onPlayMove: (move: CoachVideoMove, onDone: () => void) => void;
  onSpeak: (speech: CoachVideoSpeech) => void;
  onPlayingChange: (playing: boolean) => void;
  onEnded: () => void;
}

export class CoachVideoPlayer {
  private timeMs = 0;
  private playing = false;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private firedMoves = new Set<number>();
  private firedSpeeches = new Set<number>();
  private animHold = false;

  constructor(
    private readonly script: CoachVideoScript,
    private readonly callbacks: CoachVideoPlayerCallbacks,
  ) {}

  getTimeMs(): number {
    return this.timeMs;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  play(): void {
    if (this.playing) return;
    if (this.timeMs >= this.script.durationMs) {
      this.seek(0);
    }
    this.playing = true;
    this.callbacks.onPlayingChange(true);
    this.timerId = setInterval(() => this.tick(), TICK_MS);
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.callbacks.onPlayingChange(false);
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  seek(ms: number): void {
    this.timeMs = clamp(ms, 0, this.script.durationMs);
    this.syncFiredSets();
    this.callbacks.onApplyKeyframe(findCoachKeyframeAt(this.timeMs, this.script.keyframes, this.script.moves));
    this.callbacks.onTimeChange(this.timeMs);
    if (this.timeMs >= this.script.durationMs && this.playing) {
      this.pause();
      this.callbacks.onEnded();
    }
  }

  destroy(): void {
    this.pause();
    this.animHold = false;
  }

  private tick(): void {
    if (this.animHold) return;

    const prev = this.timeMs;
    this.timeMs = Math.min(this.script.durationMs, this.timeMs + TICK_MS);
    this.fireSpeeches(prev, this.timeMs);
    this.fireMoves(prev, this.timeMs);
    this.callbacks.onTimeChange(this.timeMs);

    if (this.timeMs >= this.script.durationMs) {
      this.pause();
      this.callbacks.onEnded();
    }
  }

  private fireSpeeches(prev: number, next: number): void {
    for (const speech of this.script.speeches) {
      if (speech.atMs > prev && speech.atMs <= next && !this.firedSpeeches.has(speech.atMs)) {
        this.firedSpeeches.add(speech.atMs);
        this.callbacks.onSpeak(speech);
      }
    }
  }

  private fireMoves(prev: number, next: number): void {
    for (const move of this.script.moves) {
      if (move.atMs > prev && move.atMs <= next && !this.firedMoves.has(move.atMs)) {
        this.firedMoves.add(move.atMs);
        this.animHold = true;
        this.callbacks.onApplyKeyframe(findCoachSetupKeyframeForMove(move, this.script.keyframes, this.script.moves));
        this.callbacks.onPlayMove(move, () => {
          this.animHold = false;
          this.callbacks.onApplyKeyframe(findCoachKeyframeAt(this.timeMs, this.script.keyframes, this.script.moves));
        });
        return;
      }
    }
  }

  private syncFiredSets(): void {
    this.firedMoves = new Set(
      this.script.moves.filter((m) => m.atMs <= this.timeMs).map((m) => m.atMs),
    );
    this.firedSpeeches = new Set(
      this.script.speeches.filter((s) => s.atMs <= this.timeMs).map((s) => s.atMs),
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
