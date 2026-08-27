import { BoardVariant } from '../../../config/BoardConfig';
import { SmartBeadsEngine } from '../../../core/SmartBeadsEngine';
import { findJumpPath, GameState, Move, Player } from '../../../models/GameState';
import { CenterRule } from './GameFeatureSettings';
import { countCenterOccupancy } from './centerScoring';
import { AiLevel } from './GameFeatureSettings';

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

export interface SelectAiOptions {
  budgetMs?: number;
  rng?: () => number;
  easySoftMissRate?: number;
  mediumSoftMissRate?: number;
  center?: AiCenterContext;
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

/**
 * Material + mobility + center (when rule is on).
 * Center must be valued whenever Cumulative/Endgame is enabled — feature cannot be half-wired.
 */
export function evaluate(
  state: GameState,
  variant: BoardVariant,
  aiPlayer: Player = 'BLUE',
  center?: AiCenterContext,
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
    score += (aiC - humanC) * CENTER_EVAL_WEIGHT;
  }
  return score;
}

/**
 * Opponent complete-turn reply depth:
 * Easy = 0, Medium = 1, Hard = 2.
 * Hard uses depth 2 (not 3): deeper search that times out mid-minimax plays weaker than Medium.
 * Hard gets a larger think budget so depth-2 actually completes.
 */
export function aiOpponentReplyPlies(level: AiLevel): number {
  if (level <= 1) return 0;
  if (level === 2) return 1;
  return 2;
}

function rootBranchForLevel(level: AiLevel): number {
  if (level >= 3) return 140;
  if (level === 2) return 100;
  return 60;
}

function replyBranchForLevel(level: AiLevel): number {
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

  for (const move of root) {
    if (ends.length > 0 && Date.now() > deadlineMs) return ends;
    const afterEng = new SmartBeadsEngine(variant);
    afterEng.loadSnapshot({ ...snapshot, state: { ...snapshot.state, currentPlayer: player }, chainPieceId: null });
    afterEng.applyMove(move);
    const afterSnap = afterEng.exportSnapshot();
    ends.push({ snapshot: afterSnap, path: [move] });
    if (ends.length >= maxBranch) return ends;

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
        if (ends.length >= maxBranch) return ends;
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
): number {
  if (depth === 0 || Date.now() > deadlineMs) return evaluate(snapshot.state, variant, aiPlayer, center);
  const player = maximizing ? aiPlayer : opponentOf(aiPlayer);
  const ends = generateTurnEnds(variant, snapshot, player, branchCap, deadlineMs);
  if (!ends.length) return maximizing ? -900 : 900;

  if (maximizing) {
    let best = -Infinity;
    for (const end of ends) {
      if (Date.now() > deadlineMs) break;
      const v = minimaxTurns(
        variant, end.snapshot, depth - 1, false, alpha, beta, branchCap, aiPlayer, deadlineMs, center,
      );
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const end of ends) {
    if (Date.now() > deadlineMs) break;
    const v = minimaxTurns(
      variant, end.snapshot, depth - 1, true, alpha, beta, branchCap, aiPlayer, deadlineMs, center,
    );
    if (v < best) best = v;
    if (v < beta) beta = v;
    if (beta <= alpha) break;
  }
  return best;
}

function normalizeOptions(budgetMsOrOptions: number | SelectAiOptions): Required<SelectAiOptions> {
  if (typeof budgetMsOrOptions === 'number') {
    return {
      budgetMs: budgetMsOrOptions,
      rng: Math.random,
      easySoftMissRate: EASY_SOFT_MISS_RATE,
      mediumSoftMissRate: MEDIUM_SOFT_MISS_RATE,
      center: { centerRule: 'off' },
    };
  }
  return {
    budgetMs: budgetMsOrOptions.budgetMs ?? 1500,
    rng: budgetMsOrOptions.rng ?? Math.random,
    easySoftMissRate: budgetMsOrOptions.easySoftMissRate ?? EASY_SOFT_MISS_RATE,
    mediumSoftMissRate: budgetMsOrOptions.mediumSoftMissRate ?? MEDIUM_SOFT_MISS_RATE,
    center: budgetMsOrOptions.center ?? { centerRule: 'off' },
  };
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
 *   0% soft-miss; longer think budget so depth-2 search completes.
 */
export function selectAiTurnPath(
  variant: BoardVariant,
  level: AiLevel,
  snapshot: { state: GameState; chainPieceId: number | null },
  aiPlayer: Player = 'BLUE',
  budgetMsOrOptions: number | SelectAiOptions = 1500,
): Move[] | null {
  const opts = normalizeOptions(budgetMsOrOptions);
  const deadlineMs = Date.now() + Math.max(0, opts.budgetMs);
  const branch = rootBranchForLevel(level);
  const ends = generateTurnEnds(variant, snapshot, aiPlayer, branch, deadlineMs);
  if (!ends.length) return null;

  if (level <= 1) {
    // Soft miss (~30%): still take *a* capture if any exist (not silly pure random),
    // but not forced to the maximum multi-jump. Otherwise random slide.
    if (opts.rng() < opts.easySoftMissRate) {
      return softMissPath(ends, snapshot.state, opts.rng);
    }

    // Primary Easy: maximize captures only; random among ties; NO evaluate().
    let bestCaps = -1;
    let pool: TurnEnd[] = [];
    for (const end of ends) {
      const captures = pathCaptureCount(snapshot.state, end.path);
      if (captures > bestCaps) {
        bestCaps = captures;
        pool = [end];
      } else if (captures === bestCaps) {
        pool.push(end);
      }
    }
    return pickRandomEnd(pool, opts.rng);
  }

  // Medium soft-miss (~20%): capture-aware random instead of full 1-ply search.
  // Hard (level 3+) never soft-misses.
  if (level === 2 && opts.rng() < opts.mediumSoftMissRate) {
    return softMissPath(ends, snapshot.state, opts.rng);
  }

  const reply = aiOpponentReplyPlies(level);
  const replyBranch = replyBranchForLevel(level);
  let bestScore = -Infinity;
  let best: TurnEnd[] = [];

  for (const end of ends) {
    if (best.length > 0 && Date.now() > deadlineMs) break;
    let score = reply <= 0
      ? evaluate(end.snapshot.state, variant, aiPlayer, opts.center)
      : minimaxTurns(
        variant, end.snapshot, reply, false, -Infinity, Infinity, replyBranch, aiPlayer, deadlineMs, opts.center,
      );
    score += pathCaptureCount(snapshot.state, end.path) * 0.05;
    if (score > bestScore) {
      bestScore = score;
      best = [end];
    } else if (score === bestScore) {
      best.push(end);
    }
  }

  if (!best.length) return ends[0].path;
  return best[Math.floor(opts.rng() * best.length)].path;
}

/** When the human offers resignation in PvE, AI accepts a draw unless clearly ahead. */
export function shouldAcceptResignationDraw(
  variant: BoardVariant,
  snapshot: { state: GameState; chainPieceId: number | null },
  aiPlayer: Player = 'BLUE',
  center?: AiCenterContext,
): boolean {
  const score = evaluate(snapshot.state, variant, aiPlayer, center);
  return score <= 0;
}

/** Think budget by difficulty — Hard must finish its depth-2 search. */
export function thinkBudgetForLevel(level: AiLevel): number {
  if (level <= 1) return 250;
  if (level === 2) return 800;
  return 2800;
}
