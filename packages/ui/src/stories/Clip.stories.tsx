import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';
import { Clip } from '../components/timeline/clip';
import { TimelineProvider } from '../context/timeline-context';
import { createMockEngine } from './helpers/mock-engine';
import { createClip, toFrame, toTrackId, toClipId, toAssetId } from '@timelinx/core';

function ProviderDecorator({ children }: { children: React.ReactNode }) {
  const engine = useMemo(() => createMockEngine(), []);
  return (
    <TimelineProvider engine={engine} initialPpf={10}>
      {children}
    </TimelineProvider>
  );
}

function useEngine() {
  return useMemo(() => createMockEngine(), []);
}

const meta: Meta<typeof Clip> = {
  title: 'Timeline/Clip',
  component: Clip,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ProviderDecorator>
        <Story />
      </ProviderDecorator>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Clip>;

const sampleClip = createClip({
  id: toClipId('clip-intro'),
  assetId: toAssetId('asset-v1'),
  trackId: toTrackId('v1'),
  name: 'Sample Clip',
  timelineStart: toFrame(100),
  timelineEnd: toFrame(600),
  mediaIn: toFrame(0),
  mediaOut: toFrame(500),
  type: 'video',
});

export const VideoClip: Story = {
  render: () => {
    const engine = useEngine();
    return (
      <div style={{ position: 'relative', width: '100%', height: '48px' }}>
        <Clip clip={sampleClip} clipType="video" ppf={10} engine={engine} isSelected={false} />
      </div>
    );
  },
};

export const AudioClip: Story = {
  render: () => {
    const engine = useEngine();
    const audioClip = createClip({
      ...sampleClip,
      id: toClipId('clip-music'),
      assetId: toAssetId('asset-a1'),
      name: 'Audio Clip',
      trackId: toTrackId('a1'),
      type: 'audio',
    });
    return (
      <div style={{ position: 'relative', width: '100%', height: '48px' }}>
        <Clip clip={audioClip} clipType="audio" ppf={10} engine={engine} isSelected={false} />
      </div>
    );
  },
};

export const Selected: Story = {
  render: () => {
    const engine = useEngine();
    return (
      <div style={{ position: 'relative', width: '100%', height: '48px' }}>
        <Clip clip={sampleClip} clipType="video" ppf={10} engine={engine} isSelected={true} />
      </div>
    );
  },
};

export const TextClip: Story = {
  render: () => {
    const engine = useEngine();
    const textClip = createClip({
      ...sampleClip,
      id: toClipId('clip-broll-1'),
      name: 'Title Card',
      trackId: toTrackId('v2'),
      type: 'text',
    });
    return (
      <div style={{ position: 'relative', width: '100%', height: '48px' }}>
        <Clip clip={textClip} clipType="text" ppf={10} engine={engine} isSelected={false} />
      </div>
    );
  },
};
