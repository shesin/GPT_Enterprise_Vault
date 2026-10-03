import { BoardVariant } from '../../../config/BoardConfig';
import { EngineSnapshot, SearchSnapshot, SmartBeadsEngine } from '../../../core/SmartBeadsEngine';
import { repetitionPenaltyForPosition } from '../../../core/positionKey';
import {
  findJumpPath,
  GameState,
  getConnectedIds,
  getJumpPathsFrom,
  Move,
  Player,
  requireIntersection,
} from '../../../models/GameState';
import { AiLevel, CenterRule } from './GameFeatureSettings';
import { countCenterOccupancy } from './centerScoring';

/** Position handed to the search: a game snapshot, or a search-line snapshot from a TurnEnd. */
export type SearchPosition = {
  state: GameState;
  chainPieceId: number | null;
  positionHistory?: Record<string, number>;
  searchBase?: Record<string, number>;
  searchPath?: readonly number[];
};

export interface TurnEnd {
  snapshot: SearchSnapshot;
  path: Move[];
}

/**
 * Easy soft-miss rate: when not playing pure capture-greedy, still prefers a capture
 * if any exist (not a totally random silly move). ~30% of turns.
 */
export const EASY_SOFT_MISS_RATE = 0.3;

/**
 * Medium soft-miss (~20%): keeps Medium softer than Hard on boards where 1-ply vs
 * 2-ply otherwise feel the same (e.g. 8-bead). Hard must use 0 soft-miss.
 */
export const MEDIUM_SOFT_MISS_RATE = 0.2;

/**
 * Weight for center seats in static eval when centerRule is on.
 * Centre only breaks a captures tie (timer expiry / safety cap), so it must stay a tie-breaker far below
 * one piece (48). At 28 the AI traded material for centre and Expert lost to Standard on timed games
 * (7-bead 18-11 vs 25-0 with centre off). 1 restores parity (25-2). Near timer expiry the urgency boost
 * in centerEvalWeight still makes centre decisive. See GPT_PROJECT_AUDIT_05P.md "AI review 2026-10-01".
 */
export const CENTER_EVAL_WEIGHT = 1;

export interface AiCenterContext {
  centerRule: CenterRule;
  /** Running cumulative scores (used when centerRule === 'cumulative'). */
  cumulativeRed?: number;
  cumulativeBlue?: number;
}

/** Timer state for AI eval — shot clock intentionally omitted (AI moves too fast). */
export interface AiTimerContext {
  timerLimitSec: number;
  /** Shared countdown (PvE, spectate, HvH with Timer on). 0 = timer off. */
  globalRemainingSec: number;
}

export const TIMER_OFF: AiTimerContext = {
  timerLimitSec: 0,
  globalRemainingSec: 0,
};

export interface SelectAiOptions {
  rng?: () => number;
  easySoftMissRate?: number;
  mediumSoftMissRate?: number;
  center?: AiCenterContext;
  timer?: AiTimerContext;
}

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

/**
 * Number of legal moves `player` would have (no open chain). Same count as
 * SmartBeadsEngine.getLegalMoves() — slides to empty neighbours + legal jumps — without building an engine
 * per call (this runs at every search leaf). Equivalence is asserted in HonestAi.test.ts.
 */
export function mobility(state: GameState, player: Player): number {
  if (state.gameOver) return 0;
  const board = state.board;
  const opponent = opponentOf(player);
  let n = 0;
  for (const point of board.intersections) {
    if (point.occupant !== player) continue;
    for (const to of getConnectedIds(board, point.id)) {
      if (requireIntersection(board, to).occupant === undefined) n += 1;
    }
    for (const path of getJumpPathsFrom(board, point.id)) {
      if (
        requireIntersection(board, path.over).occupant === opponent &&
        requireIntersection(board, path.to).occupant === undefined
      ) {
        n += 1;
      }
    }
  }
  return n;
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

export function timerActive(timer: AiTimerContext | undefined): timer is AiTimerContext {
  return !!timer && timer.timerLimitSec > 0;
}

/** 0 = plenty of time, 1 = critical (timer about to force score/end). */
function timerUrgency(timer: AiTimerContext | undefined): number {
  if (!timerActive(timer)) return 0;

  const frac = timer.globalRemainingSec / timer.timerLimitSec;
  if (frac >= 0.12) return 0;
  return 1 - frac / 0.12;
}

function centerEvalWeight(
  state: GameState,
  center: AiCenterContext | undefined,
  timer: AiTimerContext | undefined,
): number {
  if (!center || center.centerRule === 'off') return 0;

  let weight = CENTER_EVAL_WEIGHT;
  const urgency = timerUrgency(timer);
  if (urgency > 0) {
    const capDiff = Math.abs(state.captures.RED - state.captures.BLUE);
    if (capDiff <= 1) weight += Math.round(urgency * 42);
    else if (capDiff <= 2) weight += Math.round(urgency * 18);
  }
  return weight;
}

function timerEvalAdjust(
  state: GameState,
  aiPlayer: Player,
  timer: AiTimerContext | undefined,
): number {
  if (!timerActive(timer)) return 0;
  const human = opponentOf(aiPlayer);
  const urgency = timerUrgency(timer);
  let adj = 0;

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
  _variant: BoardVariant,
  aiPlayer: Player = 'BLUE',
  center?: AiCenterContext,
  timer?: AiTimerContext,
): number {
  if (state.gameOver && state.winner !== undefined) {
    // A finished game is valued by its result, never by material: a draw (repetition, tied safety cap)
    // is 0, so an AI that is ahead declines it and one that is behind takes it.
    if (state.winner === 'DRAW') return 0;
    return state.winner === aiPlayer ? 10000 : -10000;
  }
  const human = opponentOf(aiPlayer);
  const aiCount = countPieces(state, aiPlayer);
  const humanCount = countPieces(state, human);
  if (humanCount === 0) return 10000;
  if (aiCount === 0) return -10000;

  const aiMob = mobility(state, aiPlayer);
  const humanMob = mobility(state, human);
  let score = (aiCount - humanCount) * 48 + (aiMob - humanMob) * 1.5;

  if (center && center.centerRule !== 'off') {
    const aiC = centerScoreForPlayer(state, aiPlayer, center);
    const humanC = centerScoreForPlayer(state, human, center);
    score += (aiC - humanC) * centerEvalWeight(state, center, timer);
  }

  score += timerEvalAdjust(state, aiPlayer, timer);
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
  if (level >= 3) return 80;
  if (level === 2) return 64;
  return 60;
}

/** With an unbounded `maxBranch`, a list still stops this many ends after the root move count. */
const UNCAPPED_EXTRA_ENDS = 512;
/** Capture chains are followed at most this many hops deep (a chain this long never occurs in play). */
const MAX_CHAIN_HOPS = 8;

// One scratch engine per board, reused by every search node: loading a snapshot fully replaces its state.
// Safe because the search is synchronous and walkTurnEnds never runs re-entrantly.
const scratchEngines = new Map<BoardVariant, SmartBeadsEngine>();

function scratchEngine(variant: BoardVariant): SmartBeadsEngine {
  let eng = scratchEngines.get(variant);
  if (!eng) {
    eng = new SmartBeadsEngine(variant);
    scratchEngines.set(variant, eng);
  }
  return eng;
}

/**
 * Visit every way `player` can end a turn (root slides/jumps, then follow-up jump chains), in a fixed
 * order: root jumps first, each followed by its chain extensions. `visit` runs while `eng` holds the
 * end position; `snap()` exports it (memoised) and must be called inside `visit`. Return true to stop.
 */
function walkTurnEnds(
  variant: BoardVariant,
  snapshot: SearchPosition,
  player: Player,
  maxBranch: number,
  visit: (eng: SmartBeadsEngine, path: Move[], snap: () => SearchSnapshot) => boolean,
): void {
  const eng = scratchEngine(variant);
  eng.loadForSearch({
    ...snapshot,
    state: { ...snapshot.state, currentPlayer: player },
    chainPieceId: null,
  } as EngineSnapshot | SearchSnapshot);
  const rootSnapshot = eng.exportSearchSnapshot();
  const root = eng.getLegalMoves().slice();
  root.sort((a, b) => (isJump(snapshot.state, b) ? 1 : 0) - (isJump(snapshot.state, a) ? 1 : 0));

  const branchCap = Number.isFinite(maxBranch) ? maxBranch : root.length + UNCAPPED_EXTRA_ENDS;
  let count = 0;

  for (const move of root) {
    // Plain moves are applied and undone in place; only an open capture chain needs a snapshot.
    eng.applyLegalMoveWithUndo(move);
    let memo: SearchSnapshot | null = null;
    const snap = (): SearchSnapshot => (memo ??= eng.exportSearchSnapshot());
    count += 1;
    const stop = visit(eng, [move], snap);
    const open = isJump(snapshot.state, move) && eng.getChainPieceId() !== null;
    const afterSnap = open ? snap() : null;
    eng.undoLastMove();
    if (stop || count >= branchCap) return;
    if (!afterSnap) continue;

    const stack: Array<{ snap: SearchSnapshot; path: Move[]; depth: number }> = [
      { snap: afterSnap, path: [move], depth: 1 },
    ];
    while (stack.length) {
      const node = stack.pop()!;
      if (node.depth > MAX_CHAIN_HOPS) continue;
      eng.loadForSearch(node.snap);
      const jumps = eng.getLegalMoves().filter((m) => isJump(node.snap.state, m));
      for (const hop of jumps) {
        eng.applyLegalMoveWithUndo(hop);
        let hopMemo: SearchSnapshot | null = null;
        const hopSnap = (): SearchSnapshot => (hopMemo ??= eng.exportSearchSnapshot());
        const path = node.path.concat(hop);
        count += 1;
        const hopStop = visit(eng, path, hopSnap);
        const hopOpen = eng.getChainPieceId() !== null;
        const next = hopOpen ? hopSnap() : null;
        eng.undoLastMove();
        if (hopStop) return;
        if (next) stack.push({ snap: next, path, depth: node.depth + 1 });
        if (count >= branchCap) return;
      }
    }
    eng.loadForSearch(rootSnapshot);
  }
}

export function generateTurnEnds(
  variant: BoardVariant,
  snapshot: SearchPosition,
  player: Player,
  maxBranch: number,
): TurnEnd[] {
  const ends: TurnEnd[] = [];
  walkTurnEnds(variant, snapshot, player, maxBranch, (_eng, path, snap) => {
    ends.push({ snapshot: snap(), path });
    return false;
  });
  return ends;
}

/**
 * Search captures first (stable). Alpha-beta returns the same exact value for any move order, but
 * cuts off far more when strong replies are tried early. Pure speed-up: never changes a result.
 */
function capturesFirst(state: GameState, ends: TurnEnd[]): TurnEnd[] {
  const caps = ends.map((end) => pathCaptureCount(state, end.path));
  if (!caps.some((c) => c > 0)) return ends;
  return ends
    .map((end, i) => ({ end, i, c: caps[i]! }))
    .sort((a, b) => b.c - a.c || a.i - b.i)
    .map((x) => x.end);
}

/** Indexes of `ends`, captures first, original order among equals. */
function capturesFirstIndexes(state: GameState, ends: TurnEnd[]): number[] {
  const caps = ends.map((end) => pathCaptureCount(state, end.path));
  const idx = ends.map((_, i) => i);
  if (!caps.some((c) => c > 0)) return idx;
  return idx.sort((a, b) => caps[b]! - caps[a]! || a - b);
}

/**
 * Last search ply: evaluate each turn end in place (no snapshot per leaf) and stop generating moves as
 * soon as the alpha-beta window closes. Same score as scoring every end of generateTurnEnds().
 */
function leafSearch(
  variant: BoardVariant,
  snapshot: SearchPosition,
  maximizing: boolean,
  alpha: number,
  beta: number,
  branchCap: number,
  aiPlayer: Player,
  center: AiCenterContext | undefined,
  timer: AiTimerContext | undefined,
): number {
  const player = maximizing ? aiPlayer : opponentOf(aiPlayer);
  let best = maximizing ? -Infinity : Infinity;
  let any = false;
  walkTurnEnds(variant, snapshot, player, branchCap, (eng) => {
    any = true;
    const score = evaluate(eng.getState(), variant, aiPlayer, center, timer);
    if (maximizing) {
      if (score > best) best = score;
      if (score > alpha) alpha = score;
    } else {
      if (score < best) best = score;
      if (score < beta) beta = score;
    }
    return beta <= alpha;
  });
  if (!any) {
    if (snapshot.state.gameOver) return evaluate(snapshot.state, variant, aiPlayer, center, timer);
    return maximizing ? -900 : 900;
  }
  return best;
}

function minimaxTurns(
  variant: BoardVariant,
  snapshot: SearchPosition,
  depth: number,
  maximizing: boolean,
  alpha: number,
  beta: number,
  branchCap: number,
  aiPlayer: Player,
  center: AiCenterContext | undefined,
  timer: AiTimerContext | undefined,
): number {
  if (depth === 0) return evaluate(snapshot.state, variant, aiPlayer, center, timer);
  if (depth === 1) {
    return leafSearch(
      variant,
      snapshot,
      maximizing,
      alpha,
      beta,
      branchCap,
      aiPlayer,
      center,
      timer,
    );
  }

  const player = maximizing ? aiPlayer : opponentOf(aiPlayer);
  const ends = generateTurnEnds(variant, snapshot, player, branchCap);
  if (!ends.length) {
    if (snapshot.state.gameOver) return evaluate(snapshot.state, variant, aiPlayer, center, timer);
    return maximizing ? -900 : 900;
  }
  const ordered = capturesFirst(snapshot.state, ends);

  if (maximizing) {
    let best = -Infinity;
    for (const end of ordered) {
      const score = minimaxTurns(
        variant,
        end.snapshot,
        depth - 1,
        false,
        alpha,
        beta,
        branchCap,
        aiPlayer,
        center,
        timer,
      );
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const end of ordered) {
    const score = minimaxTurns(
      variant,
      end.snapshot,
      depth - 1,
      true,
      alpha,
      beta,
      branchCap,
      aiPlayer,
      center,
      timer,
    );
    if (score < best) best = score;
    if (score < beta) beta = score;
    if (beta <= alpha) break;
  }
  return best;
}

function scoreRootEnd(
  variant: BoardVariant,
  end: TurnEnd,
  replyDepth: number,
  replyBranch: number,
  aiPlayer: Player,
  center: AiCenterContext | undefined,
  timer: AiTimerContext | undefined,
  alpha = -Infinity,
): number {
  if (replyDepth <= 0) return evaluate(end.snapshot.state, variant, aiPlayer, center, timer);
  return minimaxTurns(
    variant,
    end.snapshot,
    replyDepth,
    false,
    alpha,
    Infinity,
    replyBranch,
    aiPlayer,
    center,
    timer,
  );
}

function endScore(
  end: TurnEnd,
  snapshotState: GameState,
  searchScore: number,
  positionHistory?: Record<string, number>,
): number {
  let score = searchScore + pathCaptureCount(snapshotState, end.path) * 0.05;
  score -= repetitionPenaltyForPosition(
    end.snapshot.state,
    end.snapshot.chainPieceId,
    positionHistory,
  );
  return score;
}

function normalizeOptions(options: SelectAiOptions): Required<SelectAiOptions> {
  return {
    rng: options.rng ?? Math.random,
    easySoftMissRate: options.easySoftMissRate ?? EASY_SOFT_MISS_RATE,
    mediumSoftMissRate: options.mediumSoftMissRate ?? MEDIUM_SOFT_MISS_RATE,
    center: options.center ?? { centerRule: 'off' },
    timer: options.timer ?? TIMER_OFF,
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
function softMissPath(ends: TurnEnd[], snapshotState: GameState, rng: () => number): Move[] {
  const withCaps = ends.filter((e) => pathCaptureCount(snapshotState, e.path) > 0);
  if (withCaps.length > 0) return pickRandomEnd(withCaps, rng);
  return pickRandomEnd(ends, rng);
}

/**
 * Score every root move with the full reply search and return the best ones (original order among
 * ties). One pass, no time windows: a time limit would force a weaker answer, so speed comes only from
 * exact pruning (alpha bound, captures first, geometry indexes) — see GPT_PROJECT_AUDIT_05P.md.
 */
function searchBestAtExactDepth(
  variant: BoardVariant,
  snapshot: {
    state: GameState;
    chainPieceId: number | null;
    positionHistory?: Record<string, number>;
  },
  ends: TurnEnd[],
  reply: number,
  replyBranch: number,
  aiPlayer: Player,
  center: AiCenterContext | undefined,
  timer: AiTimerContext | undefined,
): TurnEnd[] {
  const positionHistory = snapshot.positionHistory;
  if (reply <= 0) {
    let best: TurnEnd[] = [];
    let bestScore = -Infinity;
    for (const end of ends) {
      const score = endScore(
        end,
        snapshot.state,
        evaluate(end.snapshot.state, variant, aiPlayer, center, timer),
        positionHistory,
      );
      if (score > bestScore) {
        bestScore = score;
        best = [end];
      } else if (score === bestScore) {
        best.push(end);
      }
    }
    return best;
  }

  let bestIdx: number[] = [];
  let bestScore = -Infinity;

  // Exact speed-up (same chosen move set): score captures first, and give each reply search the
  // best score found so far as its alpha bound. A move whose true score would be below the best is
  // cut off early (returns a value <= alpha, so it can never tie or win); a move that ties or beats
  // the best is searched exactly because alpha sits just below the score it needs.
  const order = capturesFirstIndexes(snapshot.state, ends);
  for (const idx of order) {
    const end = ends[idx]!;
    const adjust = endScore(end, snapshot.state, 0, positionHistory);
    const alpha = Number.isFinite(bestScore) ? bestScore - adjust - 1e-6 : -Infinity;
    const searched = scoreRootEnd(variant, end, reply, replyBranch, aiPlayer, center, timer, alpha);
    const score = endScore(end, snapshot.state, searched, positionHistory);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = [idx];
    } else if (score === bestScore) {
      bestIdx.push(idx);
    }
  }

  // Keep the original move order among ties so seeded/deterministic picks are unchanged.
  bestIdx.sort((a, b) => a - b);
  return bestIdx.map((i) => ends[i]!);
}

function pickRandomEnd(ends: TurnEnd[], rng: () => number): Move[] {
  return ends[Math.floor(rng() * ends.length)]!.path;
}

/**
 * Honest AI difficulty contract:
 * - Easy: 0 reply plies; ~70% max-capture greedy (no positional eval);
 *   ~30% soft-miss (still captures when possible, but not always longest/best chain).
 * - Medium: 1 opponent complete-turn reply + full eval (incl. center when on);
 *   ~20% soft-miss so Medium feels softer than Hard on small boards.
 * - Hard: 2 opponent complete-turn replies + full eval (incl. center when on);
 *   0% soft-miss; always the full depth-2 search (no time limit, no depth-1 fallback).
 */
function steerCapturePoolByRepetition(
  pool: TurnEnd[],
  positionHistory: Record<string, number> | undefined,
): TurnEnd[] {
  if (pool.length <= 1 || !positionHistory) return pool;
  let bestPool = [pool[0]!];
  let bestPen = repetitionPenaltyForPosition(
    pool[0]!.snapshot.state,
    pool[0]!.snapshot.chainPieceId,
    positionHistory,
  );
  for (let i = 1; i < pool.length; i += 1) {
    const pen = repetitionPenaltyForPosition(
      pool[i]!.snapshot.state,
      pool[i]!.snapshot.chainPieceId,
      positionHistory,
    );
    if (pen < bestPen) {
      bestPen = pen;
      bestPool = [pool[i]!];
    } else if (pen === bestPen) {
      bestPool.push(pool[i]!);
    }
  }
  return bestPool;
}

export function selectAiTurnPath(
  variant: BoardVariant,
  level: AiLevel,
  snapshot: {
    state: GameState;
    chainPieceId: number | null;
    positionHistory?: Record<string, number>;
  },
  aiPlayer: Player = 'BLUE',
  options: SelectAiOptions = {},
): Move[] | null {
  const opts = normalizeOptions(options);
  const ends = generateTurnEnds(variant, snapshot, aiPlayer, Number.POSITIVE_INFINITY);
  if (!ends.length) return null;

  if (level <= 1) {
    if (opts.rng() < opts.easySoftMissRate) {
      return softMissPath(ends, snapshot.state, opts.rng);
    }

    const pool = steerCapturePoolByRepetition(
      bestCapturePool(ends, snapshot.state, aiPlayer, opts.center),
      snapshot.positionHistory,
    );
    return pickRandomEnd(pool, opts.rng);
  }

  if (level === 2 && opts.rng() < opts.mediumSoftMissRate) {
    return softMissPath(ends, snapshot.state, opts.rng);
  }

  const best = searchBestAtExactDepth(
    variant,
    snapshot,
    ends,
    aiOpponentReplyPlies(level),
    replyBranchForLevel(level),
    aiPlayer,
    opts.center,
    opts.timer,
  );

  return best[Math.floor(opts.rng() * best.length)]!.path;
}

/** When the human offers resignation in PvE, AI accepts a draw unless clearly ahead. */
export function shouldAcceptResignationDraw(
  variant: BoardVariant,
  snapshot: { state: GameState; chainPieceId: number | null },
  aiPlayer: Player = 'BLUE',
  center?: AiCenterContext,
  timer?: AiTimerContext,
): boolean {
  const score = evaluate(snapshot.state, variant, aiPlayer, center, timer);
  return score <= 0;
}
