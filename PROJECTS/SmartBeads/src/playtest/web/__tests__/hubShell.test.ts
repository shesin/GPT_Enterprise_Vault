import fs from 'fs';

import path from 'path';

const indexHtml = fs.readFileSync(
  path.resolve(__dirname, '../../../../../../index.html'),
  'utf8',
);

describe('two-page play flow (index.html)', () => {
  it('page 1 hub has chess.com-style layout; page 2 play shell hidden until launch', () => {
    expect(indexHtml).toContain('id="play-hub"');
    expect(indexHtml).toMatch(/id="play-hub"[^>]*data-play-board-look="1"/);
    expect(indexHtml).toMatch(/id="play-hub"[^>]*data-play-side-look="1"/);
    expect(indexHtml).toMatch(/id="play-hub"[^>]*data-play-theme="1"/);
    expect(indexHtml).toMatch(/id="play-hub"[^>]*data-play-board-match="matched"/);
    expect(indexHtml).not.toContain('id="play-theme-setting"');
    expect(indexHtml).toContain('Dark theme');
    expect(indexHtml).toContain('Light theme');
    expect(indexHtml).not.toContain('play-theme-swatches--dark-charcoal');
    expect(indexHtml).toContain('play-theme-swatches--light-charcoal');
    expect(indexHtml).toContain('play-theme-swatches--dark-same');
    expect(indexHtml).toContain('data-play-theme="4"');
    expect(indexHtml).not.toContain('play-theme-swatches--side');
    expect(indexHtml).not.toContain('data-play-theme="7"');
    expect(indexHtml).toContain('id="hub-play-theme-setting"');
    expect(indexHtml).toContain('id="hub-section-look"');
    expect(indexHtml).toContain('Choose your look');
    expect(indexHtml).not.toContain('name="play-board-match"');
    expect(indexHtml).toContain('hub-brand-block');
    expect(indexHtml).toContain('hub-sidebar-link--active');
    expect(indexHtml).not.toContain('data-hub-theme=');

    expect(indexHtml).toContain('hub-rail--left');
    expect(indexHtml).toContain('hub-rail--right');
    expect(indexHtml).toContain('data-hub-nav="community"');

    expect(indexHtml).toContain('id="play-shell"');
    expect(indexHtml).toContain('class="shell shell--ads-on is-hidden"');
  });
});
