import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/__tests__/**',
        // Pure type-declaration files — zero runtime statements, coverage irrelevant
        'src/types/operations.ts',
        'src/types/pipeline.ts',
        'src/types/playhead.ts',
        'src/types/grouping.ts',
      ],
      thresholds: {
        lines: 85,
        branches: 85,
        functions: 85,
      },
    },
  },
});
