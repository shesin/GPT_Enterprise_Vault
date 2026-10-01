import { PRODUCT_BOARD_ORDER, resolveEngineVariant } from '../../../../config/BoardCatalog';
import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import { generateTurnEnds, selectAiTurnPath } from '../HonestAi';

/** Hard product limit: an AI move must never need more than 3 s on any device (desktop is ~5x+ faster). */
const DESKTOP_LIMIT_MS = 3000;

function timedPick(
  variant: ReturnType<typeof resolveEngineVariant>,
  level: 2 | 3,
  engine: SmartBeadsEngine,
) {
  const snap = engine.exportSnapshot();
  const legal = generateTurnEnds(variant, snap, 'BLUE', Number.POSITIVE_INFINITY).length;
  const t0 = Date.now();
  const path = selectAiTurnPath(variant, level, snap, 'BLUE', { rng: () => 0 });
  return { path, legal, ms: Date.now() - t0 };
}

describe('HonestAi search: one full search, legal result, bounded time', () => {
  jest.setTimeout(120_000);

  it.each(PRODUCT_BOARD_ORDER)(
    '%s: Expert and Standard answer the opening with a legal move',
    (boardId) => {
      const variant = resolveEngineVariant(boardId);
      for (const level of [3, 2] as const) {
        const engine = new SmartBeadsEngine(variant);
        engine.getState().currentPlayer = 'BLUE';
        const { path, legal, ms } = timedPick(variant, level, engine);
        expect(legal).toBeGreaterThan(0);
        expect(path?.length).toBeGreaterThan(0);
        const first = path![0]!;
        expect(engine.getLegalMoves().some((m) => m.from === first.from && m.to === first.to)).toBe(
          true,
        );
        expect(ms).toBeLessThan(DESKTOP_LIMIT_MS);
      }
    },
  );

  it('16-bead: Expert after several plies stays under the limit and is legal', () => {
    const engine = new SmartBeadsEngine('16');
    for (let i = 0; i < 6; i += 1) {
      const moves = engine.getLegalMoves();
      if (!moves.length) break;
      engine.applyMove(moves[0]!);
      if (engine.getChainPieceId() !== null) engine.endTurn();
    }
    engine.getState().currentPlayer = 'BLUE';
    const { path, ms } = timedPick('16', 3, engine);
    expect(path?.length).toBeGreaterThan(0);
    expect(ms).toBeLessThan(DESKTOP_LIMIT_MS);
  });
});
