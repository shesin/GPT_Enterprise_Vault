import { findJumpPath } from '../../../../models/GameState';
import { FeatureSession } from '../FeatureSession';
import { applyAiHops } from '../aiTurnPath';
import { engineOccupancy, isolatedPly, moveByLabel } from '../firstMoveInvariants';
import { selectAiTurnPath } from '../HonestAi';
import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';

const off = {
  aiLevel: 2 as const,
  matchTimer: 'off' as const,
  shotClock: 'off' as const,
  centerRule: 'off' as const,
};

function hangingSession(): FeatureSession {
  const session = new FeatureSession('16', { mode: 'pve', ...off });
  session.applyMove(moveByLabel(session.getEngine(), 'A41', 'A42'));
  return session;
}

/** Yesterday's getFollowUpJumps: ignore chainPieceId, use whoever is to move. */
function oldFollowUpJumps(snapshot: { state: ReturnType<SmartBeadsEngine['getState']>; chainPieceId: number | null }) {
  const eng = new SmartBeadsEngine('16');
  eng.loadSnapshot(snapshot);
  return eng.getLegalMoves().filter((m) => findJumpPath(snapshot.state.board, m.from, m.to));
}

describe('1a A41→A42 AI hop log', () => {
  /** Independent calls of unseeded Math.random inside selectAiTurnPath. Not a seed. */
  const SELECT_AI_TURN_PATH_INDEPENDENT_RUNS = 16;

  it('old follow-ups after a completed capture are not BLUE / not the chain piece', () => {
    const session = hangingSession();
    const path = selectAiTurnPath('16', 2, session.getEngine().exportSnapshot(), 'BLUE');
    expect(path?.length).toBeGreaterThan(0);
    session.applyMove(path![0]);
    expect(session.getEngine().getChainPieceId()).toBeNull();
    expect(session.getEngine().getState().currentPlayer).toBe('RED');

    const stale = oldFollowUpJumps(session.getEngine().exportSnapshot());
    const leftover = stale.length > 0 ? stale[0] : session.getEngine().getLegalMoves()[0];
    expect(leftover).toBeDefined();
    const occupant = session.getEngine().getState().board.intersections[leftover.from]?.occupant;
    expect(occupant).not.toBe('BLUE');
  });

  it('Medium AI path after A41→A42 is BLUE-only, chain-bounded, and leftover-stale across 16 independent unseeded runs', () => {
    for (let run = 0; run < SELECT_AI_TURN_PATH_INDEPENDENT_RUNS; run++) {
      const startEngine = new SmartBeadsEngine('16');
      const hang = moveByLabel(startEngine, 'A41', 'A42');
      const startOcc = engineOccupancy(startEngine);

      const session = hangingSession();
      expect(isolatedPly(startOcc, engineOccupancy(session.getEngine()), hang, 'RED').ok).toBe(true);

      const path = selectAiTurnPath('16', 2, session.getEngine().exportSnapshot(), 'BLUE');
      expect(path?.length).toBeGreaterThan(0);
      const hops = applyAiHops(session, path!, 'BLUE');

      expect(hops.map((h) => `${h.from}->${h.to}:${h.fromOccupant}`)).toEqual(
        hops.map((h) => `${h.from}->${h.to}:BLUE`),
      );
      for (let i = 0; i < hops.length; i++) {
        const hop = hops[i];
        expect(hop.player).toBe('BLUE');
        expect(hop.fromOccupant).toBe('BLUE');
        if (hop.chainPieceIdBefore !== null) {
          expect(hop.from).toBe(hop.chainPieceIdBefore);
        }
        if (i > 0) {
          expect(hop.from).toBe(hops[i - 1].to);
        }
      }
      const last = hops[hops.length - 1];
      expect(last.chainPieceIdAfter).toBeNull();
      expect(session.getEngine().getChainPieceId()).toBeNull();
      expect(session.getEngine().getState().currentPlayer).toBe('RED');

      const leftover = session.getEngine().getLegalMoves()[0];
      expect(leftover).toBeDefined();
      expect(() => applyAiHops(session, [leftover], 'BLUE')).toThrow(/stale hop/);
    }
  });
});

describe('1b leftover hop after turn/chain ended', () => {
  it('session.applyMove still accepts a hop that belongs to the new player (old PlayController leftover bug)', () => {
    const session = hangingSession();
    const path = selectAiTurnPath('16', 2, session.getEngine().exportSnapshot(), 'BLUE');
    session.applyMove(path![0]);
    expect(session.getEngine().getChainPieceId()).toBeNull();
    expect(session.getEngine().getState().currentPlayer).toBe('RED');

    const leftover = session.getEngine().getLegalMoves()[0];
    expect(leftover).toBeDefined();
    expect(session.getEngine().getState().board.intersections[leftover.from]?.occupant).toBe('RED');
    session.applyMove(leftover);
    expect(session.getMoveCount()).toBeGreaterThanOrEqual(3);
  });

  it('applyAiHops rejects that leftover hop as stale', () => {
    const session = hangingSession();
    const path = selectAiTurnPath('16', 2, session.getEngine().exportSnapshot(), 'BLUE');
    applyAiHops(session, [path![0]], 'BLUE');
    expect(session.getEngine().getChainPieceId()).toBeNull();

    const leftover = session.getEngine().getLegalMoves()[0];
    expect(() => applyAiHops(session, [leftover], 'BLUE')).toThrow(/stale hop/);
  });
});
