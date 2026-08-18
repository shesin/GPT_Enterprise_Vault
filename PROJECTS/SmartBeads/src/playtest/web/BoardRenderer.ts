import { BoardDefinition, Intersection, Move } from '../../models/GameState';

/** Matches SHOLO_GUTI.html vertical board projection. */
export function projectIntersection(
  intersection: Intersection,
  viewWidth: number,
  viewHeight: number,
): { x: number; y: number } {
  const latticeX = intersection.x ?? 0;
  const latticeY = intersection.y ?? 0;
  const padX = viewWidth * 0.08;
  const padY = viewHeight * 0.055;
  return {
    x: padX + (latticeY / 8) * (viewWidth - padX * 2),
    y: padY + ((10 - latticeX) / 12) * (viewHeight - padY * 2),
  };
}

/** Fallback grid layout when intersections lack x/y (legacy 4×4 lab). */
export function projectGridIntersection(
  id: number,
  size: number,
  viewWidth: number,
  viewHeight: number,
): { x: number; y: number } {
  const row = Math.floor(id / size);
  const col = id % size;
  const pad = Math.min(viewWidth, viewHeight) * 0.12;
  const spacingX = (viewWidth - pad * 2) / (size - 1);
  const spacingY = (viewHeight - pad * 2) / (size - 1);
  return {
    x: pad + col * spacingX,
    y: pad + row * spacingY,
  };
}

export function resolveNodePosition(
  intersection: Intersection,
  viewWidth: number,
  viewHeight: number,
  gridSize?: number,
): { x: number; y: number } {
  if (intersection.x !== undefined && intersection.y !== undefined) {
    return projectIntersection(intersection, viewWidth, viewHeight);
  }
  if (gridSize !== undefined) {
    return projectGridIntersection(intersection.id, gridSize, viewWidth, viewHeight);
  }
  throw new Error(`Intersection ${intersection.id} has no layout coordinates`);
}

export function renderBoardSvg(
  svg: SVGSVGElement,
  board: BoardDefinition,
  legalMoves: Move[],
  chainPieceId: number | null,
  selectedPieceId: number | null,
  onNodeClick: (nodeId: number) => void,
  options?: { gridSize?: number; showLabels?: boolean },
): void {
  const viewWidth = svg.viewBox.baseVal.width || svg.clientWidth || 560;
  const viewHeight = svg.viewBox.baseVal.height || svg.clientHeight || 680;
  svg.innerHTML = '';

  const positionFor = (intersection: Intersection) =>
    resolveNodePosition(intersection, viewWidth, viewHeight, options?.gridSize);

  for (const conn of board.connections) {
    const from = board.intersections.find((point) => point.id === conn.from);
    const to = board.intersections.find((point) => point.id === conn.to);
    if (!from || !to) {
      continue;
    }
    const fromCoord = positionFor(from);
    const toCoord = positionFor(to);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fromCoord.x.toString());
    line.setAttribute('y1', fromCoord.y.toString());
    line.setAttribute('x2', toCoord.x.toString());
    line.setAttribute('y2', toCoord.y.toString());
    line.setAttribute('stroke', 'rgba(201,162,39,0.65)');
    line.setAttribute('stroke-width', '3');
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
  }

  const activeSourceId = chainPieceId !== null ? chainPieceId : selectedPieceId;
  const validTargetIds = new Set<number>();
  if (activeSourceId !== null) {
    for (const move of legalMoves) {
      if (move.from === activeSourceId) {
        validTargetIds.add(move.to);
      }
    }
  }

  for (const intersection of board.intersections) {
    const coord = positionFor(intersection);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${coord.x}, ${coord.y})`);
    g.style.cursor = 'pointer';

    const nodeCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    nodeCircle.setAttribute('r', '10');
    nodeCircle.setAttribute('fill', '#d8cdb8');
    nodeCircle.setAttribute('stroke', '#8a7a62');
    nodeCircle.setAttribute('stroke-width', '1.5');
    g.appendChild(nodeCircle);

    if (validTargetIds.has(intersection.id)) {
      const targetRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      targetRing.setAttribute('r', '18');
      targetRing.setAttribute('fill', 'none');
      targetRing.setAttribute('stroke', '#2a9d8f');
      targetRing.setAttribute('stroke-width', '3');
      targetRing.setAttribute('stroke-dasharray', '5,3');
      g.appendChild(targetRing);
    }

    if (activeSourceId === intersection.id) {
      const selectRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      selectRing.setAttribute('r', '20');
      selectRing.setAttribute('fill', 'none');
      selectRing.setAttribute('stroke', '#ffb703');
      selectRing.setAttribute('stroke-width', '4');
      g.appendChild(selectRing);
    }

    if (intersection.occupant) {
      const bead = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bead.setAttribute('r', '14');
      bead.setAttribute('fill', intersection.occupant === 'RED' ? '#ebe2cf' : '#241812');
      bead.setAttribute('stroke', intersection.occupant === 'RED' ? '#b7ab92' : '#5a4538');
      bead.setAttribute('stroke-width', '2');
      g.appendChild(bead);
    }

    if (options?.showLabels && intersection.label) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = intersection.label;
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dy', '3');
      text.setAttribute('font-size', '8');
      text.setAttribute('fill', '#555');
      text.setAttribute('pointer-events', 'none');
      g.appendChild(text);
    }

    g.addEventListener('click', () => onNodeClick(intersection.id));
    svg.appendChild(g);
  }
}
