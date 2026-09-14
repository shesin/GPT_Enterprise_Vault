import { BoardDefinition, Move, Player } from '../../../models/GameState';
import { getActiveBeadSet } from '../layout/beadSetThemes';
import { getActiveBoardLookTheme } from '../layout/boardLookThemes';
import {
  CLASSIC_BOARD_LINE_GOLD_EMPTY_NODE,
  getClassicBoardLineGold,
} from '../layout/boardLineGoldThemes';
import { readPlayBoardMatchMode } from '../layout/playShellThemes';
import { type MoveHintAuraStyle, readMoveHintAuraStyle } from '../layout/moveHintAuraThemes';
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
  player: Player;
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
  /** False after first pick this turn — all-bead flash does not return on deselect. */
  showTurnStartRings?: boolean;
  lastMove?: LastMoveHighlight | null;
  capturePulses?: CapturePulse[];
  coachGlowNodeIds?: readonly number[];
  /** Original = orange/lime per side; gold-fill = gold glow on both beads. */
  moveHintAura?: MoveHintAuraStyle;
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

const BEAD_RADIUS = 16;

/** Nodes that receive turn-start rings — current player only, chain piece if chaining. */
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

function drawTwinMoveHintRings(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pieceRadius: number,
  innerRing: string,
  outerRing: string,
  innerWidth: number,
  outerWidth: number,
): void {
  const innerRadius = pieceRadius + innerWidth / 2;
  const outerRadius = pieceRadius + innerWidth + outerWidth / 2 + 1;

  ctx.beginPath();
  ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
  ctx.strokeStyle = innerRing;
  ctx.lineWidth = innerWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
  ctx.strokeStyle = outerRing;
  ctx.lineWidth = outerWidth;
  ctx.stroke();
}

/** Original — orange (cream) or lime (black) twin rings per DECISIONS §8. */
function drawOriginalMoveHintAura(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pieceRadius: number,
  side: Player,
): void {
  const isCream = side === 'RED';
  drawTwinMoveHintRings(
    ctx,
    x,
    y,
    pieceRadius,
    isCream ? 'rgba(255, 95, 25, 0.95)' : 'rgba(180, 255, 80, 0.95)',
    isCream ? 'rgba(255, 60, 20, 0.45)' : 'rgba(180, 255, 80, 0.38)',
    isCream ? 3.5 : 2.5,
    isCream ? 2 : 1.5,
  );
}

/** Gold (fill) — Lovable-style snug gold wash + bright rim hugging the bead. */
function drawGoldFillMoveHintAura(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pieceRadius: number,
): void {
  const glowRadius = pieceRadius + 11;
  const aura = ctx.createRadialGradient(x, y, pieceRadius * 0.78, x, y, glowRadius);
  aura.addColorStop(0, 'rgba(255, 220, 120, 0.52)');
  aura.addColorStop(0.42, 'rgba(255, 205, 92, 0.30)');
  aura.addColorStop(1, 'rgba(255, 180, 50, 0)');
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  const innerRadius = pieceRadius + 0.55;
  ctx.beginPath();
  ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 228, 140, 0.98)';
  ctx.lineWidth = 2.35;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, pieceRadius + 3.2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 205, 92, 0.38)';
  ctx.lineWidth = 1.35;
  ctx.stroke();
}

function drawBeadMoveHintAura(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pieceRadius: number,
  side: Player,
  style: MoveHintAuraStyle,
): void {
  if (style === 'off') return;
  if (style === 'gold-fill') {
    drawGoldFillMoveHintAura(ctx, x, y, pieceRadius);
    return;
  }
  drawOriginalMoveHintAura(ctx, x, y, pieceRadius, side);
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

function drawBoardFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frameOuter: string,
  frameInner: string,
): void {
  ctx.save();
  ctx.strokeStyle = frameOuter;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  ctx.strokeStyle = frameInner;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(4.5, 4.5, w - 9, h - 9);
  ctx.restore();
}

/** Fixed cream-camp half tint — does not swap with currentPlayer (cream side only). */
function drawCreamHalfTint(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  axis: 'horizontal' | 'vertical',
): void {
  const look = getActiveBoardLookTheme();
  const stops = axis === 'vertical' ? look.creamVerticalStops : look.creamHorizontalStops;
  const wash =
    axis === 'vertical'
      ? ctx.createLinearGradient(0, 0, 0, h)
      : ctx.createLinearGradient(0, 0, w, 0);

  for (const [position, color] of stops) {
    wash.addColorStop(position, color);
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
  // Capture fade-out shrinks radius to 0 — nothing left to draw, and the black-bead
  // rim strokes below (radius - 0.5 / - 0.12) would throw on a negative arc radius.
  if (radius <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const beadSet = getActiveBeadSet();
  const bead = player === 'RED' ? beadSet.creamBead : beadSet.blackBead;
  const isBlack = player === 'BLUE';
  ctx.shadowColor = isBlack ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = isBlack ? 8 : 5;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  const lightX = x - radius * 0.28;
  const lightY = y - radius * 0.32;
  const grd = ctx.createRadialGradient(lightX, lightY, isBlack ? radius * 0.1 : 2, x + radius * 0.04, y + radius * 0.06, radius);
  grd.addColorStop(0, bead.highlight);
  grd.addColorStop(0.55, bead.mid);
  grd.addColorStop(1, bead.shadow);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  if (isBlack) {
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const spec = ctx.createRadialGradient(
      x - radius * 0.4,
      y - radius * 0.44,
      0,
      x - radius * 0.22,
      y - radius * 0.28,
      radius * 0.62,
    );
    spec.addColorStop(0, 'rgba(255, 255, 255, 0.82)');
    spec.addColorStop(0.32, 'rgba(255, 255, 255, 0.24)');
    spec.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = spec;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, Math.max(radius - 0.5, 0), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.50)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, Math.max(radius - 0.12, 0), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 2.1;
    ctx.stroke();
  }

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
  const showTurnStartRings = view.showTurnStartRings ?? true;
  const lastMove = view.lastMove ?? null;
  const capturePulses = view.capturePulses ?? [];
  const coachGlowNodeIds = view.coachGlowNodeIds ?? [];
  const coachGlowSet = new Set(coachGlowNodeIds);
  const moveHintAura = view.moveHintAura ?? readMoveHintAuraStyle();
  const visualProfile = getBoardVisualProfile(board.name);
  const centerHighlight = resolveCenterHighlight(board);
  const project = (node: { x?: number; y?: number; id: number }) =>
    projectIntersectionOnCanvas(node as Parameters<typeof projectIntersectionOnCanvas>[0], w, h, board);

  ctx.clearRect(0, 0, w, h);
  // Undo any alpha/shadow left behind by a draw call that threw mid-frame last time
  // (e.g. an unmatched ctx.save()) — otherwise corrupted state compounds every frame.
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  const look = getActiveBoardLookTheme();
  const boardMatch = readPlayBoardMatchMode();
  const g =
    boardMatch === 'matched'
      ? ctx.createLinearGradient(0, 0, 0, h)
      : ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, look.surfaceTop);
  g.addColorStop(1, look.surfaceBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (boardMatch === 'side-only') {
    drawCreamHalfTint(ctx, w, h, visualProfile.turnWashAxis ?? 'horizontal');
  }
  drawBoardFrame(ctx, w, h, look.frameOuter, look.frameInner);

  const animating = anim !== null && anim.t < 1;
  const turnIdleHighlight =
    !gameOver
    && !animating
    && selectedId === null
    && legalTargets.length === 0
    && showTurnStartRings;
  const turnHighlightSet = turnIdleHighlight
    ? new Set(listTurnHighlightNodeIds(board, currentPlayer, chainPieceId))
    : new Set<number>();
  const matchStartFlash = turnIdleHighlight && showTurnStartRings;

  const boardLines = getClassicBoardLineGold();
  ctx.strokeStyle = boardLines.lineRgba;
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

  // Hide last-move rings on anim endpoints for the whole move, including t=1 frame.
  const hideFrom = anim ? anim.from : -1;
  const hideTo = anim ? anim.to : -1;
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

    const isLastMoveFrom = lastMove && node.id === lastMove.from;
    const isLastMoveTo = lastMove && node.id === lastMove.to;
    const isLastMoveNode = isLastMoveFrom || isLastMoveTo;
    if (isLastMoveNode && node.id !== hideFrom && node.id !== hideTo && lastMove) {
      const opponent: Player = lastMove.player === 'RED' ? 'BLUE' : 'RED';
      if (node.occupant !== opponent) {
        drawBeadMoveHintAura(ctx, x, y, BEAD_RADIUS, lastMove.player, moveHintAura);
      }
    }

    const nodeRadius = node.occupant ? 3.5 : 4;
    ctx.beginPath();
    ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
    ctx.fillStyle = node.occupant ? boardLines.nodeRgba : CLASSIC_BOARD_LINE_GOLD_EMPTY_NODE;
    ctx.globalAlpha = 1;
    ctx.fill();

    const selectedOccupant =
      selectedId !== null ? board.intersections[selectedId]?.occupant : undefined;
    if (legalTargets.includes(node.id) && !anim) {
      const hintSide: Player = selectedOccupant === 'BLUE' ? 'BLUE' : 'RED';
      drawBeadMoveHintAura(ctx, x, y, BEAD_RADIUS, hintSide, moveHintAura);
    }

    if (node.occupant && node.id !== hideFrom && node.id !== hideTo) {
      const isSelected = selectedId === node.id;
      const isCoachGlow = coachGlowSet.has(node.id);
      const isMatchStartRing = turnHighlightSet.has(node.id);
      const pulse = isMatchStartRing ? 1 + 0.08 * Math.sin(turnPulse) : 1;
      const dimOpp =
        matchStartFlash && !gameOver && node.occupant !== currentPlayer ? 0.72 : 1;
      const r = BEAD_RADIUS * pulse;
      const showOccupiedAura =
        isSelected || turnHighlightSet.has(node.id) || (isCoachGlow && node.occupant === 'RED');
      drawPieceAt(ctx, x, y, node.occupant, r, dimOpp);
      if (showOccupiedAura) {
        drawBeadMoveHintAura(ctx, x, y, r, node.occupant, moveHintAura);
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
      const mx = fromPt.x + (toPt.x - fromPt.x) * ease;
      const my = fromPt.y + (toPt.y - fromPt.y) * ease;
      drawPieceAt(ctx, mx, my, anim.player, 17, 1);
      drawBeadMoveHintAura(ctx, mx, my, 17, anim.player, moveHintAura);
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
