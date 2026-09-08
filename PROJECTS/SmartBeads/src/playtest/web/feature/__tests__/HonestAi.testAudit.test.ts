/**
 * Guards against HonestAi tests that enumerate the full 16-bead tree without a deadline.
 */
import fs from 'fs';
import path from 'path';

const featureTestsDir = path.resolve(__dirname);
const webTestsDir = path.resolve(__dirname, '../../__tests__');
const honestAiTestPath = path.join(featureTestsDir, 'HonestAi.test.ts');

function readTestSource(name: string, dir = featureTestsDir): string {
  return fs.readFileSync(path.join(dir, name), 'utf8');
}

describe('HonestAi test audit', () => {
  it('HonestAi.test.ts bounds generateTurnEnds on 16-bead', () => {
    const src = fs.readFileSync(honestAiTestPath, 'utf8');
    expect(src).toMatch(/generateTurnEnds[\s\S]*(Date\.now\(\)\s*\+\s*\d|honestAiTurnEndsDeadlineMs)/);
    expect(src).not.toMatch(/selectAiTurnPath\(\s*'16',\s*2/);
    expect(src).toMatch(/selectAiTurnPath\(\s*'6x3x5'/);
  });

  it('HonestAi.test.ts uses a finite branch cap on 16-bead generateTurnEnds', () => {
    const src = fs.readFileSync(honestAiTestPath, 'utf8');
    expect(src).toMatch(/generateTurnEnds[\s\S]*,\s*32,/);
  });

  it('difficultyTiers generateTurnEnds calls pass a deadline', () => {
    const src = readTestSource('HonestAi.difficultyTiers.test.ts');
    expect(src).toMatch(/generateTurnEnds\([^)]*Date\.now\(\)/);
  });

  it('fast-path AI tests use bounded budgets when calling level 2 on 16-bead', () => {
    const bounded = [
      { file: 'aiTurnPath.test.ts', dir: featureTestsDir },
      { file: 'FeatureSession.firstMove.test.ts', dir: featureTestsDir },
      { file: 'PlayController.test.ts', dir: webTestsDir },
    ];
    for (const { file, dir } of bounded) {
      const src = readTestSource(file, dir);
      expect(src).toMatch(/honestAiTestOpts/);
      expect(src).not.toMatch(/selectAiTurnPath\(\s*'16',\s*2,\s*[^)]+\)\s*;/);
    }
  });
});
