import { BoardVariant } from '../../../config/BoardConfig';
import { SmartBeadsEngine } from '../../../core/SmartBeadsEngine';
import { findJumpPath, GameState, Move, Player } from '../../../models/GameState';
import { AiLevel } from './GameFeatureSettings';

export interface TurnEnd {
  snapshot: { state: GameState; chainPieceId: number | null };
  path: Move[];
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

function evaluate(state: GameState, variant: BoardVariant, aiPlayer: Player = 'BLUE'): number {
  const human = opponentOf(aiPlayer);
  const aiCount = countPieces(state, aiPlayer);
  const humanCount = countPieces(state, human);
  if (humanCount === 0) return 10000;
  if (aiCount === 0) return -10000;

  const aiMob = mobility(variant, state, aiPlayer);
  const humanMob = mobility(variant, state, human);
  return (aiCount - humanCount) * 48 + (aiMob - humanMob) * 1.5;
}

function opponentReplyPlies(level: AiLevel): number {
  if (level <= 1) return -1;
  if (level === 2) return 1;
  return 2;
}

function rootBranchForLevel(level: AiLevel): number {
  if (level >= 3) return 80;
  if (level === 2) return 120;
  return 140;
}

function replyBranchForLevel(level: AiLevel): number {
  if (level >= 3) return 40;
  if (level === 2) return 72;
  return 140;
}

function getFollowUpJumps(
  variant: BoardVariant,
  snapshot: { state: GameState; chainPieceId: number | null },
): Move[] {
  const eng = new SmartBeadsEngine(variant);
  eng.loadSnapshot(snapshot);
  return eng.getLegalMoves().filter((m) => isJump(snapshot.state, m));
}

export function generateTurnEnds(
  variant: BoardVariant,
  snapshot: { state: GameState; chainPieceId: number | null },
  player: Player,
  maxBranch: number,
): TurnEnd[] {
  const eng = new SmartBeadsEngine(variant);
  eng.loadSnapshot({ ...snapshot, state: { ...snapshot.state, currentPlayer: player }, chainPieceId: null });
  const root = eng.getLegalMoves().slice();
  root.sort((a, b) => (isJump(snapshot.state, b) ? 1 : 0) - (isJump(snapshot.state, a) ? 1 : 0));

  const ends: TurnEnd[] = [];

  for (const move of root) {
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
): number {
  if (depth === 0) return evaluate(snapshot.state, variant, aiPlayer);
  const player = maximizing ? aiPlayer : opponentOf(aiPlayer);
  const ends = generateTurnEnds(variant, snapshot, player, branchCap);
  if (!ends.length) return maximizing ? -900 : 900;

  if (maximizing) {
    let best = -Infinity;
    for (const end of ends) {
      const v = minimaxTurns(variant, end.snapshot, depth - 1, false, alpha, beta, branchCap, aiPlayer);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const end of ends) {
    const v = minimaxTurns(variant, end.snapshot, depth - 1, true, alpha, beta, branchCap, aiPlayer);
    if (v < best) best = v;
    if (v < beta) beta = v;
    if (beta <= alpha) break;
  }
  return best;
}

/** Honest AI — Easy greedy, Medium 1 opponent turn, Hard 2 opponent turns. */
export function selectAiTurnPath(
  variant: BoardVariant,
  level: AiLevel,
  snapshot: { state: GameState; chainPieceId: number | null },
  aiPlayer: Player = 'BLUE',
): Move[] | null {
  const branch = rootBranchForLevel(level);
  const ends = generateTurnEnds(variant, snapshot, aiPlayer, branch);
  if (!ends.length) return null;

  if (level <= 1) {
    let bestScore = -Infinity;
    let pool: TurnEnd[] = [];
    for (const end of ends) {
      const captures = pathCaptureCount(snapshot.state, end.path);
      const score = captures * 100 + evaluate(end.snapshot.state, variant, aiPlayer) * 0.01;
      if (score > bestScore) {
        bestScore = score;
        pool = [end];
      } else if (score === bestScore) {
        pool.push(end);
      }
    }
    return pool[Math.floor(Math.random() * pool.length)].path;
  }

  const reply = opponentReplyPlies(level);
  const replyBranch = replyBranchForLevel(level);
  let bestScore = -Infinity;
  let best: TurnEnd[] = [];

  for (const end of ends) {
    let score = reply <= 0
      ? evaluate(end.snapshot.state, variant, aiPlayer)
      : minimaxTurns(variant, end.snapshot, reply, false, -Infinity, Infinity, replyBranch, aiPlayer);
    score += pathCaptureCount(snapshot.state, end.path) * 0.05;
    if (score > bestScore) {
      bestScore = score;
      best = [end];
    } else if (score === bestScore) {
      best.push(end);
    }
  }

  return best[Math.floor(Math.random() * best.length)].path;
}

/** When the human offers resignation in PvE, AI accepts a draw unless clearly ahead. */
export function shouldAcceptResignationDraw(
  variant: BoardVariant,
  snapshot: { state: GameState; chainPieceId: number | null },
  aiPlayer: Player = 'BLUE',
): boolean {
  const score = evaluate(snapshot.state, variant, aiPlayer);
  return score <= 0;
}
