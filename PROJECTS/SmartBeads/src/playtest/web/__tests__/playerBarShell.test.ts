import fs from 'fs';
import path from 'path';

const indexHtml = fs.readFileSync(
  path.resolve(__dirname, '../../../../../../index.html'),
  'utf8',
);

describe('production left play panel shell (index.html)', () => {
  it('uses left panel with shot rings and match mm:ss, no board player bars', () => {
    expect(indexHtml).toContain('class="card left"');
    expect(indexHtml).toContain('id="play-block-p1"');
    expect(indexHtml).toContain('id="play-block-p2"');
    expect(indexHtml).toContain('id="top-match-mmss"');
    expect(indexHtml).toContain('id="start-mode-select"');
    expect(indexHtml).toContain('id="shot-ring-p1"');
    expect(indexHtml).toContain('id="shot-ring-p2"');
    expect(indexHtml).not.toContain('class="player-bar"');
    expect(indexHtml).not.toContain('class="board-stack"');
    expect(indexHtml).not.toContain('timer-match-display');
    expect(indexHtml).not.toContain('id="game-mode-select"');
    expect(indexHtml).toContain('id="start-mode-select"');
    expect(indexHtml).toContain('>AI level</label>');
    expect(indexHtml).toContain('id="ai-level-select"');
    expect(indexHtml).not.toContain('Super Expert');
    expect(indexHtml).toContain('id="coach-red-ai-select"');
    expect(indexHtml).toContain('id="coach-blue-ai-select"');
    expect(indexHtml).toContain('id="resign-btn"');
    expect(indexHtml).toContain('id="sfx-mute-btn"');
    expect(indexHtml).not.toContain('controls-pair');
  });

  it('coach AI selects use AI level labels below each side', () => {
    expect(indexHtml).toContain('class="coach-ai-level-label"');
    expect(indexHtml).toContain('for="coach-red-ai-select">AI level');
    expect(indexHtml).toContain('for="coach-blue-ai-select">AI level');
  });
});
