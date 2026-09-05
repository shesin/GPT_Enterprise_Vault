import type { FeatureSession } from './FeatureSession';
import type { CoachVideoKeyframe } from './CoachVideoScript';

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
