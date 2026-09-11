import fs from 'fs';

import path from 'path';



const indexHtml = fs.readFileSync(

  path.resolve(__dirname, '../../../../../../index.html'),

  'utf8',

);



describe('two-page play flow (index.html)', () => {

  it('page 1 hub has chess.com-style layout; page 2 play shell hidden until launch', () => {

    expect(indexHtml).toContain('id="play-hub"');
    expect(indexHtml).toContain('data-hub-theme="1"');
    expect(indexHtml).toContain('hub-theme-swatch');

    expect(indexHtml).toContain('hub-rail--left');

    expect(indexHtml).toContain('hub-rail--right');

    expect(indexHtml).toContain('data-hub-nav="community"');

    expect(indexHtml).toContain('data-hub-nav="tournaments"');

    expect(indexHtml).not.toContain('data-hub-nav="coach"');

    expect(indexHtml).toContain('id="hub-rail-notice"');

    expect(indexHtml).toContain('Player reviews coming soon');

    expect(indexHtml).toContain('id="hub-board-grid"');

    expect(indexHtml).toContain('id="hub-board-select"');

    expect(indexHtml).toContain('Choose your board');

    expect(indexHtml).toContain('How to play');

    expect(indexHtml).toContain('id="hub-lesson-basic"');

    expect(indexHtml).toContain('id="hub-lesson-advanced"');

    expect(indexHtml).toContain("Who's playing");

    expect(indexHtml).toContain('id="hub-mode-grid"');

    expect(indexHtml).toContain('id="hub-mode-select"');

    expect(indexHtml).toContain('id="hub-mode-help-btn"');

    expect(indexHtml).toContain('Play vs AI');

    expect(indexHtml).toContain('Play with a Friend (Same Device)');

    expect(indexHtml).toContain('Play with a Friend (Online)');

    expect(indexHtml).toContain('hub-mode-help-text');

    expect(indexHtml).toContain('Watch AI vs AI — Two AIs play');

    expect(indexHtml).not.toContain('id="hub-start-btn"');

    expect(indexHtml).not.toContain('id="hub-coach-btn"');

    expect(indexHtml).toContain('Smart Bead Chess');

    expect(indexHtml).toContain('id="play-shell"');

    expect(indexHtml).toMatch(/id="play-shell"[^>]*is-hidden|is-hidden[^>]*id="play-shell"/);

    expect(indexHtml).not.toContain('id="start-board-select"');

    expect(indexHtml).toMatch(/id="board-select" hidden/);
    expect(indexHtml).not.toMatch(
      /<aside class="card right">[\s\S]*<label>Board<\/label>/,
    );

    expect(indexHtml).toContain('id="coach-panel"');

    expect(indexHtml).toContain('hub-ad-bottom');

    expect(indexHtml).toContain('hub-ad-side');

  });

});

