import type { StorybookConfig } from '@storybook/react-vite';

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
      '@timelinx/core':
        '/Users/manas/Documents/Manas/Projects/timeline/packages/core/dist/index.js',
      '@timelinx/react':
        '/Users/manas/Documents/Manas/Projects/timeline/packages/react/dist/index.js',
    };
    return config;
  },
};

export default config;
