import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { TimelineEmptyState } from '../components/timeline/timeline-empty-state';

const meta: Meta<typeof TimelineEmptyState> = {
  title: 'Timeline/TimelineEmptyState',
  component: TimelineEmptyState,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TimelineEmptyState>;

export const Default: Story = {
  args: {
    onUpload: () => alert('Upload clicked'),
  },
};

export const CustomLabel: Story = {
  args: {
    onUpload: () => alert('Import clicked'),
    label: 'Import Media to Get Started',
  },
};
