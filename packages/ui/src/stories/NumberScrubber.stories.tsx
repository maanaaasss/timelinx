import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { NumberScrubber } from '../components/number-scrubber';

const meta: Meta<typeof NumberScrubber> = {
  title: 'Components/NumberScrubber',
  component: NumberScrubber,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof NumberScrubber>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState(100);
    return <NumberScrubber label="X" value={value} onChange={setValue} onCommit={setValue} />;
  },
};

export const WithMinMax: Story = {
  render: () => {
    const [value, setValue] = useState(50);
    return (
      <NumberScrubber
        label="Opacity"
        value={value}
        onChange={setValue}
        onCommit={setValue}
        min={0}
        max={100}
        step={1}
      />
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <NumberScrubber label="Locked" value={42} onChange={() => {}} onCommit={() => {}} disabled />
  ),
};

export const Decimal: Story = {
  render: () => {
    const [value, setValue] = useState(1.5);
    return (
      <NumberScrubber
        label="Scale"
        value={value}
        onChange={setValue}
        onCommit={setValue}
        min={0.1}
        max={10}
        step={0.1}
      />
    );
  },
};
