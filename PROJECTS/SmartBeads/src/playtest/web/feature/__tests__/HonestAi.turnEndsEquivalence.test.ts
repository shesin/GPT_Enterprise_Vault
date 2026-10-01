import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import { BoardVariant } from '../../../../config/BoardConfig';
import { Move, Player } from '../../../../models/GameState';
import { generateTurnEnds, TurnEnd } from '../HonestAi';

/**
 * The search plays moves on a fast "search mode" of the engine (shared repetition history, numeric
 * position encoding, apply/undo). Every turn end it reports must equal replaying the same moves on a
 * plain engine with the full string-keyed history — including 3-fold repetition draws.
 */
jest.setTimeout(120_000);

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function signature(e: SmartBeadsEngine): string {
  const s = e.getState();
  return JSON.stringify([
    s.board.intersections.map((p) => p.occupant ?? '.').join(''),
    s.currentPlayer,
    s.moveCount,
    s.captures,
    s.gameOver,
    s.winner ?? null,
    s.endReason ?? null,
    e.getChainPieceId(),
  ]);
}

function endSignature(end: TurnEnd): string {
  const s = end.snapshot.state;
  return JSON.stringify([
    s.board.intersections.map((p) => p.occupant ?? '.').join(''),
    s.currentPlayer,
    s.moveCount,
    s.captures,
    s.gameOver,
    s.winner ?? null,
    s.endReason ?? null,
    end.snapshot.chainPieceId,
  ]);
}

/** Replay a path on a plain engine that starts from `from` (full history, side forced to `player`). */
function replay(v: BoardVariant, from: ReturnType<SmartBeadsEngine['exportSnapshot']>, player: Player, path: Move[]) {
  const e = new SmartBeadsEngine(v);
  e.loadSnapshot({
    ...from,
    state: { ...from.state, currentPlayer: player },
    chainPieceId: null,
  });
  for (const m of path) e.applyMove(m);
  return e;
}

/** Shuffle games: both sides keep undoing their last slide, so positions repeat and draws appear. */
function shuffledEngine(v: BoardVariant, seed: number, plies: number): SmartBeadsEngine {
  const rng = mulberry32(seed);
  const e = new SmartBeadsEngine(v);
  const last: Record<string, Move | null> = { RED: null, BLUE: null };
  for (let i = 0; i < plies && !e.getState().gameOver; i += 1) {
    const p = e.getState().currentPlayer;
    const ends = generateTurnEnds(v, e.exportSnapshot(), p, Infinity);
    if (!ends.length) break;
    let pick = ends.filter((x) => x.path.length === 1 && x.snapshot.state.captures[p] === e.getState().captures[p]);
    if (!pick.length) pick = ends;
    const prev = last[p];
    if (prev) {
      const back = pick.filter((x) => x.path[0]!.from === prev.to && x.path[0]!.to === prev.from);
      if (back.length && rng() < 0.9) pick = back;
    }
    const chosen = pick[Math.floor(rng() * pick.length)]!;
    last[p] = chosen.path.length === 1 ? chosen.path[0]! : null;
    for (const m of chosen.path) e.applyMove(m);
    if (e.getChainPieceId() !== null) e.endTurn();
  }
  return e;
}

describe('search-mode turn ends equal full-engine replays', () => {
  it.each(['6', '7', '6x3x5'] as BoardVariant[])('%s: shuffled games incl. repetition draws', (v) => {
    let compared = 0;
    let repetitions = 0;
    for (let seed = 0; seed < 40; seed += 1) {
      for (const plies of [8, 12, 16]) {
        const e = shuffledEngine(v, 1000 + seed, plies);
        if (e.getState().gameOver) continue;
        const snap = e.exportSnapshot();
        const side = e.getState().currentPlayer;
        const level1 = generateTurnEnds(v, snap, side, Infinity);
        for (const end of level1) {
          expect(endSignature(end)).toBe(signature(replay(v, snap, side, end.path)));
          compared += 1;
          if (end.snapshot.state.endReason === 'repetition') repetitions += 1;
        }
        // one level deeper: replies are computed from search-line snapshots
        for (const end of level1.slice(0, 4)) {
          if (end.snapshot.state.gameOver) continue;
          const other: Player = side === 'RED' ? 'BLUE' : 'RED';
          const base = replay(v, snap, side, end.path);
          const baseSnap = base.exportSnapshot();
          for (const reply of generateTurnEnds(v, end.snapshot, other, 80)) {
            expect(endSignature(reply)).toBe(signature(replay(v, baseSnap, other, reply.path)));
            compared += 1;
            if (reply.snapshot.state.endReason === 'repetition') repetitions += 1;
          }
        }
      }
    }
    expect(compared).toBeGreaterThan(500);
    expect(repetitions).toBeGreaterThan(0);
  });

  it.each(['8x4x6', '16'] as BoardVariant[])('%s: seeded mid-game positions', (v) => {
    for (let seed = 0; seed < 6; seed += 1) {
      const rng = mulberry32(77 + seed);
      const e = new SmartBeadsEngine(v);
      for (let i = 0; i < 10 + Math.floor(rng() * 30) && !e.getState().gameOver; i += 1) {
        const ends = generateTurnEnds(v, e.exportSnapshot(), e.getState().currentPlayer, Infinity);
        if (!ends.length) break;
        for (const m of ends[Math.floor(rng() * ends.length)]!.path) e.applyMove(m);
        if (e.getChainPieceId() !== null) e.endTurn();
      }
      if (e.getState().gameOver) continue;
      const snap = e.exportSnapshot();
      const side = e.getState().currentPlayer;
      for (const end of generateTurnEnds(v, snap, side, Infinity)) {
        expect(endSignature(end)).toBe(signature(replay(v, snap, side, end.path)));
      }
    }
  });
});
