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
    expect(indexHtml).toContain('id="resign-btn"');
    expect(indexHtml).toContain('resign-action--draw');
    expect(indexHtml).toContain('resign-action--claim');
    expect(indexHtml).toContain('aria-label="Agree to draw"');
    expect(indexHtml).not.toContain('id="resign-agree-btn">Agree to draw</button>');
    expect(indexHtml).toContain('id="sfx-mute-btn"');
    expect(indexHtml).not.toContain('controls-pair');
  });

  it('start screen offers Coach vs AI and settings has Coach level below AI level', () => {
    expect(indexHtml).toContain('value="spectate">Coach vs AI');
    expect(indexHtml).toContain('id="coach-level-select"');
    expect(indexHtml).toContain('>Coach level</label>');
    expect(indexHtml).toContain('id="coach-level-setting"');
    expect(indexHtml).not.toContain('coach-red-ai-select');
    expect(indexHtml).not.toContain('coach-blue-ai-select');
  });
});
