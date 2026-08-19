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
