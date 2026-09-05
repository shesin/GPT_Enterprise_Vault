import { COACH_VIDEO, findCoachKeyframeByTime } from '../src/playtest/web/feature/CoachVideoScript';
import { applyCoachVideoHighlight, applyCoachVideoKeyframe } from '../src/playtest/web/feature/coachVideoBoard';
import { FeatureSession } from '../src/playtest/web/feature/FeatureSession';
import { buildCoachLessonSettings } from '../src/playtest/web/feature/CoachVideoScript';

for (const move of COACH_VIDEO.moves) {
  const kf = findCoachKeyframeByTime(move.setupAtMs, COACH_VIDEO.keyframes);
  const session = new FeatureSession('7', buildCoachLessonSettings());
  applyCoachVideoKeyframe(session, kf);
  const legal = session.getEngine().getLegalMoves().some((m) => m.from === move.from && m.to === move.to);
  if (!legal) console.log('FAIL move', move, 'kf at', kf.atMs);
}

for (const h of COACH_VIDEO.highlights) {
  const session = new FeatureSession('7', buildCoachLessonSettings());
  applyCoachVideoHighlight(session, COACH_VIDEO.keyframes, h);
  const n = session.getLegalTargetIds().length;
  if (n === 0) console.log('FAIL highlight', h, 'chain', session.getEngine().getChainPieceId());
}
