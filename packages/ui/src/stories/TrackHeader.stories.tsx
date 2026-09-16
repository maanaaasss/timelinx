import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';
import { TrackHeader } from '../components/timeline/track-header';
import { TrackBody } from '../components/timeline/track-body';
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

/* ── TrackHeader ──────────────────────────────────────────── */

const headerMeta: Meta<typeof TrackHeader> = {
  title: 'Timeline/TrackHeader',
  component: TrackHeader,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ProviderDecorator>
        <Story />
      </ProviderDecorator>
    ),
  ],
};

export default headerMeta;
type HeaderStory = StoryObj<typeof TrackHeader>;

const videoTrack = createTrack({ id: 'v1', name: 'V1', type: 'video' });
const audioTrack = createTrack({ id: 'a1', name: 'A1', type: 'audio' });

export const VideoTrack: HeaderStory = {
  render: () => {
    const engine = useEngine();
    return (
      <div style={{ width: '176px' }}>
        <TrackHeader track={videoTrack} engine={engine} />
      </div>
    );
  },
};

export const AudioTrack: HeaderStory = {
  render: () => {
    const engine = useEngine();
    return (
      <div style={{ width: '176px' }}>
        <TrackHeader track={audioTrack} engine={engine} />
      </div>
    );
  },
};

export const SelectedTrack: HeaderStory = {
  name: 'Selected',
  render: () => {
    const engine = useEngine();
    return (
      <div style={{ width: '176px' }}>
        <TrackHeader track={videoTrack} engine={engine} isSelected />
      </div>
    );
  },
};

export const MutedTrack: HeaderStory = {
  render: () => {
    const engine = useEngine();
    return (
      <div style={{ width: '176px' }}>
        <TrackHeader track={{ ...videoTrack, muted: true, name: 'V2 (Muted)' }} engine={engine} />
      </div>
    );
  },
};

export const LockedTrack: HeaderStory = {
  render: () => {
    const engine = useEngine();
    return (
      <div style={{ width: '176px' }}>
        <TrackHeader track={{ ...videoTrack, locked: true, name: 'V3 (Locked)' }} engine={engine} />
      </div>
    );
  },
};

export const AllStates: HeaderStory = {
  name: 'All States',
  render: () => {
    const engine = useEngine();
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '176px' }}>
        <TrackHeader track={videoTrack} engine={engine} />
        <TrackHeader track={audioTrack} engine={engine} />
        <TrackHeader track={videoTrack} engine={engine} isSelected />
        <TrackHeader track={{ ...videoTrack, muted: true, name: 'V2 (Muted)' }} engine={engine} />
        <TrackHeader track={{ ...audioTrack, locked: true, name: 'A2 (Locked)' }} engine={engine} />
      </div>
    );
  },
};
