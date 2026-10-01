/** Last line of defence: an uncaught error or unhandled rejection is logged and the player is told, once. */

export function installGlobalErrorBanner(): void {
  let shown = false;
  const report = (what: string, err: unknown): void => {
    console.error(`[SmartBeads] ${what}`, err);
    if (shown) return;
    shown = true;
    const bar = document.createElement('div');
    bar.className = 'sb-error-banner';
    bar.setAttribute('role', 'alert');
    bar.append('Something went wrong. ');
    const reload = document.createElement('button');
    reload.type = 'button';
    reload.textContent = 'Reload';
    reload.addEventListener('click', () => window.location.reload());
    bar.append(reload);
    document.body.appendChild(bar);
  };
  window.addEventListener('error', (e) => report('uncaught error', e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) =>
    report('unhandled promise rejection', e.reason),
  );
}
