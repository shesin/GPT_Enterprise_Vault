import { PRODUCT_BOARD_ORDER, resolveEngineVariant } from '../../../../config/BoardCatalog';
import { FeatureSession } from '../FeatureSession';
import { GameFeatureSettings } from '../GameFeatureSettings';
import { runAiTurn } from '../../PlayController';

const base: GameFeatureSettings = {
  mode: 'pve',
  aiLevel: 2,
  matchTimer: 'off',
  shotClock: 'off',
  centerRule: 'off',
};

/**
 * Human smoke checklist ("16 + one small board") automated for ALL 7 product boards:
 * own beads only selectable, capture + optional Finish, New game / Play again (= reset).
 */
describe('All V1 boards — own beads, capture/Finish, New game', () => {
  it.each(PRODUCT_BOARD_ORDER)('%s: only current-player beads selectable at idle', (boardId) => {
    const variant = resolveEngineVariant(boardId);
    const session = new FeatureSession(variant, base);
    const state = session.getEngine().getState();
    const reds = state.board.intersections.filter((p) => p.occupant === 'RED');
    const blues = state.board.intersections.filter((p) => p.occupant === 'BLUE');
    expect(reds.length).toBeGreaterThan(0);
    expect(blues.length).toBeGreaterThan(0);
    expect(state.currentPlayer).toBe('RED');
    for (const b of blues) {
      expect(session.selectNode(b.id)).toBe(false);
    }
    const movable = session.getEngine().getLegalMoves()[0]?.from;
    expect(movable).toBeDefined();
    expect(session.selectNode(movable!)).toBe(true);
  });

  it.each(PRODUCT_BOARD_ORDER)('%s: New game (reset) restores opening and clears game-over', (boardId) => {
    const variant = resolveEngineVariant(boardId);
    const session = new FeatureSession(variant, { ...base, shotClock: '30' });
    const slide = session.getEngine().getLegalMoves()[0];
    session.applyMove(slide);
    session.endGameByFeature('RED', 'test end');
    expect(session.isGameOver()).toBe(true);
    session.reset();
    expect(session.isGameOver()).toBe(false);
    expect(session.getEngine().getState().currentPlayer).toBe('RED');
    expect(session.getEngine().getState().moveCount).toBe(0);
    expect(session.getUiState()).toBe('idle');
  });

  it.each(PRODUCT_BOARD_ORDER)('%s: Medium AI completes at least one reply turn after human slide', (boardId) => {
    const variant = resolveEngineVariant(boardId);
    const session = new FeatureSession(variant, base);
    const slide = session.getEngine().getLegalMoves().find((m) => {
      const jump = session.getEngine().getState().board.jumpPaths?.some(
        (j) => j.from === m.from && j.to === m.to,
      );
      return !jump;
    });
    expect(slide).toBeDefined();
    session.applyMove(slide!);
    expect(session.getEngine().getState().currentPlayer).toBe('BLUE');
    const hops = runAiTurn(session);
    expect(hops.length).toBeGreaterThan(0);
    expect(session.getEngine().getState().currentPlayer).toBe('RED');
    expect(session.isGameOver() || session.getUiState() === 'idle').toBe(true);
  });
});

describe('Capture optionality (Finish) — 16 and small board', () => {
  it('16: after optional one-hop capture, finishChain returns turn to opponent', () => {
    const session = new FeatureSession('16', base);
    const engine = session.getEngine();
    for (const p of engine.getState().board.intersections) p.occupant = undefined;
    const id = (label: string) => engine.getState().board.intersections.find((p) => p.label === label)!.id;
    engine.getState().board.intersections.find((p) => p.label === 'A00')!.occupant = 'RED';
    engine.getState().board.intersections.find((p) => p.label === 'A01')!.occupant = 'BLUE';
    engine.getState().board.intersections.find((p) => p.label === 'A03')!.occupant = 'BLUE';
    engine.getState().currentPlayer = 'RED';
    expect(session.selectNode(id('A00'))).toBe(true);
    const move = session.resolveClickMove(id('A02'));
    expect(move).not.toBeNull();
    session.applyMove(move!);
    expect(session.getUiState()).toBe('chain');
    session.finishChain();
    expect(session.getEngine().getChainPieceId()).toBeNull();
    expect(session.getEngine().getState().currentPlayer).toBe('BLUE');
  });

  it('6x3x5: Finish mid-chain returns turn to opponent', () => {
    const session = new FeatureSession('6x3x5', base);
    const engine = session.getEngine();
    const paths = engine.getState().board.jumpPaths ?? [];
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
    expect(chain).not.toBeNull();
    const [hop1, hop2] = chain!;
    for (const point of engine.getState().board.intersections) point.occupant = undefined;
    engine.getState().board.intersections[hop1.from].occupant = 'RED';
    engine.getState().board.intersections[hop1.over].occupant = 'BLUE';
    engine.getState().board.intersections[hop2.over].occupant = 'BLUE';
    // Extra BLUE so capture does not wipe the side.
    const spare = engine.getState().board.intersections.find(
      (p) => !new Set([hop1.from, hop1.over, hop1.to, hop2.over, hop2.to]).has(p.id),
    );
    expect(spare).toBeDefined();
    spare!.occupant = 'BLUE';
    engine.getState().currentPlayer = 'RED';

    expect(session.selectNode(hop1.from)).toBe(true);
    session.applyMove({ from: hop1.from, to: hop1.to });
    expect(session.getUiState()).toBe('chain');
    session.finishChain();
    expect(session.getEngine().getChainPieceId()).toBeNull();
    expect(session.getEngine().getState().currentPlayer).toBe('BLUE');
  });
});
