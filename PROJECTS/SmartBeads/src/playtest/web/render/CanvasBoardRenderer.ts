import { BoardDefinition, Move, Player } from '../../../models/GameState';
import { projectIntersectionOnCanvas } from '../layout/boardProjection';

export interface BoardAnimState {
  from: number;
  to: number;
  captured?: number;
  capturedPlayer?: Player;
  player: Player;
  t: number;
  duration: number;
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

  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#1f4d39');
  g.addColorStop(1, '#143328');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (!gameOver) {
    const wash = ctx.createLinearGradient(0, 0, w, 0);
    if (currentPlayer === 'RED') {
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

  ctx.strokeStyle = 'rgba(212,168,75,0.55)';
  ctx.lineWidth = 2;
  for (const conn of board.connections) {
    const from = board.intersections[conn.from];
    const to = board.intersections[conn.to];
    if (from.x === undefined || from.y === undefined || to.x === undefined || to.y === undefined) continue;
    const fromPt = projectIntersectionOnCanvas(from, w, h);
    const toPt = projectIntersectionOnCanvas(to, w, h);
    ctx.beginPath();
    ctx.moveTo(fromPt.x, fromPt.y);
    ctx.lineTo(toPt.x, toPt.y);
    ctx.stroke();
  }

  const hideFrom = anim ? anim.from : -1;
  const hideCap = anim && anim.captured != null ? anim.captured : -1;
  const animating = anim !== null && anim.t < 1;

  for (const node of board.intersections) {
    if (node.x === undefined || node.y === undefined) continue;
    const { x, y } = projectIntersectionOnCanvas(node, w, h);

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

    if (node.occupant && node.id !== hideFrom) {
      const isTurnPiece = !gameOver && node.occupant === currentPlayer && !animating && chainPieceId === null;
      const pulse = isTurnPiece ? 1 + 0.08 * Math.sin(turnPulse) : 1;
      const dimOpp = !gameOver && node.occupant !== currentPlayer ? 0.72 : 1;
      const r = (selectedId === node.id ? 18 : 16) * pulse;
      drawPieceAt(ctx, x, y, node.occupant, r, dimOpp);
      if (isTurnPiece) {
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
        const capPt = projectIntersectionOnCanvas(capNode, w, h);
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
      const fromPt = projectIntersectionOnCanvas(fromNode, w, h);
      const toPt = projectIntersectionOnCanvas(toNode, w, h);
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
    const { x, y } = projectIntersectionOnCanvas(node, canvas.width, canvas.height);
    const d = Math.hypot(mx - x, my - y);
    if (d < best) {
      best = d;
      hit = node.id;
    }
  }
  return hit;
}
