/** Browser speech for Coach lessons (Web Speech API). */

export class CoachVoice {
  private muted = false;
  private speaking = false;
  private onSpeakingChange: ((speaking: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        /* load voices */
      });
    }
  }

  setOnSpeakingChange(cb: (speaking: boolean) => void): void {
    this.onSpeakingChange = cb;
  }

  isMuted(): boolean {
    return this.muted;
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stop();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  stop(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    this.setSpeaking(false);
  }

  speak(text: string): void {
    if (this.muted || !text.trim()) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const en = voices.find((v) => v.lang.startsWith('en')) ?? voices[0];
    if (en) utterance.voice = en;

    utterance.onstart = () => this.setSpeaking(true);
    utterance.onend = () => this.setSpeaking(false);
    utterance.onerror = () => this.setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  private setSpeaking(value: boolean): void {
    this.speaking = value;
    this.onSpeakingChange?.(value);
  }
}
