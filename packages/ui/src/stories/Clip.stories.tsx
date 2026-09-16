import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';
import { Clip } from '../components/timeline/clip';
import { TrackBody } from '../components/timeline/track-body';
import { TrackHeader } from '../components/timeline/track-header';
import { TrackRow } from '../components/timeline/track-row';
import { TimelineProvider } from '../context/timeline-context';
import { createMockEngine } from './helpers/mock-engine';

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

const sampleClip = {
  id: 'clip-1',
  trackId: 'v1',
  name: 'Sample Clip',
  timelineStart: 100,
  timelineEnd: 600,
  mediaIn: 0,
  mediaOut: 500,
  type: 'video' as const,
};

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
    return (
      <div style={{ position: 'relative', width: '100%', height: '48px' }}>
        <Clip
          clip={{ ...sampleClip, id: 'clip-audio', name: 'Audio Clip', trackId: 'a1' }}
          clipType="audio"
          ppf={10}
          engine={engine}
          isSelected={false}
        />
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
    return (
      <div style={{ position: 'relative', width: '100%', height: '48px' }}>
        <Clip
          clip={{ ...sampleClip, id: 'clip-text', name: 'Title Card', trackId: 'v2' }}
          clipType="text"
          ppf={10}
          engine={engine}
          isSelected={false}
        />
      </div>
    );
  },
};
