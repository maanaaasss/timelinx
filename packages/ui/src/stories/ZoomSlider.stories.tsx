import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { ZoomSlider } from '../components/timeline/zoom-slider';

const meta: Meta<typeof ZoomSlider> = {
  title: 'Timeline/ZoomSlider',
  component: ZoomSlider,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ZoomSlider>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState(10);
    return (
      <div style={{ width: '200px' }}>
        <ZoomSlider value={value} min={2} max={50} defaultValue={10} onChange={setValue} />
      </div>
    );
  },
};

export const ZoomedIn: Story = {
  render: () => {
    const [value, setValue] = useState(40);
    return (
      <div style={{ width: '200px' }}>
        <ZoomSlider value={value} min={2} max={50} defaultValue={10} onChange={setValue} />
      </div>
    );
  },
};
