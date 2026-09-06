import type {
  CoachVideoCue,
  CoachVideoHighlight,
  CoachVideoKeyframe,
  CoachVideoMove,
  CoachVideoScript,
  CoachVideoSegmentBanner,
  CoachVideoSpeech,
} from './CoachVideoScript';
import {
  COACH_VIDEO_WIN_SEGMENT_START_MS,
  findCoachKeyframeAfterMove,
  findCoachKeyframeAt,
  findCoachSegmentBannerAtTime,
  findCoachSetupKeyframeForMove,
} from './CoachVideoScript';

const TICK_MS = 50;

export interface CoachVideoPlayerCallbacks {
  onTimeChange: (ms: number) => void;
  onApplyKeyframe: (keyframe: CoachVideoKeyframe) => void;
  onApplyHighlight: (highlight: CoachVideoHighlight) => void;
  onApplyCue: (cue: CoachVideoCue | null) => void;
  onApplySegmentBanner: (banner: CoachVideoSegmentBanner | null) => void;
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
  private firedHighlights = new Set<number>();
  private firedCues = new Set<number>();
  private firedSegmentBanners = new Set<number>();
  private animHold = false;
  private winSegmentReleased = false;

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

  /** Unblocks win/draw/resign appendix after triple voice + pause. */
  releaseWinSegment(): void {
    this.winSegmentReleased = true;
    this.callbacks.onApplyKeyframe(
      findCoachKeyframeAt(this.timeMs, this.script.keyframes, this.script.moves),
    );
  }

  play(): void {
    if (this.playing) return;
    if (this.timeMs >= this.script.durationMs) {
      this.seek(0);
    }
    this.playing = true;
    this.callbacks.onPlayingChange(true);
    this.applySegmentBannerAtSeek(this.timeMs);
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
    if (this.timeMs >= COACH_VIDEO_WIN_SEGMENT_START_MS) {
      this.winSegmentReleased = true;
    }
    this.syncFiredSets();
    this.callbacks.onApplyKeyframe(findCoachKeyframeAt(this.timeMs, this.script.keyframes, this.script.moves));
    this.applyHighlightAtSeek(this.timeMs);
    this.applyCueAtSeek(this.timeMs);
    this.applySegmentBannerAtSeek(this.timeMs);
    this.callbacks.onTimeChange(this.timeMs);
    if (this.timeMs >= this.script.durationMs && this.playing) {
      this.pause();
      this.callbacks.onEnded();
    }
  }

  destroy(): void {
    this.pause();
    this.animHold = false;
    this.winSegmentReleased = false;
  }

  private tick(): void {
    if (this.animHold) return;

    const prev = this.timeMs;
    let next = Math.min(this.script.durationMs, this.timeMs + TICK_MS);

    if (!this.winSegmentReleased && next >= COACH_VIDEO_WIN_SEGMENT_START_MS) {
      next = prev;
    }

    this.timeMs = next;
    this.fireSpeeches(prev, this.timeMs);
    this.fireHighlights(prev, this.timeMs);
    this.fireMoves(prev, this.timeMs);
    this.fireCues(prev, this.timeMs);
    this.fireSegmentBanners(prev, this.timeMs);
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

  private fireHighlights(prev: number, next: number): void {
    for (const highlight of this.script.highlights) {
      if (highlight.atMs > prev && highlight.atMs <= next && !this.firedHighlights.has(highlight.atMs)) {
        this.firedHighlights.add(highlight.atMs);
        this.callbacks.onApplyHighlight(highlight);
      }
    }
  }

  private fireMoves(prev: number, next: number): void {
    for (const move of this.script.moves) {
      if (move.atMs > prev && move.atMs <= next && !this.firedMoves.has(move.atMs)) {
        this.firedMoves.add(move.atMs);
        this.animHold = true;
        this.callbacks.onApplyKeyframe(findCoachSetupKeyframeForMove(move, this.script.keyframes, this.script.moves));
        if (move.speech && !this.firedSpeeches.has(move.atMs)) {
          this.firedSpeeches.add(move.atMs);
          this.callbacks.onSpeak({ atMs: move.atMs, text: move.speech });
        }
        this.callbacks.onPlayMove(move, () => {
          this.animHold = false;
          this.callbacks.onApplyKeyframe(
            findCoachKeyframeAfterMove(move, this.script.keyframes),
          );
        });
        return;
      }
    }
  }

  private fireCues(prev: number, next: number): void {
    const cues = this.script.cues ?? [];
    cues.forEach((cue, index) => {
      if (cue.atMs > prev && cue.atMs <= next && !this.firedCues.has(index)) {
        this.firedCues.add(index);
        this.callbacks.onApplyCue(cue);
      }
    });
  }

  private fireSegmentBanners(prev: number, next: number): void {
    const banners = this.script.segmentBanners ?? [];
    for (const banner of banners) {
      const crossing = banner.atMs >= prev && banner.atMs <= next;
      if (crossing && !this.firedSegmentBanners.has(banner.atMs)) {
        this.firedSegmentBanners.add(banner.atMs);
        this.callbacks.onApplySegmentBanner(banner);
      }
    }
  }

  private applyCueAtSeek(ms: number): void {
    for (const cue of this.script.cues ?? []) {
      if (cue.atMs <= ms) {
        this.callbacks.onApplyCue(cue);
      }
    }
  }

  private applySegmentBannerAtSeek(ms: number): void {
    this.callbacks.onApplySegmentBanner(findCoachSegmentBannerAtTime(ms, this.script.segmentBanners ?? []));
  }

  private applyHighlightAtSeek(ms: number): void {
    let latest: CoachVideoHighlight | null = null;
    for (const highlight of this.script.highlights) {
      if (highlight.atMs <= ms) latest = highlight;
    }
    if (!latest) return;
    const nextMove = this.script.moves.find((m) => m.atMs > latest!.atMs);
    if (nextMove && ms >= nextMove.atMs) return;
    this.callbacks.onApplyHighlight(latest);
  }

  private syncFiredSets(): void {
    this.firedMoves = new Set(
      this.script.moves.filter((m) => m.atMs <= this.timeMs).map((m) => m.atMs),
    );
    const spokenAt = new Set<number>();
    for (const speech of this.script.speeches) {
      if (speech.atMs <= this.timeMs) spokenAt.add(speech.atMs);
    }
    for (const move of this.script.moves) {
      if (move.speech && move.atMs <= this.timeMs) spokenAt.add(move.atMs);
    }
    this.firedSpeeches = spokenAt;
    this.firedHighlights = new Set(
      this.script.highlights.filter((h) => h.atMs <= this.timeMs).map((h) => h.atMs),
    );
    this.firedCues = new Set(
      (this.script.cues ?? []).map((c, index) => index).filter(
        (index) => (this.script.cues ?? [])[index].atMs <= this.timeMs,
      ),
    );
    this.firedSegmentBanners = new Set(
      (this.script.segmentBanners ?? []).filter((b) => b.atMs <= this.timeMs).map((b) => b.atMs),
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

