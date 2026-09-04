import { SFX_URLS } from './SoundManifest';

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
 * Web Audio SFX — loads named WAV files from `public/audio/` at runtime (not bundled in JS).
 * Decoupled from game logic: fails silently without blocking turns or animations.
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

  private preloadAudioBuffers(): void {
    if (this.isDecoding || !this.ctx || typeof this.ctx.decodeAudioData !== 'function') return;
    if (typeof fetch !== 'function') return;
    this.isDecoding = true;

    const decodeUrl = async (url: string): Promise<AudioBuffer | null> => {
      try {
        if (!this.ctx) return null;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.arrayBuffer();
        return await new Promise<AudioBuffer>((resolve, reject) => {
          if (!this.ctx) return reject();
          this.ctx.decodeAudioData(data, resolve, reject);
        });
      } catch {
        return null;
      }
    };

    Promise.all([
      decodeUrl(SFX_URLS.select),
      decodeUrl(SFX_URLS.slide),
      decodeUrl(SFX_URLS.capture),
      decodeUrl(SFX_URLS.flourish),
      decodeUrl(SFX_URLS.start),
      decodeUrl(SFX_URLS.victory),
      decodeUrl(SFX_URLS.defeat),
      decodeUrl(SFX_URLS.draw),
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

  public playSlide(): void {
    this.dispatch('slide');
    this.playBuffer(this.slideBuffer, 1.0, 0.85);
  }

  public playCapture(hopIndex = 0): void {
    let pitch = 1.0;
    if (hopIndex === 1) {
      pitch = 1.2599;
    } else if (hopIndex === 2) {
      pitch = 1.4983;
    } else if (hopIndex >= 3) {
      pitch = 2.0;
    }

    this.dispatch('capture', hopIndex, pitch);
    this.playBuffer(this.captureBuffer, pitch, 1.0);
  }

  public playFlourish(): void {
    this.dispatch('flourish');
    this.playBuffer(this.flourishBuffer, 1.0, 1.0);
  }

  public playGameStart(): void {
    if (this.muted || this.masterVolume <= 0) return;
    this.dispatch('gameStart');
    this.playBuffer(this.startBuffer, 1.0, 1.0);
  }

  public playVictory(): void {
    if (this.muted || this.masterVolume <= 0) return;
    this.dispatch('victory');
    this.playBuffer(this.victoryBuffer, 1.0, 1.0);
  }

  public playDefeat(): void {
    if (this.muted || this.masterVolume <= 0) return;
    this.dispatch('defeat');
    this.playBuffer(this.defeatBuffer, 1.0, 0.95);
  }

  public playDraw(): void {
    if (this.muted || this.masterVolume <= 0) return;
    this.dispatch('draw');
    this.playBuffer(this.drawBuffer, 1.0, 1.0);
  }

  public playSelect(): void {
    this.dispatch('select');
    this.playBuffer(this.selectBuffer, 1.0, 0.90);
  }

  public playButtonTap(): void {
    this.dispatch('buttonTap');
    this.playBuffer(this.selectBuffer, 1.15, 0.65);
  }

  public playTimerWarning(): void {
    this.dispatch('timerWarning');
    this.playBuffer(this.slideBuffer, 1.4, 0.70);
  }
}

export const soundEffects = new SoundEffects();
