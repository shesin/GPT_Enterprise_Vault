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

  it('16-bead: End-Game/Off centre; 3 min in match timer options; default off', () => {
    const play = byId['16'].play;
    expect(play.centerRuleOptions).toEqual(['off', 'endgame']);
    expect(play.defaultSettings.centerRule).toBe('off');
    expect(play.timerOptions).toEqual(['off', '3', '15', '20', '30']);
    expect(play.timerBest).toBe('20');
    expect(play.defaultSettings.timer).toBe('off');
    expect(play.defaultSettings.tournamentTimer).toBe('off');
    expect(play.shotClockOptions).toEqual(['off', '60', '90', '120']);
    expect(play.shotClockBest).toBe('120');
    expect(play.defaultSettings.shotClock).toBe('off');
  });

  it('10-bead and 12-bead: End-Game/Off centre; 3 min in options; default off', () => {
    const twelve = byId['12x6x5'].play;
    expect(twelve.timerOptions).toEqual(['off', '3', '10', '15', '25']);
    expect(twelve.timerBest).toBe('15');
    expect(twelve.shotClockOptions).toEqual(['off', '60', '90', '120']);
    expect(twelve.shotClockBest).toBe('120');

    const ten = byId['10x5'].play;
    expect(ten.timerOptions).toEqual(['off', '3', '10', '15', '25']);
    expect(ten.timerBest).toBe('15');

    for (const id of ['10x5', '12x6x5'] as const) {
      const play = byId[id].play;
      expect(play.centerRuleOptions).toEqual(['off', 'endgame']);
      expect(play.defaultSettings.centerRule).toBe('off');
      expect(play.defaultSettings.timer).toBe('off');
    expect(play.defaultSettings.tournamentTimer).toBe('off');
      expect(play.defaultSettings.shotClock).toBe('off');
    }
  });

  it('6-bead boards: Cumulative/End-Game/Off centre; 3 min in options; default off', () => {
    for (const id of ['6x4', '6x3x5'] as const) {
      const play = byId[id].play;
      expect(play.centerRuleOptions).toEqual(['off', 'cumulative', 'endgame']);
      expect(play.defaultSettings.centerRule).toBe('off');
      expect(play.timerOptions).toEqual(['off', '3', '5', '10']);
      expect(play.timerBest).toBe('5');
      expect(play.defaultSettings.timer).toBe('off');
    expect(play.defaultSettings.tournamentTimer).toBe('off');
      expect(play.shotClockOptions).toEqual(['off', '30', '60']);
      expect(play.shotClockBest).toBe('60');
      expect(play.defaultSettings.shotClock).toBe('off');
    }
  });

  it('7-bead: Cumulative/End-Game/Off; 8-bead: End-Game/Off; 3 min in options; default off', () => {
    const seven = byId['7x4x5'].play;
    expect(seven.centerRuleOptions).toEqual(['off', 'cumulative', 'endgame']);
    expect(seven.defaultSettings.centerRule).toBe('off');
    expect(seven.timerOptions).toEqual(['off', '3', '5', '10']);
    expect(seven.timerBest).toBe('10');
    expect(seven.defaultSettings.timer).toBe('off');
    expect(seven.defaultSettings.tournamentTimer).toBe('off');
    expect(seven.shotClockBest).toBe('60');

    const eight = byId['8x4x6'].play;
    expect(eight.centerRuleOptions).toEqual(['off', 'endgame']);
    expect(eight.defaultSettings.centerRule).toBe('off');
    expect(eight.timerOptions).toEqual(['off', '3', '5', '10', '15']);
    expect(eight.timerBest).toBe('10');
    expect(eight.defaultSettings.timer).toBe('off');
    expect(eight.defaultSettings.tournamentTimer).toBe('off');
    expect(eight.shotClockOptions).toEqual(['off', '30', '60', '90']);
    expect(eight.shotClockBest).toBe('60');
  });

  it('lists product boards in bead-count dropdown order', () => {
    expect(listProductBoards().map((entry) => entry.id)).toEqual(PRODUCT_BOARD_ORDER);
  });

  it('exposes timer and shot-clock option lists for every playable board', () => {
    for (const entry of BOARD_CATALOG.filter((b) => b.playable)) {
      const play = getPlayConfig(entry.id);
      expect(play.timerOptions.length).toBeGreaterThan(0);
      expect(play.shotClockOptions.length).toBeGreaterThan(0);
      expect(play.timerOptions).toContain(play.defaultSettings.timer);
      expect(play.shotClockOptions).toContain(play.defaultSettings.shotClock);
      expect(play.centerRuleOptions).toContain(play.defaultSettings.centerRule);
    }
  });
});
