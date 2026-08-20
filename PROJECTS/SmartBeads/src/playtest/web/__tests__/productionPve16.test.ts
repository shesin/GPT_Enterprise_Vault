import { FeatureSession } from '../feature/FeatureSession';
import { runAiTurn } from '../PlayController';

const off = {
  aiLevel: 1 as const,
  matchTimer: 'off' as const,
  shotClock: 'off' as const,
  centerRule: 'off' as const,
};

const PRODUCTION_PVE_GAMES = 8;
const MAX_PLIES = 60;

/**
 * Production PvE: FeatureSession + HonestAi via runAiTurn on 16-bead.
 * This is not Lab CJS, not Board4 SelfPlayRunner, not applyAiHops-only.
 */
describe('production 16-bead PvE (SmartBeadsEngine + FeatureSession + HonestAi + runAiTurn)', () => {
  it(`completes ${PRODUCTION_PVE_GAMES} Easy games without leaving AI mid-chain or stuck to move`, () => {
    for (let game = 0; game < PRODUCTION_PVE_GAMES; game++) {
      const session = new FeatureSession('16', { mode: 'pve', ...off });
      let plies = 0;
      while (!session.isGameOver() && plies < MAX_PLIES) {
        const engine = session.getEngine();
        const player = engine.getState().currentPlayer;
        if (player === 'RED') {
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
      expect(engineStillSane(session)).toBe(true);
    }
  });
});

function engineStillSane(session: FeatureSession): boolean {
  return session.getEngine().getChainPieceId() === null;
}
