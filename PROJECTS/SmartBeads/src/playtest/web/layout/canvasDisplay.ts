/** Size the board frame to the canvas bitmap aspect — same approach as prototype HTML. */

export function fitCanvasToFrame(canvas: HTMLCanvasElement): void {
  const frame = canvas.parentElement as HTMLElement | null;
  if (!frame || canvas.width <= 0 || canvas.height <= 0) return;

  const aspect = canvas.width / canvas.height;
  frame.style.setProperty('--board-aspect', String(aspect));
  canvas.style.width = '100%';
  canvas.style.height = '100%';
}

export function installCanvasResizeObserver(canvas: HTMLCanvasElement, onResize: () => void): () => void {
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}
