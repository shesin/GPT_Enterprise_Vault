import fs from 'fs';
import path from 'path';

const indexHtml = fs.readFileSync(
  path.resolve(__dirname, '../../../../../../index.html'),
  'utf8',
);

describe('play hub shell (index.html)', () => {
  it('shows compact left sidebar with community and tournaments', () => {
    expect(indexHtml).toContain('id="play-hub"');
    expect(indexHtml).toContain('class="hub-sidebar"');
    expect(indexHtml).toContain('<em>Strategic as Chess.');
    expect(indexHtml).toContain('data-hub-nav="Community"');
    expect(indexHtml).toContain('data-hub-nav="Tournaments"');
    expect(indexHtml).toContain('id="hub-board-grid"');
    expect(indexHtml).toContain('id="hub-tutorial-card"');
    expect(indexHtml).toContain('class="hub-ad-bottom"');
    expect(indexHtml).toContain('id="play-shell"');
    expect(indexHtml).toContain('is-hidden');
  });
});
