import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { ZoomControls } from '../components/zoom-controls';

const meta: Meta<typeof ZoomControls> = {
  title: 'Components/ZoomControls',
  component: ZoomControls,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ZoomControls>;

export const Default: Story = {
  render: () => {
    const [ppf, setPpf] = useState(4);
    return <ZoomControls ppf={ppf} onPpfChange={setPpf} />;
  },
};

export const ZoomedIn: Story = {
  render: () => {
    const [ppf, setPpf] = useState(50);
    return <ZoomControls ppf={ppf} onPpfChange={setPpf} />;
  },
};

export const ZoomedOut: Story = {
  render: () => {
    const [ppf, setPpf] = useState(1);
    return <ZoomControls ppf={ppf} onPpfChange={setPpf} />;
  },
};
