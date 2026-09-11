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
    expect(indexHtml).toContain('id="timer-mmss-p1"');
    expect(indexHtml).toContain('id="timer-mmss-p2"');
    expect(indexHtml).not.toContain('id="top-timer-mmss"');
    expect(indexHtml).toContain('id="timer-select"');
    expect(indexHtml).toContain('id="tournament-timer-select"');
    expect(indexHtml).not.toContain('id="start-mode-select"');
    expect(indexHtml).toContain('id="hub-mode-select"');
    expect(indexHtml).toContain('id="shot-ring-p1"');
    expect(indexHtml).toContain('id="shot-ring-p2"');
    expect(indexHtml).not.toContain('class="player-bar"');
    expect(indexHtml).not.toContain('class="board-stack"');
    expect(indexHtml).not.toContain('timer-match-display');
    expect(indexHtml).not.toContain('id="game-mode-select"');
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

  it('hub offers Watch AI and board settings has Watch AI level below AI level', () => {
    expect(indexHtml).toMatch(/value="spectate"[^>]*>Watch AI vs AI|Watch AI vs AI[^<]*<\/option>/);
    expect(indexHtml).toContain('id="hub-mode-select"');
    expect(indexHtml).toContain('id="coach-level-select"');
    expect(indexHtml).toContain('>Watch AI level</label>');
    expect(indexHtml).toContain('id="coach-level-setting"');
    expect(indexHtml).not.toContain('coach-red-ai-select');
    expect(indexHtml).not.toContain('coach-blue-ai-select');
  });
});
