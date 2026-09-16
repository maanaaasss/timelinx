import React from 'react';
import type { Preview } from '@storybook/react';
import '../src/presets/dark-pro.css';
import '../src/styles/structure.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark-pro',
      values: [
        { name: 'dark-pro', value: '#0c0c10' },
        { name: 'light', value: '#f6f7f9' },
        { name: 'black', value: '#000000' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: '24px',
          minHeight: '200px',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#e4e6eb',
          background: '#0c0c10',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;
