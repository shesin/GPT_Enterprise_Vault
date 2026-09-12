import { FeatureSession } from '../FeatureSession';
import { buildCoachWatchSettings } from '../GameFeatureSettings';
import { firstOpeningSlide } from '../firstMoveInvariants';

const off = {
  aiLevel: 2 as const,
  timer: 'off' as const,
  tournamentTimer: 'off',
  shotClock: 'off' as const,
  centerRule: 'off' as const,
};

describe('FeatureSession spectate watch mode', () => {
  it('8x4x6 coach watch blocks all human input on both sides', () => {
    const session = new FeatureSession('8x4x6', buildCoachWatchSettings());
    const engine = session.getEngine();
    expect(session.canHumanAct()).toBe(false);

    const red = engine.getState().board.intersections.find((n) => n.occupant === 'RED');
    expect(red).toBeDefined();
    expect(session.selectNode(red!.id)).toBe(false);
    expect(session.interpretClick(red!.id).kind).toBe('ignore');

    const slide = firstOpeningSlide(engine);
    session.applyMove(slide);
    expect(engine.getState().currentPlayer).toBe('BLUE');
    expect(session.canHumanAct()).toBe(false);
  });

  it('8x4x6 coach preview arms selection and legal targets without human act', () => {
    const session = new FeatureSession('8x4x6', buildCoachWatchSettings());
    const engine = session.getEngine();
    const red = engine.getState().board.intersections.find(
      (n) => n.occupant === 'RED' && engine.getLegalMoves().some((m) => m.from === n.id),
    );
    expect(red).toBeDefined();
    expect(session.canHumanAct()).toBe(false);
    expect(session.selectNode(red!.id)).toBe(false);

    expect(session.previewScriptedSelection(red!.id)).toBe(true);
    expect(session.getSelectedId()).toBe(red!.id);
    expect(session.getLegalTargetIds().length).toBeGreaterThan(0);
  });

  it('scripted preview clears match-start rings like a human pick', () => {
    const session = new FeatureSession('8x4x6', buildCoachWatchSettings());
    const engine = session.getEngine();
    expect(session.shouldShowTurnStartRings()).toBe(true);
    const red = engine.getState().board.intersections.find(
      (n) => n.occupant === 'RED' && engine.getLegalMoves().some((m) => m.from === n.id),
    );
    expect(red).toBeDefined();
    expect(session.previewScriptedSelection(red!.id)).toBe(true);
    expect(session.shouldShowTurnStartRings()).toBe(false);
  });
});

describe('FeatureSession natural turn taking (all V1 boards)', () => {
  const variants = ['16', '12x6x5', '10x5', '8x4x6', '7', '6', '6x3x5'] as const;

  it.each(variants)('%s PvE: cannot select Ebony, and after a slide only AI may act', (variant) => {
    const session = new FeatureSession(variant, { mode: 'pve', ...off });
    const engine = session.getEngine();
    const blue = engine.getState().board.intersections.find((n) => n.occupant === 'BLUE');
    expect(blue).toBeDefined();
    expect(session.selectNode(blue!.id)).toBe(false);
    expect(session.getSelectedId()).toBeNull();
    expect(session.canHumanAct()).toBe(true);

    const slide = firstOpeningSlide(engine);
    session.applyMove(slide);

    expect(engine.getState().currentPlayer).toBe('BLUE');
    expect(session.canHumanAct()).toBe(false);
    expect(session.selectNode(slide.to)).toBe(false);
    const red = engine.getState().board.intersections.find((n) => n.occupant === 'RED');
    expect(session.selectNode(red!.id)).toBe(false);
  });

  it.each(variants)('%s PvP: after P1 slide, only Ebony can be selected', (variant) => {
    const session = new FeatureSession(variant, { mode: 'pvp', ...off });
    const engine = session.getEngine();
    const slide = firstOpeningSlide(engine);
    session.applyMove(slide);

    expect(engine.getState().currentPlayer).toBe('BLUE');
    expect(session.canHumanAct()).toBe(true);

    const red = engine.getState().board.intersections.find((n) => n.occupant === 'RED' && engine.getLegalMoves().some((m) => m.from === n.id));
    const blue = engine.getState().board.intersections.find((n) => n.occupant === 'BLUE' && engine.getLegalMoves().some((m) => m.from === n.id));
    expect(blue).toBeDefined();
    if (red) {
      expect(session.selectNode(red.id)).toBe(false);
    }
    expect(session.selectNode(blue!.id)).toBe(true);
    expect(session.getSelectedId()).toBe(blue!.id);
  });
});

describe('FeatureSession 16-bead triangular two-click path', () => {
  it('shows no landing highlights until a piece is selected', () => {
    const session = new FeatureSession('16', { mode: 'pvp', ...off });
    const engine = session.getEngine();
    for (const point of engine.getState().board.intersections) {
      point.occupant = undefined;
    }
    engine.getState().board.intersections.find((p) => p.label === 'LT')!.occupant = 'RED';
    engine.getState().board.intersections.find((p) => p.label === 'LIT')!.occupant = 'BLUE';
    engine.getState().currentPlayer = 'RED';

    expect(session.getSelectedId()).toBeNull();
    expect(session.getLegalTargetIds()).toEqual([]);
  });

  it('selecting LT offers collinear landing A20, keeps LIT inert, and does not offer the LIM corner', () => {
    const session = new FeatureSession('16', { mode: 'pvp', ...off });
    const engine = session.getEngine();
    for (const point of engine.getState().board.intersections) {
      point.occupant = undefined;
    }
    const id = (label: string) => engine.getState().board.intersections.find((p) => p.label === label)!.id;
    engine.getState().board.intersections.find((p) => p.label === 'LT')!.occupant = 'RED';
    engine.getState().board.intersections.find((p) => p.label === 'LIT')!.occupant = 'BLUE';
    engine.getState().currentPlayer = 'RED';

    expect(session.selectNode(id('LT'))).toBe(true);
    const targets = session.getLegalTargetIds();
    expect(targets).toContain(id('A20'));
    expect(targets).not.toContain(id('LIT'));
    expect(targets).not.toContain(id('LIM'));

    // Enemy bead is inert
    expect(session.interpretClick(id('LIT')).kind).toBe('ignore');

    // Clicking landing square executes capture
    const click = session.interpretClick(id('A20'));
    expect(click.kind).toBe('move');
    if (click.kind !== 'move') return;
    session.applyMove(click.move);
    expect(engine.getState().board.intersections.find((p) => p.label === 'A20')?.occupant).toBe('RED');
    expect(engine.getState().board.intersections.find((p) => p.label === 'LIT')?.occupant).toBeUndefined();
    expect(engine.getState().captures.RED).toBe(1);
  });
});

describe('FeatureSession opponent inertness & standard rules (all 7 V1 boards)', () => {
  const variants = ['16', '12x6x5', '10x5', '8x4x6', '7', '6', '6x3x5'] as const;

  it.each(variants)('%s idle click on capturable opponent bead does NOTHING', (variant) => {
    const session = new FeatureSession(variant, { mode: 'pve', ...off });
    const engine = session.getEngine();
    const paths = engine.getState().board.jumpPaths ?? [];
    expect(paths.length).toBeGreaterThan(0);
    const path = paths[0];

    // Clear board and place jumper on path.from, capturable enemy on path.over, path.to empty
    for (const point of engine.getState().board.intersections) point.occupant = undefined;
    engine.getState().board.intersections[path.from].occupant = 'RED';
    engine.getState().board.intersections[path.over].occupant = 'BLUE';
    // Add a spare enemy far away
    const spare = engine.getState().board.intersections.find((p) => p.id !== path.from && p.id !== path.over && p.id !== path.to);
    if (spare) spare.occupant = 'BLUE';
    engine.getState().currentPlayer = 'RED';

    // Verify jumper has a legal capture available
    expect(engine.getLegalMoves().some((m) => m.from === path.from && m.to === path.to)).toBe(true);

    // Initial state is idle
    expect(session.getUiState()).toBe('idle');
    expect(session.getSelectedId()).toBeNull();

    // Direct click on the capturable enemy bead while idle MUST be completely ignored
    const idleClick = session.interpretClick(path.over);
    expect(idleClick.kind).toBe('ignore');
    expect(session.getSelectedId()).toBeNull();
    expect(session.getUiState()).toBe('idle');
    expect(engine.getState().board.intersections[path.over].occupant).toBe('BLUE');
    expect(engine.getState().board.intersections[path.to].occupant).toBeUndefined();
    expect(engine.getState().captures.RED).toBe(0);
    expect(engine.getState().moveCount).toBe(0);

    // Direct select on enemy bead must fail
    expect(session.selectNode(path.over)).toBe(false);
    expect(session.getSelectedId()).toBeNull();
  });

  it.each(variants)('%s clicking victim bead after selecting jumper is ignored; only landing square executes capture', (variant) => {
    const session = new FeatureSession(variant, { mode: 'pve', ...off });
    const engine = session.getEngine();
    const path = (engine.getState().board.jumpPaths ?? [])[0];

    for (const point of engine.getState().board.intersections) point.occupant = undefined;
    engine.getState().board.intersections[path.from].occupant = 'RED';
    engine.getState().board.intersections[path.over].occupant = 'BLUE';
    const spare = engine.getState().board.intersections.find((p) => p.id !== path.from && p.id !== path.over && p.id !== path.to);
    if (spare) spare.occupant = 'BLUE';
    engine.getState().currentPlayer = 'RED';

    // Step 1: Select own bead
    expect(session.selectNode(path.from)).toBe(true);
    expect(session.getSelectedId()).toBe(path.from);
    expect(session.getUiState()).toBe('selected');
    expect(session.getLegalTargetIds()).toContain(path.to);
    expect(session.getLegalTargetIds()).not.toContain(path.over);

    // Step 2: Clicking the enemy bead itself while selected is ignored
    const victimClick = session.interpretClick(path.over);
    expect(victimClick.kind).toBe('ignore');
    expect(session.getSelectedId()).toBe(path.from); // Selection unchanged
    expect(engine.getState().board.intersections[path.over].occupant).toBe('BLUE');

    // Step 3: Clicking the empty landing square executes the capture
    const landingClick = session.interpretClick(path.to);
    expect(landingClick.kind).toBe('move');
    if (landingClick.kind === 'move') {
      session.applyMove(landingClick.move);
      expect(engine.getState().board.intersections[path.from].occupant).toBeUndefined();
      expect(engine.getState().board.intersections[path.over].occupant).toBeUndefined();
      expect(engine.getState().board.intersections[path.to].occupant).toBe('RED');
      expect(engine.getState().captures.RED).toBe(1);
    }
  });

  it.each(variants)('%s mid-chain clicking an opponent bead is ignored', (variant) => {
    const session = new FeatureSession(variant, { mode: 'pve', ...off });
    const engine = session.getEngine();
    const paths = engine.getState().board.jumpPaths ?? [];

    // Find two chaining jumps: A -> B over V1, then B -> C over V2
    let chain: [typeof paths[0], typeof paths[0]] | null = null;
    for (const p1 of paths) {
      for (const p2 of paths) {
        if (p1.to === p2.from && new Set([p1.from, p1.over, p1.to, p2.over, p2.to]).size === 5) {
          chain = [p1, p2];
          break;
        }
      }
      if (chain) break;
    }
    if (!chain) return;

    const [hop1, hop2] = chain;
    for (const point of engine.getState().board.intersections) point.occupant = undefined;
    engine.getState().board.intersections[hop1.from].occupant = 'RED';
    engine.getState().board.intersections[hop1.over].occupant = 'BLUE';
    engine.getState().board.intersections[hop2.over].occupant = 'BLUE';
    const spare = engine.getState().board.intersections.find((p) => !new Set([hop1.from, hop1.over, hop1.to, hop2.over, hop2.to]).has(p.id));
    if (spare) spare.occupant = 'BLUE';
    engine.getState().currentPlayer = 'RED';

    // Execute hop 1
    session.selectNode(hop1.from);
    session.applyMove({ from: hop1.from, to: hop1.to });

    // We are now mid-chain
    expect(session.getUiState()).toBe('chain');
    expect(engine.getChainPieceId()).toBe(hop1.to);

    // Clicking opponent bead (hop2.over or spare) while mid-chain MUST be ignored
    expect(session.interpretClick(hop2.over).kind).toBe('ignore');
    if (spare) expect(session.interpretClick(spare.id).kind).toBe('ignore');

    // Chain piece remains
    expect(engine.getChainPieceId()).toBe(hop1.to);

    // Optional capture — Finish capture ends the turn
    session.finishChain();
    expect(session.getUiState()).toBe('idle');
    expect(engine.getChainPieceId()).toBeNull();
    expect(engine.getState().currentPlayer).toBe('BLUE');
  });
});

describe('FeatureSession turn start rings', () => {
  const pve = { ...off, mode: 'pve' as const };

  it('shows all-bead flash at match start only — not again on later turns', () => {
    const session = new FeatureSession('8x4x6', pve);
    expect(session.shouldShowTurnStartRings()).toBe(true);

    const slide = firstOpeningSlide(session.getEngine());
    expect(session.selectNode(slide.from)).toBe(true);
    expect(session.shouldShowTurnStartRings()).toBe(false);

    session.applyMove(slide);
    expect(session.getEngine().getState().currentPlayer).toBe('BLUE');
    expect(session.shouldShowTurnStartRings()).toBe(false);
  });

  it('deselect or re-select does not re-arm turn-start rings within the same turn', () => {
    const session = new FeatureSession('8x4x6', pve);
    const engine = session.getEngine();
    const slide = firstOpeningSlide(engine);
    expect(session.selectNode(slide.from)).toBe(true);
    expect(session.shouldShowTurnStartRings()).toBe(false);

    const immobile = engine.getState().board.intersections.find(
      (n) => n.occupant === 'RED'
        && n.id !== slide.from
        && !engine.getLegalMoves().some((m) => m.from === n.id),
    );
    if (immobile) {
      expect(session.selectNode(immobile.id)).toBe(false);
      expect(session.getSelectedId()).toBeNull();
    } else {
      const other = engine.getState().board.intersections.find(
        (n) => n.occupant === 'RED'
          && n.id !== slide.from
          && engine.getLegalMoves().some((m) => m.from === n.id),
      );
      expect(other).toBeDefined();
      expect(session.selectNode(other!.id)).toBe(true);
      expect(session.getSelectedId()).toBe(other!.id);
    }
    expect(session.shouldShowTurnStartRings()).toBe(false);
  });

  it('keeps match-start rings until scripted preview (Watch AI / AI opens)', () => {
    const session = new FeatureSession('8x4x6', buildCoachWatchSettings());
    session.setStartingPlayer('RED');
    expect(session.shouldShowTurnStartRings()).toBe(true);
    const red = session.getEngine().getState().board.intersections.find(
      (n) => n.occupant === 'RED' && session.getEngine().getLegalMoves().some((m) => m.from === n.id),
    );
    expect(red).toBeDefined();
    expect(session.previewScriptedSelection(red!.id)).toBe(true);
    expect(session.shouldShowTurnStartRings()).toBe(false);
  });

  it('reset re-arms match-start flash for a new game', () => {
    const session = new FeatureSession('6x3x5', pve);
    const slide = firstOpeningSlide(session.getEngine());
    session.selectNode(slide.from);
    session.applyMove(slide);
    expect(session.shouldShowTurnStartRings()).toBe(false);

    session.reset();
    expect(session.shouldShowTurnStartRings()).toBe(true);
  });

  it('clears all-bead flash after first move on same turn (chain)', () => {
    const session = new FeatureSession('8x4x6', { ...off, mode: 'pvp' as const });
    const engine = session.getEngine();
    const paths = engine.getLegalMoves().filter((m) => m.over !== undefined);
    let chain: [typeof paths[0], typeof paths[0]] | null = null;
    for (const p1 of paths) {
      for (const p2 of paths) {
        if (p1.to === p2.from && new Set([p1.from, p1.over, p1.to, p2.over, p2.to]).size === 5) {
          chain = [p1, p2];
          break;
        }
      }
      if (chain) break;
    }
    if (!chain) return;

    const [hop1] = chain;
    for (const point of engine.getState().board.intersections) point.occupant = undefined;
    engine.getState().board.intersections[hop1.from].occupant = 'RED';
    engine.getState().board.intersections[hop1.over].occupant = 'BLUE';
    engine.getState().board.intersections[hop1.to].occupant = undefined;
    engine.getState().currentPlayer = 'RED';

    expect(session.selectNode(hop1.from)).toBe(true);
    expect(session.shouldShowTurnStartRings()).toBe(false);
    session.applyMove({ from: hop1.from, to: hop1.to });
    expect(session.getEngine().getChainPieceId()).not.toBeNull();
    expect(session.shouldShowTurnStartRings()).toBe(false);
  });

  it('mid-chain: tap another own bead is ignored until Finish capture', () => {
    const session = new FeatureSession('8x4x6', { ...off, mode: 'pvp' as const });
    const engine = session.getEngine();
    const paths = engine.getLegalMoves().filter((m) => m.over !== undefined);
    let chain: [typeof paths[0], typeof paths[0]] | null = null;
    for (const p1 of paths) {
      for (const p2 of paths) {
        if (p1.to === p2.from && new Set([p1.from, p1.over, p1.to, p2.over, p2.to]).size === 5) {
          chain = [p1, p2];
          break;
        }
      }
      if (chain) break;
    }
    if (!chain) return;

    const [hop1] = chain;
    for (const point of engine.getState().board.intersections) point.occupant = undefined;
    engine.getState().board.intersections[hop1.from].occupant = 'RED';
    engine.getState().board.intersections[hop1.over].occupant = 'BLUE';
    engine.getState().board.intersections[hop1.to].occupant = undefined;
    const otherRed = engine.getState().board.intersections.find(
      (p) => !new Set([hop1.from, hop1.over, hop1.to]).has(p.id),
    );
    expect(otherRed).toBeDefined();
    otherRed!.occupant = 'RED';
    engine.getState().currentPlayer = 'RED';

    session.selectNode(hop1.from);
    session.applyMove({ from: hop1.from, to: hop1.to });
    expect(engine.getChainPieceId()).not.toBeNull();

    expect(session.interpretClick(otherRed!.id).kind).toBe('ignore');
    expect(engine.getChainPieceId()).toBe(hop1.to);
    expect(engine.getState().currentPlayer).toBe('RED');

    session.finishChain();
    expect(engine.getChainPieceId()).toBeNull();
    expect(engine.getState().currentPlayer).toBe('BLUE');
  });

  it('undo snapshot round-trips match-start flag', () => {
    const session = new FeatureSession('6x3x5', pve);
    expect(session.shouldShowTurnStartRings()).toBe(true);

    const snap = session.exportSnapshot();
    expect(snap.turnStartRingsPending).toBe(true);

    session.selectNode(firstOpeningSlide(session.getEngine()).from);
    expect(session.exportSnapshot().turnStartRingsPending).toBe(false);

    session.loadSnapshot(snap);
    expect(session.shouldShowTurnStartRings()).toBe(true);
    expect(session.getSelectedId()).toBeNull();
  });
});
