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

function mv(e: SmartBeadsEngine, f: number, t: number): boolean {
  const m = e.getLegalMoves().find((x) => x.from === f && x.to === t);
  if (!m) {
    console.log('fail', f, t, e.getLegalMoves().filter((x) => x.from === f));
    return false;
  }
  e.applyMove(m);
  return true;
}

console.log('3 slides independent');
for (const [label, pairs, move] of [
  ['s1', [[12, 'RED'], [16, 'RED'], [17, 'RED'], [15, 'BLUE'], [19, 'BLUE']] as [number, Player][], [12, 8] as [number, number]],
  ['s2', [[16, 'RED'], [17, 'RED'], [18, 'RED'], [15, 'BLUE'], [19, 'BLUE']], [16, 12]],
  ['s3', [[17, 'RED'], [16, 'RED'], [12, 'RED'], [15, 'BLUE'], [19, 'BLUE']], [17, 13]],
]) {
  const e = new SmartBeadsEngine('7');
  setBoard(e, pairs);
  console.log(label, mv(e, move[0], move[1]));
}

console.log('3 slides sequential');
{
  const e = new SmartBeadsEngine('7');
  setBoard(e, [[12, 'RED'], [16, 'RED'], [17, 'RED'], [15, 'BLUE'], [19, 'BLUE']]);
  console.log('1', mv(e, 12, 8));
  console.log('2', mv(e, 16, 12));
  console.log('3', mv(e, 17, 13));
  console.log('over', e.getState().gameOver);
}

console.log('3 caps');
{
  const setups = [
    { label: 'c1', pairs: [[12, 'RED'], [8, 'BLUE'], [16, 'RED'], [17, 'RED'], [19, 'BLUE']] as [number, Player][], move: [12, 4] as [number, number] },
    { label: 'c2', pairs: [[8, 'RED'], [5, 'BLUE'], [16, 'RED'], [17, 'RED'], [19, 'BLUE']], move: [8, 2] },
    { label: 'c3', pairs: [[17, 'RED'], [13, 'BLUE'], [16, 'RED'], [12, 'RED'], [19, 'BLUE']], move: [17, 9] },
  ];
  for (const s of setups) {
    const e = new SmartBeadsEngine('7');
    setBoard(e, s.pairs);
    console.log(s.label, mv(e, s.move[0], s.move[1]), 'caps', e.getState().captures);
  }
}

console.log('double 12-4-6');
{
  const e = new SmartBeadsEngine('7');
  setBoard(e, [[12, 'RED'], [8, 'BLUE'], [5, 'BLUE'], [16, 'RED'], [19, 'BLUE']]);
  console.log('1', mv(e, 12, 4), 'chain', e.getChainPieceId());
  console.log('2', mv(e, 4, 6), 'caps', e.getState().captures);
}

console.log('triple 12-4-6-14');
{
  const e = new SmartBeadsEngine('7');
  setBoard(e, [[12, 'RED'], [8, 'BLUE'], [5, 'BLUE'], [10, 'BLUE'], [16, 'RED'], [19, 'BLUE']]);
  console.log('1', mv(e, 12, 4));
  console.log('2', mv(e, 4, 6));
  console.log('3', mv(e, 6, 14));
  console.log('caps', e.getState().captures, 'over', e.getState().gameOver);
}
