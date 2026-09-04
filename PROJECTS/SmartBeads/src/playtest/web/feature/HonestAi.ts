import { BoardVariant } from '../../../config/BoardConfig';
import { SmartBeadsEngine } from '../../../core/SmartBeadsEngine';
import { findJumpPath, GameState, Move, Player } from '../../../models/GameState';
import { AiLevel, CenterRule, GameMode } from './GameFeatureSettings';
import { countCenterOccupancy } from './centerScoring';

export interface TurnEnd {
  snapshot: { state: GameState; chainPieceId: number | null };
  path: Move[];
}

/**
 * Easy soft-miss rate: when not playing pure capture-greedy, still prefers a capture
 * if any exist (not a totally random silly move). ~30% of turns.
 */
export const EASY_SOFT_MISS_RATE = 0.30;

/**
 * Medium soft-miss (~20%): keeps Medium softer than Hard on boards where 1-ply vs
 * 2-ply otherwise feel the same (e.g. 8-bead). Hard must use 0 soft-miss.
 */
export const MEDIUM_SOFT_MISS_RATE = 0.20;

/** Weight for center seats in static eval when centerRule is on. */
export const CENTER_EVAL_WEIGHT = 28;

export interface AiCenterContext {
  centerRule: CenterRule;
  /** Running cumulative scores (used when centerRule === 'cumulative'). */
  cumulativeRed?: number;
  cumulativeBlue?: number;
}

/** Match timer state for AI eval — shot clock intentionally omitted (AI moves too fast). */
export interface AiMatchTimerContext {
  matchLimitSec: number;
  /** PvE / spectate shared countdown; 0 when per-side clocks are used. */
  globalRemainingSec: number;
  redRemainingSec: number;
  blueRemainingSec: number;
  mode: GameMode;
}

export const MATCH_TIMER_OFF: AiMatchTimerContext = {
  matchLimitSec: 0,
  globalRemainingSec: 0,
  redRemainingSec: 0,
  blueRemainingSec: 0,
  mode: 'pve',
};

export interface SelectAiOptions {
  budgetMs?: number;
  rng?: () => number;
  easySoftMissRate?: number;
  mediumSoftMissRate?: number;
  center?: AiCenterContext;
  matchTimer?: AiMatchTimerContext;
}

export interface SearchCompletionReport {
  targetReplyPlies: number;
  achievedReplyPlies: number;
  rootMoveCount: number;
  completeAtAchievedDepth: number;
}

interface MinimaxResult {
  score: number;
  complete: boolean;
}

const BOARD_THINK_MULTIPLIER: Partial<Record<BoardVariant, number>> = {
  '16': 1.55,
  '12x6x5': 1.3,
  '10x5': 1.15,
  '8x4x6': 1.1,
  '7x4x5': 1.05,
};

function opponentOf(player: Player): Player {
  return player === 'RED' ? 'BLUE' : 'RED';
}

function isJump(state: GameState, move: Move): boolean {
  return findJumpPath(state.board, move.from, move.to) !== undefined;
}

function pathCaptureCount(state: GameState, path: Move[]): number {
  let n = 0;
  for (const move of path) {
    if (isJump(state, move)) n += 1;
  }
  return n;
}

function countPieces(state: GameState, player: Player): number {
  return state.board.intersections.filter((p) => p.occupant === player).length;
}

function mobility(variant: BoardVariant, state: GameState, player: Player): number {
  const eng = new SmartBeadsEngine(variant);
  eng.loadSnapshot({
    state: { ...state, currentPlayer: player, board: state.board },
    chainPieceId: null,
  });
  return eng.getLegalMoves().length;
}

function centerScoreForPlayer(
  state: GameState,
  player: Player,
  center: AiCenterContext | undefined,
): number {
  if (!center || center.centerRule === 'off') return 0;
  const occ = countCenterOccupancy(state.board, player);
  if (center.centerRule === 'endgame') return occ;
  const cum = player === 'RED' ? (center.cumulativeRed ?? 0) : (center.cumulativeBlue ?? 0);
  return cum + occ;
}

export function matchTimerActive(matchTimer: AiMatchTimerContext | undefined): boolean {
  return !!matchTimer && matchTimer.matchLimitSec > 0;
}

/** 0 = plenty of time, 1 = critical (match about to force score/end). */
function timerUrgency(matchTimer: AiMatchTimerContext | undefined, aiPlayer: Player): number {
  if (!matchTimerActive(matchTimer)) return 0;
  const t = matchTimer!;

  if (t.mode === 'pvp') {
    const aiSec = aiPlayer === 'RED' ? t.redRemainingSec : t.blueRemainingSec;
    const limit = t.matchLimitSec;
    if (aiSec <= 0) return 1;
    const frac = aiSec / limit;
    if (frac >= 0.2) return 0;
    return 1 - frac / 0.2;
  }

  const frac = t.globalRemainingSec / t.matchLimitSec;
  if (frac >= 0.12) return 0;
  return 1 - frac / 0.12;
}

function centerEvalWeight(
  state: GameState,
  aiPlayer: Player,
  center: AiCenterContext | undefined,
  matchTimer: AiMatchTimerContext | undefined,
): number {
  if (!center || center.centerRule === 'off') return 0;

  let weight = CENTER_EVAL_WEIGHT;
  const urgency = timerUrgency(matchTimer, aiPlayer);
  if (urgency > 0) {
    const capDiff = Math.abs(state.captures.RED - state.captures.BLUE);
    if (capDiff <= 1) weight += Math.round(urgency * 42);
    else if (capDiff <= 2) weight += Math.round(urgency * 18);
  }
  return weight;
}

function matchTimerEvalAdjust(
  state: GameState,
  aiPlayer: Player,
  matchTimer: AiMatchTimerContext | undefined,
): number {
  if (!matchTimerActive(matchTimer)) return 0;
  const human = opponentOf(aiPlayer);
  const urgency = timerUrgency(matchTimer, aiPlayer);
  let adj = 0;

  if (matchTimer!.mode === 'pvp') {
    const aiSec = aiPlayer === 'RED' ? matchTimer!.redRemainingSec : matchTimer!.blueRemainingSec;
    const oppSec = aiPlayer === 'RED' ? matchTimer!.blueRemainingSec : matchTimer!.redRemainingSec;
    const lead = aiSec - oppSec;
    if (lead > 45) adj += 10;
    else if (lead < -45) adj -= 12;
    else if (lead < -20) adj -= 6;
    return adj;
  }

  if (urgency > 0) {
    const capLead = state.captures[aiPlayer] - state.captures[human];
    if (capLead < 0) adj -= Math.round(urgency * 24);
    else if (capLead > 0) adj += Math.round(urgency * 12);
  }
  return adj;
}

/**
 * Material + mobility + center (when rule is on) + match-timer pressure.
 * Center must be valued whenever Cumulative/Endgame is enabled — feature cannot be half-wired.
 */
export function evaluate(
  state: GameState,
  variant: BoardVariant,
  aiPlayer: Player = 'BLUE',
  center?: AiCenterContext,
  matchTimer?: AiMatchTimerContext,
): number {
  const human = opponentOf(aiPlayer);
  const aiCount = countPieces(state, aiPlayer);
  const humanCount = countPieces(state, human);
  if (humanCount === 0) return 10000;
  if (aiCount === 0) return -10000;

  const aiMob = mobility(variant, state, aiPlayer);
  const humanMob = mobility(variant, state, human);
  let score = (aiCount - humanCount) * 48 + (aiMob - humanMob) * 1.5;

  if (center && center.centerRule !== 'off') {
    const aiC = centerScoreForPlayer(state, aiPlayer, center);
    const humanC = centerScoreForPlayer(state, human, center);
    score += (aiC - humanC) * centerEvalWeight(state, aiPlayer, center, matchTimer);
  }

  score += matchTimerEvalAdjust(state, aiPlayer, matchTimer);
  return score;
}

/**
 * Opponent complete-turn reply depth:
 * Easy = 0, Medium = 1, Hard = 2.
 */
export function aiOpponentReplyPlies(level: AiLevel): number {
  if (level <= 1) return 0;
  if (level === 2) return 1;
  return 2;
}

function replyBranchForLevel(level: AiLevel): number {
  if (level >= 5) return 160;
  if (level >= 4) return 110;
  if (level >= 3) return 80;
  if (level === 2) return 64;
  return 60;
}

function getFollowUpJumps(
  variant: BoardVariant,
  snapshot: { state: GameState; chainPieceId: number | null },
): Move[] {
  if (snapshot.chainPieceId === null) return [];
  const eng = new SmartBeadsEngine(variant);
  eng.loadSnapshot(snapshot);
  return eng.getLegalMoves().filter((m) => isJump(snapshot.state, m));
}

export function generateTurnEnds(
  variant: BoardVariant,
  snapshot: { state: GameState; chainPieceId: number | null },
  player: Player,
  maxBranch: number,
  deadlineMs = Infinity,
): TurnEnd[] {
  const eng = new SmartBeadsEngine(variant);
  eng.loadSnapshot({ ...snapshot, state: { ...snapshot.state, currentPlayer: player }, chainPieceId: null });
  const root = eng.getLegalMoves().slice();
  root.sort((a, b) => (isJump(snapshot.state, b) ? 1 : 0) - (isJump(snapshot.state, a) ? 1 : 0));

  const ends: TurnEnd[] = [];
  const branchCap = Number.isFinite(maxBranch) ? maxBranch : root.length + 512;

  for (const move of root) {
    if (ends.length > 0 && Date.now() > deadlineMs) return ends;
    const afterEng = new SmartBeadsEngine(variant);
    afterEng.loadSnapshot({ ...snapshot, state: { ...snapshot.state, currentPlayer: player }, chainPieceId: null });
    afterEng.applyMove(move);
    const afterSnap = afterEng.exportSnapshot();
    ends.push({ snapshot: afterSnap, path: [move] });
    if (ends.length >= branchCap) return ends;

    if (!isJump(snapshot.state, move)) continue;

    const stack: Array<{ snap: { state: GameState; chainPieceId: number | null }; path: Move[]; depth: number }> = [
      { snap: afterSnap, path: [move], depth: 1 },
    ];

    while (stack.length) {
      if (Date.now() > deadlineMs) return ends;
      const node = stack.pop()!;
      if (node.depth > 8) continue;
      const jumps = getFollowUpJumps(variant, node.snap);
      for (const hop of jumps) {
        const hopEng = new SmartBeadsEngine(variant);
        hopEng.loadSnapshot(node.snap);
        hopEng.applyMove(hop);
        const hopSnap = hopEng.exportSnapshot();
        const path = node.path.concat(hop);
        ends.push({ snapshot: hopSnap, path });
        stack.push({ snap: hopSnap, path, depth: node.depth + 1 });
        if (ends.length >= branchCap) return ends;
      }
    }
  }

  return ends;
}

function minimaxTurns(
  variant: BoardVariant,
  snapshot: { state: GameState; chainPieceId: number | null },
  depth: number,
  maximizing: boolean,
  alpha: number,
  beta: number,
  branchCap: number,
  aiPlayer: Player,
  deadlineMs: number,
  center: AiCenterContext | undefined,
  matchTimer: AiMatchTimerContext | undefined,
): MinimaxResult {
  if (Date.now() > deadlineMs) {
    return { score: evaluate(snapshot.state, variant, aiPlayer, center, matchTimer), complete: false };
  }
  if (depth === 0) {
    return { score: evaluate(snapshot.state, variant, aiPlayer, center, matchTimer), complete: true };
  }

  const player = maximizing ? aiPlayer : opponentOf(aiPlayer);
  const ends = generateTurnEnds(variant, snapshot, player, branchCap, deadlineMs);
  if (!ends.length) {
    return { score: maximizing ? -900 : 900, complete: true };
  }

  if (maximizing) {
    let best = -Infinity;
    let complete = true;
    for (const end of ends) {
      if (Date.now() > deadlineMs) {
        complete = false;
        break;
      }
      const child = minimaxTurns(
        variant, end.snapshot, depth - 1, false, alpha, beta, branchCap, aiPlayer, deadlineMs, center, matchTimer,
      );
      if (!child.complete) complete = false;
      if (child.score > best) best = child.score;
      if (child.score > alpha) alpha = child.score;
      if (beta <= alpha) break;
    }
    return { score: best, complete };
  }

  let best = Infinity;
  let complete = true;
  for (const end of ends) {
    if (Date.now() > deadlineMs) {
      complete = false;
      break;
    }
    const child = minimaxTurns(
      variant, end.snapshot, depth - 1, true, alpha, beta, branchCap, aiPlayer, deadlineMs, center, matchTimer,
    );
    if (!child.complete) complete = false;
    if (child.score < best) best = child.score;
    if (child.score < beta) beta = child.score;
    if (beta <= alpha) break;
  }
  return { score: best, complete };
}

function scoreRootEnd(
  variant: BoardVariant,
  snapshot: GameState,
  end: TurnEnd,
  replyDepth: number,
  replyBranch: number,
  aiPlayer: Player,
  deadlineMs: number,
  center: AiCenterContext | undefined,
  matchTimer: AiMatchTimerContext | undefined,
): MinimaxResult {
  if (replyDepth <= 0) {
    return {
      score: evaluate(end.snapshot.state, variant, aiPlayer, center, matchTimer),
      complete: true,
    };
  }
  return minimaxTurns(
    variant,
    end.snapshot,
    replyDepth,
    false,
    -Infinity,
    Infinity,
    replyBranch,
    aiPlayer,
    deadlineMs,
    center,
    matchTimer,
  );
}

function endScore(end: TurnEnd, snapshotState: GameState, result: MinimaxResult): number {
  return result.score + pathCaptureCount(snapshotState, end.path) * 0.05;
}

function normalizeOptions(budgetMsOrOptions: number | SelectAiOptions): Required<SelectAiOptions> {
  if (typeof budgetMsOrOptions === 'number') {
    return {
      budgetMs: budgetMsOrOptions,
      rng: Math.random,
      easySoftMissRate: EASY_SOFT_MISS_RATE,
      mediumSoftMissRate: MEDIUM_SOFT_MISS_RATE,
      center: { centerRule: 'off' },
      matchTimer: MATCH_TIMER_OFF,
    };
  }
  return {
    budgetMs: budgetMsOrOptions.budgetMs ?? 1500,
    rng: budgetMsOrOptions.rng ?? Math.random,
    easySoftMissRate: budgetMsOrOptions.easySoftMissRate ?? EASY_SOFT_MISS_RATE,
    mediumSoftMissRate: budgetMsOrOptions.mediumSoftMissRate ?? MEDIUM_SOFT_MISS_RATE,
    center: budgetMsOrOptions.center ?? { centerRule: 'off' },
    matchTimer: budgetMsOrOptions.matchTimer ?? MATCH_TIMER_OFF,
  };
}

/** Max-capture pool; tie-break by center when rule is on (Easy contract). */
function bestCapturePool(
  ends: TurnEnd[],
  snapshotState: GameState,
  aiPlayer: Player,
  center: AiCenterContext | undefined,
): TurnEnd[] {
  let bestCaps = -1;
  let pool: TurnEnd[] = [];
  for (const end of ends) {
    const captures = pathCaptureCount(snapshotState, end.path);
    if (captures > bestCaps) {
      bestCaps = captures;
      pool = [end];
    } else if (captures === bestCaps) {
      pool.push(end);
    }
  }
  if (pool.length <= 1 || !center || center.centerRule === 'off') return pool;

  let bestCenter = -Infinity;
  let bestPool: TurnEnd[] = [];
  for (const end of pool) {
    const c = centerScoreForPlayer(end.snapshot.state, aiPlayer, center);
    if (c > bestCenter) {
      bestCenter = c;
      bestPool = [end];
    } else if (c === bestCenter) {
      bestPool.push(end);
    }
  }
  return bestPool.length ? bestPool : pool;
}

/** Capture-aware soft miss used by Easy (always) and Medium (probabilistic). */
function softMissPath(
  ends: TurnEnd[],
  snapshotState: GameState,
  rng: () => number,
): Move[] {
  const withCaps = ends.filter((e) => pathCaptureCount(snapshotState, e.path) > 0);
  if (withCaps.length > 0) return pickRandomEnd(withCaps, rng);
  return pickRandomEnd(ends, rng);
}

/** Hard/Expert: extend think time up to this cap so depth-2 never falls back. */
const MAX_DEPTH2_SEARCH_MS = 45_000;
const MAX_DEPTH2_SEARCH_MS_TIER5 = 60_000;

function maxSearchBudgetMs(level: AiLevel): number {
  return level >= 5 ? MAX_DEPTH2_SEARCH_MS_TIER5 : MAX_DEPTH2_SEARCH_MS;
}

function searchLayerAtExactDepth(
  variant: BoardVariant,
  snapshot: { state: GameState; chainPieceId: number | null },
  ends: TurnEnd[],
  reply: number,
  replyBranch: number,
  aiPlayer: Player,
  deadlineMs: number,
  center: AiCenterContext | undefined,
  matchTimer: AiMatchTimerContext | undefined,
): { best: TurnEnd[]; completeCount: number } {
  if (reply <= 0) {
    let best: TurnEnd[] = [];
    let bestScore = -Infinity;
    for (const end of ends) {
      const score = endScore(end, snapshot.state, {
        score: evaluate(end.snapshot.state, variant, aiPlayer, center, matchTimer),
        complete: true,
      });
      if (score > bestScore) {
        bestScore = score;
        best = [end];
      } else if (score === bestScore) {
        best.push(end);
      }
    }
    return { best: best.length ? best : [ends[0]], completeCount: ends.length };
  }

  let best: TurnEnd[] = [];
  let bestScore = -Infinity;
  let completeCount = 0;

  for (const end of ends) {
    const result = scoreRootEnd(
      variant, snapshot.state, end, reply, replyBranch, aiPlayer, deadlineMs, center, matchTimer,
    );
    if (!result.complete) continue;
    completeCount += 1;
    const score = endScore(end, snapshot.state, result);
    if (score > bestScore) {
      bestScore = score;
      best = [end];
    } else if (score === bestScore) {
      best.push(end);
    }
  }

  return { best, completeCount };
}

function searchBestAtExactDepth(
  variant: BoardVariant,
  snapshot: { state: GameState; chainPieceId: number | null },
  ends: TurnEnd[],
  reply: number,
  replyBranch: number,
  aiPlayer: Player,
  startBudgetMs: number,
  level: AiLevel,
  center: AiCenterContext | undefined,
  matchTimer: AiMatchTimerContext | undefined,
): { best: TurnEnd[]; achievedReplyPlies: number; completeAtAchievedDepth: number } {
  const maxBudget = Math.max(startBudgetMs, maxSearchBudgetMs(level));
  let budgetMs = startBudgetMs;

  while (budgetMs <= maxBudget) {
    const deadlineMs = Date.now() + budgetMs;
    const layer = searchLayerAtExactDepth(
      variant, snapshot, ends, reply, replyBranch, aiPlayer, deadlineMs, center, matchTimer,
    );
    if (layer.completeCount === ends.length && layer.best.length) {
      return {
        best: layer.best,
        achievedReplyPlies: reply,
        completeAtAchievedDepth: layer.completeCount,
      };
    }
    budgetMs = Math.min(maxBudget, Math.round(budgetMs * 1.6));
  }

  const layer = searchLayerAtExactDepth(
    variant, snapshot, ends, reply, replyBranch, aiPlayer, Infinity, center, matchTimer,
  );
  return {
    best: layer.best.length ? layer.best : [ends[0]],
    achievedReplyPlies: reply,
    completeAtAchievedDepth: layer.completeCount,
  };
}

function pickRandomEnd(ends: TurnEnd[], rng: () => number): Move[] {
  return ends[Math.floor(rng() * ends.length)].path;
}

/**
 * Honest AI difficulty contract:
 * - Easy: 0 reply plies; ~70% max-capture greedy (no positional eval);
 *   ~30% soft-miss (still captures when possible, but not always longest/best chain).
 * - Medium: 1 opponent complete-turn reply + full eval (incl. center when on);
 *   ~20% soft-miss so Medium feels softer than Hard on small boards.
 * - Hard: 2 opponent complete-turn replies + full eval (incl. center when on);
 *   0% soft-miss; extends think time until full depth-2 completes (no depth-1 fallback).
 */
export function selectAiTurnPath(
  variant: BoardVariant,
  level: AiLevel,
  snapshot: { state: GameState; chainPieceId: number | null },
  aiPlayer: Player = 'BLUE',
  budgetMsOrOptions: number | SelectAiOptions = 1500,
): Move[] | null {
  const opts = normalizeOptions(budgetMsOrOptions);
  const ends = generateTurnEnds(
    variant, snapshot, aiPlayer, Number.POSITIVE_INFINITY, Date.now() + opts.budgetMs,
  );
  if (!ends.length) return null;

  if (level <= 1) {
    if (opts.rng() < opts.easySoftMissRate) {
      return softMissPath(ends, snapshot.state, opts.rng);
    }

    const pool = bestCapturePool(ends, snapshot.state, aiPlayer, opts.center);
    return pickRandomEnd(pool, opts.rng);
  }

  if (level === 2 && opts.rng() < opts.mediumSoftMissRate) {
    return softMissPath(ends, snapshot.state, opts.rng);
  }

  const reply = aiOpponentReplyPlies(level);
  const replyBranch = replyBranchForLevel(level);
  const { best } = searchBestAtExactDepth(
    variant, snapshot, ends, reply, replyBranch, aiPlayer, opts.budgetMs, level, opts.center, opts.matchTimer,
  );

  return best[Math.floor(opts.rng() * best.length)].path;
}

/** Test/diagnostic: did depth-N search finish cleanly for this position? */
export function probeSearchCompletion(
  variant: BoardVariant,
  level: AiLevel,
  snapshot: { state: GameState; chainPieceId: number | null },
  aiPlayer: Player = 'BLUE',
  budgetMsOrOptions: number | SelectAiOptions = 1500,
): SearchCompletionReport {
  const opts = normalizeOptions(budgetMsOrOptions);
  const ends = generateTurnEnds(
    variant, snapshot, aiPlayer, Number.POSITIVE_INFINITY, Date.now() + opts.budgetMs,
  );
  const reply = aiOpponentReplyPlies(level);
  const replyBranch = replyBranchForLevel(level);
  const { achievedReplyPlies, completeAtAchievedDepth } = searchBestAtExactDepth(
    variant, snapshot, ends, reply, replyBranch, aiPlayer, opts.budgetMs, level, opts.center, opts.matchTimer,
  );
  return {
    targetReplyPlies: reply,
    achievedReplyPlies,
    rootMoveCount: ends.length,
    completeAtAchievedDepth,
  };
}

/** When the human offers resignation in PvE, AI accepts a draw unless clearly ahead. */
export function shouldAcceptResignationDraw(
  variant: BoardVariant,
  snapshot: { state: GameState; chainPieceId: number | null },
  aiPlayer: Player = 'BLUE',
  center?: AiCenterContext,
  matchTimer?: AiMatchTimerContext,
): boolean {
  const score = evaluate(snapshot.state, variant, aiPlayer, center, matchTimer);
  return score <= 0;
}

/** Think budget by difficulty; larger boards get more time so depth-2 can finish. */
export function thinkBudgetForLevel(level: AiLevel, variant?: BoardVariant): number {
  let base: number;
  if (level <= 1) base = 250;
  else if (level === 2) base = 800;
  else if (level === 3) base = 3200;
  else if (level === 4) base = 4800;
  else base = 9000;

  const mult = variant ? (BOARD_THINK_MULTIPLIER[variant] ?? 1) : 1;
  return Math.round(base * mult);
}
