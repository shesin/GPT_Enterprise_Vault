import fs from 'fs';
import path from 'path';

const indexHtml = fs.readFileSync(
  path.resolve(__dirname, '../../../../../../index.html'),
  'utf8',
);
const playShellCss = fs.readFileSync(
  path.resolve(__dirname, '../play-shell.css'),
  'utf8',
);
const playControllerSource = fs.readFileSync(
  path.resolve(__dirname, '../PlayController.ts'),
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

  it('left panels stay fixed: upper black side, lower cream/green side (no turn swap)', () => {
    expect(indexHtml).toMatch(/id="play-block-p2"[^>]*play-block-ai|play-block-ai[^>]*id="play-block-p2"/);
    expect(indexHtml).toMatch(/id="play-block-p1"[^>]*play-block-human|play-block-human[^>]*id="play-block-p1"/);
    expect(playShellCss).toMatch(/\.play-block-ai[\s\S]*--black-bead|var\(--black-bead\)/);
    expect(playShellCss).toMatch(/\.play-block-human[\s\S]*var\(--play-human-accent\)/);
    expect(playShellCss).toMatch(/--play-human-accent:\s*var\(--gold\)/);
    expect(playShellCss).not.toContain('.play-block.active');
    expect(playControllerSource).not.toMatch(/play-block-p1[\s\S]*classList\.toggle\(\s*'active'/);
    expect(playControllerSource).not.toMatch(/play-block-p2[\s\S]*classList\.toggle\(\s*'active'/);
  });

  it('board settings offers only the off/on move hint aura toggle (2026-09-21)', () => {
    expect(indexHtml).toContain('id="move-hint-aura-setting"');
    expect(indexHtml).toContain('id="move-hint-aura-select"');
    expect(indexHtml).toContain('value="off"');
    expect(indexHtml).toContain('value="on"');
    expect(indexHtml).not.toContain('Original (orange / lime)');
    expect(indexHtml).not.toContain('White / gold (fill)');
    expect(indexHtml).not.toContain('Gold (no fill)');
  });

  it('board settings has no bead set picker (fully automatic per board, 2026-09-21) and drops Look preview (2026-09-19 — hub-only now)', () => {
    expect(indexHtml).not.toContain('id="bead-set-select"');
    expect(indexHtml).not.toContain('id="bead-set-setting"');
    // Look preview (3 rows: dark/light/matched) lives on the hub (page 1) only —
    // it was locked-and-redundant clutter on page 2 since selection already
    // happened before the player got here. The class names still exist in the
    // file (hub's own copy), so only the page-2-specific id/label are checked.
    expect(indexHtml).not.toContain('id="play-theme-setting"');
    expect(indexHtml).not.toContain('id="play-theme-swatches-dark-charcoal"');
    expect(indexHtml).not.toContain('>Look preview<');
    expect(indexHtml).not.toContain('play-theme-swatches--side');
    expect(indexHtml).not.toContain('data-play-theme="7"');
    expect(indexHtml).toContain('id="hub-play-theme-setting"');
    expect(indexHtml).toContain('Choose your look');
    expect(indexHtml).toContain('Warm Walnut');
    expect(indexHtml).not.toContain('Desert Clay');
    expect(indexHtml).not.toContain('Cream Ivory');
    expect(indexHtml).not.toContain('Warm Cream');
    expect(indexHtml).toMatch(/id="play-shell"[^>]*data-play-board-look="1"/);
    expect(indexHtml).toMatch(/id="play-shell"[^>]*data-play-side-look="1"/);
    expect(indexHtml).toMatch(/id="play-shell"[^>]*data-play-theme="1"/);
    expect(indexHtml).toMatch(/id="play-shell"[^>]*data-play-board-match="matched"/);
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

  it('result modal can close so final board stays visible', () => {
    expect(indexHtml).toContain('id="result-view-board-btn"');
    expect(indexHtml).not.toContain('id="result-close-btn"');
    expect(playControllerSource).toContain('resultModalDismissed');
    expect(playControllerSource).toMatch(/function dismissResultModal\(\)/);
    expect(playControllerSource).toMatch(/if \(!resultModalDismissed\)/);
  });
});
