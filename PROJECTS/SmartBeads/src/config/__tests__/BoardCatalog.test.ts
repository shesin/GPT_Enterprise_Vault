import {
  BOARD_CATALOG,
  getPlayConfig,
  ProductBoardId,
} from '../BoardCatalog';

describe('BoardCatalog human-decided settings', () => {
  const byId = Object.fromEntries(BOARD_CATALOG.map((entry) => [entry.id, entry])) as Record<
    ProductBoardId,
    (typeof BOARD_CATALOG)[number]
  >;

  it('16-bead: End-Game/Off centre, default Off; timer 15/25/35; shot 60/90/120', () => {
    const play = byId['16'].play;
    expect(play.centerRuleOptions).toEqual(['off', 'endgame']);
    expect(play.defaultSettings.centerRule).toBe('off');
    expect(play.matchTimerOptions).toEqual(['off', '15', '25', '35']);
    expect(play.defaultSettings.matchTimer).toBe('25');
    expect(play.shotClockOptions).toEqual(['off', '60', '90', '120']);
    expect(play.defaultSettings.shotClock).toBe('90');
  });

  it('10-bead and 12-bead: End-Game/Off centre, default Off; timer 10/20/30; shot 60/90', () => {
    for (const id of ['10x5', '12x6x5'] as const) {
      const play = byId[id].play;
      expect(play.centerRuleOptions).toEqual(['off', 'endgame']);
      expect(play.defaultSettings.centerRule).toBe('off');
      expect(play.matchTimerOptions).toEqual(['off', '10', '20', '30']);
      expect(play.defaultSettings.matchTimer).toBe('20');
      expect(play.shotClockOptions).toEqual(['off', '60', '90']);
      expect(play.defaultSettings.shotClock).toBe('90');
    }
  });

  it('6-bead boards: Cumulative/End-Game/Off centre, default End-Game; timer 3/5/10; shot 30/60', () => {
    for (const id of ['6x4', '6x3x5'] as const) {
      const play = byId[id].play;
      expect(play.centerRuleOptions).toEqual(['off', 'cumulative', 'endgame']);
      expect(play.defaultSettings.centerRule).toBe('endgame');
      expect(play.matchTimerOptions).toEqual(['off', '3', '5', '10']);
      expect(play.defaultSettings.matchTimer).toBe('3');
      expect(play.shotClockOptions).toEqual(['off', '30', '60']);
      expect(play.defaultSettings.shotClock).toBe('30');
    }
  });

  it('7/8-bead hourglass: Cumulative/End-Game/Off centre, default End-Game; timer 3/5/10 default 5; shot 30/60', () => {
    for (const id of ['7x4x5', '8x4x6'] as const) {
      const play = byId[id].play;
      expect(play.centerRuleOptions).toEqual(['off', 'cumulative', 'endgame']);
      expect(play.defaultSettings.centerRule).toBe('endgame');
      expect(play.matchTimerOptions).toEqual(['off', '3', '5', '10']);
      expect(play.defaultSettings.matchTimer).toBe('5');
      expect(play.shotClockOptions).toEqual(['off', '30', '60']);
      expect(play.defaultSettings.shotClock).toBe('30');
    }
  });

  it('exposes timer and shot-clock option lists for every playable board', () => {
    for (const entry of BOARD_CATALOG.filter((b) => b.playable)) {
      const play = getPlayConfig(entry.id);
      expect(play.matchTimerOptions.length).toBeGreaterThan(0);
      expect(play.shotClockOptions.length).toBeGreaterThan(0);
      expect(play.matchTimerOptions).toContain(play.defaultSettings.matchTimer);
      expect(play.shotClockOptions).toContain(play.defaultSettings.shotClock);
      expect(play.centerRuleOptions).toContain(play.defaultSettings.centerRule);
    }
  });
});
