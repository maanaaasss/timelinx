import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@timelinx/core': path.resolve(__dirname, '../../packages/core/src/public-api.ts'),
      '@timelinx/react': path.resolve(__dirname, '../../packages/react/src/index.ts'),
      '@timelinx/ui/styles/tokens.css': path.resolve(__dirname, '../../packages/ui/src/tokens.css'),
      '@timelinx/ui/styles/tokens': path.resolve(__dirname, '../../packages/ui/src/tokens.css'),
      '@timelinx/ui/styles/presets/dark-pro.css': path.resolve(__dirname, '../../packages/ui/src/presets/dark-pro.css'),
      '@timelinx/ui/styles/presets/dark-pro': path.resolve(__dirname, '../../packages/ui/src/presets/dark-pro.css'),
      '@timelinx/ui/styles/presets/light.css': path.resolve(__dirname, '../../packages/ui/src/presets/light.css'),
      '@timelinx/ui/styles/presets/light': path.resolve(__dirname, '../../packages/ui/src/presets/light.css'),
      '@timelinx/ui/styles/presets/high-contrast.css': path.resolve(__dirname, '../../packages/ui/src/presets/high-contrast.css'),
      '@timelinx/ui/styles/presets/high-contrast': path.resolve(__dirname, '../../packages/ui/src/presets/high-contrast.css'),
      '@timelinx/ui/styles/structure.css': path.resolve(__dirname, '../../packages/ui/src/styles/structure.css'),
      '@timelinx/ui/styles/structure': path.resolve(__dirname, '../../packages/ui/src/styles/structure.css'),
      '@timelinx/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
    dedupe: ['react', 'react-dom']
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
