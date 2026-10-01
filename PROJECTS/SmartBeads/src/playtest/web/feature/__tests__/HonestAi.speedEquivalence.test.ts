import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import { BoardVariant } from '../../../../config/BoardConfig';
import {
  cloneBoardDefinition,
  findJumpPath,
  getConnectedIds,
  getJumpPathsFrom,
  Move,
  Player,
} from '../../../../models/GameState';
import { generateTurnEnds, mobility, selectAiTurnPath, thinkBudgetForLevel } from '../HonestAi';

/**
 * 2026-10-01 AI speed-up guards. The speed-up (engine geometry indexes, mobility without engines,
 * alpha bound + capture ordering in the search) must NEVER change which move the AI picks.
 * GOLDEN picks below were recorded from the pre-speed-up code (commit 7126494) on seeded positions.
 * If a deliberate future AI-strength change alters them, re-record them on purpose — never "fix" silently.
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

function applyPath(e: SmartBeadsEngine, path: Move[]): void {
  for (const m of path) {
    if (e.getState().gameOver) return;
    if (!e.getLegalMoves().some((x) => x.from === m.from && x.to === m.to)) {
      if (e.getChainPieceId() !== null) e.endTurn();
      return;
    }
    e.applyMove(m);
  }
  if (e.getChainPieceId() !== null) e.endTurn();
}

/** Seeded mid-game position (same generator the golden picks were recorded with). */
function position(v: BoardVariant, id: number): SmartBeadsEngine | null {
  const rng = mulberry32(4242 + id * 7919 + v.length * 13);
  const e = new SmartBeadsEngine(v);
  const k = 6 + Math.floor(rng() * 50);
  for (let i = 0; i < k && !e.getState().gameOver; i += 1) {
    const p = e.getState().currentPlayer;
    const ends = generateTurnEnds(v, e.exportSnapshot(), p, Infinity);
    if (!ends.length) break;
    applyPath(e, ends[Math.floor(rng() * ends.length)]!.path);
  }
  return e.getState().gameOver ? null : e;
}

const key = (path: Move[] | null) => (path ?? []).map((m) => `${m.from}>${m.to}`).join(',');

const GOLDEN: Array<{ v: BoardVariant; id: number; first: string; last: string }> = [
  { v: '7', id: 0, first: '17>14', last: '17>14' },
  { v: '7', id: 2, first: '8>16,16>18', last: '8>16,16>18' },
  { v: '8x4x6', id: 0, first: '0>8', last: '0>8' },
  { v: '8x4x6', id: 1, first: '14>20,20>22', last: '14>20,20>22' },
  { v: '8x4x6', id: 2, first: '18>21', last: '18>21' },
  { v: '12x6x5', id: 0, first: '28>26', last: '28>26' },
  { v: '12x6x5', id: 1, first: '1>3,3>13,13>1,1>11,11>23', last: '1>13,13>3,3>1,1>11,11>23' },
  { v: '12x6x5', id: 2, first: '8>14', last: '9>14' },
  { v: '16', id: 0, first: '12>22', last: '12>22' },
  { v: '16', id: 1, first: '13>21', last: '13>21' },
  { v: '16', id: 2, first: '17>12', last: '17>12' },
];

describe('AI speed-up never changes the chosen move (golden picks from the pre-speed-up code)', () => {
  it.each(GOLDEN)('Expert on $v position $id picks the recorded move', ({ v, id, first, last }) => {
    const e = position(v, id);
    expect(e).not.toBeNull();
    const snap = e!.exportSnapshot();
    const p = e!.getState().currentPlayer;
    const budgetMs = thinkBudgetForLevel(3, v);
    expect(key(selectAiTurnPath(v, 3, snap, p, { budgetMs, rng: () => 0 }))).toBe(first);
    expect(key(selectAiTurnPath(v, 3, snap, p, { budgetMs, rng: () => 0.999 }))).toBe(last);
  });
});

describe('engine-free mobility equals the engine legal-move count', () => {
  const variants: BoardVariant[] = ['6', '6x3x5', '7', '8x4x6', '10x5', '12x6x5', '16'];
  it.each(variants)('on %s, over seeded positions and both players', (v) => {
    let checked = 0;
    for (let id = 0; id < 25; id += 1) {
      const e = position(v, id);
      if (!e) continue;
      const state = e.getState();
      for (const player of ['RED', 'BLUE'] as Player[]) {
        const probe = new SmartBeadsEngine(v);
        probe.loadSnapshot({ state: { ...state, currentPlayer: player }, chainPieceId: null });
        expect(mobility(state, player)).toBe(probe.getLegalMoves().length);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe('geometry indexes equal the naive scans they replaced', () => {
  it.each(['6', '7', '8x4x6', '10x5', '12x6x5', '16'] as BoardVariant[])('on %s', (v) => {
    const board = new SmartBeadsEngine(v).getState().board;
    for (const point of board.intersections) {
      const naive: number[] = [];
      for (const c of board.connections) {
        if (c.from === point.id) naive.push(c.to);
        else if (c.to === point.id) naive.push(c.from);
      }
      expect(getConnectedIds(board, point.id)).toEqual(naive);
      expect(getJumpPathsFrom(board, point.id)).toEqual(
        (board.jumpPaths ?? []).filter((p) => p.from === point.id),
      );
    }
    for (const p of board.jumpPaths ?? []) {
      expect(findJumpPath(board, p.from, p.to)).toEqual(
        board.jumpPaths!.find((q) => q.from === p.from && q.to === p.to),
      );
    }
    expect(findJumpPath(board, 0, 0)).toBeUndefined();
  });

  it('board clones keep occupants independent but share immutable geometry', () => {
    const board = new SmartBeadsEngine('7').getState().board;
    const clone = cloneBoardDefinition(board);
    clone.intersections[0]!.occupant = clone.intersections[0]!.occupant === 'RED' ? 'BLUE' : 'RED';
    expect(board.intersections[0]!.occupant).not.toBe(clone.intersections[0]!.occupant);
    expect(clone.connections).toBe(board.connections);
    expect(clone.jumpPaths).toBe(board.jumpPaths);
  });
});
