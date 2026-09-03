import {
  BOARD_CATALOG,
  getPlayConfig,
  listProductBoards,
  PRODUCT_BOARD_ORDER,
  ProductBoardId,
} from '../BoardCatalog';

describe('BoardCatalog human-decided settings', () => {
  const byId = Object.fromEntries(BOARD_CATALOG.map((entry) => [entry.id, entry])) as Record<
    ProductBoardId,
    (typeof BOARD_CATALOG)[number]
  >;

  it('16-bead: End-Game/Off centre, default Off; timers default Off', () => {
    const play = byId['16'].play;
    expect(play.centerRuleOptions).toEqual(['off', 'endgame']);
    expect(play.defaultSettings.centerRule).toBe('off');
    expect(play.matchTimerOptions).toEqual(['off', '15', '20', '30']);
    expect(play.matchTimerBest).toBe('20');
    expect(play.defaultSettings.matchTimer).toBe('off');
    expect(play.shotClockOptions).toEqual(['off', '60', '90', '120']);
    expect(play.shotClockBest).toBe('120');
    expect(play.defaultSettings.shotClock).toBe('off');
  });

  it('10-bead and 12-bead: End-Game/Off centre, default Off; timers default Off', () => {
    const twelve = byId['12x6x5'].play;
    expect(twelve.matchTimerOptions).toEqual(['off', '10', '15', '25']);
    expect(twelve.matchTimerBest).toBe('15');
    expect(twelve.shotClockOptions).toEqual(['off', '60', '90', '120']);
    expect(twelve.shotClockBest).toBe('120');

    const ten = byId['10x5'].play;
    expect(ten.matchTimerOptions).toEqual(['off', '10', '15', '25']);
    expect(ten.matchTimerBest).toBe('15');

    for (const id of ['10x5', '12x6x5'] as const) {
      const play = byId[id].play;
      expect(play.centerRuleOptions).toEqual(['off', 'endgame']);
      expect(play.defaultSettings.centerRule).toBe('off');
      expect(play.matchTimerOptions).toEqual(['off', '10', '15', '25']);
      expect(play.defaultSettings.matchTimer).toBe('off');
      expect(play.defaultSettings.shotClock).toBe('off');
    }
  });

  it('6-bead boards: Cumulative/End-Game/Off centre, default Off; timers default Off', () => {
    for (const id of ['6x4', '6x3x5'] as const) {
      const play = byId[id].play;
      expect(play.centerRuleOptions).toEqual(['off', 'cumulative', 'endgame']);
      expect(play.defaultSettings.centerRule).toBe('off');
      expect(play.matchTimerOptions).toEqual(['off', '3', '5', '10']);
      expect(play.matchTimerBest).toBe('5');
      expect(play.defaultSettings.matchTimer).toBe('off');
      expect(play.shotClockOptions).toEqual(['off', '30', '60']);
      expect(play.shotClockBest).toBe('60');
      expect(play.defaultSettings.shotClock).toBe('off');
    }
  });

  it('7-bead: Cumulative/End-Game/Off; 8-bead: End-Game/Off only', () => {
    const seven = byId['7x4x5'].play;
    expect(seven.centerRuleOptions).toEqual(['off', 'cumulative', 'endgame']);
    expect(seven.defaultSettings.centerRule).toBe('off');
    expect(seven.matchTimerOptions).toEqual(['off', '3', '5', '10']);
    expect(seven.matchTimerBest).toBe('10');
    expect(seven.shotClockBest).toBe('60');

    const eight = byId['8x4x6'].play;
    expect(eight.centerRuleOptions).toEqual(['off', 'endgame']);
    expect(eight.defaultSettings.centerRule).toBe('off');
    expect(eight.matchTimerOptions).toEqual(['off', '5', '10', '15']);
    expect(eight.matchTimerBest).toBe('10');
    expect(eight.shotClockOptions).toEqual(['off', '30', '60', '90']);
    expect(eight.shotClockBest).toBe('60');
  });

  it('lists product boards in bead-count dropdown order', () => {
    expect(listProductBoards().map((entry) => entry.id)).toEqual(PRODUCT_BOARD_ORDER);
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
