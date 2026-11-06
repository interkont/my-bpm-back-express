// Proyectos de Jest (research R-05, R-08). ts-jest solo transpila: el chequeo de tipos lo hace `npm run typecheck`.
const transform = { '^.+\.ts$': ['ts-jest', { isolatedModules: true, diagnostics: false }] };

const base = {
  testEnvironment: 'node',
  transform,
  moduleFileExtensions: ['ts', 'js', 'json'],
};

const withDatabase = {
  ...base,
  snapshotSerializers: ['<rootDir>/tests/setup/normalize.ts'],
  globalSetup: '<rootDir>/tests/setup/global-setup.ts',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.ts',
};

module.exports = {
  testTimeout: 30000,
  projects: [
    { ...base, displayName: 'unit', testMatch: ['<rootDir>/tests/unit/**/*.test.ts'] },
    { ...withDatabase, displayName: 'contract', testMatch: ['<rootDir>/tests/contract/**/*.test.ts'] },
    { ...withDatabase, displayName: 'engine', testMatch: ['<rootDir>/tests/engine/**/*.test.ts'] },
  ],
};
