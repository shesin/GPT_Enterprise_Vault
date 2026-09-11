import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import { buildPositionKey } from '../../../../core/positionKey';
import { Move } from '../../../../models/GameState';
import { FeatureSession } from '../FeatureSession';
import { GameFeatureSettings } from '../GameFeatureSettings';

const off: GameFeatureSettings = {
  mode: 'spectate',
  aiLevel: 3,
  timer: 'off',
  tournamentTimer: 'off',
  shotClock: 'off',
  centerRule: 'off',
};

function clearOccupants(session: FeatureSession): void {
  for (const node of session.getEngine().getState().board.intersections) {
    node.occupant = undefined;
  }
}

function setOcc(session: FeatureSession, label: string, player: 'RED' | 'BLUE'): void {
  const node = session.getEngine().getState().board.intersections.find((n) => n.label === label);
  if (!node) throw new Error(`missing node ${label}`);
  node.occupant = player;
}

function startKey(session: FeatureSession): string {
  const snap = session.getEngine().exportSnapshot();
  return buildPositionKey(snap.state, snap.chainPieceId);
}

/** Two-ply cycle on 6-bead · 4×4 — RED A22 ↔ A32, BLUE A23 ↔ A33 (same ping-pong class as live 7-bead report). */
const PING_PONG_RED_FORWARD: Move = { from: 10, to: 14 };
const PING_PONG_BLUE_FORWARD: Move = { from: 11, to: 15 };
const PING_PONG_RED_BACK: Move = { from: 14, to: 10 };
const PING_PONG_BLUE_BACK: Move = { from: 15, to: 11 };

function setupPingPong(session: FeatureSession): void {
  clearOccupants(session);
  setOcc(session, 'A22', 'RED');
  setOcc(session, 'A23', 'BLUE');
  session.setStartingPlayer('RED');
  session.getEngine().rebaselineRepetitionHistory();
}

function playPingPongCycle(session: FeatureSession): void {
  session.applyMove(PING_PONG_RED_FORWARD);
  session.applyMove(PING_PONG_BLUE_FORWARD);
  session.applyMove(PING_PONG_RED_BACK);
  session.applyMove(PING_PONG_BLUE_BACK);
}

describe('3-fold repetition draw (Watch AI vs AI / all modes)', () => {
  it('verifies ping-pong setup is legal on 6-bead board', () => {
    const session = new FeatureSession('6', off);
    setupPingPong(session);
    expect(session.getEngine().getLegalMoves()).toContainEqual(PING_PONG_RED_FORWARD);
    session.applyMove(PING_PONG_RED_FORWARD);
    expect(session.getEngine().getLegalMoves()).toContainEqual(PING_PONG_BLUE_FORWARD);
  });

  it('ends the match in a draw when the same position occurs three times (spectate)', () => {
    const session = new FeatureSession('6', off);
    setupPingPong(session);
    const openingKey = startKey(session);

    playPingPongCycle(session);
    expect(session.isGameOver()).toBe(false);
    expect(startKey(session)).toBe(openingKey);

    playPingPongCycle(session);

    expect(session.isGameOver()).toBe(true);
    expect(session.getDisplayedWinner()).toBe('DRAW');
    expect(session.getDisplayedReason()).toBe('repetition');
  });

  it('ends PvP the same way (not spectate-only)', () => {
    const session = new FeatureSession('6', { ...off, mode: 'pvp' });
    setupPingPong(session);
    playPingPongCycle(session);
    playPingPongCycle(session);
    expect(session.getDisplayedWinner()).toBe('DRAW');
    expect(session.getDisplayedReason()).toBe('repetition');
  });

  it('does not use maxPlies when all shipped boards leave it null', () => {
    const engine = new SmartBeadsEngine('7');
    expect(engine.getState().board.maxPlies).toBeNull();
    expect(engine.getState().gameOver).toBe(false);
  });
});
