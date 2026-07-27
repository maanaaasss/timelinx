import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/utils/media-import.ts',
        'src/components/canvas-compositor.tsx',
        'src/hooks/use-export.ts',
        'src/context/media-assets-context.tsx',
      ],
      thresholds: {
        statements: 40,
        branches: 50,
        functions: 40,
        lines: 40,
      },
    },
  },
});
