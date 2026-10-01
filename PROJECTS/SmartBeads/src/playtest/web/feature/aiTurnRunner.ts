import { Move, Player } from '../../../models/GameState';
import {
  aiLevelForActingPlayer,
  effectiveCenterRule,
  isHumanVsAiMode,
  parseTimerSeconds,
} from './GameFeatureSettings';
import { applyAiHops, AiHopRecord } from './aiTurnPath';
import { FeatureSession } from './FeatureSession';
import { AiCenterContext, AiTimerContext } from './HonestAi';
import { AiPlanRequest, searchAiPath } from './aiSearch';

export type { AiPlanRequest };
export { searchAiPath };

/** After a hop lands, the live AI loop continues only while a chain is still open. */
export function shouldContinueAiTurn(chainPieceId: number | null, hopsRemaining: number): boolean {
  return chainPieceId !== null && hopsRemaining > 0;
}

/**
 * Capture optionality: AI may stop while follow-up jumps still exist.
 * Humans use Finish capture; AI has no button, so the sequencer must end the turn.
 * Leaving the chain open keeps currentPlayer = BLUE and the shell sticks on “AI is thinking…”.
 */
export function completeAiTurnIfChainOpen(session: FeatureSession): void {
  if (!session.isGameOver() && session.getEngine().getChainPieceId() !== null) {
    session.finishChain();
  }
}

export function aiCenterFromSession(session: FeatureSession): AiCenterContext {
  const settings = session.getSettings();
  const scores = session.getCenterDisplayScores();
  return {
    centerRule: effectiveCenterRule(settings),
    cumulativeRed: scores.red,
    cumulativeBlue: scores.blue,
  };
}

export function aiTimerFromSession(session: FeatureSession): AiTimerContext {
  return {
    timerLimitSec: parseTimerSeconds(session.getSettings().timer),
    globalRemainingSec: session.getGlobalMatchRemaining(),
  };
}

export function buildAiPlanRequest(session: FeatureSession, actingPlayer?: Player): AiPlanRequest {
  const settings = session.getSettings();
  const aiPlayer = actingPlayer ?? session.getAiPlayer();
  const level = aiLevelForActingPlayer(settings, aiPlayer);
  const variant = session.getBoardVariant();
  return {
    variant,
    level,
    snap: session.getEngine().exportSnapshot(),
    aiPlayer,
    center: aiCenterFromSession(session),
    timer: aiTimerFromSession(session),
  };
}

/**
 * Last resort when the search itself failed or returned nothing: first legal hop.
 * Never silent — the failure is always logged so a real search bug cannot hide as "weak AI".
 */
export function emergencyLegalPath(session: FeatureSession, reason: unknown): Move[] | null {
  const legal = session.getEngine().getLegalMoves();
  if (!legal.length) return null; // genuinely no moves — not a failure
  console.error('[AI] search failed or returned no move; using emergency first legal hop.', reason);
  return [legal[0]!];
}

/**
 * Choose an AI path without throwing.
 * Never silently downgrade Hard/Medium to Easy — that broke the difficulty contract.
 * Only emergency fallback (logged): first legal hop if search throws or returns empty.
 * Center + match timer rules are passed so eval matches session scoring.
 */
export function planAiTurnPath(session: FeatureSession, actingPlayer?: Player): Move[] | null {
  try {
    const planned = searchAiPath(buildAiPlanRequest(session, actingPlayer));
    if (planned?.length) return planned;
    return emergencyLegalPath(session, 'search returned an empty path');
  } catch (err) {
    return emergencyLegalPath(session, err);
  }
}

/**
 * Live AI turn sequencer (same continue/stop as the play-shell hop loop).
 * Animation is not used — engine rules must hold with the renderer unplugged.
 * Pass `path` to inject hops (leftover/stale cases). Omit it to use planAiTurnPath.
 */
export function runAiTurn(session: FeatureSession, path?: Move[] | null): AiHopRecord[] {
  const settings = session.getSettings();
  const aiPlayer = session.getAiPlayer();
  if (
    session.isGameOver() ||
    !isHumanVsAiMode(settings.mode) ||
    session.getEngine().getState().currentPlayer !== aiPlayer
  ) {
    throw new Error('stale hop: AI turn is not live');
  }

  const planned = path === undefined ? planAiTurnPath(session) : path;

  if (!planned?.length) {
    if (path === undefined) {
      session.endGameByFeature('RED', 'AI has no legal moves.');
      return [];
    }
    throw new Error('stale hop: empty leftover path');
  }

  const records: AiHopRecord[] = [];
  for (let i = 0; i < planned.length; i++) {
    if (i > 0 && !shouldContinueAiTurn(session.getEngine().getChainPieceId(), planned.length - i)) {
      break;
    }
    const hopRecords = applyAiHops(session, [planned[i]!], aiPlayer);
    records.push({ ...hopRecords[0]!, index: i });
    if (!shouldContinueAiTurn(session.getEngine().getChainPieceId(), planned.length - (i + 1))) {
      break;
    }
  }
  completeAiTurnIfChainOpen(session);
  return records;
}
