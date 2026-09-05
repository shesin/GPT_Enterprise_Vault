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
  if (!m) return false;
  e.applyMove(m);
  return true;
}

function probe(label: string, pairs: [number, Player][], moves: [number, number][]): void {
  const e = new SmartBeadsEngine('7');
  setBoard(e, pairs);
  console.log(label, 'setup ok');
  for (const [f, t] of moves) {
    const ok = tryMove(e, f, t);
    console.log(`  ${f}->${t}`, ok, 'chain', e.getChainPieceId(), 'caps', e.getState().captures);
    if (!ok) break;
  }
}

// cap1: 12->4 over 8
probe('cap1', [
  [12, 'RED'], [8, 'BLUE'], [16, 'RED'], [17, 'RED'], [19, 'BLUE'],
], [[12, 4]]);

// cap2: 8->2 over ? — try BLUE at 5 between 8 and 2? 8,5,2 colinear?
probe('cap2a', [
  [8, 'RED'], [5, 'BLUE'], [16, 'RED'], [17, 'RED'], [19, 'BLUE'],
], [[8, 2]]);

// cap2: 17->13 over 14?
probe('cap2b', [
  [17, 'RED'], [14, 'BLUE'], [16, 'RED'], [12, 'RED'], [19, 'BLUE'],
], [[17, 13]]);

// cap3: 18->14
probe('cap3', [
  [18, 'RED'], [14, 'BLUE'], [16, 'RED'], [12, 'RED'], [19, 'BLUE'],
], [[18, 14]]);

// double: find chain on 7 board
probe('dbl', [
  [12, 'RED'], [8, 'BLUE'], [4, 'BLUE'], [16, 'RED'], [19, 'BLUE'],
], [[12, 4], [4, 0]]);

probe('dbl2', [
  [12, 'RED'], [9, 'BLUE'], [6, 'BLUE'], [16, 'RED'], [19, 'BLUE'],
], [[12, 6], [6, 2]]);

probe('dbl3', [
  [17, 'RED'], [13, 'BLUE'], [9, 'BLUE'], [16, 'RED'], [19, 'BLUE'],
], [[17, 9], [9, 5]]);

// triple
probe('tri1', [
  [12, 'RED'], [8, 'BLUE'], [4, 'BLUE'], [1, 'BLUE'], [19, 'BLUE'],
], [[12, 4], [4, 0], [0, -1]]);

probe('tri2', [
  [12, 'RED'], [8, 'BLUE'], [4, 'BLUE'], [1, 'BLUE'], [16, 'RED'], [19, 'BLUE'],
], [[12, 4], [4, 0]]);

// after 12->4, piece at 4, chain? can 4 jump again?
{
  const e = new SmartBeadsEngine('7');
  setBoard(e, [[12, 'RED'], [8, 'BLUE'], [4, 'BLUE'], [1, 'BLUE'], [16, 'RED'], [19, 'BLUE']]);
  tryMove(e, 12, 4);
  console.log('after 12->4 legal from 4', e.getLegalMoves().filter(m => m.from === 4));
  tryMove(e, 4, 0);
  console.log('after 4->0 legal from 0', e.getLegalMoves().filter(m => m.from === 0));
}

probe('tri3', [
  [12, 'RED'], [8, 'BLUE'], [4, 'BLUE'], [1, 'BLUE'], [16, 'RED'], [19, 'BLUE'],
], [[12, 4], [4, 0]]);
