import {
  buildCoachLessonSettings,
  COACH_VIDEO,
  COACH_VIDEO_BOARD_ID,
  COACH_VIDEO_DURATION_MS,
  COACH_VIDEO_SEGMENT_STARTS_MS,
  coachSpeechForTime,
  findCoachSetupKeyframeForMove,
  formatCoachTime,
} from '../CoachVideoScript';
import { applyCoachVideoHighlight, applyCoachVideoKeyframe } from '../coachVideoBoard';
import { renderCoachPanelHtml } from '../coachPanelRender';
import { FeatureSession } from '../FeatureSession';

describe('CoachVideoScript Video 1 basics (7-bead)', () => {
  it('uses the 7-bead board with a ~3 minute timeline', () => {
    expect(COACH_VIDEO_BOARD_ID).toBe('7');
    expect(COACH_VIDEO.durationMs).toBe(COACH_VIDEO_DURATION_MS);
    expect(COACH_VIDEO_DURATION_MS).toBe(180_000);
    expect(COACH_VIDEO.moves).toHaveLength(11);
    expect(COACH_VIDEO.speeches).toHaveLength(4);
    expect(COACH_VIDEO.highlights).toHaveLength(11);
  });

  it('renders panel copy for move, single, double, and triple', () => {
    const html = renderCoachPanelHtml({
      intro: COACH_VIDEO.intro,
      points: COACH_VIDEO.points,
    });
    expect(html).toContain('Triple capture');
    expect(COACH_VIDEO.points).toHaveLength(4);
  });

  it('waits five seconds before each segment voice line', () => {
    expect(COACH_VIDEO.speeches[0].atMs - COACH_VIDEO_SEGMENT_STARTS_MS[0]).toBe(5000);
    expect(COACH_VIDEO.speeches[1].atMs - COACH_VIDEO_SEGMENT_STARTS_MS[1]).toBe(5000);
    expect(COACH_VIDEO.speeches[2].atMs - COACH_VIDEO_SEGMENT_STARTS_MS[2]).toBe(5000);
    expect(COACH_VIDEO.speeches[3].atMs - COACH_VIDEO_SEGMENT_STARTS_MS[3]).toBe(5000);
  });

  it('scripted moves are legal from their setup keyframes', () => {
    for (const move of COACH_VIDEO.moves) {
      const keyframe = findCoachSetupKeyframeForMove(move, COACH_VIDEO.keyframes, COACH_VIDEO.moves);
      const session = new FeatureSession(COACH_VIDEO_BOARD_ID, buildCoachLessonSettings());
      applyCoachVideoKeyframe(session, keyframe);
      const legal = session.getEngine().getLegalMoves().some((m) => m.from === move.from && m.to === move.to);
      expect(legal).toBe(true);
    }
  });

  it('highlights expose amber targets for each scripted move', () => {
    for (const highlight of COACH_VIDEO.highlights) {
      const session = new FeatureSession(COACH_VIDEO_BOARD_ID, buildCoachLessonSettings());
      applyCoachVideoHighlight(session, COACH_VIDEO.keyframes, highlight);
      expect(session.getSelectedId()).toBe(highlight.selectedId);
      expect(session.getLegalTargetIds().length).toBeGreaterThan(0);
    }
  });

  it('double and triple chains complete on engine', () => {
    const session = new FeatureSession(COACH_VIDEO_BOARD_ID, buildCoachLessonSettings());
    applyCoachVideoKeyframe(session, COACH_VIDEO.keyframes.find((k) => k.atMs === 72_000)!);
    session.getEngine().applyMove({ from: 12, to: 4 });
    session.getEngine().applyMove({ from: 4, to: 6 });
    expect(session.getEngine().getState().captures.RED).toBe(2);

    const tri = new FeatureSession(COACH_VIDEO_BOARD_ID, buildCoachLessonSettings());
    applyCoachVideoKeyframe(tri, COACH_VIDEO.keyframes.find((k) => k.atMs === 94_000)!);
    tri.getEngine().applyMove({ from: 12, to: 4 });
    tri.getEngine().applyMove({ from: 4, to: 6 });
    tri.getEngine().applyMove({ from: 6, to: 14 });
    expect(tri.getEngine().getState().captures.RED).toBe(3);
  });

  it('maps scrub time to segment voice lines', () => {
    expect(coachSpeechForTime(0)).toMatch(/Move/i);
    expect(coachSpeechForTime(40_000)).toMatch(/Single capture/i);
    expect(coachSpeechForTime(80_000)).toMatch(/Double capture/i);
    expect(coachSpeechForTime(100_000)).toMatch(/Triple capture/i);
  });

  it('formats mm:ss labels', () => {
    expect(formatCoachTime(0)).toBe('0:00');
    expect(formatCoachTime(180_000)).toBe('3:00');
  });
});
