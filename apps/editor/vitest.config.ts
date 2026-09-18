import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
    exclude: ['src/e2e/**', 'node_modules/**', 'dist/**'],
  },
});
