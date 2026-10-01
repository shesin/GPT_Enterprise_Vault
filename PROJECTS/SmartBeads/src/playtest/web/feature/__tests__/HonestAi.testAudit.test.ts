/**
 * Source guards for the AI search contract: no time limit that could weaken a move, and tests that
 * touch 16-bead keep their enumeration bounded.
 */
import fs from 'fs';
import path from 'path';

const featureTestsDir = path.resolve(__dirname);
const webTestsDir = path.resolve(__dirname, '../../__tests__');
const featureDir = path.resolve(__dirname, '..');
const honestAiTestPath = path.join(featureTestsDir, 'HonestAi.test.ts');

function readTestSource(name: string, dir = featureTestsDir): string {
  return fs.readFileSync(path.join(dir, name), 'utf8');
}

describe('HonestAi test audit', () => {
  it('HonestAi.ts has no time limit (no clock, no budget, no retry window)', () => {
    const src = fs.readFileSync(path.join(featureDir, 'HonestAi.ts'), 'utf8');
    expect(src).not.toMatch(/Date\.now|performance\.now|budgetMs|deadlineMs|thinkBudget/);
  });

  it('HonestAi.test.ts bounds generateTurnEnds on 16-bead', () => {
    const src = fs.readFileSync(honestAiTestPath, 'utf8');
    expect(src).not.toMatch(/selectAiTurnPath\(\s*'16',\s*2/);
    expect(src).toMatch(/selectAiTurnPath\(\s*'6x3x5'/);
    expect(src).toMatch(/generateTurnEnds[\s\S]*,\s*32,/);
  });

  it('fast-path AI tests use deterministic options when calling level 2 on 16-bead', () => {
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
