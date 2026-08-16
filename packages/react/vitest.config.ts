import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.config.*', 'src/__tests__/**'],
      thresholds: {
        lines: 75,
        branches: 70,
        functions: 75,
      },
    },
  },
});
