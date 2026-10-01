import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import { BoardVariant } from '../../../../config/BoardConfig';
import { Move, Player } from '../../../../models/GameState';
import { AiLevel } from '../GameFeatureSettings';
import { generateTurnEnds, selectAiTurnPath } from '../HonestAi';

/**
 * Difficulty ladder regression guard: a stronger level must clearly beat the weaker one.
 * Baseline (2026-10-01, 100 games/board, alternating colour, 2 random opening turns):
 *   L3 vs L2 -> 6x4 99W/0L, 6x3x5 97W/1L, 7x4x5 97W/0L ; L2 vs L1 -> ~94% wins.
 * Bars below are far looser than the baseline so noise cannot flake them, but a real AI regression trips them.
 */
jest.setTimeout(600_000);

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function applyPath(engine: SmartBeadsEngine, path: Move[]): void {
  for (const move of path) {
    if (engine.getState().gameOver) return;
    if (!engine.getLegalMoves().some((m) => m.from === move.from && m.to === move.to)) {
      if (engine.getChainPieceId() !== null) engine.endTurn();
      return;
    }
    engine.applyMove(move);
  }
  if (engine.getChainPieceId() !== null) engine.endTurn();
}

/** Returns 'STRONG' | 'WEAK' | 'DRAW' from the stronger level's point of view. */
function playGame(
  variant: BoardVariant,
  strong: AiLevel,
  weak: AiLevel,
  id: number,
): 'STRONG' | 'WEAK' | 'DRAW' {
  const rng = mulberry32(900_001 + id * 7919 + strong * 31 + weak);
  const strongColor: Player = id % 2 === 0 ? 'RED' : 'BLUE';
  const engine = new SmartBeadsEngine(variant);
  for (let i = 0; i < 2; i += 1) {
    const p = engine.getState().currentPlayer;
    const ends = generateTurnEnds(variant, engine.exportSnapshot(), p, Number.POSITIVE_INFINITY);
    if (!ends.length) break;
    applyPath(engine, ends[Math.floor(rng() * ends.length)]!.path);
  }
  let turns = 0;
  while (!engine.getState().gameOver && turns < 400) {
    const p = engine.getState().currentPlayer;
    const level = p === strongColor ? strong : weak;
    const path = selectAiTurnPath(variant, level, engine.exportSnapshot(), p, {
      rng,
    });
    if (!path) break;
    applyPath(engine, path);
    turns += 1;
  }
  const w = engine.getState().winner;
  if (w === strongColor) return 'STRONG';
  if (w === 'DRAW' || w === undefined) return 'DRAW';
  return 'WEAK';
}

function series(variant: BoardVariant, strong: AiLevel, weak: AiLevel, games: number) {
  let s = 0;
  let w = 0;
  for (let i = 0; i < games; i += 1) {
    const r = playGame(variant, strong, weak, i);
    if (r === 'STRONG') s += 1;
    else if (r === 'WEAK') w += 1;
  }
  return { s, w, d: games - s - w, games };
}

describe('AI difficulty ladder (strength regression guard)', () => {
  const GAMES = 12;
  for (const variant of ['6', '6x3x5', '7'] as const) {
    it(`Expert (L3) clearly beats Standard (L2) on ${variant}`, () => {
      const r = series(variant, 3, 2, GAMES);
      expect(r.s).toBeGreaterThanOrEqual(Math.ceil(GAMES * 0.75));
      expect(r.w).toBeLessThanOrEqual(1);
    });
  }

  it('Standard (L2) clearly beats Casual (L1) on 6x4', () => {
    const r = series('6', 2, 1, GAMES);
    expect(r.s).toBeGreaterThanOrEqual(Math.ceil(GAMES * 0.75));
    expect(r.w).toBeLessThanOrEqual(2);
  });
});
