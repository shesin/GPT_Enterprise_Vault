/** localStorage that never throws: private windows and blocked site data make every call throw. */

/** Single definition: theme modules import this leaf file, so there is no import cycle. */
export const PLAY_BOARD_LOOK_STORAGE_KEY = 'sb-play-board-look';

export function readStored(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** The setting simply is not remembered when storage is blocked. */
export function writeStored(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    /* storage blocked */
  }
}
