/**
 * Mirrors the server state into the local FeatureSession (A4), so the existing board, bars, clocks, result
 * screen and keyboard play all work online without a second UI. Pure: takes the local snapshot and the view.
 */
import type { RoomView } from '../../../../server/protocol';
import type { SessionSnapshot } from '../feature/FeatureSession';

export function snapshotFromView(base: SessionSnapshot, view: RoomView): SessionSnapshot {
  const state = base.engineSnap.state;
  const board = {
    ...state.board,
    intersections: state.board.intersections.map((n, i) => {
      const occ = view.occupants[i];
      const next = { ...n };
      if (occ) next.occupant = occ;
      else delete next.occupant;
      return next;
    }),
  };
  const myTurnChain = view.chainPieceId !== null && view.currentPlayer === view.you;
  const selectedId = myTurnChain
    ? view.chainPieceId
    : view.chainPieceId === null
      ? base.selectedId
      : null;
  return {
    ...base,
    engineSnap: {
      state: {
        ...state,
        board,
        currentPlayer: view.currentPlayer,
        moveCount: view.moveCount,
        captures: { ...view.captures },
        gameOver: view.gameOver,
        ...(view.winner ? { winner: view.winner } : {}),
        ...(view.reason ? { endReason: view.reason } : {}),
      },
      chainPieceId: view.chainPieceId,
    },
    uiState: view.gameOver
      ? 'game_over'
      : myTurnChain
        ? 'chain'
        : selectedId !== null
          ? 'selected'
          : 'idle',
    selectedId: view.gameOver ? null : selectedId,
    turnStartRingsPending: view.moveCount === 0 && view.chainPieceId === null,
    p1Clock: view.clocks.p1,
    p2Clock: view.clocks.p2,
    globalMatchRemaining: view.clocks.matchRemaining,
    shotRemaining: view.clocks.shotRemaining,
    featureOver:
      view.gameOver && view.winner && view.reason
        ? {
            winner: view.winner,
            reason: view.reason,
            ...(/expired|ran out of time/i.test(view.reason) ? { byClock: true as const } : {}),
          }
        : null,
  };
}
