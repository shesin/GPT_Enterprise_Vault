import { listProductBoards, resolveEngineVariant } from '../../../config/BoardCatalog';
import { BoardVariant } from '../../../config/BoardConfig';
import { SmartBeadsEngine } from '../../../core/SmartBeadsEngine';
import {
  BoardDefinition,
  getConnectedIds,
  JumpPath,
  Move,
  requireIntersection,
} from '../../../models/GameState';
import { FeatureSession } from '../feature/FeatureSession';
import { projectIntersectionOnCanvas } from '../layout/boardProjection';
import { getBoardCanvasSize } from '../layout/boardVisualProfile';
import { drawCanvasBoard, hitTestNode } from '../render/CanvasBoardRenderer';

/**
 * Geometry / capture audit for the locked V1 seven-board set.
 * Production path only: BoardDefinition + SmartBeadsEngine + FeatureSession + canvas renderer.
 * No prototype .cjs and no self-play batches are used as evidence here.
 */

const off = {
  aiLevel: 1 as const,
  matchTimer: 'off' as const,
  shotClock: 'off' as const,
  centerRule: 'off' as const,
};

const productBoards = listProductBoards();

function labelOf(board: BoardDefinition, id: number): string {
  return board.intersections[id].label ?? String(id);
}

function edgeKeys(board: BoardDefinition): Set<string> {
  const keys = new Set<string>();
  for (const conn of board.connections) {
    keys.add(`${conn.from}-${conn.to}`);
    keys.add(`${conn.to}-${conn.from}`);
  }
  return keys;
}

/** Board-lattice collinearity: b continues in the same direction from a to c. */
function isCollinear(board: BoardDefinition, a: number, b: number, c: number): boolean {
  const pa = board.intersections[a];
  const pb = board.intersections[b];
  const pc = board.intersections[c];
  const dx = pb.x! - pa.x!;
  const dy = pb.y! - pa.y!;
  const ex = pc.x! - pb.x!;
  const ey = pc.y! - pb.y!;
  return dx * ey === dy * ex && dx * ex + dy * ey > 0;
}

function blankEngine(variant: BoardVariant): SmartBeadsEngine {
  const engine = new SmartBeadsEngine(variant);
  for (const point of engine.getState().board.intersections) {
    point.occupant = undefined;
  }
  const state = engine.getState();
  state.currentPlayer = 'RED';
  state.captures.RED = 0;
  state.captures.BLUE = 0;
  state.moveCount = 0;
  state.gameOver = false;
  state.winner = undefined;
  state.endReason = undefined;
  return engine;
}

/** Park a spare enemy clear of the action so elimination does not end the game early. */
function placeSpareEnemy(engine: SmartBeadsEngine, used: number[]): void {
  const board = engine.getState().board;
  const busy = new Set(used);
  for (const point of board.intersections) {
    if (busy.has(point.id)) continue;
    if (used.some((id) => getConnectedIds(board, id).includes(point.id))) continue;
    point.occupant = 'BLUE';
    return;
  }
}

function offers(engine: SmartBeadsEngine, from: number, to: number): boolean {
  return engine.getLegalMoves().some((m) => m.from === from && m.to === to);
}

/** First pair of jump paths that chain end-to-start over five distinct nodes. */
function findChainPair(board: BoardDefinition): [JumpPath, JumpPath] | null {
  const paths = board.jumpPaths ?? [];
  for (const first of paths) {
    for (const second of paths) {
      if (second.from !== first.to) continue;
      const ids = new Set([first.from, first.over, first.to, second.over, second.to]);
      if (ids.size === 5) return [first, second];
    }
  }
  return null;
}

interface Segment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/** Minimal 2D context that records only the straight strokes the renderer draws. */
function recordingContext(segments: Segment[]): CanvasRenderingContext2D {
  let cursor: { x: number; y: number } | null = null;
  let pending: Segment | null = null;
  const gradient = { addColorStop: () => {} };
  const ctx = {
    canvas: null,
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {
      cursor = null;
      pending = null;
    },
    closePath: () => {
      pending = null;
    },
    moveTo: (x: number, y: number) => {
      cursor = { x, y };
      pending = null;
    },
    lineTo: (x: number, y: number) => {
      pending = cursor ? { ax: cursor.x, ay: cursor.y, bx: x, by: y } : null;
      cursor = { x, y };
    },
    arc: () => {
      pending = null;
    },
    stroke: () => {
      if (pending) segments.push(pending);
      pending = null;
    },
    fill: () => {},
    save: () => {},
    restore: () => {},
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

function fakeCanvas(width: number, height: number): HTMLCanvasElement {
  const segments: Segment[] = [];
  const canvas = {
    width,
    height,
    __segments: segments,
    getContext: () => recordingContext(segments),
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
  };
  return canvas as unknown as HTMLCanvasElement;
}

describe('V1 geometry + capture audit — all seven locked boards', () => {
  describe.each(productBoards)('$id', (entry) => {
    const variant = resolveEngineVariant(entry.id);
    const reference = new SmartBeadsEngine(variant).getState().board;
    const jumpPaths = reference.jumpPaths ?? [];

    it('has jump paths and connections to audit', () => {
      expect(reference.connections.length).toBeGreaterThan(0);
      expect(jumpPaths.length).toBeGreaterThan(0);
    });

    it('adjacency is reciprocal — every drawn line slides both ways', () => {
      const broken: string[] = [];
      for (const point of reference.intersections) {
        for (const other of getConnectedIds(reference, point.id)) {
          if (!getConnectedIds(reference, other).includes(point.id)) {
            broken.push(`${labelOf(reference, point.id)}->${labelOf(reference, other)}`);
          }
        }
      }
      expect(broken).toEqual([]);
    });

    it('every collinear pair of connected edges is a real capture route', () => {
      const known = new Set(jumpPaths.map((p) => `${p.from}|${p.over}|${p.to}`));
      const missing: string[] = [];
      for (const mid of reference.intersections) {
        const neighbours = getConnectedIds(reference, mid.id);
        for (const from of neighbours) {
          for (const to of neighbours) {
            if (from === to) continue;
            if (!isCollinear(reference, from, mid.id, to)) continue;
            if (!known.has(`${from}|${mid.id}|${to}`)) {
              missing.push(
                `${labelOf(reference, from)} over ${labelOf(reference, mid.id)} to ${labelOf(reference, to)}`,
              );
            }
          }
        }
      }
      expect(missing).toEqual([]);
    });

    it('every jump path is two real edges, collinear, and reversible', () => {
      const edges = edgeKeys(reference);
      const known = new Set(jumpPaths.map((p) => `${p.from}|${p.over}|${p.to}`));
      const bad: string[] = [];
      for (const path of jumpPaths) {
        const tag = `${labelOf(reference, path.from)}|${labelOf(reference, path.over)}|${labelOf(reference, path.to)}`;
        if (!edges.has(`${path.from}-${path.over}`) || !edges.has(`${path.over}-${path.to}`)) {
          bad.push(`${tag} has no drawn line`);
        }
        if (!isCollinear(reference, path.from, path.over, path.to)) bad.push(`${tag} is bent`);
        if (!known.has(`${path.to}|${path.over}|${path.from}`)) bad.push(`${tag} has no reverse`);
      }
      expect(bad).toEqual([]);
    });

    it('no two jump paths share a from/to pair, so the captured bead is unambiguous', () => {
      const byPair = new Map<string, number>();
      const clashes: string[] = [];
      for (const path of jumpPaths) {
        const key = `${path.from}->${path.to}`;
        const seen = byPair.get(key);
        if (seen !== undefined && seen !== path.over) clashes.push(key);
        byPair.set(key, path.over);
      }
      expect(clashes).toEqual([]);
    });

    it('no landing square doubles as a slide neighbour of its own start', () => {
      const edges = edgeKeys(reference);
      const clashes = jumpPaths
        .filter((path) => edges.has(`${path.from}-${path.to}`))
        .map((path) => `${labelOf(reference, path.from)}->${labelOf(reference, path.to)}`);
      expect(clashes).toEqual([]);
    });

    it('every jump path captures and completes the turn on an isolated board', () => {
      const failures: string[] = [];
      for (const path of jumpPaths) {
        const engine = blankEngine(variant);
        const board = engine.getState().board;
        requireIntersection(board, path.from).occupant = 'RED';
        requireIntersection(board, path.over).occupant = 'BLUE';
        placeSpareEnemy(engine, [path.from, path.over, path.to]);
        const tag = `${labelOf(board, path.from)}x${labelOf(board, path.over)}->${labelOf(board, path.to)}`;

        if (!offers(engine, path.from, path.to)) {
          failures.push(`${tag} not offered`);
          continue;
        }
        engine.applyMove({ from: path.from, to: path.to });
        const state = engine.getState();
        if (requireIntersection(state.board, path.over).occupant !== undefined) failures.push(`${tag} victim survived`);
        if (requireIntersection(state.board, path.to).occupant !== 'RED') failures.push(`${tag} landing empty`);
        if (state.captures.RED !== 1) failures.push(`${tag} capture not scored`);
        if (engine.getChainPieceId() !== null) failures.push(`${tag} chain left open`);
        if (!state.gameOver && state.currentPlayer !== 'BLUE') failures.push(`${tag} turn not handed over`);
      }
      expect(failures).toEqual([]);
    });

    it('a capture is refused when the landing is occupied or the middle bead is friendly or absent', () => {
      const failures: string[] = [];
      for (const path of jumpPaths) {
        const tag = `${labelOf(reference, path.from)}x${labelOf(reference, path.over)}->${labelOf(reference, path.to)}`;

        const blocked = blankEngine(variant);
        requireIntersection(blocked.getState().board, path.from).occupant = 'RED';
        requireIntersection(blocked.getState().board, path.over).occupant = 'BLUE';
        requireIntersection(blocked.getState().board, path.to).occupant = 'RED';
        if (offers(blocked, path.from, path.to)) failures.push(`${tag} jumped onto an occupied landing`);

        const friendly = blankEngine(variant);
        requireIntersection(friendly.getState().board, path.from).occupant = 'RED';
        requireIntersection(friendly.getState().board, path.over).occupant = 'RED';
        if (offers(friendly, path.from, path.to)) failures.push(`${tag} captured its own bead`);

        const empty = blankEngine(variant);
        requireIntersection(empty.getState().board, path.from).occupant = 'RED';
        if (offers(empty, path.from, path.to)) failures.push(`${tag} hopped over an empty point`);
      }
      expect(failures).toEqual([]);
    });

    it('every drawn line is a legal slide in both directions and ends the turn', () => {
      const failures: string[] = [];
      for (const conn of reference.connections) {
        for (const [from, to] of [[conn.from, conn.to], [conn.to, conn.from]]) {
          const engine = blankEngine(variant);
          requireIntersection(engine.getState().board, from).occupant = 'RED';
          placeSpareEnemy(engine, [from, to]);
          const tag = `${labelOf(reference, from)}->${labelOf(reference, to)}`;
          if (!offers(engine, from, to)) {
            failures.push(`${tag} not offered`);
            continue;
          }
          engine.applyMove({ from, to });
          const state = engine.getState();
          if (requireIntersection(state.board, to).occupant !== 'RED') failures.push(`${tag} did not land`);
          if (engine.getChainPieceId() !== null) failures.push(`${tag} opened a chain`);
          if (!state.gameOver && state.currentPlayer !== 'BLUE') failures.push(`${tag} kept the turn`);
        }
      }
      expect(failures).toEqual([]);
    });

    it('a bent two-step never captures the bead it passes', () => {
      const known = new Set(jumpPaths.map((p) => `${p.from}|${p.over}|${p.to}`));
      const failures: string[] = [];
      for (const mid of reference.intersections) {
        const neighbours = getConnectedIds(reference, mid.id);
        for (const from of neighbours) {
          for (const to of neighbours) {
            if (from === to) continue;
            if (known.has(`${from}|${mid.id}|${to}`)) continue;
            const engine = blankEngine(variant);
            requireIntersection(engine.getState().board, from).occupant = 'RED';
            requireIntersection(engine.getState().board, mid.id).occupant = 'BLUE';
            placeSpareEnemy(engine, [from, mid.id, to]);
            if (!offers(engine, from, to)) continue;
            const tag = `${labelOf(reference, from)}-${labelOf(reference, mid.id)}->${labelOf(reference, to)}`;
            if (!getConnectedIds(reference, from).includes(to)) {
              failures.push(`${tag} is legal but is neither a slide nor a jump`);
              continue;
            }
            engine.applyMove({ from, to });
            const state = engine.getState();
            if (requireIntersection(state.board, mid.id).occupant !== 'BLUE' || state.captures.RED !== 0) {
              failures.push(`${tag} captured on a bent path`);
            }
          }
        }
      }
      expect(failures).toEqual([]);
    });

    it('a two-hop chain continues from the victim click and completes the turn', () => {
      const pair = findChainPair(reference);
      expect(pair).not.toBeNull();
      const [first, second] = pair!;

      const session = new FeatureSession(variant, { mode: 'pvp', ...off });
      for (const point of session.getEngine().getState().board.intersections) point.occupant = undefined;
      const board = session.getEngine().getState().board;
      requireIntersection(board, first.from).occupant = 'RED';
      requireIntersection(board, first.over).occupant = 'BLUE';
      requireIntersection(board, second.over).occupant = 'BLUE';
      placeSpareEnemy(session.getEngine(), [first.from, first.over, first.to, second.over, second.to]);
      session.getEngine().getState().currentPlayer = 'RED';

      session.applyMove({ from: first.from, to: first.to });
      expect(session.getEngine().getChainPieceId()).toBe(first.to);
      expect(session.getUiState()).toBe('chain');

      // Second hop is executed by clicking the landing square
      const click = session.interpretClick(second.to);
      expect(click.kind).toBe('move');
      if (click.kind !== 'move') return;
      expect(click.move).toEqual({ from: second.from, to: second.to });
      session.applyMove(click.move);

      const state = session.getEngine().getState();
      expect(state.captures.RED).toBe(2);
      expect(session.getEngine().getChainPieceId()).toBeNull();
      if (!state.gameOver) expect(state.currentPlayer).toBe('BLUE');
    });

    it('capture optionality: the chain can be stopped while a further capture is available', () => {
      const pair = findChainPair(reference);
      expect(pair).not.toBeNull();
      const [first, second] = pair!;

      const session = new FeatureSession(variant, { mode: 'pvp', ...off });
      for (const point of session.getEngine().getState().board.intersections) point.occupant = undefined;
      const board = session.getEngine().getState().board;
      requireIntersection(board, first.from).occupant = 'RED';
      requireIntersection(board, first.over).occupant = 'BLUE';
      requireIntersection(board, second.over).occupant = 'BLUE';
      placeSpareEnemy(session.getEngine(), [first.from, first.over, first.to, second.over, second.to]);
      session.getEngine().getState().currentPlayer = 'RED';

      session.applyMove({ from: first.from, to: first.to });
      expect(session.getUiState()).toBe('chain');
      expect(session.getEngine().getLegalMoves().length).toBeGreaterThan(0);

      session.finishChain();
      const state = session.getEngine().getState();
      expect(state.captures.RED).toBe(1);
      expect(session.getEngine().getChainPieceId()).toBeNull();
      expect(session.getUiState()).not.toBe('chain');
      if (!state.gameOver) expect(state.currentPlayer).toBe('BLUE');
    });

    it('clicking the landing executes the capture, while the victim bead is inert and unhighlighted', () => {
      const failures: string[] = [];
      for (const path of jumpPaths) {
        const session = new FeatureSession(variant, { mode: 'pvp', ...off });
        for (const point of session.getEngine().getState().board.intersections) point.occupant = undefined;
        const board = session.getEngine().getState().board;
        requireIntersection(board, path.from).occupant = 'RED';
        requireIntersection(board, path.over).occupant = 'BLUE';
        placeSpareEnemy(session.getEngine(), [path.from, path.over, path.to]);
        session.getEngine().getState().currentPlayer = 'RED';
        session.selectNode(path.from);

        const tag = `${labelOf(board, path.from)}x${labelOf(board, path.over)}->${labelOf(board, path.to)}`;
        const expected: Move = { from: path.from, to: path.to };
        const onLanding = session.interpretClick(path.to);
        const onVictim = session.interpretClick(path.over);
        if (onLanding.kind !== 'move' || onLanding.move.to !== expected.to) failures.push(`${tag} landing click refused`);
        if (onVictim.kind !== 'ignore') failures.push(`${tag} victim click was not ignored (inert rule violated)`);
        if (!session.getLegalTargetIds().includes(path.to)) failures.push(`${tag} landing not highlighted`);
        if (session.getLegalTargetIds().includes(path.over)) failures.push(`${tag} victim should not be highlighted`);
      }
      expect(failures).toEqual([]);
    });

    it('clicking an immobile own bead never leaves a different bead armed', () => {
      const session = new FeatureSession(variant, { mode: 'pvp', ...off });
      const board = session.getEngine().getState().board;
      for (const point of board.intersections) point.occupant = undefined;

      const opener = (reference.jumpPaths ?? [])[0];
      requireIntersection(board, opener.from).occupant = 'RED';
      requireIntersection(board, opener.over).occupant = 'BLUE';

      // Box a second Ivory bead in with Ivory neighbours so it has no legal move.
      let immobile = -1;
      for (const point of board.intersections) {
        if (point.occupant || point.id === opener.to) continue;
        const neighbours = getConnectedIds(board, point.id);
        if (neighbours.some((id) => [opener.from, opener.over, opener.to].includes(id))) continue;
        if (neighbours.some((id) => board.intersections[id].occupant)) continue;
        point.occupant = 'RED';
        neighbours.forEach((id) => { board.intersections[id].occupant = 'RED'; });
        immobile = point.id;
        break;
      }
      expect(immobile).toBeGreaterThanOrEqual(0);
      session.getEngine().getState().currentPlayer = 'RED';
      expect(session.getEngine().getLegalMoves().some((m) => m.from === immobile)).toBe(false);

      expect(session.selectNode(opener.from)).toBe(true);
      expect(session.getSelectedId()).toBe(opener.from);

      const click = session.interpretClick(immobile);
      if (click.kind === 'select') session.selectNode(click.nodeId);

      // The player clicked their own bead; the previously armed bead must not stay armed.
      expect(session.getSelectedId()).not.toBe(opener.from);
      expect(session.getLegalTargetIds()).toEqual([]);
    });

    it('the canvas draws exactly the legal connections — no extra or missing lines', () => {
      const { width, height } = getBoardCanvasSize(reference.name);
      const canvas = fakeCanvas(width, height);
      const engine = new SmartBeadsEngine(variant);
      const board = engine.getState().board;

      drawCanvasBoard(canvas, {
        board,
        currentPlayer: 'RED',
        gameOver: false,
        selectedId: null,
        legalTargets: [],
        chainPieceId: null,
        anim: null,
        turnPulse: 0,
      });

      const drawn = (canvas as unknown as { __segments: Segment[] }).__segments;
      const round = (n: number) => Math.round(n * 100) / 100;
      const drawnKeys = drawn
        .map((s) => [`${round(s.ax)},${round(s.ay)}`, `${round(s.bx)},${round(s.by)}`].sort().join('|'))
        .sort();
      const expectedKeys = board.connections
        .map((conn) => {
          const a = projectIntersectionOnCanvas(board.intersections[conn.from], width, height, board);
          const b = projectIntersectionOnCanvas(board.intersections[conn.to], width, height, board);
          return [`${round(a.x)},${round(a.y)}`, `${round(b.x)},${round(b.y)}`].sort().join('|');
        })
        .sort();

      expect(drawnKeys).toEqual(expectedKeys);
    });

    it('every node is on screen and clicking its drawn centre selects that node', () => {
      const { width, height } = getBoardCanvasSize(reference.name);
      const canvas = fakeCanvas(width, height);
      const misses: string[] = [];
      for (const node of reference.intersections) {
        const point = projectIntersectionOnCanvas(node, width, height, reference);
        if (point.x < 0 || point.y < 0 || point.x > width || point.y > height) {
          misses.push(`${labelOf(reference, node.id)} is off canvas`);
        }
        if (hitTestNode(canvas, reference, point.x, point.y) !== node.id) {
          misses.push(`${labelOf(reference, node.id)} centre hits another node`);
        }
      }
      expect(misses).toEqual([]);
    });

    it('no drawn line passes through a node it does not connect', () => {
      const { width, height } = getBoardCanvasSize(reference.name);
      const points = reference.intersections.map((node) =>
        projectIntersectionOnCanvas(node, width, height, reference),
      );
      const overlaps: string[] = [];
      for (const conn of reference.connections) {
        const a = points[conn.from];
        const b = points[conn.to];
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const len2 = vx * vx + vy * vy;
        for (const node of reference.intersections) {
          if (node.id === conn.from || node.id === conn.to) continue;
          const p = points[node.id];
          const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
          const distance = Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
          if (distance < 12) {
            overlaps.push(
              `${labelOf(reference, conn.from)}-${labelOf(reference, conn.to)} runs through ${labelOf(reference, node.id)}`,
            );
          }
        }
      }
      expect(overlaps).toEqual([]);
    });
  });
});

describe('16-bead triangle-to-rectangle junction', () => {
  const idOf = (board: BoardDefinition, label: string): number =>
    board.intersections.find((point) => point.label === label)!.id;

  const wings = [
    { wing: 'L', apex: 'A20', inner: 'A21' },
    { wing: 'R', apex: 'A24', inner: 'A23' },
  ] as const;

  it.each(wings)('$wing wing crosses into the grid and back out', ({ wing, apex }) => {
    const board = new SmartBeadsEngine('16').getState().board;
    const routes: Array<[string, string]> = [
      [`${wing}T`, `${wing}IT`],
      [`${wing}M`, `${wing}IM`],
      [`${wing}B`, `${wing}IB`],
    ];
    for (const [outer, inner] of routes) {
      expect(board.jumpPaths).toEqual(
        expect.arrayContaining([
          { from: idOf(board, outer), over: idOf(board, inner), to: idOf(board, apex) },
          { from: idOf(board, apex), over: idOf(board, inner), to: idOf(board, outer) },
        ]),
      );
    }
  });

  it.each(wings)('$wing wing: a capture runs both ways across the junction', ({ wing, apex }) => {
    for (const [outer, inner] of [
      [`${wing}T`, `${wing}IT`],
      [`${wing}M`, `${wing}IM`],
      [`${wing}B`, `${wing}IB`],
    ]) {
      for (const [from, over, to] of [[outer, inner, apex], [apex, inner, outer]]) {
        const engine = blankEngine('16');
        const board = engine.getState().board;
        requireIntersection(board, idOf(board, from)).occupant = 'RED';
        requireIntersection(board, idOf(board, over)).occupant = 'BLUE';
        placeSpareEnemy(engine, [idOf(board, from), idOf(board, over), idOf(board, to)]);

        expect(offers(engine, idOf(board, from), idOf(board, to))).toBe(true);
        engine.applyMove({ from: idOf(board, from), to: idOf(board, to) });
        expect(requireIntersection(board, idOf(board, over)).occupant).toBeUndefined();
        expect(requireIntersection(board, idOf(board, to)).occupant).toBe('RED');
        expect(engine.getState().captures.RED).toBe(1);
      }
    }
  });

  it.each(wings)('$wing wing: multi-jump chains through the apex in both directions', ({ wing, apex, inner }) => {
    const chains: Array<[string, string, string, string, string]> = [
      [`${wing}T`, `${wing}IT`, apex, inner, 'A22'],
      [`${wing}M`, `${wing}IM`, apex, inner, 'A22'],
      [`${wing}B`, `${wing}IB`, apex, inner, 'A22'],
      ['A22', inner, apex, `${wing}IT`, `${wing}T`],
      ['A22', inner, apex, `${wing}IM`, `${wing}M`],
      ['A22', inner, apex, `${wing}IB`, `${wing}B`],
    ];

    for (const [start, victim1, middle, victim2, end] of chains) {
      const engine = blankEngine('16');
      const board = engine.getState().board;
      requireIntersection(board, idOf(board, start)).occupant = 'RED';
      requireIntersection(board, idOf(board, victim1)).occupant = 'BLUE';
      requireIntersection(board, idOf(board, victim2)).occupant = 'BLUE';
      requireIntersection(board, idOf(board, 'A44')).occupant = 'BLUE';

      const tag = `${start}x${victim1}->${middle}x${victim2}->${end}`;
      expect([tag, offers(engine, idOf(board, start), idOf(board, middle))]).toEqual([tag, true]);
      engine.applyMove({ from: idOf(board, start), to: idOf(board, middle) });
      expect([tag, engine.getChainPieceId()]).toEqual([tag, idOf(board, middle)]);
      expect([tag, offers(engine, idOf(board, middle), idOf(board, end))]).toEqual([tag, true]);
      engine.applyMove({ from: idOf(board, middle), to: idOf(board, end) });

      expect([tag, engine.getState().captures.RED]).toEqual([tag, 2]);
      expect([tag, engine.getChainPieceId()]).toEqual([tag, null]);
      expect([tag, engine.getState().currentPlayer]).toEqual([tag, 'BLUE']);
    }
  });

  it('the wing inner points continue collinear diagonal and horizontal hops across the apex into the grid', () => {
    const board = new SmartBeadsEngine('16').getState().board;
    const expectedJunctionJumps = [
      // Left wing across apex A20
      { from: idOf(board, 'LIT'), over: idOf(board, 'A20'), to: idOf(board, 'A31') },
      { from: idOf(board, 'A31'), over: idOf(board, 'A20'), to: idOf(board, 'LIT') },
      { from: idOf(board, 'LIB'), over: idOf(board, 'A20'), to: idOf(board, 'A11') },
      { from: idOf(board, 'A11'), over: idOf(board, 'A20'), to: idOf(board, 'LIB') },
      { from: idOf(board, 'LIM'), over: idOf(board, 'A20'), to: idOf(board, 'A21') },
      { from: idOf(board, 'A21'), over: idOf(board, 'A20'), to: idOf(board, 'LIM') },
      // Right wing across apex A24
      { from: idOf(board, 'RIT'), over: idOf(board, 'A24'), to: idOf(board, 'A33') },
      { from: idOf(board, 'A33'), over: idOf(board, 'A24'), to: idOf(board, 'RIT') },
      { from: idOf(board, 'RIB'), over: idOf(board, 'A24'), to: idOf(board, 'A13') },
      { from: idOf(board, 'A13'), over: idOf(board, 'A24'), to: idOf(board, 'RIB') },
      { from: idOf(board, 'RIM'), over: idOf(board, 'A24'), to: idOf(board, 'A23') },
      { from: idOf(board, 'A23'), over: idOf(board, 'A24'), to: idOf(board, 'RIM') },
    ];
    expect(board.jumpPaths).toEqual(expect.arrayContaining(expectedJunctionJumps));
  });

  it('non-collinear hops across the apex (e.g. LIT to horizontal A21) are strictly rejected', () => {
    const board = new SmartBeadsEngine('16').getState().board;
    const illegalBends = [
      { from: idOf(board, 'LIT'), over: idOf(board, 'A20'), to: idOf(board, 'A21') },
      { from: idOf(board, 'LIB'), over: idOf(board, 'A20'), to: idOf(board, 'A21') },
      { from: idOf(board, 'RIT'), over: idOf(board, 'A24'), to: idOf(board, 'A23') },
      { from: idOf(board, 'RIB'), over: idOf(board, 'A24'), to: idOf(board, 'A23') },
    ];
    for (const bend of illegalBends) {
      const match = (board.jumpPaths ?? []).find(
        (p) => p.from === bend.from && p.over === bend.over && p.to === bend.to,
      );
      expect(match).toBeUndefined();
    }
  });

  it('the middle wing line continues through the apex into the grid', () => {
    const board = new SmartBeadsEngine('16').getState().board;
    for (const [wing, apex, inner] of [['L', 'A20', 'A21'], ['R', 'A24', 'A23']] as const) {
      expect(board.jumpPaths).toEqual(
        expect.arrayContaining([
          { from: idOf(board, `${wing}IM`), over: idOf(board, apex), to: idOf(board, inner) },
          { from: idOf(board, inner), over: idOf(board, apex), to: idOf(board, `${wing}IM`) },
        ]),
      );
    }
  });
});
