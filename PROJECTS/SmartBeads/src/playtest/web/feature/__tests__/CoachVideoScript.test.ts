import { resolveEngineVariant } from '../../../../config/BoardCatalog';

import {

  buildCoachLessonSettings,

  COACH_POST_DEMO_PAUSE_MS,

  COACH_VIDEO,

  COACH_VIDEO_BASICS_END_MS,

  COACH_VIDEO_BOARD_ID,

  COACH_VIDEO_DURATION_MS,

  COACH_VIDEO_ENDING_SEGMENT_STARTS_MS,

  COACH_VIDEO_SEGMENT_BANNERS,

  COACH_VIDEO_TRIPLE_DEMO_MS,

  COACH_VIDEO_TRIPLE_SPEECH_ESTIMATE_MS,

  COACH_VIDEO_TRIPLE_SPEECH_TEXT,

  COACH_VIDEO_WIN_SEGMENT_START_MS,

  coachSegmentBannerUntilMs,

  coachSpeechForTime,

  findCoachCueAtTime,

  findCoachSegmentBannerAtTime,

  findCoachSetupKeyframeForMove,

  formatCoachTime,

} from '../CoachVideoScript';

import { applyCoachVideoHighlight, applyCoachVideoKeyframe } from '../coachVideoBoard';

import { renderCoachPanelHtml } from '../coachPanelRender';

import { FeatureSession } from '../FeatureSession';



describe('CoachVideoScript Video 1 basics (7-bead)', () => {

  it('uses the 7-bead board with an extended ending appendix', () => {

    expect(COACH_VIDEO_BOARD_ID).toBe('7x4x5');

    expect(resolveEngineVariant(COACH_VIDEO_BOARD_ID)).toBe('7');

    expect(COACH_VIDEO.durationMs).toBe(COACH_VIDEO_DURATION_MS);

    expect(COACH_VIDEO_BASICS_END_MS).toBe(56_220);

    expect(COACH_VIDEO_WIN_SEGMENT_START_MS).toBe(

      COACH_VIDEO_TRIPLE_DEMO_MS + COACH_VIDEO_TRIPLE_SPEECH_ESTIMATE_MS + COACH_POST_DEMO_PAUSE_MS,

    );

    expect(COACH_VIDEO.moves).toHaveLength(11);

    expect(COACH_VIDEO.speeches).toHaveLength(3);

    expect(COACH_VIDEO.highlights).toHaveLength(11);

    expect(COACH_VIDEO.points).toHaveLength(7);

    expect(COACH_VIDEO.segmentBanners).toHaveLength(7);

  });



  it('uses SmartBeads branding and 3 s pauses between slide moves', () => {

    expect(COACH_VIDEO_SEGMENT_BANNERS[0].subtitle).toMatch(/SMARTBEADS/i);

    const slideMoves = COACH_VIDEO.moves.slice(0, 3);

    expect(slideMoves[1].atMs - slideMoves[0].atMs).toBe(11_200 - 6_500);

    expect(slideMoves[2].atMs - slideMoves[1].atMs).toBe(15_900 - 11_200);

    expect(COACH_VIDEO.segmentBanners[1].atMs - slideMoves[2].atMs).toBe(

      19_100 - 15_900,

    );

    expect(COACH_VIDEO.segmentBanners[1].atMs - slideMoves[2].atMs).toBeGreaterThanOrEqual(

      COACH_POST_DEMO_PAUSE_MS,

    );

  });



  it('speaks basics voice lines when the first demo move of each segment starts', () => {

    const spokenMoves = COACH_VIDEO.moves.filter((m) => m.speech);

    expect(spokenMoves).toHaveLength(4);

    expect(spokenMoves[0].atMs).toBe(6_500);

    expect(spokenMoves[1].atMs).toBe(25_100);

    expect(spokenMoves[2].atMs).toBe(43_940);

    expect(spokenMoves[3].atMs).toBe(COACH_VIDEO_TRIPLE_DEMO_MS);

    expect(spokenMoves[3].speech).toBe(COACH_VIDEO_TRIPLE_SPEECH_TEXT);

    expect(COACH_VIDEO_TRIPLE_SPEECH_TEXT).toMatch(/while the chain stays open/i);

  });



  it('keeps segment banners visible longer through the demo move without crossing the next banner', () => {
    const moveBanner = COACH_VIDEO_SEGMENT_BANNERS[0];
    expect(coachSegmentBannerUntilMs(moveBanner)).toBe(8_500);
    expect(findCoachSegmentBannerAtTime(8_499)?.title).toBe('MOVE');
    expect(findCoachSegmentBannerAtTime(8_500)).toBeNull();

    const singleBanner = COACH_VIDEO_SEGMENT_BANNERS[1];
    expect(coachSegmentBannerUntilMs(singleBanner)).toBe(27_100);
    expect(findCoachSegmentBannerAtTime(27_099)?.title).toBe('SINGLE CAPTURE');
    expect(findCoachSegmentBannerAtTime(27_100)).toBeNull();
    expect(findCoachSegmentBannerAtTime(19_100)?.title).toBe('SINGLE CAPTURE');
    expect(findCoachSegmentBannerAtTime(19_099)).toBeNull();
  });



  it('renders panel copy for basics and ending rules', () => {

    const html = renderCoachPanelHtml({

      intro: COACH_VIDEO.intro,

      points: COACH_VIDEO.points,

    });

    expect(html).toContain('Triple capture');

    expect(html).toMatch(/four, five, or more/i);

    expect(html).toMatch(/Win —/);

    expect(html).toMatch(/Draw —/);

    expect(html).toMatch(/Resign —/);

  });



  it('scripted moves are legal from their setup keyframes', () => {

    for (const move of COACH_VIDEO.moves) {

      const keyframe = findCoachSetupKeyframeForMove(move, COACH_VIDEO.keyframes, COACH_VIDEO.moves);

      const session = new FeatureSession(resolveEngineVariant(COACH_VIDEO_BOARD_ID), buildCoachLessonSettings());

      applyCoachVideoKeyframe(session, keyframe);

      const legal = session.getEngine().getLegalMoves().some((m) => m.from === move.from && m.to === move.to);

      expect(legal).toBe(true);

    }

  });



  it('highlights expose amber targets for each scripted move', () => {

    for (const highlight of COACH_VIDEO.highlights) {

      const session = new FeatureSession(resolveEngineVariant(COACH_VIDEO_BOARD_ID), buildCoachLessonSettings());

      applyCoachVideoHighlight(session, COACH_VIDEO.keyframes, highlight);

      expect(session.getSelectedId()).toBe(highlight.selectedId);

      expect(session.getLegalTargetIds().length).toBeGreaterThan(0);

    }

  });



  it('double and triple chains complete on engine', () => {

    const session = new FeatureSession(resolveEngineVariant(COACH_VIDEO_BOARD_ID), buildCoachLessonSettings());

    applyCoachVideoKeyframe(session, COACH_VIDEO.keyframes.find((k) => k.atMs === 37_940)!);

    session.getEngine().applyMove({ from: 12, to: 4 });

    session.getEngine().applyMove({ from: 4, to: 6 });

    expect(session.getEngine().getState().captures.RED).toBe(2);



    const tri = new FeatureSession(resolveEngineVariant(COACH_VIDEO_BOARD_ID), buildCoachLessonSettings());

    applyCoachVideoKeyframe(tri, COACH_VIDEO.keyframes.find((k) => k.atMs === 48_100)!);

    tri.getEngine().applyMove({ from: 12, to: 4 });

    tri.getEngine().applyMove({ from: 4, to: 6 });

    tri.getEngine().applyMove({ from: 6, to: 14 });

    expect(tri.getEngine().getState().captures.RED).toBe(3);

  });



  it('maps scrub time to demo and ending voice lines', () => {

    expect(coachSpeechForTime(7_000)).toMatch(/Move/i);

    expect(coachSpeechForTime(26_000)).toMatch(/Single capture/i);

    expect(coachSpeechForTime(44_000)).toMatch(/Double capture/i);

    expect(coachSpeechForTime(55_000)).toMatch(/Triple capture/i);

    expect(coachSpeechForTime(COACH_VIDEO_WIN_SEGMENT_START_MS)).toMatch(/Win/i);

    expect(coachSpeechForTime(COACH_VIDEO_ENDING_SEGMENT_STARTS_MS[1])).toMatch(/Draw/i);

    expect(coachSpeechForTime(COACH_VIDEO_ENDING_SEGMENT_STARTS_MS[2])).toMatch(/Resign/i);

  });



  it('win ending shows beads on board with cream 2 and black 0 captures', () => {

    const win = COACH_VIDEO.keyframes.find((k) => k.atMs === COACH_VIDEO_WIN_SEGMENT_START_MS)!;

    expect(win.captures).toEqual({ RED: 2, BLUE: 0 });

    expect(win.occupants.filter(Boolean).length).toBeGreaterThan(0);

  });



  it('resolves scripted cues for watch-only ending overlays', () => {

    const winCue = findCoachCueAtTime(COACH_VIDEO_WIN_SEGMENT_START_MS + 5_000);

    expect(winCue?.kind).toBe('result');

    if (winCue?.kind === 'result') {

      expect(winCue.snapshot).toBe(true);

      expect(winCue.captures).toEqual({ RED: 2, BLUE: 0 });

    }

    expect(findCoachCueAtTime(COACH_VIDEO_WIN_SEGMENT_START_MS + 7_000)?.kind).toBe('hideModals');

    expect(COACH_VIDEO_ENDING_SEGMENT_STARTS_MS[0]).toBe(COACH_VIDEO_WIN_SEGMENT_START_MS);

  });



  it('formats mm:ss labels', () => {

    expect(formatCoachTime(0)).toBe('0:00');

    expect(formatCoachTime(COACH_VIDEO_DURATION_MS)).toBe(formatCoachTime(102_335));

  });

});


