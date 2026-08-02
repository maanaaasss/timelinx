'use client';

import { TimelineTrack, TimelineProvider as UITimelineProvider } from '@timelinx/ui';
import { TimelineEngine, TimelineProvider as ReactTimelineProvider } from '@timelinx/react';
import {
  createTimeline,
  createTimelineState,
  createTrack,
  createAsset,
  createClip,
  dispatch,
  toFrame,
  frameRate,
} from '@timelinx/core';
import { useMemo, useCallback } from 'react';

function createDemoEngine() {
  const asset = createAsset({
    id: 'asset-1',
    name: 'Interview.mp4',
    mediaType: 'video',
    filePath: '/media/interview.mp4',
    intrinsicDuration: toFrame(3000),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  const timeline = createTimeline({
    id: 'tl-demo',
    name: 'Demo',
    fps: frameRate(30),
    duration: toFrame(9000),
  });

  const assetRegistry = new Map([[asset.id, asset]]);
  let state = createTimelineState({ timeline, assetRegistry });

  const track = createTrack({ id: 'v1', name: 'V1', type: 'video', clips: [] });
  const trackResult = dispatch(state, {
    id: 'add-track',
    label: 'Add track',
    timestamp: Date.now(),
    operations: [{ type: 'ADD_TRACK', track }],
  });
  if (trackResult.accepted) state = trackResult.nextState;

  const clip = createClip({
    id: 'clip-1',
    assetId: 'asset-1',
    trackId: 'v1',
    timelineStart: toFrame(0),
    timelineEnd: toFrame(600),
    mediaIn: toFrame(0),
    mediaOut: toFrame(600),
  });
  const clipResult = dispatch(state, {
    id: 'add-clip',
    label: 'Add clip',
    timestamp: Date.now(),
    operations: [{ type: 'INSERT_CLIP', trackId: track.id, clip }],
  });
  if (clipResult.accepted) state = clipResult.nextState;

  return new TimelineEngine({ initialState: state });
}

export function TimelineTrackExample() {
  const engine = useMemo(() => createDemoEngine(), []);

  const handleDelete = useCallback((trackId: string) => {
    console.log('Delete track:', trackId);
  }, []);

  const handleAddClip = useCallback((trackId: string) => {
    console.log('Add clip to track:', trackId);
  }, []);

  return (
    <div style={{ padding: 24, background: 'var(--color-background, #1a1a1a)', borderRadius: 8 }}>
      <ReactTimelineProvider engine={engine}>
        <UITimelineProvider engine={engine}>
          <div style={{ display: 'flex', gap: 8 }}>
            <TimelineTrack
              trackId="v1"
              shortId="V1"
              height={48}
              clipCount={1}
              onDelete={handleDelete}
              onAddClip={handleAddClip}
            />
          </div>
        </UITimelineProvider>
      </ReactTimelineProvider>
    </div>
  );
}
