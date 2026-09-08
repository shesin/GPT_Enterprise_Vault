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
const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const playBoardHtml = fs.readFileSync(path.join(repoRoot, 'play-board.html'), 'utf8');

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

  describe('WHEN rule — match-start flash only (not every turn)', () => {
    it('documents match-start-only on turnStartRingsPending', () => {
      expect(featureSessionSource).toMatch(
        /True only at match start[\s\S]*never again until reset/,
      );
    });

    it('does not re-arm turnStartRingsPending after a completed turn', () => {
      const block = afterTurnCompletedBlock();
      expect(block).not.toMatch(/turnStartRingsPending\s*=\s*true/);
    });

    it('only sets turnStartRingsPending true at init and reset', () => {
      const matches = [...featureSessionSource.matchAll(/turnStartRingsPending\s*=\s*true/g)];
      expect(matches.length).toBe(2);
      expect(featureSessionSource).toMatch(/private turnStartRingsPending = true/);
      expect(featureSessionSource).toMatch(/reset\(\)[\s\S]*turnStartRingsPending = true/);
    });
  });
});
