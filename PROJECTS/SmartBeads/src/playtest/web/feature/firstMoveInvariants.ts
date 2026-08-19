import { findJumpPath, Move, Player } from '../../../models/GameState';
import { SmartBeadsEngine } from '../../../core/SmartBeadsEngine';

export type OccupantSide = Player | null;

export interface OccupancyNode {
  id: number;
  occupant?: Player | null;
}

export interface OccupancyChange {
  id: number;
  from: string;
  to: string;
}

export function occupantToken(occupant: OccupantSide | undefined): string {
  return occupant ?? '.';
}

export function occupancyMap(nodes: OccupancyNode[]): Map<number, OccupantSide> {
  return new Map(nodes.map((n) => [n.id, n.occupant ?? null]));
}

export function occupancyDiff(before: OccupancyNode[], after: OccupancyNode[]): OccupancyChange[] {
  const a = occupancyMap(before);
  const b = occupancyMap(after);
  const ids = new Set([...a.keys(), ...b.keys()]);
  const changes: OccupancyChange[] = [];
  for (const id of ids) {
    const from = occupantToken(a.get(id) ?? null);
    const to = occupantToken(b.get(id) ?? null);
    if (from !== to) changes.push({ id, from, to });
  }
  return changes.sort((x, y) => x.id - y.id);
}

export function countSide(nodes: OccupancyNode[], side: Player): number {
  return nodes.filter((n) => n.occupant === side).length;
}

export function isJumpMove(engine: SmartBeadsEngine, move: Move): boolean {
  return findJumpPath(engine.getState().board, move.from, move.to) !== undefined;
}

export function firstOpeningSlide(engine: SmartBeadsEngine): Move {
  const move = engine.getLegalMoves().find((m) => !isJumpMove(engine, m));
  if (!move) throw new Error('no opening slide');
  return move;
}

export function moveByLabel(engine: SmartBeadsEngine, fromLabel: string, toLabel: string): Move {
  const from = engine.getState().board.intersections.find((n) => n.label === fromLabel);
  const to = engine.getState().board.intersections.find((n) => n.label === toLabel);
  if (!from || !to) throw new Error(`missing ${fromLabel} or ${toLabel}`);
  return { from: from.id, to: to.id };
}

/** Opening slides that give the opponent a capture on the next ply — the moves a person actually points at. */
export function hangingOpeningSlides(engine: SmartBeadsEngine): Move[] {
  const variant = engine.getVariant();
  return engine.getLegalMoves().filter((m) => {
    if (isJumpMove(engine, m)) return false;
    const probe = new SmartBeadsEngine(variant);
    probe.applyMove(m);
    return probe.getLegalMoves().some((j) => isJumpMove(probe, j));
  });
}

export function engineOccupancy(engine: SmartBeadsEngine): OccupancyNode[] {
  return engine.getState().board.intersections.map((n) => ({
    id: n.id,
    occupant: n.occupant ?? null,
  }));
}

/**
 * One completed ply by `mover` — slide (2 nodes) or jump (3 nodes).
 * Opponent beads must not have moved except the captured piece on a jump.
 * This is the app/session contract: a human two-click move must look like this
 * before any AI ply is applied.
 */
export function isolatedPly(
  before: OccupancyNode[],
  after: OccupancyNode[],
  move: Move,
  mover: Player,
  over?: number,
): { ok: boolean; changes: OccupancyChange[]; detail: string } {
  const changes = occupancyDiff(before, after);
  const opponent: Player = mover === 'RED' ? 'BLUE' : 'RED';
  const beforeFrom = occupancyMap(before).get(move.from) ?? null;
  const afterFrom = occupancyMap(after).get(move.from) ?? null;
  const beforeTo = occupancyMap(before).get(move.to) ?? null;
  const afterTo = occupancyMap(after).get(move.to) ?? null;
  const moverBefore = countSide(before, mover);
  const moverAfter = countSide(after, mover);
  const oppBefore = countSide(before, opponent);
  const oppAfter = countSide(after, opponent);

  const problems: string[] = [];
  if (beforeFrom !== mover) problems.push(`from ${move.from} was ${occupantToken(beforeFrom)}, not ${mover}`);
  if (afterFrom !== null) problems.push(`from ${move.from} still occupied (${occupantToken(afterFrom)})`);
  if (beforeTo !== null) problems.push(`to ${move.to} was not empty`);
  if (afterTo !== mover) problems.push(`to ${move.to} is ${occupantToken(afterTo)}, not ${mover}`);
  if (moverBefore !== moverAfter) problems.push(`${mover} count ${moverBefore}->${moverAfter}`);

  if (over === undefined) {
    if (changes.length !== 2) problems.push(`slide changed ${changes.length} nodes, expected 2`);
    if (oppBefore !== oppAfter) problems.push(`${opponent} count changed on a slide`);
  } else {
    if (changes.length !== 3) problems.push(`jump changed ${changes.length} nodes, expected 3`);
    if (oppAfter !== oppBefore - 1) problems.push(`capture did not remove one ${opponent}`);
    const afterOver = occupancyMap(after).get(over) ?? null;
    const beforeOver = occupancyMap(before).get(over) ?? null;
    if (beforeOver !== opponent) problems.push(`over ${over} was ${occupantToken(beforeOver)}`);
    if (afterOver !== null) problems.push(`over ${over} still occupied`);
  }

  const extra = changes.filter((c) => c.id !== move.from && c.id !== move.to && c.id !== over);
  if (extra.length) problems.push(`extra nodes moved: ${extra.map((c) => c.id).join(',')}`);

  return {
    ok: problems.length === 0,
    changes,
    detail: problems.length ? problems.join('; ') : changes.map((c) => `${c.id}:${c.from}->${c.to}`).join(', '),
  };
}
