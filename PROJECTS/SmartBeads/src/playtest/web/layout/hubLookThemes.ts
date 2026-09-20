/** Page 1 (hub chrome) look — additive to the locked "Pearl Deep + Gold" default
 * (GPT_PROJECT_DECISIONS_05P.md §13). 'default' keeps that palette untouched;
 * 'seaglass' and 'jade' are optional hub-wide looks, applied via a data
 * attribute on #play-hub so the existing !important palette block in
 * play-hub.css still wins unless this attribute is present. */

export type HubLookId = 'default' | 'seaglass' | 'jade';

export const HUB_LOOK_STORAGE_KEY = 'sb-hub-look';
const HUB_LOOK_ATTR = 'data-hub-look';

export function isHubLookId(value: string | null | undefined): value is HubLookId {
  return value === 'default' || value === 'seaglass' || value === 'jade';
}

export function readStoredHubLookId(): HubLookId {
  try {
    const stored = localStorage.getItem(HUB_LOOK_STORAGE_KEY);
    return isHubLookId(stored) ? stored : 'default';
  } catch {
    return 'default';
  }
}

export function applyHubLookId(id: HubLookId, target: HTMLElement): void {
  if (id === 'default') {
    target.removeAttribute(HUB_LOOK_ATTR);
  } else {
    target.setAttribute(HUB_LOOK_ATTR, id);
  }
  try {
    localStorage.setItem(HUB_LOOK_STORAGE_KEY, id);
  } catch {
    /* storage unavailable */
  }
}
