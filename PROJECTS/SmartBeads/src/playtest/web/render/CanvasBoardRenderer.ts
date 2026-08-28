import { BoardDefinition, Move, Player } from '../../../models/GameState';
import { getBoardVisualProfile } from '../layout/boardVisualProfile';
import { projectIntersectionOnCanvas, projectLatticePointOnCanvas } from '../layout/boardProjection';

export interface BoardAnimState {
  from: number;
  to: number;
  captured?: number;
  capturedPlayer?: Player;
  player: Player;
  t: number;
  duration: number;
}

export interface LastMoveHighlight {
  from: number;
  to: number;
}

export interface CapturePulse {
  nodeId: number;
  /** 0 at flash start, 1 when faded out */
  progress: number;
}

export interface CanvasBoardView {
  board: BoardDefinition;
  currentPlayer: Player;
  gameOver: boolean;
  selectedId: number | null;
  legalTargets: number[];
  chainPieceId: number | null;
  anim: BoardAnimState | null;
  turnPulse: number;
  lastMove?: LastMoveHighlight | null;
  capturePulses?: CapturePulse[];
}

function resolveCenterHighlight(board: BoardDefinition): Set<number> {
  const profile = getBoardVisualProfile(board.name);
  const byNodeId = new Set<number>();
  const ringPoints = profile.centerRingPoints;
  if (!ringPoints?.length) return byNodeId;

  const byLattice = new Set(ringPoints.map((pt) => `${pt.x},${pt.y}`));
  for (const node of board.intersections) {
    if (node.x === undefined || node.y === undefined) continue;
    if (byLattice.has(`${node.x},${node.y}`)) {
      byNodeId.add(node.id);
    }
  }
  return byNodeId;
}

function isCenterHighlight(nodeId: number, cache: Set<number>): boolean {
  return cache.has(nodeId);
}

/** Nodes that receive the whose-turn pulse/ring — current player only, chain piece if chaining. */
export function listTurnHighlightNodeIds(
  board: BoardDefinition,
  currentPlayer: Player,
  chainPieceId: number | null,
): number[] {
  const ids: number[] = [];
  for (const node of board.intersections) {
    if (node.occupant !== currentPlayer) continue;
    if (chainPieceId !== null && node.id !== chainPieceId) continue;
    ids.push(node.id);
  }
  return ids;
}

function drawAmberSquare(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.fillStyle = 'rgba(232,168,60,0.35)';
  ctx.fillRect(cx - 14, cy - 14, 28, 28);
  ctx.strokeStyle = 'rgba(232,168,60,0.95)';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 14, cy - 14, 28, 28);
}

function drawCenterLine(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): void {
  const grad = ctx.createLinearGradient(ax, ay - 10, bx, by + 10);
  grad.addColorStop(0, 'rgba(232,168,60,0.15)');
  grad.addColorStop(0.5, 'rgba(232,168,60,0.45)');
  grad.addColorStop(1, 'rgba(232,168,60,0.15)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(ax - 8, ay - 10);
  ctx.lineTo(bx + 8, by - 10);
  ctx.lineTo(bx + 8, by + 10);
  ctx.lineTo(ax - 8, ay + 10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.strokeStyle = 'rgba(232,168,60,0.95)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawCenterRing(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(232, 168, 60, 0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawLastMoveTrail(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(95, 191, 138, 0.55)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawLastMoveNodeRing(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(120, 210, 170, 0.7)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(95, 191, 138, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGoldenCapturePulse(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number): void {
  const life = 1 - progress;
  if (life <= 0) return;
  const radius = 14 + progress * 20;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 200, 80, ${0.9 * life})`;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 215, 100, ${0.3 * life})`;
  ctx.fill();
}

function drawTurnWash(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  currentPlayer: Player,
  axis: 'horizontal' | 'vertical',
): void {
  const wash =
    axis === 'vertical'
      ? ctx.createLinearGradient(0, 0, 0, h)
      : ctx.createLinearGradient(0, 0, w, 0);

  if (axis === 'vertical') {
    if (currentPlayer === 'RED') {
      wash.addColorStop(0, 'rgba(0,0,0,0)');
      wash.addColorStop(0.55, 'rgba(255,245,220,0)');
      wash.addColorStop(1, 'rgba(255,245,220,0.14)');
    } else {
      wash.addColorStop(0, 'rgba(40,90,160,0.16)');
      wash.addColorStop(0.45, 'rgba(30,20,10,0)');
      wash.addColorStop(1, 'rgba(0,0,0,0)');
    }
  } else if (currentPlayer === 'RED') {
    wash.addColorStop(0, 'rgba(255,245,220,0.14)');
    wash.addColorStop(0.45, 'rgba(255,245,220,0)');
    wash.addColorStop(1, 'rgba(0,0,0,0)');
  } else {
    wash.addColorStop(0, 'rgba(0,0,0,0)');
    wash.addColorStop(0.55, 'rgba(30,20,10,0)');
    wash.addColorStop(1, 'rgba(40,90,160,0.16)');
  }

  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
}

function drawCenterDecorations(
  ctx: CanvasRenderingContext2D,
  board: BoardDefinition,
  w: number,
  h: number,
): void {
  const profile = getBoardVisualProfile(board.name);

  if (profile.centerLine) {
    const [a, b] = profile.centerLine;
    const aPt = projectLatticePointOnCanvas(a.x, a.y, w, h, board);
    const bPt = projectLatticePointOnCanvas(b.x, b.y, w, h, board);
    drawCenterLine(ctx, aPt.x, aPt.y, bPt.x, bPt.y);
  }

  if (profile.centerSquares) {
    for (const sq of profile.centerSquares) {
      const pt = projectLatticePointOnCanvas(sq.x, sq.y, w, h, board);
      drawAmberSquare(ctx, pt.x, pt.y);
    }
  }
}

function drawPieceAt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  player: Player,
  radius: number,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  const grd = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, radius);
  if (player === 'RED') {
    grd.addColorStop(0, '#fffaf0');
    grd.addColorStop(0.55, '#ebe2cf');
    grd.addColorStop(1, '#b7ab92');
  } else {
    grd.addColorStop(0, '#5a4538');
    grd.addColorStop(0.5, '#241812');
    grd.addColorStop(1, '#0a0604');
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.restore();
}

export function drawCanvasBoard(
  canvas: HTMLCanvasElement,
  view: CanvasBoardView,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const { board, currentPlayer, gameOver, selectedId, legalTargets, chainPieceId, anim, turnPulse } = view;
  const lastMove = view.lastMove ?? null;
  const capturePulses = view.capturePulses ?? [];
  const visualProfile = getBoardVisualProfile(board.name);
  const centerHighlight = resolveCenterHighlight(board);
  const project = (node: { x?: number; y?: number; id: number }) =>
    projectIntersectionOnCanvas(node as Parameters<typeof projectIntersectionOnCanvas>[0], w, h, board);

  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#1f4d39');
  g.addColorStop(1, '#143328');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const animating = anim !== null && anim.t < 1;
  const washPlayer = animating && anim ? anim.player : currentPlayer;
  if (!gameOver) {
    drawTurnWash(ctx, w, h, washPlayer, visualProfile.turnWashAxis ?? 'horizontal');
  }

  ctx.strokeStyle = 'rgba(212,168,75,0.55)';
  ctx.lineWidth = 2;
  for (const conn of board.connections) {
    const from = board.intersections[conn.from];
    const to = board.intersections[conn.to];
    if (from.x === undefined || from.y === undefined || to.x === undefined || to.y === undefined) continue;
    const fromPt = project(from);
    const toPt = project(to);
    ctx.beginPath();
    ctx.moveTo(fromPt.x, fromPt.y);
    ctx.lineTo(toPt.x, toPt.y);
    ctx.stroke();
  }

  drawCenterDecorations(ctx, board, w, h);

  if (lastMove && lastMove.from !== lastMove.to) {
    const fromNode = board.intersections[lastMove.from];
    const toNode = board.intersections[lastMove.to];
    if (fromNode?.x !== undefined && toNode?.x !== undefined) {
      const fromPt = project(fromNode);
      const toPt = project(toNode);
      drawLastMoveTrail(ctx, fromPt.x, fromPt.y, toPt.x, toPt.y);
    }
  }

  const hideFrom = anim ? anim.from : -1;
  const hideTo = animating && anim ? anim.to : -1;
  const hideCap = anim && anim.captured != null ? anim.captured : -1;

  for (const node of board.intersections) {
    if (node.x === undefined || node.y === undefined) continue;
    const { x, y } = project(node);
    const center = isCenterHighlight(node.id, centerHighlight);

    if (center) {
      drawCenterRing(ctx, x, y);
    }

    for (const pulse of capturePulses) {
      if (pulse.nodeId === node.id && pulse.progress < 1) {
        drawGoldenCapturePulse(ctx, x, y, pulse.progress);
      }
    }

    const isLastMoveNode = lastMove && (node.id === lastMove.from || node.id === lastMove.to);
    if (isLastMoveNode && node.id !== hideFrom && node.id !== hideTo) {
      drawLastMoveNodeRing(ctx, x, y);
    }

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212,168,75,0.4)';
    ctx.fill();

    if (legalTargets.includes(node.id) && !animating) {
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(60,184,154,0.85)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    if (node.occupant && node.id !== hideFrom && node.id !== hideTo) {
      const isChainPiece = chainPieceId !== null && node.id === chainPieceId;
      const isTurnPiece =
        !gameOver
        && node.occupant === currentPlayer
        && !animating
        && (chainPieceId === null || isChainPiece);
      const isSelected = selectedId === node.id;
      const pulse = isTurnPiece ? 1 + 0.08 * Math.sin(turnPulse) : 1;
      const dimOpp = !gameOver && node.occupant !== currentPlayer ? 0.72 : 1;
      const r = (isSelected ? 18 : 16) * pulse;
      drawPieceAt(ctx, x, y, node.occupant, r, dimOpp);
      if (isSelected) {
        // Clear, prominent red/orange glowing double-ring for the active selected piece
        ctx.beginPath();
        ctx.arc(x, y, r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 95, 25, 0.95)';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, r + 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 60, 20, 0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (isTurnPiece) {
        ctx.beginPath();
        ctx.arc(x, y, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = node.occupant === 'RED' ? 'rgba(255,230,170,0.55)' : 'rgba(120,180,255,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  if (anim) {
    if (anim.captured != null && hideCap >= 0) {
      const capNode = board.intersections[anim.captured];
      if (capNode.x !== undefined && capNode.y !== undefined && anim.capturedPlayer) {
        const capPt = project(capNode);
        const fade = Math.max(0, 1 - anim.t * 1.4);
        drawPieceAt(ctx, capPt.x, capPt.y, anim.capturedPlayer, 16 * fade, fade);
        if (fade > 0.2) {
          ctx.beginPath();
          ctx.arc(capPt.x, capPt.y, 22, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(212,80,60,${0.7 * fade})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
    }

    const fromNode = board.intersections[anim.from];
    const toNode = board.intersections[anim.to];
    if (fromNode.x !== undefined && fromNode.y !== undefined && toNode.x !== undefined && toNode.y !== undefined) {
      const fromPt = project(fromNode);
      const toPt = project(toNode);
      const ease = anim.t < 0.5 ? 2 * anim.t * anim.t : 1 - ((-2 * anim.t + 2) ** 2) / 2;
      drawPieceAt(
        ctx,
        fromPt.x + (toPt.x - fromPt.x) * ease,
        fromPt.y + (toPt.y - fromPt.y) * ease,
        anim.player,
        17,
        1,
      );
    }
  }
}

export function hitTestNode(
  canvas: HTMLCanvasElement,
  board: BoardDefinition,
  clientX: number,
  clientY: number,
): number {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  const mx = (clientX - rect.left) * sx;
  const my = (clientY - rect.top) * sy;

  let hit = -1;
  let best = 22;
  for (const node of board.intersections) {
    if (node.x === undefined || node.y === undefined) continue;
    const { x, y } = projectIntersectionOnCanvas(node, canvas.width, canvas.height, board);
    const d = Math.hypot(mx - x, my - y);
    if (d < best) {
      best = d;
      hit = node.id;
    }
  }
  return hit;
}
