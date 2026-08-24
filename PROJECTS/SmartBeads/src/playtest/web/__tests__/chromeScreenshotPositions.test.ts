import { findJumpPath } from '../../../models/GameState';
import { FeatureSession } from '../feature/FeatureSession';
import { runAiTurn } from '../PlayController';

const off = {
  aiLevel: 2 as const,
  matchTimer: 'off' as const,
  shotClock: 'off' as const,
  centerRule: 'off' as const,
};

function idOf(session: FeatureSession, label: string): number {
  return session.getEngine().getState().board.intersections.find((p) => p.label === label)!.id;
}

function loadOccupancy(session: FeatureSession, red: string[], blue: string[]): void {
  const engine = session.getEngine();
  for (const point of engine.getState().board.intersections) {
    point.occupant = undefined;
  }
  for (const label of red) {
    engine.getState().board.intersections.find((p) => p.label === label)!.occupant = 'RED';
  }
  for (const label of blue) {
    engine.getState().board.intersections.find((p) => p.label === label)!.occupant = 'BLUE';
  }
}

function applyClick(session: FeatureSession, nodeId: number): void {
  const click = session.interpretClick(nodeId);
  if (click.kind === 'select') {
    session.selectNode(click.nodeId);
    return;
  }
  if (click.kind === 'move') {
    session.applyMove(click.move);
    return;
  }
  throw new Error(`click ${nodeId} ignored`);
}

/**
 * Chrome screenshot: P1 13, P2 16, 0 Ivory captures. Red arrow on the ivory
 * at the triangle/grid join. Black on A20.
 */
const CAPTURE_RED = ['LT', 'LM', 'LB', 'LIT', 'LIB', 'A00', 'A01', 'A02', 'A10', 'A11', 'A30', 'A40', 'A41'];
const CAPTURE_BLUE = ['RT', 'RM', 'RB', 'RIT', 'RIM', 'RIB', 'A04', 'A14', 'A24', 'A44', 'A03', 'A13', 'A33', 'A43', 'A22', 'A20'];

/**
 * Chrome screenshot: AI is thinking, P1 15, P2 16, 1 Ebony capture.
 */
const STALL_RED = ['LT', 'LM', 'LB', 'LIT', 'LIM', 'A00', 'A01', 'A10', 'A21', 'A30', 'A31', 'A32', 'A40', 'A41', 'A42'];
const STALL_BLUE = ['RT', 'RM', 'RB', 'RIT', 'RIM', 'RIB', 'A03', 'A04', 'A14', 'A20', 'A23', 'A24', 'A33', 'A34', 'A43', 'A44'];

describe('Chrome 16-bead screenshot positions (human oracle)', () => {
  it('two-click capture of the black bead: select jumper then click the empty landing (enemy bead is inert)', () => {
    const session = new FeatureSession('16', { mode: 'pve', ...off });
    const engine = session.getEngine();
    for (const point of engine.getState().board.intersections) {
      point.occupant = undefined;
    }
    engine.getState().board.intersections.find((p) => p.label === 'A10')!.occupant = 'RED';
    engine.getState().board.intersections.find((p) => p.label === 'A20')!.occupant = 'BLUE';
    engine.getState().currentPlayer = 'RED';

    applyClick(session, idOf(session, 'A10'));
    expect(session.getSelectedId()).toBe(idOf(session, 'A10'));
    expect(session.getLegalTargetIds()).toContain(idOf(session, 'A30'));
    expect(session.getLegalTargetIds()).not.toContain(idOf(session, 'A20'));

    // Enemy bead itself is completely inert
    expect(session.interpretClick(idOf(session, 'A20')).kind).toBe('ignore');

    applyClick(session, idOf(session, 'A30'));
    expect(engine.getState().board.intersections.find((p) => p.label === 'A20')?.occupant).toBeUndefined();
    expect(engine.getState().board.intersections.find((p) => p.label === 'A10')?.occupant).toBeUndefined();
    expect(engine.getState().board.intersections.find((p) => p.label === 'A30')?.occupant).toBe('RED');
    expect(engine.getState().captures.RED).toBe(1);
  });

  it('screenshot occupancy: A30 Ivory blocks A10 over A20, so clicking the black does not capture', () => {
    const session = new FeatureSession('16', { mode: 'pve', ...off });
    loadOccupancy(session, CAPTURE_RED, CAPTURE_BLUE);
    const engine = session.getEngine();
    engine.getState().currentPlayer = 'RED';
    expect(engine.countPieces('RED')).toBe(13);
    expect(engine.countPieces('BLUE')).toBe(16);

    applyClick(session, idOf(session, 'A10'));
    expect(session.interpretClick(idOf(session, 'A20')).kind).toBe('ignore');
    expect(session.getLegalTargetIds()).not.toContain(idOf(session, 'A30'));
    expect(engine.getState().board.intersections.find((p) => p.label === 'A20')?.occupant).toBe('BLUE');
  });

  it('LIT has collinear diagonal landing A31 over A20, but not non-collinear horizontal A21', () => {
    const session = new FeatureSession('16', { mode: 'pve', ...off });
    loadOccupancy(session, CAPTURE_RED, CAPTURE_BLUE);
    session.getEngine().getState().currentPlayer = 'RED';
    applyClick(session, idOf(session, 'LIT'));
    // Enemy bead itself is inert
    expect(session.interpretClick(idOf(session, 'A20')).kind).toBe('ignore');
    // Horizontal bend is illegal
    expect(findJumpPath(session.getEngine().getState().board, idOf(session, 'LIT'), idOf(session, 'A21'))).toBeUndefined();
    // Diagonal continuation into grid is legal
    expect(findJumpPath(session.getEngine().getState().board, idOf(session, 'LIT'), idOf(session, 'A31'))).toBeDefined();
  });

  it('LIB can capture black bead on A20 landing on empty A11 (the exact screenshot scenario)', () => {
    const session = new FeatureSession('16', { mode: 'pve', ...off });
    // Clear board and place jumper on LIB, victim on A20, landing A11 empty
    const engine = session.getEngine();
    for (const point of engine.getState().board.intersections) {
      point.occupant = undefined;
    }
    engine.getState().board.intersections.find((p) => p.label === 'LIB')!.occupant = 'RED';
    engine.getState().board.intersections.find((p) => p.label === 'A20')!.occupant = 'BLUE';
    engine.getState().board.intersections.find((p) => p.label === 'A44')!.occupant = 'BLUE';
    engine.getState().currentPlayer = 'RED';

    applyClick(session, idOf(session, 'LIB'));
    expect(session.getSelectedId()).toBe(idOf(session, 'LIB'));
    expect(session.getLegalTargetIds()).toContain(idOf(session, 'A11'));

    // Enemy bead is inert
    expect(session.interpretClick(idOf(session, 'A20')).kind).toBe('ignore');

    // Clicking landing square executes the capture
    applyClick(session, idOf(session, 'A11'));
    expect(engine.getState().board.intersections.find((p) => p.label === 'LIB')?.occupant).toBeUndefined();
    expect(engine.getState().board.intersections.find((p) => p.label === 'A20')?.occupant).toBeUndefined();
    expect(engine.getState().board.intersections.find((p) => p.label === 'A11')?.occupant).toBe('RED');
    expect(engine.getState().captures.RED).toBe(1);
  });

  it('stall screenshot: Medium runAiTurn finishes and returns the turn to Ivory', () => {
    for (let i = 0; i < 8; i++) {
      const session = new FeatureSession('16', { mode: 'pve', ...off });
      loadOccupancy(session, STALL_RED, STALL_BLUE);
      const engine = session.getEngine();
      engine.getState().currentPlayer = 'BLUE';
      expect(engine.countPieces('RED')).toBe(15);
      expect(engine.countPieces('BLUE')).toBe(16);
      const hops = runAiTurn(session);
      expect(hops.length).toBeGreaterThan(0);
      expect(engine.getChainPieceId()).toBeNull();
      if (!session.isGameOver()) {
        expect(engine.getState().currentPlayer).toBe('RED');
        expect(session.getUiState()).not.toBe('chain');
      }
    }
  });
});
