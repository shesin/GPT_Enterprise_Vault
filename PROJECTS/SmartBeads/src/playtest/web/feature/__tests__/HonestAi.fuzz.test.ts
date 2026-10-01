import { PRODUCT_BOARD_ORDER, resolveEngineVariant } from '../../../../config/BoardCatalog';
import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import { generateTurnEnds, selectAiTurnPath } from '../HonestAi';
import { AiLevel } from '../GameFeatureSettings';

/**
 * Property/fuzz guard for the AI entry point on every board: from random reachable positions the AI
 * must return a legal, replayable turn (or null only when the side has no legal move), must not throw,
 * and must be deterministic for a given seeded rng.
 */
jest.setTimeout(240_000);

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POSITIONS_PER_BOARD = 12;

describe('AI fuzz: legal, deterministic, never throws', () => {
  it.each(PRODUCT_BOARD_ORDER)('%s: random positions, levels 1-3', (boardId) => {
    const v = resolveEngineVariant(boardId);
    let checked = 0;
    for (let id = 0; id < POSITIONS_PER_BOARD * 3 && checked < POSITIONS_PER_BOARD; id += 1) {
      const rng = mulberry32(9000 + id * 131 + v.length);
      const e = new SmartBeadsEngine(v);
      const plies = 2 + Math.floor(rng() * 50);
      for (let i = 0; i < plies && !e.getState().gameOver; i += 1) {
        const ends = generateTurnEnds(v, e.exportSnapshot(), e.getState().currentPlayer, Infinity);
        if (!ends.length) break;
        const caps = ends.filter((x) => x.path.length > 1);
        const pick = caps.length && rng() < 0.4 ? caps : ends;
        for (const m of pick[Math.floor(rng() * pick.length)]!.path) e.applyMove(m);
        if (e.getChainPieceId() !== null) e.endTurn();
      }
      if (e.getState().gameOver) continue;
      checked += 1;

      const snap = e.exportSnapshot();
      const side = e.getState().currentPlayer;
      for (const level of [1, 2, 3] as AiLevel[]) {
        const a = selectAiTurnPath(v, level, snap, side, { rng: mulberry32(id + level) });
        const b = selectAiTurnPath(v, level, snap, side, { rng: mulberry32(id + level) });
        expect(a).not.toBeNull();
        expect(b).toEqual(a);

        // Replayable on a plain engine: every hop legal, chain hops are jumps by the chain bead.
        const replay = new SmartBeadsEngine(v);
        replay.loadSnapshot(snap);
        for (const m of a!) {
          expect(replay.getLegalMoves().some((x) => x.from === m.from && x.to === m.to)).toBe(true);
          replay.applyMove(m);
        }
        expect(a!.length).toBeGreaterThan(0);
        if (replay.getChainPieceId() !== null) replay.endTurn();
        expect(replay.getState().currentPlayer === side && !replay.getState().gameOver).toBe(false);
      }
    }
    expect(checked).toBeGreaterThanOrEqual(POSITIONS_PER_BOARD - 2);
  });

  it('returns null when the side to move has no legal move', () => {
    const e = new SmartBeadsEngine('6');
    for (const p of e.getState().board.intersections) p.occupant = undefined;
    e.getState().board.intersections[0]!.occupant = 'RED';
    e.getState().currentPlayer = 'BLUE';
    e.rebaselineRepetitionHistory();
    expect(selectAiTurnPath('6', 3, e.exportSnapshot(), 'BLUE', { rng: () => 0 })).toBeNull();
  });
});
