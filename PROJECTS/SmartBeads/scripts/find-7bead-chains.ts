import { SmartBeadsEngine } from '../src/core/SmartBeadsEngine';
import { Player } from '../src/models/GameState';

function setBoard(e: SmartBeadsEngine, pairs: [number, Player][]): void {
  const s = e.exportSnapshot();
  for (const n of s.state.board.intersections) n.occupant = undefined;
  for (const [id, p] of pairs) s.state.board.intersections[id].occupant = p;
  s.state.currentPlayer = 'RED';
  s.state.captures = { RED: 0, BLUE: 0 };
  s.state.gameOver = false;
  s.chainPieceId = null;
  e.loadSnapshot(s);
}

function applySeq(e: SmartBeadsEngine, seq: [number, number][]): boolean {
  for (const [f, t] of seq) {
    const m = e.getLegalMoves().find((x) => x.from === f && x.to === t);
    if (!m) return false;
    e.applyMove(m);
  }
  return true;
}

const anchor: [number, Player][] = [[16, 'RED'], [17, 'RED'], [19, 'BLUE']];

console.log('=== double chains from RED 12 ===');
for (let over1 = 0; over1 < 20; over1++) {
  for (let over2 = 0; over2 < 20; over2++) {
    if (over1 === over2) continue;
    const e = new SmartBeadsEngine('7');
    setBoard(e, [[12, 'RED'], [over1, 'BLUE'], [over2, 'BLUE'], ...anchor]);
    const snap = e.exportSnapshot();
    const e2 = new SmartBeadsEngine('7');
    e2.loadSnapshot(snap);
    const firstJumps = e2.getLegalMoves().filter((m) => m.from === 12 && m.to !== 8 && m.to !== 9 && m.to !== 13);
    for (const j1 of e2.getLegalMoves().filter((m) => m.from === 12)) {
      const e3 = new SmartBeadsEngine('7');
      e3.loadSnapshot(snap);
      e3.applyMove(j1);
      if (e3.getChainPieceId() === null) continue;
      const j2 = e3.getLegalMoves().filter((m) => m.from === e3.getChainPieceId());
      if (j2.length > 0) {
        console.log('setup blues', over1, over2, 'j1', j1, 'j2 options', j2);
      }
    }
  }
}

console.log('=== triple from 12 ===');
for (let b1 = 0; b1 < 20; b1++) {
  for (let b2 = 0; b2 < 20; b2++) {
    for (let b3 = 0; b3 < 20; b3++) {
      if (new Set([b1, b2, b3]).size < 3) continue;
      const e = new SmartBeadsEngine('7');
      setBoard(e, [[12, 'RED'], [b1, 'BLUE'], [b2, 'BLUE'], [b3, 'BLUE'], ...anchor]);
      const snap = e.exportSnapshot();
      const e2 = new SmartBeadsEngine('7');
      e2.loadSnapshot(snap);
      if (!applySeq(e2, [])) continue;
      const path: [number, number][] = [];
      let cur = e2;
      for (let hop = 0; hop < 3; hop++) {
        const chain = cur.getChainPieceId();
        const from = chain ?? 12;
        const jumps = cur.getLegalMoves().filter((m) => m.from === from && m.to !== from);
        const jump = jumps.find((m) => {
          const test = new SmartBeadsEngine('7');
          test.loadSnapshot(cur.exportSnapshot());
          test.applyMove(m);
          return test.getState().captures.RED > cur.getState().captures.RED;
        });
        if (!jump) break;
        path.push([jump.from, jump.to]);
        cur.applyMove(jump);
      }
      if (path.length === 3) console.log('TRIPLE', 'blues', b1, b2, b3, 'path', path);
    }
  }
}
