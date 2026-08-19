import { BoardDefinition, Player } from '../../../models/GameState';
import { CenterRule } from './GameFeatureSettings';

/** Count beads occupying configured center nodes (BoardDefinition.centerNodeIds). */
export function countCenterOccupancy(board: BoardDefinition, player: Player): number {
  const centerIds = board.centerNodeIds ?? [];
  if (centerIds.length === 0) return 0;
  let count = 0;
  for (const id of centerIds) {
    if (board.intersections[id]?.occupant === player) count += 1;
  }
  return count;
}

export function formatCenterDisplay(rule: CenterRule, count: number): string {
  return rule === 'off' ? 'Off' : String(count);
}
