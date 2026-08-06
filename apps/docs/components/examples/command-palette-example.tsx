'use client';

import { CommandPalette, TimelineProvider as UITimelineProvider } from '@timelinx/ui';
import { TimelineEngine, TimelineProvider as ReactTimelineProvider } from '@timelinx/react';
import {
  createTimeline,
  createTimelineState,
  createTrack,
  dispatch,
  toFrame,
  frameRate,
} from '@timelinx/core';
import { useMemo, useState } from 'react';

function createDemoEngine() {
  const timeline = createTimeline({
    id: 'tl-cmd-palette',
    name: 'Command Palette Demo',
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

export function CommandPaletteExample() {
  const engine = useMemo(() => createDemoEngine(), []);
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsVisible(true)}
        style={{
          padding: '8px 16px',
          background: 'var(--color-primary, #3b82f6)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 14,
          marginBottom: 12,
        }}
      >
        Open Command Palette
      </button>
      <div style={{ height: 300, border: '1px solid var(--color-border, #333)', borderRadius: 8, overflow: 'hidden' }}>
        <ReactTimelineProvider engine={engine}>
          <UITimelineProvider engine={engine} onPpfChange={() => {}}>
            <CommandPalette
              isVisible={isVisible}
              onClose={() => setIsVisible(false)}
            />
          </UITimelineProvider>
        </ReactTimelineProvider>
      </div>
    </div>
  );
}
