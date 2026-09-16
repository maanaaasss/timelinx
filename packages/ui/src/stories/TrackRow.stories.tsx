import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';
import { TrackRow } from '../components/timeline/track-row';
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

const meta: Meta<typeof TrackRow> = {
  title: 'Timeline/TrackRow',
  component: TrackRow,
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
type Story = StoryObj<typeof TrackRow>;

const videoTrack = createTrack({ id: 'v1', name: 'V1', type: 'video' });
const audioTrack = createTrack({ id: 'a1', name: 'A1', type: 'audio' });

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
    name: 'Main Section',
    timelineStart: 480,
    timelineEnd: 1500,
    mediaIn: 0,
    mediaOut: 1020,
    type: 'video' as const,
  },
];

const audioClips = [
  {
    id: 'clip-music',
    trackId: 'a1',
    name: 'Background Music',
    timelineStart: 0,
    timelineEnd: 2100,
    mediaIn: 0,
    mediaOut: 2100,
    type: 'audio' as const,
  },
];

export const VideoTrack: Story = {
  render: () => {
    const engine = useEngine();
    const allTracks = [videoTrack, audioTrack];
    return (
      <div style={{ width: '100%' }}>
        <TrackRow
          track={videoTrack}
          clips={sampleClips}
          ppf={10}
          fps={30}
          tracks={allTracks}
          totalWidth={4000}
          selectedClipIds={new Set()}
          engine={engine}
          onSeek={() => {}}
        />
      </div>
    );
  },
};

export const AudioTrackRow: Story = {
  render: () => {
    const engine = useEngine();
    const allTracks = [videoTrack, audioTrack];
    return (
      <div style={{ width: '100%' }}>
        <TrackRow
          track={audioTrack}
          clips={audioClips}
          ppf={10}
          fps={30}
          tracks={allTracks}
          totalWidth={4000}
          selectedClipIds={new Set()}
          engine={engine}
          onSeek={() => {}}
        />
      </div>
    );
  },
};

export const SelectedTrackRow: Story = {
  name: 'Selected Track',
  render: () => {
    const engine = useEngine();
    const allTracks = [videoTrack, audioTrack];
    return (
      <div style={{ width: '100%' }}>
        <TrackRow
          track={videoTrack}
          clips={sampleClips}
          ppf={10}
          fps={30}
          tracks={allTracks}
          totalWidth={4000}
          selectedClipIds={new Set()}
          engine={engine}
          onSeek={() => {}}
          isSelected
        />
      </div>
    );
  },
};

export const MultipleTracks: Story = {
  render: () => {
    const engine = useEngine();
    const allTracks = [videoTrack, audioTrack];
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <TrackRow
          track={videoTrack}
          clips={sampleClips}
          ppf={10}
          fps={30}
          tracks={allTracks}
          totalWidth={4000}
          selectedClipIds={new Set(['clip-2'])}
          engine={engine}
          onSeek={() => {}}
          isSelected
        />
        <TrackRow
          track={audioTrack}
          clips={audioClips}
          ppf={10}
          fps={30}
          tracks={allTracks}
          totalWidth={4000}
          selectedClipIds={new Set()}
          engine={engine}
          onSeek={() => {}}
        />
      </div>
    );
  },
};

export const MutedAndLocked: Story = {
  name: 'Muted & Locked',
  render: () => {
    const engine = useEngine();
    const allTracks = [videoTrack, audioTrack];
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <TrackRow
          track={{ ...videoTrack, muted: true, name: 'V2 (Muted)' }}
          clips={sampleClips}
          ppf={10}
          fps={30}
          tracks={allTracks}
          totalWidth={4000}
          selectedClipIds={new Set()}
          engine={engine}
          onSeek={() => {}}
        />
        <TrackRow
          track={{ ...audioTrack, locked: true, name: 'A2 (Locked)' }}
          clips={audioClips}
          ppf={10}
          fps={30}
          tracks={allTracks}
          totalWidth={4000}
          selectedClipIds={new Set()}
          engine={engine}
          onSeek={() => {}}
        />
      </div>
    );
  },
};
