import { FeatureSession } from '../FeatureSession';
import { shouldAcceptResignationDraw } from '../HonestAi';
import { GameFeatureSettings } from '../GameFeatureSettings';

const base: GameFeatureSettings = {
  mode: 'pve',
  aiLevel: 1,
  timer: 'off',
  tournamentTimer: 'off',
  shotClock: 'off',
  centerRule: 'off',
};

function clearOccupants(session: FeatureSession): void {
  for (const p of session.getEngine().getState().board.intersections) {
    p.occupant = undefined;
  }
}

function setOcc(session: FeatureSession, label: string, player: 'RED' | 'BLUE'): void {
  const p = session
    .getEngine()
    .getState()
    .board.intersections.find((n) => n.label === label);
  if (!p) throw new Error(label);
  p.occupant = player;
}

describe('FeatureSession center / timer (runtime rules)', () => {
  it('centre rule needs a match timer: no timer forces centre off, timer on keeps it', () => {
    const noTimer = new FeatureSession('6x3x5', { ...base, centerRule: 'endgame', timer: 'off' });
    expect(noTimer.getSettings().centerRule).toBe('off');
    const withTimer = new FeatureSession('6x3x5', { ...base, centerRule: 'endgame', timer: '5' });
    expect(withTimer.getSettings().centerRule).toBe('endgame');
  });

  it('endgame center tiebreak awards winner when captures tied (match timer on)', () => {
    const session = new FeatureSession('6x3x5', {
      ...base,
      centerRule: 'endgame',
      timer: '15',
    });
    clearOccupants(session);
    setOcc(session, 'A21', 'RED');
    setOcc(session, 'A00', 'RED');
    setOcc(session, 'A40', 'BLUE');
    session.getEngine().getState().captures.RED = 2;
    session.getEngine().getState().captures.BLUE = 2;

    session.evaluateScoreAndEnd('Game ended.');
    expect(session.isGameOver()).toBe(true);
    expect(session.getDisplayedWinner()).toBe('RED');
    expect(session.getDisplayedReason()).toContain('center');
  });

  it('engine safety cap: tied captures + centre rule on -> centre decides, not a draw', () => {
    const session = new FeatureSession('6x3x5', { ...base, centerRule: 'endgame', timer: '15' });
    clearOccupants(session);
    setOcc(session, 'A21', 'RED');
    setOcc(session, 'A00', 'RED');
    setOcc(session, 'A40', 'BLUE');
    const st = session.getEngine().getState();
    st.currentPlayer = 'RED';
    st.moveCount = 119;
    const move = session
      .getEngine()
      .getLegalMoves()
      .find(
        (m) =>
          m.from ===
          session
            .getEngine()
            .getState()
            .board.intersections.find((n) => n.label === 'A00')!.id,
      )!;
    session.applyMove(move);
    expect(session.isGameOver()).toBe(true);
    expect(session.getDisplayedWinner()).toBe('RED');
    expect(session.getDisplayedReason()).toContain('center');
  });

  it('engine safety cap: tied captures + centre off -> draw', () => {
    const session = new FeatureSession('6x3x5', { ...base, centerRule: 'off' });
    clearOccupants(session);
    setOcc(session, 'A21', 'RED');
    setOcc(session, 'A00', 'RED');
    setOcc(session, 'A40', 'BLUE');
    const st = session.getEngine().getState();
    st.currentPlayer = 'RED';
    st.moveCount = 119;
    session.applyMove(session.getEngine().getLegalMoves()[0]!);
    expect(session.isGameOver()).toBe(true);
    expect(session.getDisplayedWinner()).toBe('DRAW');
  });

  it('engine safety cap: more captures wins, regardless of centre', () => {
    const session = new FeatureSession('6x3x5', { ...base, centerRule: 'endgame', timer: '15' });
    clearOccupants(session);
    setOcc(session, 'A21', 'RED');
    setOcc(session, 'A00', 'RED');
    setOcc(session, 'A40', 'BLUE');
    const st = session.getEngine().getState();
    st.currentPlayer = 'RED';
    st.captures.BLUE = 3;
    st.captures.RED = 1;
    st.moveCount = 119;
    session.applyMove(session.getEngine().getLegalMoves()[0]!);
    expect(session.getDisplayedWinner()).toBe('BLUE');
  });

  it('cumulative center accrues occupancy across multiple completed turns', () => {
    const session = new FeatureSession('6x3x5', {
      ...base,
      mode: 'pvp',
      centerRule: 'cumulative',
      timer: '15',
    });
    clearOccupants(session);
    setOcc(session, 'A11', 'RED');
    setOcc(session, 'A40', 'BLUE');
    const from = session
      .getEngine()
      .getState()
      .board.intersections.find((p) => p.label === 'A11')!.id;
    const to = session
      .getEngine()
      .getState()
      .board.intersections.find((p) => p.label === 'A21')!.id;
    session.getEngine().getState().currentPlayer = 'RED';
    session.selectNode(from);
    const move = session.resolveClickMove(to);
    expect(move).not.toBeNull();
    session.applyMove(move!);
    const afterRed = session.getCenterDisplayScores();
    expect(afterRed.red).toBe(1);

    const blueFrom = session
      .getEngine()
      .getState()
      .board.intersections.find((p) => p.label === 'A40')!.id;
    session.selectNode(blueFrom);
    const blueTargets = session.getLegalTargetIds();
    expect(blueTargets.length).toBeGreaterThan(0);
    const blueMove = session.resolveClickMove(blueTargets[0]!);
    expect(blueMove).not.toBeNull();
    session.applyMove(blueMove!);

    const afterBlue = session.getCenterDisplayScores();
    expect(afterBlue.red).toBeGreaterThanOrEqual(afterRed.red);
  });

  it('evaluateScoreAndEnd uses cumulative totals when captures are tied', () => {
    const session = new FeatureSession('6x3x5', {
      ...base,
      centerRule: 'cumulative',
      timer: '15',
    });
    clearOccupants(session);
    setOcc(session, 'A00', 'RED');
    setOcc(session, 'A40', 'BLUE');
    session.getEngine().getState().captures.RED = 2;
    session.getEngine().getState().captures.BLUE = 2;
    setOcc(session, 'A21', 'BLUE');
    session.getEngine().getState().currentPlayer = 'BLUE';
    const snap = session.exportSnapshot();
    session.loadSnapshot({
      ...snap,
      p1CenterScore: 1,
      p2CenterScore: 4,
    });
    session.evaluateScoreAndEnd('Game ended.');
    expect(session.getDisplayedWinner()).toBe('BLUE');
    expect(session.getDisplayedReason()).toContain('center');
  });

  it('shot clock can expire on BLUE turn (AI side)', () => {
    const session = new FeatureSession('6x3x5', {
      ...base,
      shotClock: '30',
    });
    const slide = session
      .getEngine()
      .getLegalMoves()
      .find((m) => {
        const jump = session
          .getEngine()
          .getState()
          .board.jumpPaths?.some((j) => j.from === m.from && j.to === m.to);
        return !jump;
      });
    expect(slide).toBeDefined();
    session.applyMove(slide!);
    expect(session.getEngine().getState().currentPlayer).toBe('BLUE');
    session.resetTurnClock();
    for (let i = 0; i < 30; i++) session.timerTick();
    expect(session.isGameOver()).toBe(true);
    expect(session.getDisplayedWinner()).toBe('RED');
    expect(session.getDisplayedReason()).toContain('Shot clock');
  });

  it('shot clock expiry awards win to opponent of the player to move', () => {
    const session = new FeatureSession('6x3x5', {
      ...base,
      shotClock: '30',
    });
    session.resetTurnClock();
    expect(session.getShotRemaining()).toBe(30);
    for (let i = 0; i < 30; i++) session.timerTick();
    expect(session.isGameOver()).toBe(true);
    expect(session.getDisplayedWinner()).toBe('BLUE');
    expect(session.getDisplayedReason()).toContain('Shot clock');
  });

  it('PvE match timer expiry uses endgame center tiebreak when captures tied (full timerTick path)', () => {
    const session = new FeatureSession('6x3x5', {
      ...base,
      timer: '2',
      centerRule: 'endgame',
    });
    clearOccupants(session);
    setOcc(session, 'A21', 'RED');
    setOcc(session, 'A00', 'RED');
    setOcc(session, 'A40', 'BLUE');
    session.getEngine().getState().captures.RED = 2;
    session.getEngine().getState().captures.BLUE = 2;
    const ticks = 2 * 60;
    for (let i = 0; i < ticks; i++) session.timerTick();
    expect(session.isGameOver()).toBe(true);
    expect(session.getDisplayedWinner()).toBe('RED');
    expect(session.getDisplayedReason()).toContain('center');
  });

  it('PvE match timer expiry uses capture score hierarchy', () => {
    const session = new FeatureSession('6x3x5', {
      ...base,
      timer: '2',
      centerRule: 'endgame',
    });
    session.getEngine().getState().captures.RED = 3;
    session.getEngine().getState().captures.BLUE = 1;
    const ticks = 2 * 60;
    for (let i = 0; i < ticks; i++) session.timerTick();
    expect(session.isGameOver()).toBe(true);
    expect(session.getDisplayedWinner()).toBe('RED');
    const reason = session.getDisplayedReason() ?? '';
    expect(reason).toContain('captures');
    expect(reason).not.toMatch(/\bP1\b|\bP2\b/);
    expect(reason).toContain('Cream bead');
  });
});

describe('shouldAcceptResignationDraw strength', () => {
  it('declines draw when AI is clearly ahead on material', () => {
    const session = new FeatureSession('16', {
      ...base,
      mode: 'pve',
      aiLevel: 2,
    });
    clearOccupants(session);
    setOcc(session, 'A00', 'BLUE');
    setOcc(session, 'A01', 'BLUE');
    setOcc(session, 'A02', 'BLUE');
    setOcc(session, 'A03', 'BLUE');
    setOcc(session, 'A40', 'RED');
    const accept = shouldAcceptResignationDraw('16', session.getEngine().exportSnapshot(), 'BLUE');
    expect(accept).toBe(false);
  });
});
