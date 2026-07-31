'use client';

import { TransportControls, TimelineProvider } from '@timelinx/ui';
import { TimelineEngine } from '@timelinx/react';
import {
  createTimeline,
  createTimelineState,
  createTrack,
  dispatch,
  toFrame,
  frameRate,
} from '@timelinx/core';
import { useMemo } from 'react';

function createEngineForTransport() {
  const timeline = createTimeline({
    id: 'tl-transport',
    name: 'Transport Demo',
    fps: frameRate(30),
    duration: toFrame(9000),
  });

  let state = createTimelineState({ timeline });

  const track = createTrack({ id: 'v1', name: 'V1', type: 'video', clips: [] });
  const trackResult = dispatch(state, {
    id: 'add-track',
    label: 'Add video track',
    timestamp: Date.now(),
    operations: [{ type: 'ADD_TRACK', track }],
  });
  if (trackResult.accepted) state = trackResult.nextState;

  return new TimelineEngine({ initialState: state });
}

export function TransportControlsExample() {
  const engine = useMemo(() => createEngineForTransport(), []);

  return (
    <div style={{ padding: 24, background: 'var(--color-background, #1a1a1a)', borderRadius: 8 }}>
      <TimelineProvider engine={engine}>
        <TransportControls />
      </TimelineProvider>
    </div>
  );
}
