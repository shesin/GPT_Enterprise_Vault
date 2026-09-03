import {
  aiLevelForActingPlayer,
  buildCoachWatchSettings,
  clampUiAiLevel,
  COACH_DEFAULT_BOARD_ID,
  COACH_MAX_AI_LEVEL,
  formatAiLevelLabel,
  formatAiLevelSelectOption,
  HUMAN_PVE_MAX_AI_LEVEL,
  MAX_UI_AI_LEVEL,
} from '../GameFeatureSettings';

describe('GameFeatureSettings AI labels', () => {
  it('maps levels 1–3 to Casual / Standard / Expert', () => {
    expect(formatAiLevelLabel(1)).toBe('Casual');
    expect(formatAiLevelLabel(2)).toBe('Standard');
    expect(formatAiLevelLabel(3)).toBe('Expert');
  });

  it('UI caps human PvE and coach at Expert (3)', () => {
    expect(MAX_UI_AI_LEVEL).toBe(3);
    expect(HUMAN_PVE_MAX_AI_LEVEL).toBe(3);
    expect(COACH_MAX_AI_LEVEL).toBe(3);
  });

  it('clampUiAiLevel clamps legacy values into 1–3', () => {
    expect(clampUiAiLevel(5)).toBe(3);
    expect(clampUiAiLevel(0)).toBe(1);
    expect(clampUiAiLevel(2)).toBe(2);
  });
  it('coach UI option labels are numeric 1–3', () => {
    expect(formatAiLevelSelectOption(1, true)).toBe('1');
    expect(formatAiLevelSelectOption(2, true)).toBe('2');
    expect(formatAiLevelSelectOption(3, true)).toBe('3');
    expect(formatAiLevelSelectOption(2, false)).toBe('Standard');
  });
});

describe('GameFeatureSettings coach watch', () => {
  it('defaults to 8-bead board id constant', () => {
    expect(COACH_DEFAULT_BOARD_ID).toBe('8x4x6');
  });

  it('buildCoachWatchSettings maps cream coach + black AI levels', () => {
    const settings = buildCoachWatchSettings({
      coachRedLevel: 2,
      coachBlueLevel: 5,
      matchTimer: '10',
      shotClock: '60',
      centerRule: 'endgame',
    });
    expect(settings.mode).toBe('spectate');
    expect(aiLevelForActingPlayer(settings, 'RED')).toBe(2);
    expect(aiLevelForActingPlayer(settings, 'BLUE')).toBe(3);
    expect(settings.matchTimer).toBe('10');
    expect(settings.shotClock).toBe('60');
    expect(settings.centerRule).toBe('endgame');
  });
});
