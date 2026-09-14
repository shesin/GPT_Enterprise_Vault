/**
 * Process regression guards — cross-surface sync, WHEN/timing rules, live UI ownership.
 * Source-level checks complement behaviour tests in FeatureSession.turnControl.
 */
import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../../../../../');
const playControllerSource = fs.readFileSync(
  path.resolve(__dirname, '../PlayController.ts'),
  'utf8',
);
const featureSessionSource = fs.readFileSync(
  path.resolve(__dirname, '../feature/FeatureSession.ts'),
  'utf8',
);
const coachVideoBoardSource = fs.readFileSync(
  path.resolve(__dirname, '../feature/coachVideoBoard.ts'),
  'utf8',
);
const m2GateSource = fs.readFileSync(
  path.resolve(__dirname, '../../../../scripts/m2-2step-npm-gate.mjs'),
  'utf8',
);
const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const playBoardHtml = fs.readFileSync(path.join(repoRoot, 'play-board.html'), 'utf8');
const canvasRendererSource = fs.readFileSync(
  path.resolve(__dirname, '../render/CanvasBoardRenderer.ts'),
  'utf8',
);
const playHubSource = fs.readFileSync(
  path.resolve(__dirname, '../PlayHub.ts'),
  'utf8',
);
const playShellThemesSource = fs.readFileSync(
  path.resolve(__dirname, '../layout/playShellThemes.ts'),
  'utf8',
);
const playShellCss = fs.readFileSync(
  path.resolve(__dirname, '../play-shell.css'),
  'utf8',
);
const gameFeatureSettingsSource = fs.readFileSync(
  path.resolve(__dirname, '../feature/GameFeatureSettings.ts'),
  'utf8',
);

function afterTurnCompletedBlock(): string {
  const start = featureSessionSource.indexOf('private afterTurnCompleted');
  expect(start).toBeGreaterThan(-1);
  const next = featureSessionSource.indexOf('\n  private ', start + 1);
  return featureSessionSource.slice(start, next > start ? next : undefined);
}

describe('process regression guards', () => {
  describe('cross-surface — live controls vs coach cleanup', () => {
    it('Finish capture lives in controls row after Resign in both HTML shells', () => {
      for (const html of [indexHtml, playBoardHtml]) {
        expect(html).toContain('id="finish-btn"');
        expect(html).toContain('Finish capture');
        expect(html).toMatch(/id="resign-btn"[\s\S]*id="finish-btn"/);
        expect(html).not.toContain('finish-capture-bar');
        expect(html).toMatch(/id="finish-btn"[^>]*hidden/);
      }
    });

    it('shows Finish capture after syncModeUi (not cleared by stopCoachVideo on every tick)', () => {
      expect(playControllerSource).toMatch(/syncModeUi\(\)/);
      expect(playControllerSource).toMatch(/finishBtn\.hidden = !showFinishCapture/);
      const syncModeIdx = playControllerSource.indexOf('syncModeUi();');
      const finishIdx = playControllerSource.indexOf('finishBtn.hidden = !showFinishCapture');
      expect(syncModeIdx).toBeGreaterThan(-1);
      expect(finishIdx).toBeGreaterThan(syncModeIdx);
    });

    it('stopCoachVideo does not hide Finish capture (updateUI owns visibility)', () => {
      expect(playControllerSource).not.toMatch(
        /stopCoachVideo[\s\S]*finishBtn\.classList\.remove\('visible'/,
      );
      expect(playControllerSource).not.toMatch(/stopCoachVideo[\s\S]*finishCaptureBar/);
      expect(playControllerSource).toMatch(
        /if \(coachVideoPlayer !== null\) \{\s*stopCoachVideo\(\)/,
      );
    });

    it('live chain visibility does not require coach mode', () => {
      expect(playControllerSource).toMatch(
        /const chainOpen = session\.getEngine\(\)\.getChainPieceId\(\) !== null/,
      );
      expect(playControllerSource).toMatch(/coachFinishDemo[\s\S]*\|\|[\s\S]*chainOpen/);
    });
  });

  describe('WHEN rule — turn-start flash every turn (idle until pick)', () => {
    it('documents turn-start WHEN in DECISIONS and re-arms after each completed turn', () => {
      const decisionsSource = fs.readFileSync(
        path.resolve(__dirname, '../../../../GPT_PROJECT_DECISIONS_05P.md'),
        'utf8',
      );
      expect(decisionsSource).toMatch(/Re-arms.*only on.*New game/i);
      expect(featureSessionSource).toMatch(/GPT_PROJECT_DECISIONS_05P\.md §7/);
    });

    it('does not re-arm turnStartRingsPending after a completed turn', () => {
      const block = afterTurnCompletedBlock();
      expect(block).not.toMatch(/turnStartRingsPending\s*=\s*true/);
    });

    it('sets turnStartRingsPending true at init and reset only', () => {
      const matches = [...featureSessionSource.matchAll(/turnStartRingsPending\s*=\s*true/g)];
      expect(matches.length).toBe(2);
      expect(featureSessionSource).toMatch(/private turnStartRingsPending = true/);
      expect(featureSessionSource).toMatch(/reset\(\)[\s\S]*turnStartRingsPending = true/);
    });

    it('deselect path clears selection without re-arming turnStartRingsPending', () => {
      const armBlock = featureSessionSource.slice(
        featureSessionSource.indexOf('private armSelection'),
        featureSessionSource.indexOf('canHumanAct():'),
      );
      expect(armBlock).toMatch(/if \(!hasMoves\)/);
      expect(armBlock).not.toMatch(/turnStartRingsPending\s*=\s*true/);
    });

    it('browser snapshot exposes turnStartRingsPending for live gates', () => {
      expect(playControllerSource).toMatch(/turnStartRingsPending:\s*session\.shouldShowTurnStartRings\(\)/);
    });

    it('captures human ply snap at applyMove before AI (browser gate)', () => {
      expect(playControllerSource).toMatch(/captureHumanPlySnapForGate\(player\)/);
      expect(playControllerSource).toMatch(/lastHumanPlySnap = buildLiveSnap\(\)/);
    });
  });

  describe('coach vs live — move hints use previewScriptedSelection', () => {
    it('coach video board applies highlights via previewScriptedSelection', () => {
      expect(coachVideoBoardSource).toMatch(/session\.previewScriptedSelection\(highlight\.selectedId\)/);
      expect(coachVideoBoardSource).not.toMatch(/setCoachBoardFocus/);
    });

    it('setCoachDemoSelection delegates to previewScriptedSelection', () => {
      expect(featureSessionSource).toMatch(
        /setCoachDemoSelection[\s\S]*return this\.previewScriptedSelection\(nodeId\)/,
      );
    });

    it('coach resign boardFocus uses previewScriptedSelection (not setCoachBoardFocus)', () => {
      expect(playControllerSource).toMatch(
        /cue\.kind === 'boardFocus'[\s\S]*session\.previewScriptedSelection\(cue\.selectedId\)/,
      );
      expect(playControllerSource).not.toMatch(
        /cue\.kind === 'boardFocus'[\s\S]*setCoachBoardFocus/,
      );
    });

    it('coach win keyframe uses previewScriptedSelection (not setCoachWinGlow)', () => {
      expect(coachVideoBoardSource).not.toMatch(/setCoachWinGlow/);
      expect(coachVideoBoardSource).toMatch(/previewScriptedSelection\(glow\[0\]\)/);
    });
  });

  describe('board canvas — fixed cream half tint', () => {
    it('uses drawCreamHalfTint every frame, not turn-based drawTurnWash', () => {
      expect(canvasRendererSource).toMatch(/function drawCreamHalfTint/);
      expect(canvasRendererSource).toMatch(/drawCreamHalfTint\(ctx, w, h,/);
      expect(canvasRendererSource).not.toMatch(/function drawTurnWash/);
      expect(canvasRendererSource).not.toMatch(/rgba\(40,90,160/);
    });
  });

  describe('Watch AI vs AI launch defaults', () => {
    it('locks End-Game, 2 min timer, Expert vs Expert on hub spectate entry', () => {
      expect(playControllerSource).toMatch(/function applySpectateDefaultsToUi/);
      expect(playControllerSource).toMatch(/SPECTATE_WATCH_DEFAULTS/);
      expect(playControllerSource).toMatch(/if \(action === 'spectate'\)[\s\S]*applySpectateDefaultsToUi\(boardId\)/);
      expect(gameFeatureSettingsSource).toMatch(/SPECTATE_WATCH_DEFAULTS/);
      expect(gameFeatureSettingsSource).toMatch(/centerRule: 'endgame'/);
      expect(gameFeatureSettingsSource).toMatch(/timer: '2'/);
      expect(gameFeatureSettingsSource).toMatch(/coachBlueLevel: 3/);
    });
  });

  describe('move hint aura — off, original, and gold-fill preview', () => {
    it('board settings toggle and renderer support all presets', () => {
      expect(indexHtml).toContain('id="move-hint-aura-select"');
      expect(indexHtml).toContain('value="off"');
      expect(indexHtml).toContain('value="original"');
      expect(indexHtml).toContain('value="gold-fill"');
      expect(indexHtml).not.toContain('value="white-gold"');
      expect(indexHtml).not.toContain('value="gold-no-fill"');
      expect(playControllerSource).toMatch(/initMoveHintAuraSetting/);
      expect(playControllerSource).toMatch(/moveHintAura: readMoveHintAuraFromUi\(\)/);
      expect(canvasRendererSource).toMatch(/drawGoldFillMoveHintAura/);
      expect(canvasRendererSource).toMatch(/drawOriginalMoveHintAura/);
    });
  });

  describe('play theme — three look rows (dark-charcoal, light-charcoal, dark-same)', () => {
    it('swatch UI, storage split, unified complete colours', () => {
      expect(playShellThemesSource).toMatch(/function applyPlayLookFromRow/);
      expect(playShellThemesSource).toMatch(/function applyPlayLookState/);
      expect(playShellThemesSource).toMatch(/LOVABLE_LIGHT_BOARD_THEMES/);
      expect(playShellThemesSource).toMatch(/isLightBoardLookId/);
      expect(playHubSource).toMatch(/applyPlayLookState/);
      expect(playControllerSource).toMatch(/applyPlayLookFromRow/);
      expect(playControllerSource).toMatch(/resolvePlayLookRow/);
      expect(playControllerSource).toMatch(/play-theme-swatch/);
      expect(indexHtml).toContain('id="play-theme-setting"');
      expect(indexHtml).toContain('play-theme-swatches--dark-charcoal');
      expect(indexHtml).toContain('play-theme-swatches--light-charcoal');
      expect(indexHtml).toContain('play-theme-swatches--dark-same');
      expect(indexHtml).toContain('data-play-theme="4"');
      expect(indexHtml).toContain('data-play-theme="10"');
      expect(indexHtml).toContain('data-play-theme="12"');
      expect(indexHtml).toContain('Warm Walnut');
      expect(indexHtml).not.toContain('Desert Clay');
      expect(indexHtml).not.toContain('Cream Ivory');
      expect(indexHtml).not.toContain('Warm Cream');
      expect(indexHtml).not.toContain('play-theme-swatches--side');
      expect(indexHtml).not.toContain('data-play-theme="7"');
      expect(playControllerSource).toMatch(/function syncPlayShellThemeFromStorage/);
      expect(playControllerSource).toMatch(/enterFromHub[\s\S]*syncPlayShellThemeFromStorage\(\)/);
      expect(playShellThemesSource).toMatch(/frameOuter: t\.frameOuter/);
      expect(playControllerSource).toMatch(/initBeadSetSetting/);
      expect(indexHtml).toContain('id="bead-set-select"');
      expect(canvasRendererSource).toMatch(/getActiveBoardLookTheme/);
    });
  });

  describe('below-board New game — reset not hub', () => {
    it('restart button starts a new match (same as Play again), not returnToHub', () => {
      expect(playControllerSource).toMatch(/restartBtn\.addEventListener\('click'/);
      const restartHandler = playControllerSource.match(
        /restartBtn\.addEventListener\('click', \(\) => \{([\s\S]*?)\}\);/,
      )?.[1] ?? '';
      expect(restartHandler).toMatch(/resetGame\(\)/);
      expect(restartHandler).not.toMatch(/returnToHub\(\)/);
    });

    it('both HTML shells style New game like resign gold without red border hook', () => {
      for (const html of [indexHtml, playBoardHtml]) {
        expect(html).toMatch(/id="restart-btn"[^>]*type="button"/);
        expect(html).toContain('class="new-game-new">New</span> game');
      }
      expect(playShellCss).toMatch(/#restart-btn[\s\S]*border: 2px solid var\(--gold\)/);
      expect(playShellCss).toMatch(/\.new-game-new[\s\S]*color: #000/);
      expect(playShellCss).not.toMatch(/\.new-game-new[\s\S]*font-weight:\s*800/);
    });
  });

  describe('result modal — dismiss keeps final board', () => {
    it('both HTML shells expose view-board control (no separate close X)', () => {
      for (const html of [indexHtml, playBoardHtml]) {
        expect(html).toContain('id="result-view-board-btn"');
        expect(html).not.toContain('id="result-close-btn"');
      }
    });

    it('updateUI does not re-show modal after user dismisses at game over', () => {
      expect(playControllerSource).toContain('let resultModalDismissed = false');
      expect(playControllerSource).toMatch(/resultModalDismissed = true/);
      expect(playControllerSource).toMatch(/if \(!resultModalDismissed\)/);
      expect(playControllerSource).toMatch(/resultModalDismissed = false/);
    });
  });

  describe('browser gates — turn colour + Finish capture', () => {
    it('npm test chains capture-geometry gate (Finish capture mid-chain)', () => {
      expect(m2GateSource).toMatch(/m2-capture-geometry-browser\.mjs/);
    });

    it('two-click observe gate records match-start ring lifecycle', () => {
      const observeSource = fs.readFileSync(
        path.resolve(__dirname, '../../../../scripts/m2-2step-observe.mjs'),
        'utf8',
      );
      expect(observeSource).toMatch(/turnStartRingsPending/);
      expect(observeSource).toMatch(/match-start rings pending after game start/);
      expect(observeSource).toMatch(/match-start rings clear after first select/);
      expect(observeSource).toMatch(/deselect or re-select: match-start rings do not return/);
    });
  });
});
