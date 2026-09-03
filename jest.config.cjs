/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/PROJECTS/SmartBeads'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  /** One worker — parallel runs thrash CPU on HonestAi depth-2 (Windows). */
  maxWorkers: 1,
  /** Expert depth-2 search per board can use ~45s budget. */
  testTimeout: 120_000,
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
      },
    ],
  },
};
