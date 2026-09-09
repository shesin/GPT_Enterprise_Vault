import type { Player } from '../../../models/GameState';

/** User-facing cream/black side name (not engine RED/BLUE or DOM p1/p2 ids). */
export function beadSideLabel(player: Player): string {
  return player === 'RED' ? 'Cream bead' : 'Black bead';
}
