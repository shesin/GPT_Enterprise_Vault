/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/PROJECTS/SmartBeads'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  /** One worker — parallel runs thrash CPU on HonestAi depth-2 (Windows). */
  maxWorkers: 1,
  /** Fast tests fail at 30s; slow HonestAi batches override via runner --testTimeout. */
  testTimeout: 30_000,
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
      },
    ],
  },
};
