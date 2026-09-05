import {
  buildCoachLessonSettings,
  COACH_VIDEO,
  COACH_VIDEO_BOARD_ID,
  COACH_VIDEO_DURATION_MS,
  coachSpeechForTime,
  findCoachKeyframeAt,
  findCoachSetupKeyframeForMove,
  formatCoachTime,
} from '../CoachVideoScript';
import { applyCoachVideoKeyframe } from '../coachVideoBoard';
import { renderCoachPanelHtml } from '../coachPanelRender';
import { FeatureSession } from '../FeatureSession';

describe('CoachVideoScript', () => {
  it('locks to the 6-bead 3×5 board with a ~48s paced timeline', () => {
    expect(COACH_VIDEO_BOARD_ID).toBe('6x3x5');
    expect(COACH_VIDEO.durationMs).toBe(COACH_VIDEO_DURATION_MS);
    expect(COACH_VIDEO_DURATION_MS).toBe(48_000);
    expect(COACH_VIDEO.moves).toHaveLength(4);
    expect(COACH_VIDEO.speeches).toHaveLength(3);
  });

  it('each segment starts with three cream and three black beads', () => {
    for (const kf of [COACH_VIDEO.keyframes[0], COACH_VIDEO.keyframes[2], COACH_VIDEO.keyframes[4]]) {
      const red = kf.occupants.filter((o) => o === 'RED').length;
      const blue = kf.occupants.filter((o) => o === 'BLUE').length;
      expect(red).toBe(3);
      expect(blue).toBe(3);
    }
  });

  it('renders labelled panel copy for move, capture, and chain', () => {
    const html = renderCoachPanelHtml({
      intro: COACH_VIDEO.intro,
      points: COACH_VIDEO.points,
    });
    expect(html).toContain('Move —');
    expect(html).toContain('Double capture');
    expect(COACH_VIDEO.points.every((p) => p.length < 80)).toBe(true);
  });

  it('waits five seconds before each segment voice line', () => {
    expect(COACH_VIDEO.speeches[0].atMs - COACH_VIDEO.keyframes[0].atMs).toBe(5000);
    expect(COACH_VIDEO.speeches[1].atMs - COACH_VIDEO.keyframes[2].atMs).toBe(5000);
    expect(COACH_VIDEO.speeches[2].atMs - COACH_VIDEO.keyframes[4].atMs).toBe(5000);
  });

  it('scripted moves are legal from their keyframe setups', () => {
    for (const move of COACH_VIDEO.moves) {
      const keyframe = findCoachSetupKeyframeForMove(move, COACH_VIDEO.keyframes, COACH_VIDEO.moves);
      const session = new FeatureSession(COACH_VIDEO_BOARD_ID, buildCoachLessonSettings());
      applyCoachVideoKeyframe(session, keyframe);
      const engine = session.getEngine();
      const legal = engine.getLegalMoves().some((m) => m.from === move.from && m.to === move.to);
      expect(legal).toBe(true);
    }
  });

  it('double capture chain completes on engine', () => {
    const session = new FeatureSession(COACH_VIDEO_BOARD_ID, buildCoachLessonSettings());
    applyCoachVideoKeyframe(session, COACH_VIDEO.keyframes[4]);
    session.getEngine().applyMove({ from: 11, to: 9 });
    expect(session.getEngine().getChainPieceId()).toBe(9);
    session.getEngine().applyMove({ from: 9, to: 3 });
    expect(session.getEngine().getState().captures.RED).toBe(2);
  });

  it('maps scrub time to segment voice lines', () => {
    expect(coachSpeechForTime(0)).toMatch(/Move/i);
    expect(coachSpeechForTime(16_000)).toMatch(/Single capture/i);
    expect(coachSpeechForTime(31_000)).toMatch(/Double capture/i);
  });

  it('formats mm:ss labels', () => {
    expect(formatCoachTime(0)).toBe('0:00');
    expect(formatCoachTime(65000)).toBe('1:05');
  });
});
