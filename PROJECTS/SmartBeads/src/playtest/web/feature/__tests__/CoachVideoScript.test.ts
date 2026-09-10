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
  COACH_FINISH_CAPTURE_DEMO_MS,
  COACH_FINISH_CAPTURE_DEMO_DURATION_MS,
  COACH_FINISH_CAPTURE_SPEECH_TAIL,
  coachPanelPointIndexAtTime,
  isCoachFinishCaptureDemoActive,

  COACH_VIDEO_WIN_SEGMENT_START_MS,
  COACH_VIDEO_RESIGN_SEGMENT_START_MS,
  COACH_VIDEO_DRAW_SEGMENT_START_MS,
  COACH_RESIGN_DECLINE_CONGRATS_MS,
  COACH_DRAW_RESULT_CUE_MS,
  COACH_WIN_CONGRATS_CUE_MS,
  COACH_WIN_CONGRATS_PHASE_MS,
  COACH_WIN_BOARD_PHASE_MS,

  coachSegmentBannerUntilMs,

  coachSpeechForTime,

  findCoachCueAtTime,

  findCoachKeyframeAfterMove,

  findCoachKeyframeAt,

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

    expect(COACH_VIDEO_BASICS_END_MS).toBe(COACH_VIDEO_WIN_SEGMENT_START_MS);

    expect(COACH_VIDEO_WIN_SEGMENT_START_MS).toBe(
      COACH_FINISH_CAPTURE_DEMO_MS + COACH_FINISH_CAPTURE_DEMO_DURATION_MS,
    );

    expect(COACH_FINISH_CAPTURE_DEMO_MS).toBe(
      COACH_VIDEO_TRIPLE_DEMO_MS + COACH_VIDEO_TRIPLE_SPEECH_ESTIMATE_MS + COACH_POST_DEMO_PAUSE_MS,
    );

    expect(COACH_VIDEO.moves).toHaveLength(11);

    expect(COACH_VIDEO.speeches).toHaveLength(5);

    expect(COACH_VIDEO.highlights).toHaveLength(11);

    expect(COACH_VIDEO.points).toHaveLength(6);

    expect(COACH_VIDEO.segmentBanners).toHaveLength(8);

  });



  it('uses Smart Bead Chess branding and 3 s pauses between slide moves', () => {

    expect(COACH_VIDEO_SEGMENT_BANNERS[0].subtitle).toMatch(/SMART BEAD CHESS/i);

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

    expect(COACH_VIDEO_TRIPLE_SPEECH_TEXT).toMatch(/while captures stay open/i);

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

    expect(html).toMatch(/Watch demo of move, capture, finish capture, win, resign, and draw/i);

    expect(COACH_VIDEO.points[2]).toMatch(/more captures are still open/i);

    expect(html).toMatch(/Win —/);

    expect(html).toMatch(/Resign —/);

    expect(html).toMatch(/Draw —/);

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

  it('coach move highlights match live pick legal targets (no scripted overlay)', () => {
    for (const highlight of COACH_VIDEO.highlights) {
      const session = new FeatureSession(resolveEngineVariant(COACH_VIDEO_BOARD_ID), buildCoachLessonSettings());
      applyCoachVideoHighlight(session, COACH_VIDEO.keyframes, highlight);
      expect(session.getCoachHighlightTargets()).toEqual([]);
      const expected = new Set(
        session.getEngine()
          .getLegalMoves()
          .filter((m) => m.from === highlight.selectedId)
          .map((m) => m.to),
      );
      expect(new Set(session.getLegalTargetIds())).toEqual(expected);
    }
  });

  it('win keyframe uses live selection on first survivor (not coach-only glow)', () => {
    const session = new FeatureSession(resolveEngineVariant(COACH_VIDEO_BOARD_ID), buildCoachLessonSettings());
    const winKf = COACH_VIDEO.keyframes.find((k) => k.atMs === COACH_VIDEO_WIN_SEGMENT_START_MS)!;
    applyCoachVideoKeyframe(session, winKf);
    expect(session.getCoachGlowNodeIds()).toEqual([]);
    expect(session.getCoachHighlightTargets()).toEqual([]);
    expect(session.getSelectedId()).toBe(winKf.glowNodeIds![0]);
    expect(session.getLegalTargetIds().length).toBeGreaterThan(0);
  });

  it('resign board focus uses live selection on the resigning bead', () => {
    const session = new FeatureSession(resolveEngineVariant(COACH_VIDEO_BOARD_ID), buildCoachLessonSettings());
    const resignKf = COACH_VIDEO.keyframes.find((k) => k.atMs === COACH_VIDEO_RESIGN_SEGMENT_START_MS)!;
    applyCoachVideoKeyframe(session, resignKf);
    expect(session.previewScriptedSelection(4)).toBe(true);
    expect(session.getCoachHighlightTargets()).toEqual([]);
    expect(new Set(session.getLegalTargetIds())).toEqual(
      new Set(
        session.getEngine().getLegalMoves().filter((m) => m.from === 4).map((m) => m.to),
      ),
    );
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
    expect(coachSpeechForTime(26_000)).not.toMatch(/Finish capture/i);

    expect(coachSpeechForTime(44_000)).toMatch(/Double capture/i);

    expect(coachSpeechForTime(55_000)).toMatch(/Triple capture/i);
    expect(coachSpeechForTime(COACH_FINISH_CAPTURE_DEMO_MS + 500)).toMatch(
      /Press Finish capture to end your turn early while more captures are still open/i,
    );

    expect(coachSpeechForTime(COACH_VIDEO_WIN_SEGMENT_START_MS)).toMatch(/Capture all opponent beads/i);

    expect(coachSpeechForTime(COACH_VIDEO_RESIGN_SEGMENT_START_MS)).toMatch(/^Resign\./i);

    expect(coachSpeechForTime(COACH_RESIGN_DECLINE_CONGRATS_MS)).toMatch(/Black bead won/i);

    expect(coachSpeechForTime(COACH_VIDEO_DRAW_SEGMENT_START_MS)).toMatch(/^Draw\./i);

  });



  it('highlights one left-panel bullet per segment banner', () => {
    expect(coachPanelPointIndexAtTime(7_000)).toBe(0);
    expect(coachPanelPointIndexAtTime(20_000)).toBe(1);
    expect(coachPanelPointIndexAtTime(40_000)).toBe(1);
    expect(coachPanelPointIndexAtTime(50_000)).toBe(1);
    expect(coachPanelPointIndexAtTime(COACH_FINISH_CAPTURE_DEMO_MS + 500)).toBe(2);
    expect(coachPanelPointIndexAtTime(COACH_VIDEO_WIN_SEGMENT_START_MS + 500)).toBe(3);
  });

  it('Finish capture coach demo spans voice estimate plus post pause', () => {
    expect(isCoachFinishCaptureDemoActive(COACH_FINISH_CAPTURE_DEMO_MS - 1)).toBe(false);
    expect(isCoachFinishCaptureDemoActive(COACH_FINISH_CAPTURE_DEMO_MS)).toBe(true);
    expect(isCoachFinishCaptureDemoActive(
      COACH_FINISH_CAPTURE_DEMO_MS + COACH_FINISH_CAPTURE_DEMO_DURATION_MS - 1,
    )).toBe(true);
    expect(isCoachFinishCaptureDemoActive(
      COACH_FINISH_CAPTURE_DEMO_MS + COACH_FINISH_CAPTURE_DEMO_DURATION_MS,
    )).toBe(false);
    expect(COACH_FINISH_CAPTURE_DEMO_DURATION_MS).toBeGreaterThanOrEqual(8_000);
    expect(COACH_FINISH_CAPTURE_SPEECH_TAIL).toMatch(/more captures are still open/i);
    const emphasized = renderCoachPanelHtml({
      intro: COACH_VIDEO.intro,
      points: COACH_VIDEO.points,
      emphasizedPointIndex: 2,
    });
    expect(emphasized).toContain('coach-point-emphasis');
  });



  it('win ending shows two glowing cream beads and capture score 2 vs 0', () => {

    const win = COACH_VIDEO.keyframes.find((k) => k.atMs === COACH_VIDEO_WIN_SEGMENT_START_MS)!;

    expect(win.captures).toEqual({ RED: 2, BLUE: 0 });

    expect(win.occupants.filter(Boolean)).toHaveLength(2);

    expect(win.occupants.filter((o) => o === 'RED')).toHaveLength(2);

    expect(win.occupants.filter((o) => o === 'BLUE')).toHaveLength(0);

    expect(win.glowNodeIds).toEqual([4, 8]);

  });



  it('keeps WIN banner up for the 10 s board phase', () => {
    const winBanner = COACH_VIDEO_SEGMENT_BANNERS.find((b) => b.title === 'WIN')!;
    expect(coachSegmentBannerUntilMs(winBanner)).toBe(COACH_VIDEO_WIN_SEGMENT_START_MS + COACH_WIN_BOARD_PHASE_MS);
  });



  it('resolves scripted cues for watch-only ending overlays', () => {

    expect(findCoachCueAtTime(COACH_WIN_CONGRATS_CUE_MS - 100)).toBeNull();

    const congratsCue = findCoachCueAtTime(COACH_WIN_CONGRATS_CUE_MS + 100);

    expect(congratsCue?.kind).toBe('result');

    if (congratsCue?.kind === 'result') {

      expect(congratsCue.snapshot).toBe(true);

      expect(congratsCue.phase).toBe('congrats');

      expect(congratsCue.captures).toEqual({ RED: 2, BLUE: 0 });

    }

    expect(findCoachCueAtTime(COACH_WIN_CONGRATS_CUE_MS + COACH_WIN_CONGRATS_PHASE_MS + 100)?.kind).toBe('hideModals');

    expect(COACH_VIDEO_ENDING_SEGMENT_STARTS_MS[0]).toBe(COACH_VIDEO_WIN_SEGMENT_START_MS);

  });



  it('win board phase uses ending keyframe with zero black beads', () => {
    const kf = findCoachKeyframeAt(
      COACH_WIN_CONGRATS_CUE_MS,
      COACH_VIDEO.keyframes,
      COACH_VIDEO.moves,
    );
    expect(kf.atMs).toBe(COACH_VIDEO_WIN_SEGMENT_START_MS);
    expect(kf.occupants.filter((o) => o === 'BLUE')).toHaveLength(0);
    expect(kf.occupants.filter((o) => o === 'RED')).toHaveLength(2);
  });



  it('draw segment reuses the balanced 2 vs 2 resign board', () => {
    const draw = COACH_VIDEO.keyframes.find((k) => k.atMs === COACH_VIDEO_DRAW_SEGMENT_START_MS)!;
    expect(draw.captures).toEqual({ RED: 2, BLUE: 2 });
    expect(draw.occupants.filter((o) => o === 'RED')).toHaveLength(2);
    expect(draw.occupants.filter((o) => o === 'BLUE')).toHaveLength(2);
  });



  it('resolves draw agreed cue after intro speech', () => {
    const before = findCoachCueAtTime(COACH_DRAW_RESULT_CUE_MS - 100);
    expect(before?.kind === 'result' && before?.phase === 'resignAcceptedDraw').toBe(false);
    const drawCue = findCoachCueAtTime(COACH_DRAW_RESULT_CUE_MS + 100);
    expect(drawCue?.kind).toBe('result');
    if (drawCue?.kind === 'result') {
      expect(drawCue.winner).toBe('DRAW');
      expect(drawCue.phase).toBe('resignAcceptedDraw');
    }
  });



  it('resign segment reuses a balanced 2 vs 2 board for both demos', () => {
    const resign = COACH_VIDEO.keyframes.find((k) => k.atMs === COACH_VIDEO_ENDING_SEGMENT_STARTS_MS[1])!;
    expect(resign.captures).toEqual({ RED: 2, BLUE: 2 });
    expect(resign.occupants.filter((o) => o === 'RED')).toHaveLength(2);
    expect(resign.occupants.filter((o) => o === 'BLUE')).toHaveLength(2);
  });



  it('triple chain steps use time-based keyframes without jumping to the finale', () => {
    const midChain = findCoachKeyframeAt(55_000, COACH_VIDEO.keyframes, COACH_VIDEO.moves);
    expect(midChain.atMs).toBe(54_880);
    expect(midChain.atMs).not.toBe(56_220);

    const finale = findCoachKeyframeAt(56_500, COACH_VIDEO.keyframes, COACH_VIDEO.moves);
    expect(finale.atMs).toBe(56_220);
  });



  it('resolves post-hop board from setup keyframe for triple chain hops', () => {
    const hop1 = COACH_VIDEO.moves.find((m) => m.atMs === 54_980)!;
    const hop2 = COACH_VIDEO.moves.find((m) => m.atMs === 55_860)!;
    expect(findCoachKeyframeAfterMove(hop1, COACH_VIDEO.keyframes).atMs).toBe(54_880);
    expect(findCoachKeyframeAfterMove(hop2, COACH_VIDEO.keyframes).atMs).toBe(56_220);

    const tripleDemo = COACH_VIDEO.moves.find((m) => m.atMs === COACH_VIDEO_TRIPLE_DEMO_MS)!;
    expect(findCoachKeyframeAfterMove(tripleDemo, COACH_VIDEO.keyframes).atMs).toBe(54_480);
  });



  it('formats mm:ss labels', () => {

    expect(formatCoachTime(0)).toBe('0:00');

    expect(formatCoachTime(COACH_VIDEO_DURATION_MS)).toBe(formatCoachTime(COACH_VIDEO.durationMs));

  });

});


