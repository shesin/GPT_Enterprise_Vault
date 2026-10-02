/**
 * Keyboard and screen-reader behaviour for the game's dialogs (result, resignation offer):
 * focus moves into the dialog when it opens, Tab stays inside it, Escape runs `onEscape`,
 * and focus goes back to where it was when the dialog closes.
 */

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled])';

export function installModalFocus(modal: HTMLElement, opts: { onEscape?: () => void } = {}): void {
  let wasOpen = false;
  let returnTo: HTMLElement | null = null;

  const isOpen = (): boolean => getComputedStyle(modal).display !== 'none';
  const items = (): HTMLElement[] =>
    Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null,
    );

  function sync(): void {
    const open = isOpen();
    if (open === wasOpen) return;
    wasOpen = open;
    if (open) {
      returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const first = items()[0];
      if (first) first.focus();
      else {
        modal.tabIndex = -1;
        modal.focus();
      }
    } else if (returnTo && document.contains(returnTo)) {
      returnTo.focus();
      returnTo = null;
    }
  }

  new MutationObserver(sync).observe(modal, {
    attributes: true,
    attributeFilter: ['style', 'class'],
  });

  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') {
      opts.onEscape?.();
      return;
    }
    if (e.key !== 'Tab') return;
    const list = items();
    if (list.length === 0) {
      e.preventDefault();
      return;
    }
    const first = list[0]!;
    const last = list[list.length - 1]!;
    const active = document.activeElement;
    if (!modal.contains(active)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  });
}
