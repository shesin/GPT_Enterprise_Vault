// Leaf module (no DOM / session imports) so the AI Web Worker bundle stays small.
import { BoardVariant } from '../../../config/BoardConfig';
import { GameState, Move, Player } from '../../../models/GameState';
import { AiLevel } from './GameFeatureSettings';
import { AiCenterContext, AiTimerContext, selectAiTurnPath } from './HonestAi';

/** Everything the AI search needs, as plain cloneable data so it can run in a Web Worker. */
export interface AiPlanRequest {
  variant: BoardVariant;
  level: AiLevel;
  snap: { state: GameState; chainPieceId: number | null; positionHistory?: Record<string, number> };
  aiPlayer: Player;
  center: AiCenterContext;
  timer: AiTimerContext;
}

/** Pure search step: main thread in tests/fallback, inside the AI Web Worker in the browser. */
export function searchAiPath(req: AiPlanRequest): Move[] | null {
  return selectAiTurnPath(req.variant, req.level, req.snap, req.aiPlayer, {
    center: req.center,
    timer: req.timer,
  });
}
