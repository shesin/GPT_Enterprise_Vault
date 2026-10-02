/**
 * Keyboard play (W3): arrow keys move a focus marker between board nodes, Enter / Space picks or places.
 * Pure helpers — screen positions come from the renderer's own projection, so "right" always means right on screen.
 */
export interface ScreenNode {
  id: number;
  x: number;
  y: number;
}

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

const DIRECTIONS: Record<ArrowKey, readonly [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

export function isArrowKey(key: string): key is ArrowKey {
  return key in DIRECTIONS;
}

/**
 * Nearest node in the pressed direction: within 60 degrees of the arrow's axis, closest first
 * (off-axis distance counts double so "right" prefers the node straight right over a diagonal one).
 * Returns null at the edge of the board (focus stays put).
 */
export function nextNodeInDirection(
  nodes: readonly ScreenNode[],
  fromId: number,
  key: ArrowKey,
): number | null {
  const from = nodes.find((n) => n.id === fromId);
  if (!from) return null;
  const [dx, dy] = DIRECTIONS[key];
  let best: number | null = null;
  let bestScore = Infinity;
  for (const n of nodes) {
    if (n.id === fromId) continue;
    const vx = n.x - from.x;
    const vy = n.y - from.y;
    const along = vx * dx + vy * dy;
    if (along <= 0) continue;
    const across = Math.abs(vx * dy - vy * dx);
    if (across > along * Math.tan((60 * Math.PI) / 180)) continue;
    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = n.id;
    }
  }
  return best;
}

/** Spoken description of the focused node (written to a polite live region). */
export function describeNode(opts: {
  label: string;
  occupant: 'RED' | 'BLUE' | null | undefined;
  selected: boolean;
  legalTarget: boolean;
}): string {
  const who =
    opts.occupant === 'RED' ? 'Cream bead' : opts.occupant === 'BLUE' ? 'Black bead' : 'empty';
  const extra = opts.selected ? ', selected' : opts.legalTarget ? ', legal move' : '';
  return `${opts.label}: ${who}${extra}`;
}
