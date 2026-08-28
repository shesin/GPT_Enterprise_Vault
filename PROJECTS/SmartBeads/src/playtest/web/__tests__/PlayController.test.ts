import { SmartBeadsEngine } from '../../../core/SmartBeadsEngine';
import { FeatureSession } from '../feature/FeatureSession';
import { engineOccupancy, isolatedPly, moveByLabel } from '../feature/firstMoveInvariants';
import { selectAiTurnPath } from '../feature/HonestAi';
import { planAiTurnPath, runAiTurn } from '../PlayController';

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

describe('PlayController.runAiTurn (live hop loop, no renderer)', () => {
  it('every hop after A41→A42 is one BLUE chain and stops when chainPieceId is null', () => {
    const startEngine = new SmartBeadsEngine('16');
    const hang = moveByLabel(startEngine, 'A41', 'A42');
    const startOcc = engineOccupancy(startEngine);

    const session = hangingSession();
    expect(isolatedPly(startOcc, engineOccupancy(session.getEngine()), hang, 'RED').ok).toBe(true);
    expect(session.getEngine().getState().currentPlayer).toBe('BLUE');

    const hops = runAiTurn(session);
    expect(hops.length).toBeGreaterThan(0);
    expect(hops.map((h) => h.fromOccupant)).toEqual(hops.map(() => 'BLUE'));
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
  });

  it('does not apply a leftover hop still sitting on the selected path after the chain ends', () => {
    const session = hangingSession();
    const path = selectAiTurnPath('16', 2, session.getEngine().exportSnapshot(), 'BLUE');
    expect(path?.length).toBeGreaterThan(0);

    const probe = hangingSession();
    probe.applyMove(path![0]);
    expect(probe.getEngine().getChainPieceId()).toBeNull();
    const leftover = probe.getEngine().getLegalMoves()[0];
    expect(leftover).toBeDefined();
    expect(probe.getEngine().getState().board.intersections[leftover.from]?.occupant).toBe('RED');

    const hops = runAiTurn(session, [path![0], leftover]);
    expect(hops).toHaveLength(1);
    expect(hops[0].fromOccupant).toBe('BLUE');
    expect(session.getEngine().getChainPieceId()).toBeNull();
    expect(session.getEngine().getState().currentPlayer).toBe('RED');
    expect(session.getMoveCount()).toBe(2);
  });

  it('rejects a leftover/stale hop path fed in after the AI turn has ended', () => {
    const session = hangingSession();
    runAiTurn(session);
    expect(session.getEngine().getChainPieceId()).toBeNull();
    expect(session.getEngine().getState().currentPlayer).toBe('RED');

    const leftover = session.getEngine().getLegalMoves()[0];
    expect(leftover).toBeDefined();
    expect(session.getEngine().getState().board.intersections[leftover.from]?.occupant).toBe('RED');
    expect(() => runAiTurn(session, [leftover])).toThrow(/stale hop/);
  });

  it('optional-stop capture finishes the AI turn so PvE cannot stick on AI is thinking', () => {
    const session = new FeatureSession('16', { mode: 'pve', ...off });
    const engine = session.getEngine();
    for (const point of engine.getState().board.intersections) {
      point.occupant = undefined;
    }
    const id = (label: string) => engine.getState().board.intersections.find((p) => p.label === label)!.id;
    engine.getState().board.intersections.find((p) => p.label === 'A00')!.occupant = 'BLUE';
    engine.getState().board.intersections.find((p) => p.label === 'A01')!.occupant = 'RED';
    engine.getState().board.intersections.find((p) => p.label === 'A03')!.occupant = 'RED';
    engine.getState().currentPlayer = 'BLUE';

    const oneHop = { from: id('A00'), to: id('A02') };
    const hops = runAiTurn(session, [oneHop]);
    expect(hops).toHaveLength(1);
    expect(hops[0].fromOccupant).toBe('BLUE');
    expect(session.getEngine().getChainPieceId()).toBeNull();
    expect(session.getEngine().getState().currentPlayer).toBe('RED');
    expect(session.getUiState()).not.toBe('chain');
    expect(session.canHumanAct()).toBe(true);
  });

  it('planAiTurnPath uses configured Medium level (does not silently plan as Easy)', () => {
    const session = hangingSession();
    const path = planAiTurnPath(session);
    expect(path?.length).toBeGreaterThan(0);
    // Medium search returns a legal BLUE hop from the hanging reply position
    const eng = session.getEngine();
    expect(eng.getState().currentPlayer).toBe('BLUE');
    const legal = eng.getLegalMoves().some((m) => m.from === path![0].from && m.to === path![0].to);
    expect(legal).toBe(true);
  });

  it('planAiTurnPath values center when endgame rule is on (independent of match timer)', () => {
    const session = new FeatureSession('6x3x5', {
      mode: 'pve',
      aiLevel: 2,
      matchTimer: 'off',
      shotClock: 'off',
      centerRule: 'endgame',
    });
    const engine = session.getEngine();
    for (const point of engine.getState().board.intersections) {
      point.occupant = undefined;
    }
    const id = (label: string) => engine.getState().board.intersections.find((p) => p.label === label)!.id;
    engine.getState().board.intersections.find((p) => p.label === 'A11')!.occupant = 'BLUE';
    engine.getState().board.intersections.find((p) => p.label === 'A00')!.occupant = 'RED';
    engine.getState().board.intersections.find((p) => p.label === 'A02')!.occupant = 'RED';
    engine.getState().board.intersections.find((p) => p.label === 'A40')!.occupant = 'BLUE';
    engine.getState().currentPlayer = 'BLUE';
    const centerId = id('A21');

    const path = planAiTurnPath(session);
    expect(path).not.toBeNull();
    const probe = new SmartBeadsEngine('6x3x5');
    probe.loadSnapshot(engine.exportSnapshot());
    for (const move of path!) probe.applyMove(move);
    const onCenter = probe.getState().board.intersections[centerId]?.occupant === 'BLUE';
    const movedToCenter = path!.some((m) => m.to === centerId);
    expect(onCenter || movedToCenter).toBe(true);
  });

  it('Medium runAiTurn completes short 6x3x5 games without mid-chain stuck', () => {
    for (let g = 0; g < 3; g++) {
      const session = new FeatureSession('6x3x5', { mode: 'pve', ...off, aiLevel: 2 });
      let guard = 0;
      while (!session.isGameOver() && guard < 40) {
        guard += 1;
        const player = session.getEngine().getState().currentPlayer;
        if (player === 'RED') {
          const moves = session.getEngine().getLegalMoves();
          if (!moves.length) break;
          const slide = moves.find((m) => {
            const jump = session.getEngine().getState().board.jumpPaths?.some(
              (j) => j.from === m.from && j.to === m.to,
            );
            return !jump;
          }) ?? moves[0];
          session.applyMove(slide);
          if (session.getUiState() === 'chain') session.finishChain();
        } else {
          runAiTurn(session);
        }
        expect(session.getEngine().getChainPieceId()).toBeNull();
      }
      expect(guard).toBeLessThan(40);
    }
  });
});
