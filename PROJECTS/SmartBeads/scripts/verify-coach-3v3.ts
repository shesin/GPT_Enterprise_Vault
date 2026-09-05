import { SmartBeadsEngine } from '../src/core/SmartBeadsEngine';
import { Player } from '../src/models/GameState';

function setBoard(engine: SmartBeadsEngine, pairs: [number, Player][], player: Player = 'RED'): void {
  const snap = engine.exportSnapshot();
  for (const n of snap.state.board.intersections) n.occupant = undefined;
  for (const [id, p] of pairs) snap.state.board.intersections[id].occupant = p;
  snap.state.currentPlayer = player;
  snap.state.captures = { RED: 0, BLUE: 0 };
  snap.state.gameOver = false;
  snap.chainPieceId = null;
  engine.loadSnapshot(snap);
}

function tryMove(e: SmartBeadsEngine, from: number, to: number): boolean {
  const m = e.getLegalMoves().find((x) => x.from === from && x.to === to);
  if (!m) {
    console.log('FAIL', from, '->', to);
    return false;
  }
  e.applyMove(m);
  return true;
}

let e = new SmartBeadsEngine('6x3x5');
setBoard(e, [
  [0, 'BLUE'], [1, 'BLUE'], [2, 'BLUE'],
  [11, 'RED'], [13, 'RED'], [14, 'RED'],
]);
console.log('slide', tryMove(e, 13, 10), 'over', e.getState().gameOver);

e = new SmartBeadsEngine('6x3x5');
setBoard(e, [
  [0, 'BLUE'], [2, 'BLUE'], [8, 'BLUE'],
  [11, 'RED'], [13, 'RED'], [14, 'RED'],
]);
console.log('cap', tryMove(e, 11, 5), 'cap', e.getState().captures, 'over', e.getState().gameOver);

e = new SmartBeadsEngine('6x3x5');
setBoard(e, [
  [0, 'BLUE'], [6, 'BLUE'], [10, 'BLUE'],
  [11, 'RED'], [13, 'RED'], [14, 'RED'],
]);
console.log('dbl1', tryMove(e, 11, 9), 'chain', e.getChainPieceId());
console.log('dbl2', tryMove(e, 9, 3), 'cap', e.getState().captures, 'over', e.getState().gameOver);
