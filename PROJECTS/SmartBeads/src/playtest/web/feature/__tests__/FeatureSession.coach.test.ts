import { FeatureSession } from '../FeatureSession';
import { buildCoachLessonSettings } from '../CoachLesson';

describe('FeatureSession coach mode', () => {
  it('6x3x5 coach is watch-only — no human board input', () => {
    const session = new FeatureSession('6x3x5', buildCoachLessonSettings());
    expect(session.getSettings().mode).toBe('coach');
    expect(session.canHumanAct()).toBe(false);
    session.getEngine().getState().currentPlayer = 'RED';
    expect(session.canHumanAct()).toBe(false);
  });
});
