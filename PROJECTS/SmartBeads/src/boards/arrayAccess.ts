/**
 * Bounds-checked array access for geometry-construction code where the index
 * is always in range by construction (e.g. an adjacency list built from the
 * same node set it indexes into) — noUncheckedIndexedAccess can't prove that
 * statically, so this makes the invariant explicit instead of silencing the
 * compiler with `!`. Throws immediately if the invariant is ever violated
 * (this code runs once at module load, building each board's fixed
 * geometry — not a hot path), rather than letting `undefined` propagate
 * silently into gameplay logic.
 */
export function at<T>(arr: readonly T[], index: number): T {
  const value = arr[index];
  if (value === undefined) {
    throw new Error(`Index ${index} out of bounds (length ${arr.length})`);
  }
  return value;
}
