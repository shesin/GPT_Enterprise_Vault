/** Single-elimination bracket layout. Pure functions, no state. */

/** Seed numbers in bracket order for a power-of-two size: consecutive pairs meet in round one (1 v size, ...). */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const sum = order.length * 2 + 1;
    order = order.flatMap((s) => [s, sum - s]);
  }
  return order;
}

export function bracketSize(entrants: number): number {
  let size = 2;
  while (size < entrants) size *= 2;
  return size;
}

/**
 * Round-one pairs from players listed best seed first. Seeds beyond the number of players are byes, so the best
 * seeds get them. A pair is [a, b] with null for a bye.
 */
export function firstRoundPairs(seeded: string[]): Array<[string | null, string | null]> {
  const size = bracketSize(seeded.length);
  const order = seedOrder(size);
  const at = (seed: number): string | null => seeded[seed - 1] ?? null;
  const pairs: Array<[string | null, string | null]> = [];
  for (let i = 0; i < order.length; i += 2) pairs.push([at(order[i]!), at(order[i + 1]!)]);
  return pairs;
}

/** Pairs the winners of one round, in bracket order, for the next round. */
export function nextRoundPairs(winners: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i + 1 < winners.length; i += 2) pairs.push([winners[i]!, winners[i + 1]!]);
  return pairs;
}
