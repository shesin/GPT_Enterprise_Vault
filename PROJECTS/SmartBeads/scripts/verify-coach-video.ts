import { SmartBeadsEngine } from '../src/core/SmartBeadsEngine';
import { Player } from '../src/models/GameState';

function setBoard(engine: SmartBeadsEngine, occ: (Player | undefined)[], player: Player = 'RED'): void {
  const snap = engine.exportSnapshot();
  for (let i = 0; i < occ.length; i++) {
    snap.state.board.intersections[i].occupant = occ[i];
  }
  snap.state.currentPlayer = player;
  snap.state.captures = { RED: 0, BLUE: 0 };
  snap.state.gameOver = false;
  snap.chainPieceId = null;
  engine.loadSnapshot(snap);
}

function tryMove(engine: SmartBeadsEngine, from: number, to: number): boolean {
  const legal = engine.getLegalMoves().find((m) => m.from === from && m.to === to);
  if (!legal) {
    console.log('no legal', from, '->', to, 'legal:', engine.getLegalMoves());
    return false;
  }
  engine.applyMove(legal);
  return true;
}

const empty = (): (Player | undefined)[] => Array.from({ length: 15 }, () => undefined);

let eng = new SmartBeadsEngine('6x3x5');
const slideOcc = empty();
slideOcc[13] = 'RED';
setBoard(eng, slideOcc);
console.log('slide 13->10', tryMove(eng, 13, 10));

eng = new SmartBeadsEngine('6x3x5');
const capOcc = empty();
capOcc[8] = 'BLUE';
capOcc[11] = 'RED';
setBoard(eng, capOcc);
console.log('cap 11->5', tryMove(eng, 11, 5));

eng = new SmartBeadsEngine('6x3x5');
const dblOcc = empty();
dblOcc[2] = 'BLUE';
dblOcc[5] = 'RED';
setBoard(eng, dblOcc);
console.log('double 5->0', tryMove(eng, 5, 0));

// chain on vertical/different lines
eng = new SmartBeadsEngine('6x3x5');
const chainOcc = empty();
chainOcc[10] = 'BLUE';
chainOcc[11] = 'RED';
setBoard(eng, chainOcc);
console.log('cap 11->9 over 10', tryMove(eng, 11, 9));

eng = new SmartBeadsEngine('6x3x5');
const chain2 = empty();
chain2[6] = 'BLUE';
chain2[10] = 'BLUE';
chain2[11] = 'RED';
setBoard(eng, chain2);
console.log('first 11->9', tryMove(eng, 11, 9));
console.log('second 9->3 over 6', tryMove(eng, 9, 3));

// slide 13->7 diagonal?
eng = new SmartBeadsEngine('6x3x5');
const slide2 = empty();
slide2[13] = 'RED';
setBoard(eng, slide2);
console.log('slide 13->7', tryMove(eng, 13, 7));
console.log('slide legal from 13', eng.getLegalMoves().filter(m => m.from===13));
