import fs from 'fs';
import path from 'path';

const indexHtml = fs.readFileSync(
  path.resolve(__dirname, '../../../../../../index.html'),
  'utf8',
);

describe('play hub shell (index.html)', () => {
  it('shows sidebar Coach link and prominent coach card above boards', () => {
    expect(indexHtml).toContain('id="play-hub"');
    expect(indexHtml).toContain('data-hub-nav="coach"');
    expect(indexHtml).toContain('id="hub-coach-card"');
    expect(indexHtml).toContain('id="hub-board-grid"');
    expect(indexHtml).toContain('id="coach-panel"');
    expect(indexHtml).toContain('id="play-shell"');
  });
});
