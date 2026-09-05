import type { FeatureSession } from './FeatureSession';
import type { CoachVideoHighlight, CoachVideoKeyframe } from './CoachVideoScript';
import { findCoachKeyframeByTime } from './CoachVideoScript';

/** Snap the live session to a scripted coach-video board state. */
export function applyCoachVideoKeyframe(session: FeatureSession, keyframe: CoachVideoKeyframe): void {
  const engine = session.getEngine();
  const snap = engine.exportSnapshot();
  const nodes = snap.state.board.intersections;

  for (let i = 0; i < keyframe.occupants.length; i++) {
    nodes[i].occupant = keyframe.occupants[i];
  }

  snap.state.currentPlayer = keyframe.currentPlayer;
  snap.state.captures = { ...keyframe.captures };
  snap.state.gameOver = false;
  snap.state.winner = undefined;
  snap.chainPieceId = keyframe.chainPieceId;
  engine.loadSnapshot(snap);
  session.clearArmedSelection();
}

/** Amber/lime move hints during coach playback (watch-only). */
export function applyCoachVideoHighlight(
  session: FeatureSession,
  keyframes: readonly CoachVideoKeyframe[],
  highlight: CoachVideoHighlight,
): void {
  const keyframe = findCoachKeyframeByTime(highlight.keyframeAtMs, keyframes);
  applyCoachVideoKeyframe(session, keyframe);
  session.setCoachDemoSelection(highlight.selectedId);
}
