import { SoundEffects, SoundEvent } from '../SoundEffects';

describe('SoundEffects event dispatch and mute/volume', () => {
  let sfx: SoundEffects;
  let receivedEvents: SoundEvent[];
  let unsubscribe: () => void;

  beforeEach(() => {
    sfx = new SoundEffects();
    receivedEvents = [];
    unsubscribe = sfx.addEventListener((ev) => {
      receivedEvents.push(ev);
    });
  });

  afterEach(() => {
    if (unsubscribe) unsubscribe();
  });

  it('initializes unmuted with default volume 0.90', () => {
    expect(sfx.isMuted()).toBe(false);
    expect(sfx.getVolume()).toBe(0.90);
  });

  it('toggles and sets mute state', () => {
    expect(sfx.toggleMuted()).toBe(true);
    expect(sfx.isMuted()).toBe(true);
    sfx.setMuted(false);
    expect(sfx.isMuted()).toBe(false);
  });

  it('clamps and sets volume', () => {
    sfx.setVolume(0.8);
    expect(sfx.getVolume()).toBe(0.8);
    sfx.setVolume(1.5);
    expect(sfx.getVolume()).toBe(1.0);
    sfx.setVolume(-0.2);
    expect(sfx.getVolume()).toBe(0.0);
  });

  it('dispatches correct sound-trigger event for: game start fanfare', () => {
    sfx.playGameStart();

    const events = sfx.getDispatchedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('gameStart');
    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].kind).toBe('gameStart');
  });

  it('dispatches correct sound-trigger event for: normal move (soft wooden slide)', () => {
    sfx.playSlide();

    const events = sfx.getDispatchedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('slide');
    expect(events[0].hopIndex).toBeUndefined();
    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].kind).toBe('slide');
  });

  it('dispatches correct sound-trigger event for: single capture chime pop', () => {
    sfx.playCapture(0);

    const events = sfx.getDispatchedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('capture');
    expect(events[0].hopIndex).toBe(0);
    expect(events[0].pitchMultiplier).toBe(1.0);
  });

  it('dispatches ascending major triad musical intervals for 2-hop chain', () => {
    // 1st hop: root pitch
    sfx.playCapture(0);
    // 2nd hop: +4 semitones major 3rd
    sfx.playCapture(1);

    const events = sfx.getDispatchedEvents();
    expect(events).toHaveLength(2);

    expect(events[0].kind).toBe('capture');
    expect(events[0].hopIndex).toBe(0);
    expect(events[0].pitchMultiplier).toBe(1.0);

    expect(events[1].kind).toBe('capture');
    expect(events[1].hopIndex).toBe(1);
    expect(events[1].pitchMultiplier).toBeCloseTo(1.2599, 3);
    expect(events[1].pitchMultiplier).toBeGreaterThan(events[0].pitchMultiplier!);
  });

  it('dispatches ascending musical ladder + acoustic flourish for 3+ hop chain', () => {
    sfx.playCapture(0);
    sfx.playCapture(1);
    sfx.playCapture(2);
    sfx.playFlourish();

    const events = sfx.getDispatchedEvents();
    expect(events).toHaveLength(4);

    expect(events[0].pitchMultiplier).toBe(1.0);
    expect(events[1].pitchMultiplier).toBeCloseTo(1.2599, 3);
    expect(events[2].pitchMultiplier).toBeCloseTo(1.4983, 3);
    expect(events[3].kind).toBe('flourish');
  });

  it('dispatches correct events for victory celebration, defeat resolution, and draw chime', () => {
    sfx.playVictory();
    sfx.playDefeat();
    sfx.playDraw();

    const events = sfx.getDispatchedEvents();
    expect(events).toHaveLength(3);
    expect(events[0].kind).toBe('victory');
    expect(events[1].kind).toBe('defeat');
    expect(events[2].kind).toBe('draw');
  });

  it('dispatches correct events for piece selection, button tap, and timer warning', () => {
    sfx.playSelect();
    sfx.playButtonTap();
    sfx.playTimerWarning();

    const events = sfx.getDispatchedEvents();
    expect(events).toHaveLength(3);
    expect(events[0].kind).toBe('select');
    expect(events[1].kind).toBe('buttonTap');
    expect(events[2].kind).toBe('timerWarning');
  });

  it('clears dispatched events on request', () => {
    sfx.playSlide();
    sfx.playCapture(0);
    expect(sfx.getDispatchedEvents()).toHaveLength(2);

    sfx.clearDispatchedEvents();
    expect(sfx.getDispatchedEvents()).toHaveLength(0);
  });

  it('operates safely and silently when Web Audio API is completely unavailable', () => {
    expect(() => {
      sfx.playGameStart();
      sfx.playSlide();
      sfx.playCapture(0);
      sfx.playCapture(1);
      sfx.playCapture(2);
      sfx.playVictory();
      sfx.playDefeat();
      sfx.playDraw();
      sfx.playFlourish();
      sfx.playSelect();
      sfx.playButtonTap();
      sfx.playTimerWarning();
    }).not.toThrow();
  });
});
