import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(
  path.resolve(__dirname, '../play-shell.css'),
  'utf8',
);

describe('viewport fit CSS contract', () => {
  it('sizes board on .shell with height-first and horizontal budget', () => {
    expect(css).toContain('--board-area-h: calc(100dvh - var(--body-pad-v) - var(--stack-chrome))');
    expect(css).toContain('--board-area-w: max(160px, calc(100vw - var(--side-columns-width) - var(--shell-gutter-h)))');
    expect(css).toContain('--frame-h: min(');
    expect(css).toContain('calc(var(--board-area-w) / var(--board-aspect))');
    expect(css).toContain('--frame-w: min(var(--board-area-w), calc(var(--frame-h) * var(--board-aspect)))');
    expect(css).toContain('.shell.shell--board-16');
    expect(css).toContain('--board-frame-max-h: 860px');
    expect(css).toContain('flex-wrap: nowrap');
    expect(css).toContain('--stack-chrome: calc(var(--controls-h) + var(--main-gap))');
    expect(css).toContain('height: var(--frame-h)');
    expect(css).toContain('.play-panel');
  });
});
