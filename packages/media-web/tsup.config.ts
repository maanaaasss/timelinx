import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    minify: false,
    external: ['@timelinx/core'],
  },
  {
    entry: {
      index: 'src/workers/index.ts',
    },
    outDir: 'dist/workers',
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    minify: false,
    external: ['@timelinx/core'],
  },
]);
