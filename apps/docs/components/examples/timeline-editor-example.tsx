'use client';

import { TimelineLayout, TimelineProvider } from '@timelinx/ui';
import { TimelineEngine } from '@timelinx/react';
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
import { useMemo } from 'react';

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
    name: 'Demo Timeline',
    fps: frameRate(30),
    duration: toFrame(9000),
  });

  const assetRegistry = new Map([[asset.id, asset]]);
  let state = createTimelineState({ timeline, assetRegistry });

  const track = createTrack({ id: 'v1', name: 'V1', type: 'video', clips: [] });
  const trackResult = dispatch(state, {
    id: 'add-track',
    label: 'Add video track',
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

  const clip2 = createClip({
    id: 'clip-2',
    assetId: 'asset-1',
    trackId: 'v1',
    timelineStart: toFrame(700),
    timelineEnd: toFrame(1500),
    mediaIn: toFrame(0),
    mediaOut: toFrame(800),
  });
  const clip2Result = dispatch(state, {
    id: 'add-clip-2',
    label: 'Add second clip',
    timestamp: Date.now(),
    operations: [{ type: 'INSERT_CLIP', trackId: track.id, clip: clip2 }],
  });
  if (clip2Result.accepted) state = clip2Result.nextState;

  return new TimelineEngine({ initialState: state });
}

export function TimelineEditorExample() {
  const engine = useMemo(() => createDemoEngine(), []);

  return (
    <div
      style={{
        height: 500,
        border: '1px solid var(--color-border, #333)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <TimelineProvider engine={engine}>
        <TimelineLayout />
      </TimelineProvider>
    </div>
  );
}
