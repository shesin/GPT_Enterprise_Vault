import { listProductBoards, resolveEngineVariant } from '../../../config/BoardCatalog';
import { findJumpPath, JumpPath, requireIntersection } from '../../../models/GameState';
import { FeatureSession } from '../feature/FeatureSession';
import { firstOpeningSlide } from '../feature/firstMoveInvariants';
import { runAiTurn } from '../PlayController';

const off = {
  aiLevel: 1 as const,
  matchTimer: 'off' as const,
  shotClock: 'off' as const,
  centerRule: 'off' as const,
};

const productBoards = listProductBoards();
const PVE_GAMES = 3;
const MAX_PLIES = 40;

function clearBoard(session: FeatureSession): void {
  for (const point of session.getEngine().getState().board.intersections) {
    point.occupant = undefined;
  }
}

function isolateJump(session: FeatureSession, path: JumpPath): void {
  session.reset();
  clearBoard(session);
  const board = session.getEngine().getState().board;
  requireIntersection(board, path.from).occupant = 'RED';
  requireIntersection(board, path.over).occupant = 'BLUE';
  const spare = board.intersections.find(
    (p) => p.id !== path.from && p.id !== path.over && p.id !== path.to,
  );
  if (spare) spare.occupant = 'BLUE';
  session.getEngine().getState().currentPlayer = 'RED';
  session.getEngine().getState().captures.RED = 0;
  session.getEngine().getState().captures.BLUE = 0;
}

describe('V1 production sanity (SmartBeadsEngine + FeatureSession + HonestAi + runAiTurn)', () => {
  it.each(productBoards)('$id every jumpPath captures when isolated', (entry) => {
    const variant = resolveEngineVariant(entry.id);
    const session = new FeatureSession(variant, { mode: 'pve', ...off });
    const paths = session.getEngine().getState().board.jumpPaths ?? [];
    expect(paths.length).toBeGreaterThan(0);

    for (const path of paths) {
      isolateJump(session, path);
      const legal = session.getEngine().getLegalMoves();
      expect(legal.some((m) => m.from === path.from && m.to === path.to)).toBe(true);
      session.selectNode(path.from);
      expect(session.getLegalTargetIds()).toContain(path.to);
      expect(session.getLegalTargetIds()).toContain(path.over);
      const click = session.interpretClick(path.over);
      expect(click.kind).toBe('move');
      if (click.kind !== 'move') continue;
      expect(click.move).toEqual({ from: path.from, to: path.to });
      session.applyMove(click.move);
      expect(requireIntersection(session.getEngine().getState().board, path.over).occupant).toBeUndefined();
      expect(requireIntersection(session.getEngine().getState().board, path.to).occupant).toBe('RED');
      expect(session.getEngine().getState().captures.RED).toBe(1);
    }
  });

  it.each(productBoards)('$id idle click on a unique victim captures without a prior select', (entry) => {
    const variant = resolveEngineVariant(entry.id);
    const session = new FeatureSession(variant, { mode: 'pve', ...off });
    const path = session.getEngine().getState().board.jumpPaths![0];
    isolateJump(session, path);
    expect(session.getSelectedId()).toBeNull();
    const click = session.interpretClick(path.over);
    expect(click.kind).toBe('move');
    if (click.kind !== 'move') return;
    session.applyMove(click.move);
    expect(requireIntersection(session.getEngine().getState().board, path.to).occupant).toBe('RED');
    expect(session.getEngine().getState().captures.RED).toBe(1);
  });

  it.each(productBoards)('$id optional-stop AI hop closes the chain so PvE cannot stick thinking', (entry) => {
    const variant = resolveEngineVariant(entry.id);
    const session = new FeatureSession(variant, { mode: 'pve', ...off });
    const paths = session.getEngine().getState().board.jumpPaths ?? [];
    const hop = paths[0];
    clearBoard(session);
    const board = session.getEngine().getState().board;
    requireIntersection(board, hop.from).occupant = 'BLUE';
    requireIntersection(board, hop.over).occupant = 'RED';
    session.getEngine().getState().currentPlayer = 'BLUE';

    const hops = runAiTurn(session, [{ from: hop.from, to: hop.to }]);
    expect(hops.length).toBeGreaterThan(0);
    expect(session.getEngine().getChainPieceId()).toBeNull();
    if (!session.isGameOver()) {
      expect(session.getEngine().getState().currentPlayer).toBe('RED');
      expect(session.getUiState()).not.toBe('chain');
    }
  });

  it.each(productBoards)('$id Easy production PvE: opening slide then AI finishes and returns the turn', (entry) => {
    const variant = resolveEngineVariant(entry.id);
    const session = new FeatureSession(variant, { mode: 'pve', ...off });
    session.applyMove(firstOpeningSlide(session.getEngine()));
    expect(session.getEngine().getState().currentPlayer).toBe('BLUE');
    const hops = runAiTurn(session);
    expect(hops.length).toBeGreaterThan(0);
    expect(session.getEngine().getChainPieceId()).toBeNull();
    if (!session.isGameOver()) {
      expect(session.getEngine().getState().currentPlayer).toBe('RED');
      expect(session.canHumanAct()).toBe(true);
    }
  });

  it.each(productBoards)(
    `$id completes ${PVE_GAMES} Easy production games without leaving AI mid-chain`,
    (entry) => {
      const variant = resolveEngineVariant(entry.id);
      for (let game = 0; game < PVE_GAMES; game++) {
        const session = new FeatureSession(variant, { mode: 'pve', ...off });
        let plies = 0;
        while (!session.isGameOver() && plies < MAX_PLIES) {
          const engine = session.getEngine();
          if (engine.getState().currentPlayer === 'RED') {
            const moves = engine.getLegalMoves();
            if (moves.length === 0) break;
            session.applyMove(moves[0]);
            if (session.getUiState() === 'chain') session.finishChain();
          } else {
            const before = session.getMoveCount();
            runAiTurn(session);
            expect(engine.getChainPieceId()).toBeNull();
            if (!session.isGameOver()) {
              expect(engine.getState().currentPlayer).toBe('RED');
              expect(session.getMoveCount()).toBeGreaterThan(before);
            }
          }
          plies += 1;
        }
        expect(session.getEngine().getChainPieceId()).toBeNull();
      }
    },
  );

  it('jump legality is the jumpPaths table — a missing from/to is not a legal hop', () => {
    const session = new FeatureSession('16', { mode: 'pve', ...off });
    const board = session.getEngine().getState().board;
    const lit = board.intersections.find((p) => p.label === 'LIT')!.id;
    const a20 = board.intersections.find((p) => p.label === 'A20')!.id;
    const a21 = board.intersections.find((p) => p.label === 'A21')!.id;
    expect(findJumpPath(board, lit, a20)).toBeUndefined();
    expect(findJumpPath(board, lit, a21)).toBeUndefined();
  });
});
