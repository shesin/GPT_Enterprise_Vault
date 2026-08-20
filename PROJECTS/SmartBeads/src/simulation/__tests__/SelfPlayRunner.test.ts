import { readFileSync } from 'node:fs';
import { generateBatchReport, playSingleGame, runSelfPlayBatch } from '../SelfPlayRunner';

describe('SelfPlayRunner', () => {
  it('is Board4 random legal moves — not production PvE (no HonestAi / FeatureSession / runAiTurn)', () => {
    const src = readFileSync(require.resolve('../SelfPlayRunner.ts'), 'utf8');
    expect(src).not.toMatch(/HonestAi/);
    expect(src).not.toMatch(/FeatureSession/);
    expect(src).not.toMatch(/runAiTurn/);
    expect(src).toMatch(/executeAiRandomMove/);
  });

  it('executes a single game of Board4 to completion with RED starting', () => {
    const result = playSingleGame('4', 'RED');

    expect(result.startingPlayer).toBe('RED');
    expect(['RED', 'BLUE', 'DRAW']).toContain(result.winner);
    expect(result.totalPlies).toBeGreaterThan(0);
    expect(result.totalPlies).toBeLessThanOrEqual(40);
    expect(result.redRemainingPieces).toBeGreaterThanOrEqual(0);
    expect(result.blueRemainingPieces).toBeGreaterThanOrEqual(0);
    expect(result.redCaptures).toBeGreaterThanOrEqual(0);
    expect(result.blueCaptures).toBeGreaterThanOrEqual(0);
    expect(['Capture victory', 'No legal moves', 'Ply limit']).toContain(result.terminationReason);
  });

  it('executes a single game of Board4 to completion with BLUE starting', () => {
    const result = playSingleGame('4', 'BLUE');

    expect(result.startingPlayer).toBe('BLUE');
    expect(['RED', 'BLUE', 'DRAW']).toContain(result.winner);
    expect(result.totalPlies).toBeGreaterThan(0);
    expect(result.totalPlies).toBeLessThanOrEqual(40);
  });

  it('alternates starting player across a batch of games', () => {
    const results = runSelfPlayBatch('4', 10);

    expect(results).toHaveLength(10);
    expect(results[0].startingPlayer).toBe('RED');
    expect(results[1].startingPlayer).toBe('BLUE');
    expect(results[2].startingPlayer).toBe('RED');
    expect(results[3].startingPlayer).toBe('BLUE');
  });

  it('generates a machine-readable JSON batch report with all required metrics', () => {
    const report = generateBatchReport('4', 100);

    expect(report.variant).toBe('4');
    expect(report.totalGamesPlayed).toBe(100);
    expect(report.redWins + report.blueWins + report.draws).toBe(100);
    expect(report.averageGameLength).toBeGreaterThan(0);
    expect(report.averageGameLength).toBeLessThanOrEqual(40);
    expect(report.minGameLength).toBeGreaterThan(0);
    expect(report.maxGameLength).toBeLessThanOrEqual(40);
    expect(report.averageCapturesPerGame).toBeGreaterThanOrEqual(0);
    expect(
      report.gamesEndingByNoLegalMoves +
        report.gamesEndingByPlyLimit +
        report.gamesEndingByCaptureVictory,
    ).toBe(100);
    expect(typeof report.timestamp).toBe('string');
  });
});
