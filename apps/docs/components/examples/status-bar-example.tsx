'use client';

import { StatusBar, TimelineProvider as UITimelineProvider } from '@timelinx/ui';
import { TimelineEngine, TimelineProvider as ReactTimelineProvider } from '@timelinx/react';
import {
  createTimeline,
  createTimelineState,
  createTrack,
  dispatch,
  toFrame,
  frameRate,
} from '@timelinx/core';
import { useMemo } from 'react';

function createDemoEngine() {
  const timeline = createTimeline({
    id: 'tl-status-bar',
    name: 'Status Bar Demo',
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

export function StatusBarExample() {
  const engine = useMemo(() => createDemoEngine(), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 300, border: '1px solid var(--color-border, #333)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted, #888)', fontSize: 14 }}>
        Timeline content area
      </div>
      <ReactTimelineProvider engine={engine}>
        <UITimelineProvider engine={engine} onPpfChange={() => {}}>
          <StatusBar />
        </UITimelineProvider>
      </ReactTimelineProvider>
    </div>
  );
}
