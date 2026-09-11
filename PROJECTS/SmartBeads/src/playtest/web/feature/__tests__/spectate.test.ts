import { FeatureSession } from '../FeatureSession';
import {
  aiLevelForActingPlayer,
  buildCoachWatchSettings,
  COACH_DEFAULT_BOARD_ID,
  SPECTATE_INTER_MOVE_DELAY_MS,
  SPECTATE_INTER_MOVE_DELAY_SMALL_BOARD_MS,
  spectateInterMoveDelayMs,
} from '../GameFeatureSettings';
import { planAiTurnPath } from '../../PlayController';
import { thinkBudgetForLevel } from '../HonestAi';

describe('Coach watch (AI vs AI)', () => {
  it('exports 8-bead default board and board-sized Watch AI inter-move pause', () => {
    expect(COACH_DEFAULT_BOARD_ID).toBe('8x4x6');
    expect(SPECTATE_INTER_MOVE_DELAY_MS).toBe(10_000);
    expect(SPECTATE_INTER_MOVE_DELAY_SMALL_BOARD_MS).toBe(5_000);
    expect(spectateInterMoveDelayMs('6x3x5')).toBe(5_000);
    expect(spectateInterMoveDelayMs('6x4')).toBe(5_000);
    expect(spectateInterMoveDelayMs('7x4x5')).toBe(5_000);
    expect(spectateInterMoveDelayMs('8x4x6')).toBe(5_000);
    expect(spectateInterMoveDelayMs('10x5')).toBe(10_000);
    expect(spectateInterMoveDelayMs('16')).toBe(10_000);
  });

  it('planAiTurnPath uses configured per-side coach levels on 8x4x6', () => {
    const settings = buildCoachWatchSettings({
      coachRedLevel: 3,
      coachBlueLevel: 2,
      centerRule: 'endgame',
    });
    const session = new FeatureSession('8x4x6', settings);
    expect(session.getSettings().mode).toBe('spectate');
    expect(thinkBudgetForLevel(3)).toBeGreaterThan(thinkBudgetForLevel(2));

    const redPath = planAiTurnPath(session, 'RED');
    expect(redPath?.length).toBeGreaterThan(0);
    expect(aiLevelForActingPlayer(settings, 'RED')).toBe(3);

    const engine = session.getEngine();
    engine.getState().currentPlayer = 'BLUE';
    const bluePath = planAiTurnPath(session, 'BLUE');
    expect(bluePath?.length).toBeGreaterThan(0);
    expect(aiLevelForActingPlayer(settings, 'BLUE')).toBe(2);
  });
});
