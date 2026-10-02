import { describeNode, isArrowKey, nextNodeInDirection, ScreenNode } from '../keyboardNav';

// 3 x 3 grid, ids row by row:  0 1 2 / 3 4 5 / 6 7 8, 100 px apart.
const grid: ScreenNode[] = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  x: (i % 3) * 100,
  y: Math.floor(i / 3) * 100,
}));

describe('nextNodeInDirection (W3 keyboard play)', () => {
  it('moves one step in each arrow direction', () => {
    expect(nextNodeInDirection(grid, 4, 'ArrowRight')).toBe(5);
    expect(nextNodeInDirection(grid, 4, 'ArrowLeft')).toBe(3);
    expect(nextNodeInDirection(grid, 4, 'ArrowUp')).toBe(1);
    expect(nextNodeInDirection(grid, 4, 'ArrowDown')).toBe(7);
  });

  it('stays put (null) at the edge of the board', () => {
    expect(nextNodeInDirection(grid, 0, 'ArrowLeft')).toBeNull();
    expect(nextNodeInDirection(grid, 0, 'ArrowUp')).toBeNull();
    expect(nextNodeInDirection(grid, 8, 'ArrowRight')).toBeNull();
    expect(nextNodeInDirection(grid, 8, 'ArrowDown')).toBeNull();
  });

  it('prefers the node straight ahead over a nearer-looking diagonal', () => {
    const nodes: ScreenNode[] = [
      { id: 0, x: 0, y: 0 },
      { id: 1, x: 60, y: 55 }, // diagonal, 81 px away
      { id: 2, x: 90, y: 0 }, // straight right, 90 px away
    ];
    expect(nextNodeInDirection(nodes, 0, 'ArrowRight')).toBe(2);
  });

  it('every node of a connected grid can be reached with arrows only', () => {
    for (const target of grid) {
      const seen = new Set<number>([4]);
      const queue = [4];
      while (queue.length) {
        const cur = queue.shift()!;
        for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const) {
          const n = nextNodeInDirection(grid, cur, k);
          if (n !== null && !seen.has(n)) {
            seen.add(n);
            queue.push(n);
          }
        }
      }
      expect(seen.has(target.id)).toBe(true);
    }
  });

  it('returns null for an unknown start node', () => {
    expect(nextNodeInDirection(grid, 99, 'ArrowUp')).toBeNull();
  });
});

describe('describeNode / isArrowKey', () => {
  it('says what is on the node and its state', () => {
    expect(
      describeNode({ label: 'A02', occupant: 'RED', selected: true, legalTarget: false }),
    ).toBe('A02: Cream bead, selected');
    expect(describeNode({ label: 'B1', occupant: null, selected: false, legalTarget: true })).toBe(
      'B1: empty, legal move',
    );
    expect(
      describeNode({ label: 'C3', occupant: 'BLUE', selected: false, legalTarget: false }),
    ).toBe('C3: Black bead');
  });

  it('recognises only the four arrows', () => {
    expect(isArrowKey('ArrowUp')).toBe(true);
    expect(isArrowKey('Enter')).toBe(false);
  });
});
