import { GameState } from '../models/GameState';

/** Position identity for 3-fold repetition (occupancies + side to move + open chain). */
export function buildPositionKey(
  state: GameState,
  chainPieceId: number | null,
): string {
  const occ = state.board.intersections
    .map((node) => node.occupant ?? '.')
    .join('');
  return `${occ}|${state.currentPlayer}|${chainPieceId ?? 'none'}`;
}

export const REPETITION_DRAW_THRESHOLD = 3;

export function isThreefoldRepetition(count: number): boolean {
  return count >= REPETITION_DRAW_THRESHOLD;
}

/** Soft eval penalty — matches Lab REP_SOFT; steers AI away before the legal third repeat. */
export const AI_REPETITION_SOFT_PENALTY = 25;

export function repetitionPenaltyForPosition(
  state: GameState,
  chainPieceId: number | null,
  history: Record<string, number> | undefined,
): number {
  if (!history) return 0;
  const key = buildPositionKey(state, chainPieceId);
  const count = history[key] ?? 0;
  if (count + 1 >= 2) return AI_REPETITION_SOFT_PENALTY * (count + 1);
  return 0;
}
