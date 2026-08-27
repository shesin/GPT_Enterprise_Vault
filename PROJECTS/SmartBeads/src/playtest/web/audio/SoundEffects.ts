import {
  SFX_CAPTURE_DATA_URI,
  SFX_DEFEAT_DATA_URI,
  SFX_DRAW_DATA_URI,
  SFX_FLOURISH_DATA_URI,
  SFX_SELECT_DATA_URI,
  SFX_SLIDE_DATA_URI,
  SFX_START_DATA_URI,
  SFX_VICTORY_DATA_URI,
} from './SoundAssets';

export type SoundEventKind =
  | 'select'
  | 'slide'
  | 'capture'
  | 'flourish'
  | 'gameStart'
  | 'victory'
  | 'defeat'
  | 'draw'
  | 'buttonTap'
  | 'timerWarning';

export interface SoundEvent {
  kind: SoundEventKind;
  hopIndex?: number;
  pitchMultiplier?: number;
  timestamp: number;
}

/**
 * Pure Sweet Acoustic Sound Engine for SmartBeads (Candy Crush Reference).
 * Handcrafted physical acoustic modeling: Concert Harp, Rosewood Marimba, Juicy Wooden Tap, and Kalimba.
 * 100% royalty-free CC0 Public Domain.
 * Decoupled from game logic: Fails silently without blocking turns or animations.
 */
export class SoundEffects {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private masterVolume: number = 0.90;

  private selectBuffer: AudioBuffer | null = null;
  private slideBuffer: AudioBuffer | null = null;
  private captureBuffer: AudioBuffer | null = null;
  private flourishBuffer: AudioBuffer | null = null;
  private startBuffer: AudioBuffer | null = null;
  private victoryBuffer: AudioBuffer | null = null;
  private defeatBuffer: AudioBuffer | null = null;
  private drawBuffer: AudioBuffer | null = null;

  private isDecoding: boolean = false;

  private dispatchedEvents: SoundEvent[] = [];
  private eventListeners: Array<(event: SoundEvent) => void> = [];

  constructor() {
    try {
      const g = typeof globalThis !== 'undefined' ? (globalThis as unknown as { localStorage?: Storage }) : null;
      if (g?.localStorage) {
        const saved = g.localStorage.getItem('smartbeads_sfx_muted');
        this.muted = saved === 'true';
        const savedVol = g.localStorage.getItem('smartbeads_sfx_vol');
        if (savedVol !== null) {
          const parsed = parseFloat(savedVol);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
            this.masterVolume = parsed;
          }
        }
      }
    } catch {
      // Storage access unavailable
    }

    this.installUserGestureUnlock();
  }

  private installUserGestureUnlock(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const unlock = () => {
      this.getAudioContext();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
  }

  private getAudioContext(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }
    try {
      const g = typeof globalThis !== 'undefined'
        ? (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        : null;
      const AudioCtx = g?.AudioContext || g?.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.preloadAudioBuffers();
        return this.ctx;
      }
    } catch {
      // AudioContext unavailable
    }
    return null;
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const raw = base64.replace(/^data:audio\/\w+;base64,/, '');
    if (typeof Buffer !== 'undefined') {
      const buf = Buffer.from(raw, 'base64');
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
    const binaryString = atob(raw);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private preloadAudioBuffers(): void {
    if (this.isDecoding || !this.ctx || typeof this.ctx.decodeAudioData !== 'function') return;
    this.isDecoding = true;

    const decode = async (dataUri: string): Promise<AudioBuffer | null> => {
      try {
        const buffer = this.base64ToArrayBuffer(dataUri);
        return await new Promise<AudioBuffer>((resolve, reject) => {
          if (!this.ctx) return reject();
          this.ctx.decodeAudioData(buffer, resolve, reject);
        });
      } catch {
        return null;
      }
    };

    Promise.all([
      decode(SFX_SELECT_DATA_URI),
      decode(SFX_SLIDE_DATA_URI),
      decode(SFX_CAPTURE_DATA_URI),
      decode(SFX_FLOURISH_DATA_URI),
      decode(SFX_START_DATA_URI),
      decode(SFX_VICTORY_DATA_URI),
      decode(SFX_DEFEAT_DATA_URI),
      decode(SFX_DRAW_DATA_URI),
    ]).then(([select, slide, capture, flourish, start, victory, defeat, draw]) => {
      this.selectBuffer = select;
      this.slideBuffer = slide;
      this.captureBuffer = capture;
      this.flourishBuffer = flourish;
      this.startBuffer = start;
      this.victoryBuffer = victory;
      this.defeatBuffer = defeat;
      this.drawBuffer = draw;
      this.isDecoding = false;
    }).catch(() => {
      this.isDecoding = false;
    });
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      const g = typeof globalThis !== 'undefined' ? (globalThis as unknown as { localStorage?: Storage }) : null;
      if (g?.localStorage) {
        g.localStorage.setItem('smartbeads_sfx_muted', String(muted));
      }
    } catch {
      // Storage unavailable
    }
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  public setVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    try {
      const g = typeof globalThis !== 'undefined' ? (globalThis as unknown as { localStorage?: Storage }) : null;
      if (g?.localStorage) {
        g.localStorage.setItem('smartbeads_sfx_vol', String(this.masterVolume));
      }
    } catch {
      // Storage unavailable
    }
  }

  public addEventListener(listener: (event: SoundEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  public getDispatchedEvents(): SoundEvent[] {
    return [...this.dispatchedEvents];
  }

  public clearDispatchedEvents(): void {
    this.dispatchedEvents = [];
  }

  private dispatch(kind: SoundEventKind, hopIndex?: number, pitchMultiplier?: number): void {
    const event: SoundEvent = {
      kind,
      hopIndex,
      pitchMultiplier,
      timestamp: Date.now(),
    };
    this.dispatchedEvents.push(event);
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // Listener error ignored
      }
    }
  }

  private playBuffer(buffer: AudioBuffer | null, pitch = 1.0, gainScale = 1.0): void {
    if (this.muted || this.masterVolume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const execute = (buf: AudioBuffer | null) => {
      if (!buf) return;
      try {
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();

        source.buffer = buf;
        source.playbackRate.value = pitch;
        gain.gain.value = this.masterVolume * gainScale;

        source.connect(gain);
        gain.connect(ctx.destination);

        source.start();
      } catch {
        // Silent failure
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        execute(buffer);
      }).catch(() => {});
    } else {
      if (!buffer) {
        this.preloadAudioBuffers();
        return;
      }
      execute(buffer);
    }
  }

  /**
   * 1. Slide / Move — Soft wooden piece settling on felt (45ms).
   */
  public playSlide(): void {
    this.dispatch('slide');
    this.playBuffer(this.slideBuffer, 1.0, 0.85);
  }

  /**
   * 2. Capture — Luscious rosewood Marimba strike (C5, 523.25 Hz).
   * Musical major triad steps:
   * - Hop 0: 1.000x pitch
   * - Hop 1: 1.259x pitch (+4 semitones, Major 3rd)
   * - Hop 2: 1.498x pitch (+7 semitones, Perfect 5th)
   * - Hop 3+: 2.000x pitch (+12 semitones, Octave)
   */
  public playCapture(hopIndex = 0): void {
    let pitch = 1.0;
    if (hopIndex === 1) {
      pitch = 1.2599; // +4 semitones
    } else if (hopIndex === 2) {
      pitch = 1.4983; // +7 semitones
    } else if (hopIndex >= 3) {
      pitch = 2.0;    // Octave
    }

    this.dispatch('capture', hopIndex, pitch);
    this.playBuffer(this.captureBuffer, pitch, 1.0);
  }

  /**
   * 3. 3+ Multi-Jump Chain: Sweet 4-note ascending Marimba & Celesta arpeggio (C5 -> E5 -> G5 -> C6).
   */
  public playFlourish(): void {
    this.dispatch('flourish');
    this.playBuffer(this.flourishBuffer, 1.0, 1.0);
  }

  /**
   * 4. Game Start: Sweet Concert Harp & Celesta Glissando (C4 -> E4 -> G4 -> C5 -> E5 -> G5 -> C6) (1.6s).
   */
  public playGameStart(): void {
    if (this.muted || this.masterVolume <= 0) return;
    this.dispatch('gameStart');
    this.playBuffer(this.startBuffer, 1.0, 1.0);
  }

  /**
   * 5. Victory: Triumphant, warm sweet Marimba celebration (C4 -> G4 -> C5 -> E5 -> G5 -> C6) (1.2s).
   */
  public playVictory(): void {
    if (this.muted || this.masterVolume <= 0) return;
    this.dispatch('victory');
    this.playBuffer(this.victoryBuffer, 1.0, 1.0);
  }

  /**
   * 6. Defeat / Loss: Gentle comforting Kalimba resolution (G4 -> E4 -> C4) (600ms).
   */
  public playDefeat(): void {
    if (this.muted || this.masterVolume <= 0) return;
    this.dispatch('defeat');
    this.playBuffer(this.defeatBuffer, 1.0, 0.95);
  }

  /**
   * 7. Draw: Peaceful twin chime (G4 -> C5) (450ms).
   */
  public playDraw(): void {
    if (this.muted || this.masterVolume <= 0) return;
    this.dispatch('draw');
    this.playBuffer(this.drawBuffer, 1.0, 1.0);
  }

  /** Piece selection feedback: Juicy sweet wooden bubble-tap (35ms) */
  public playSelect(): void {
    this.dispatch('select');
    this.playBuffer(this.selectBuffer, 1.0, 0.90);
  }

  /** UI Button tap */
  public playButtonTap(): void {
    this.dispatch('buttonTap');
    this.playBuffer(this.selectBuffer, 1.15, 0.65);
  }

  /** Clock warning */
  public playTimerWarning(): void {
    this.dispatch('timerWarning');
    this.playBuffer(this.slideBuffer, 1.4, 0.70);
  }
}

export const soundEffects = new SoundEffects();
