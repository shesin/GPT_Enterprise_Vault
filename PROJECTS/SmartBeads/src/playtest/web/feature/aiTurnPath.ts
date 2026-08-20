import { Move, Player } from '../../../models/GameState';
import { FeatureSession } from './FeatureSession';

export interface AiHopRecord {
  index: number;
  from: number;
  to: number;
  player: Player;
  fromOccupant: Player | null;
  chainPieceIdBefore: number | null;
  chainPieceIdAfter: number | null;
}

/**
 * Apply an AI hop queue with turn-boundary checks.
 * First hop of a turn may start with chainPieceId null.
 * After a hop completes the turn (chain null, player flipped), remaining hops are stale.
 * Does not call finishChain — optional-stop paths that leave the chain open must be
 * closed by PlayController.runAiTurn / completeAiTurnIfChainOpen.
 */
export function applyAiHops(
  session: FeatureSession,
  hops: Move[],
  aiPlayer: Player,
): AiHopRecord[] {
  const records: AiHopRecord[] = [];
  for (let i = 0; i < hops.length; i++) {
    const hop = hops[i];
    const engine = session.getEngine();
    const state = engine.getState();
    const chainBefore = engine.getChainPieceId();
    const fromOccupant = state.board.intersections[hop.from]?.occupant ?? null;

    if (state.currentPlayer !== aiPlayer) {
      throw new Error(`stale hop ${i}: currentPlayer is ${state.currentPlayer}, not ${aiPlayer}`);
    }
    if (i > 0 && chainBefore === null) {
      throw new Error(`stale hop ${i}: chainPieceId is null; turn already ended`);
    }
    if (chainBefore !== null && hop.from !== chainBefore) {
      throw new Error(`hop ${i} from ${hop.from} is not chain piece ${chainBefore}`);
    }
    if (fromOccupant !== aiPlayer) {
      throw new Error(`hop ${i} occupant is ${fromOccupant}, not ${aiPlayer}`);
    }

    session.applyMove(hop);
    records.push({
      index: i,
      from: hop.from,
      to: hop.to,
      player: aiPlayer,
      fromOccupant,
      chainPieceIdBefore: chainBefore,
      chainPieceIdAfter: session.getEngine().getChainPieceId(),
    });
  }
  return records;
}
