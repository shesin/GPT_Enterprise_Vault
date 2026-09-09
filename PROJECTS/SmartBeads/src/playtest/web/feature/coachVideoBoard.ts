import type { FeatureSession } from './FeatureSession';
import type { CoachVideoHighlight, CoachVideoKeyframe } from './CoachVideoScript';
import { findCoachKeyframeByTime } from './CoachVideoScript';

/** Snap the live session to a scripted coach-video board state. */
export function applyCoachVideoKeyframe(session: FeatureSession, keyframe: CoachVideoKeyframe): void {
  const engine = session.getEngine();
  const snap = engine.exportSnapshot();
  const nodes = snap.state.board.intersections;

  for (const node of nodes) {
    node.occupant = undefined;
  }
  for (let i = 0; i < keyframe.occupants.length; i++) {
    const occupant = keyframe.occupants[i];
    if (occupant !== undefined) {
      nodes[i].occupant = occupant;
    }
  }

  snap.state.currentPlayer = keyframe.currentPlayer;
  snap.state.captures = { ...keyframe.captures };
  snap.state.gameOver = false;
  snap.state.winner = undefined;
  snap.chainPieceId = keyframe.chainPieceId;
  engine.loadSnapshot(snap);
  session.clearArmedSelection();
  const glow = keyframe.glowNodeIds ?? [];
  if (glow.length > 0) {
    session.previewScriptedSelection(glow[0]);
  }
}

/** Amber/lime move hints during coach playback (watch-only). */
export function applyCoachVideoHighlight(
  session: FeatureSession,
  keyframes: readonly CoachVideoKeyframe[],
  highlight: CoachVideoHighlight,
): void {
  const keyframe = findCoachKeyframeByTime(highlight.keyframeAtMs, keyframes);
  applyCoachVideoKeyframe(session, keyframe);
  session.previewScriptedSelection(highlight.selectedId);
}
