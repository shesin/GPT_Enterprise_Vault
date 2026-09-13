/** Move-hint aura presets — preview until locked in DECISIONS. */

export type MoveHintAuraStyle = 'off' | 'original' | 'gold-fill';

export const MOVE_HINT_AURA_STORAGE_KEY = 'sb-move-hint-aura';

const RETIRED_AURA_STYLES = new Set(['white-gold', 'gold-no-fill', 'ring-only']);

export function isMoveHintAuraStyle(value: string | null | undefined): value is MoveHintAuraStyle {
  return value === 'off' || value === 'original' || value === 'gold-fill';
}

function normalizeMoveHintAuraStyle(value: string | null | undefined): MoveHintAuraStyle | null {
  if (value && RETIRED_AURA_STYLES.has(value)) return 'gold-fill';
  return isMoveHintAuraStyle(value) ? value : null;
}

export function readMoveHintAuraStyle(): MoveHintAuraStyle {
  if (typeof localStorage === 'undefined') return 'off';
  const stored = localStorage.getItem(MOVE_HINT_AURA_STORAGE_KEY);
  return normalizeMoveHintAuraStyle(stored) ?? 'off';
}

export function writeMoveHintAuraStyle(style: MoveHintAuraStyle): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(MOVE_HINT_AURA_STORAGE_KEY, style);
}
