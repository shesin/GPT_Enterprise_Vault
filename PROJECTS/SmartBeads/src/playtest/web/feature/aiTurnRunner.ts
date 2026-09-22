import { Move, Player } from '../../../models/GameState';
import {
  aiLevelForActingPlayer,
  effectiveCenterRule,
  isHumanVsAiMode,
  isTournamentTimerActive,
  parseTimerSeconds,
} from './GameFeatureSettings';
import { applyAiHops, AiHopRecord } from './aiTurnPath';
import { FeatureSession } from './FeatureSession';
import { selectAiTurnPath, thinkBudgetForLevel, AiCenterContext, AiTimerContext } from './HonestAi';

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
  const settings = session.getSettings();
  const tournament = isTournamentTimerActive(settings);
  const timerLimitSec = parseTimerSeconds(tournament ? settings.tournamentTimer : settings.timer);
  return {
    timerLimitSec,
    globalRemainingSec: session.getGlobalMatchRemaining(),
    redRemainingSec: session.getP1Clock(),
    blueRemainingSec: session.getP2Clock(),
    usePerSideClocks: tournament,
  };
}

/**
 * Choose an AI path without throwing.
 * Never silently downgrade Hard/Medium to Easy — that broke the difficulty contract.
 * Only emergency fallback: first legal hop if search returns empty.
 * Center + match timer rules are passed so eval matches session scoring.
 */
export function planAiTurnPath(session: FeatureSession, actingPlayer?: Player): Move[] | null {
  const settings = session.getSettings();
  const aiPlayer = actingPlayer ?? session.getAiPlayer();
  const level = aiLevelForActingPlayer(settings, aiPlayer);
  const variant = session.getBoardVariant();
  const snap = session.getEngine().exportSnapshot();
  const center = aiCenterFromSession(session);
  const timer = aiTimerFromSession(session);
  try {
    const planned = selectAiTurnPath(variant, level, snap, aiPlayer, {
      budgetMs: thinkBudgetForLevel(level, variant),
      center,
      timer,
    });
    if (planned?.length) return planned;
  } catch {
    /* fall through to emergency legal hop — do not substitute Easy search */
  }
  const legal = session.getEngine().getLegalMoves();
  return legal.length ? [legal[0]!] : null;
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
