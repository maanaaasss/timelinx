/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: 'command',
  commandRunner: {
    command: 'pnpm vitest run --exclude="src/__tests__/tools/selection.test.ts" --exclude="src/__tests__/phase7-benchmark.test.ts"',
  },
  reporters: ['clear-text', 'json', 'html'],
  coverageAnalysis: 'off',
  timeoutMS: 60000,
  concurrency: 2,
  mutate: [
    'src/validation/validators.ts',
  ],
  warnings: {
    unknownOptions: false,
  },
};
export default config;
