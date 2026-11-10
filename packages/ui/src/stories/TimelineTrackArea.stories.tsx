import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo, useState } from 'react';
import { TimelineTrackAreaV2 } from '../components/timeline/timeline-track-area';
import { TimelineProvider } from '../context/timeline-context';
import { useTimelineWithEngine, useSelectedClipIds } from '@timelinx/react';
import { createMockEngine } from './helpers/mock-engine';

const meta: Meta<typeof TimelineTrackAreaV2> = {
  title: 'Timeline/TimelineTrackAreaV2',
  component: TimelineTrackAreaV2,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof TimelineTrackAreaV2>;

function TrackAreaWrapper() {
  const engine = useMemo(() => createMockEngine(), []);
  const timeline = useTimelineWithEngine(engine);
  const selectedClipIds = useSelectedClipIds(engine);
  const [heights, setHeights] = useState<Record<string, number>>({});

  const allClips = timeline.tracks.flatMap((t) => t.clips);

  return (
    <TimelineProvider engine={engine} initialPpf={10}>
      <div style={{ width: '100%', height: '350px', background: 'var(--tl-bg-root, #0c0c10)' }}>
        <TimelineTrackAreaV2
          tracks={timeline.tracks}
          clips={allClips}
          ppf={10}
          fps={30}
          duration={3000}
          selectedClipIds={selectedClipIds}
          engine={engine}
          onScrollHorizontal={() => {}}
          heights={heights}
          onHeightChange={(id, h) => setHeights((prev) => ({ ...prev, [id]: h }))}
        />
      </div>
    </TimelineProvider>
  );
}

export const MultiTrackView: Story = {
  name: 'Multi-Track View',
  render: () => <TrackAreaWrapper />,
};
