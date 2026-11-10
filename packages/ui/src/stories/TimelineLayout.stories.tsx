import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';
import { TimelineLayout } from '../components/timeline/timeline-layout';
import { TimelineProvider } from '../context/timeline-context';
import { createMockEngine } from './helpers/mock-engine';
import { toTrackId } from '@timelinx/core';

const meta: Meta<typeof TimelineLayout> = {
  title: 'Timeline/TimelineLayout',
  component: TimelineLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof TimelineLayout>;

function TimelineWrapper(props: React.ComponentProps<typeof TimelineLayout>) {
  const engine = useMemo(() => createMockEngine(), []);
  return (
    <TimelineProvider engine={engine} initialPpf={10}>
      <div style={{ width: '100%', height: '500px', display: 'flex', flexDirection: 'column' }}>
        <TimelineLayout {...props} />
      </div>
    </TimelineProvider>
  );
}

function EmptyTimelineWrapper(props: React.ComponentProps<typeof TimelineLayout>) {
  const engine = useMemo(() => {
    // Create an engine with no tracks
    const eng = createMockEngine();
    const tracks = eng.getState().timeline.tracks;
    tracks.forEach((t) => {
      eng.dispatch({
        id: `remove-${t.id}`,
        label: 'Delete track',
        timestamp: Date.now(),
        operations: [{ type: 'DELETE_TRACK', trackId: toTrackId(t.id) }],
      });
    });
    return eng;
  }, []);

  return (
    <TimelineProvider engine={engine} initialPpf={10}>
      <div style={{ width: '100%', height: '400px', display: 'flex', flexDirection: 'column' }}>
        <TimelineLayout {...props} />
      </div>
    </TimelineProvider>
  );
}

export const V3Modern: Story = {
  name: 'V3 Modern (Default)',
  render: () => <TimelineWrapper variant="v3" />,
};

export const V2Classic: Story = {
  name: 'V2 Classic Layout',
  render: () => <TimelineWrapper variant="v2" />,
};

export const WithPages: Story = {
  name: 'V3 with Page Selector',
  render: () => {
    const [page, setPage] = React.useState('main');
    return (
      <TimelineWrapper
        variant="v3"
        pages={[
          { id: 'main', name: 'Main Sequence' },
          { id: 'vfx', name: 'VFX Shots' },
          { id: 'audio', name: 'Audio Mix' },
        ]}
        activePage={page}
        onPageChange={setPage}
      />
    );
  },
};

export const TimecodeFormat: Story = {
  name: 'V3 with Timecode Display',
  render: () => <TimelineWrapper variant="v3" timeFormat="timecode" />,
};

export const EmptyState: Story = {
  name: 'Empty State (No Tracks)',
  render: () => (
    <EmptyTimelineWrapper
      variant="v3"
      emptyStateLabel="Import Media to Begin"
      onUpload={() => alert('Upload clicked!')}
    />
  ),
};
