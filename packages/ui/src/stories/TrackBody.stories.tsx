import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';
import { TrackBody } from '../components/timeline/track-body';
import { TimelineProvider } from '../context/timeline-context';
import { createMockEngine } from './helpers/mock-engine';
import { createTrack } from '@timelinx/core';

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

const meta: Meta<typeof TrackBody> = {
  title: 'Timeline/TrackBody',
  component: TrackBody,
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
type Story = StoryObj<typeof TrackBody>;

const videoTrack = createTrack({ id: 'v1', name: 'V1', type: 'video' });

const sampleClips = [
  {
    id: 'clip-1',
    trackId: 'v1',
    name: 'Intro',
    timelineStart: 0,
    timelineEnd: 450,
    mediaIn: 0,
    mediaOut: 450,
    type: 'video' as const,
  },
  {
    id: 'clip-2',
    trackId: 'v1',
    name: 'Main',
    timelineStart: 480,
    timelineEnd: 1500,
    mediaIn: 0,
    mediaOut: 1020,
    type: 'video' as const,
  },
  {
    id: 'clip-3',
    trackId: 'v1',
    name: 'Outro',
    timelineStart: 1530,
    timelineEnd: 2100,
    mediaIn: 0,
    mediaOut: 570,
    type: 'video' as const,
  },
];

export const WithClips: Story = {
  render: () => {
    const engine = useEngine();
    return (
      <div style={{ height: '48px' }}>
        <TrackBody
          track={videoTrack}
          clips={sampleClips}
          ppf={10}
          fps={30}
          tracks={[videoTrack]}
          totalWidth={4000}
          selectedClipIds={new Set()}
          engine={engine}
          onSeek={() => {}}
        />
      </div>
    );
  },
};

export const SelectedClip: Story = {
  render: () => {
    const engine = useEngine();
    return (
      <div style={{ height: '48px' }}>
        <TrackBody
          track={videoTrack}
          clips={sampleClips}
          ppf={10}
          fps={30}
          tracks={[videoTrack]}
          totalWidth={4000}
          selectedClipIds={new Set(['clip-2'])}
          engine={engine}
          onSeek={() => {}}
        />
      </div>
    );
  },
};

export const EmptyTrack: Story = {
  render: () => {
    const engine = useEngine();
    return (
      <div style={{ height: '48px' }}>
        <TrackBody
          track={videoTrack}
          clips={[]}
          ppf={10}
          fps={30}
          tracks={[videoTrack]}
          totalWidth={4000}
          selectedClipIds={new Set()}
          engine={engine}
          onSeek={() => {}}
        />
      </div>
    );
  },
};
