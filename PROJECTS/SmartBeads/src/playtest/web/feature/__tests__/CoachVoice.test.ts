import { CoachVoice } from '../CoachVoice';

describe('CoachVoice', () => {
  const speak = jest.fn();
  const cancel = jest.fn();

  beforeEach(() => {
    speak.mockClear();
    cancel.mockClear();
    (globalThis as unknown as { SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance }).SpeechSynthesisUtterance =
      class {
        rate = 1;
        pitch = 1;
        voice: SpeechSynthesisVoice | null = null;
        onstart: (() => void) | null = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(public text: string) {}
      } as unknown as typeof SpeechSynthesisUtterance;
    (globalThis as unknown as { window: Window }).window = {
      speechSynthesis: {
        speak,
        cancel,
        getVoices: () => [{ lang: 'en-US', name: 'Test' } as SpeechSynthesisVoice],
        addEventListener: jest.fn(),
      },
    } as unknown as Window;
  });

  it('speaks lesson text when not muted', () => {
    const voice = new CoachVoice();
    voice.speak('Move one step to an empty node.');
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it('does not speak when muted', () => {
    const voice = new CoachVoice();
    voice.setMuted(true);
    voice.speak('Should not play.');
    expect(speak).not.toHaveBeenCalled();
  });

  it('stop cancels synthesis', () => {
    const voice = new CoachVoice();
    voice.stop();
    expect(cancel).toHaveBeenCalled();
  });
});
