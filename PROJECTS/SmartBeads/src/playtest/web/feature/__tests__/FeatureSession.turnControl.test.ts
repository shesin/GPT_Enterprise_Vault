import { FeatureSession } from '../FeatureSession';
import { firstOpeningSlide } from '../firstMoveInvariants';

const off = {
  aiLevel: 2 as const,
  matchTimer: 'off' as const,
  shotClock: 'off' as const,
  centerRule: 'off' as const,
};

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
  it('selecting LT offers collinear LIT capture to A20 and does not offer the LIM corner', () => {
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
    expect(targets).toContain(id('LIT'));
    expect(targets).not.toContain(id('LIM'));

    const click = session.interpretClick(id('LIT'));
    expect(click.kind).toBe('move');
    if (click.kind !== 'move') return;
    session.applyMove(click.move);
    expect(engine.getState().board.intersections.find((p) => p.label === 'A20')?.occupant).toBe('RED');
    expect(engine.getState().board.intersections.find((p) => p.label === 'LIT')?.occupant).toBeUndefined();
    expect(engine.getState().captures.RED).toBe(1);
  });
});
