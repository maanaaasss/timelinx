import type { StorybookConfig } from '@storybook/react-vite';
import path from 'node:path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@timelinx/core': path.resolve(process.cwd(), '../core/src/index.ts'),
      '@timelinx/react': path.resolve(process.cwd(), '../react/src/index.ts'),
    };
    return config;
  },
};

export default config;
