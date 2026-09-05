'use client';

import { TimelineLayout, TimelineProvider, MediaAssetsProvider } from '@timelinx/ui';
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
  const asset1 = createAsset({
    id: 'asset-1',
    name: 'Interview.mp4',
    mediaType: 'video',
    filePath: '/media/interview.mp4',
    intrinsicDuration: toFrame(3000),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  const asset2 = createAsset({
    id: 'asset-2',
    name: 'B-Roll.mp4',
    mediaType: 'video',
    filePath: '/media/broll.mp4',
    intrinsicDuration: toFrame(2000),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  const timeline = createTimeline({
    id: 'tl-demo',
    name: 'Demo Timeline',
    fps: frameRate(30),
    duration: toFrame(9000),
  });

  const assetRegistry = new Map([
    [asset1.id, asset1],
    [asset2.id, asset2],
  ]);
  let state = createTimelineState({ timeline, assetRegistry });

  const track1 = createTrack({ id: 'v1', name: 'Video 1', type: 'video', clips: [] });
  const track1Result = dispatch(state, {
    id: 'add-track-1',
    label: 'Add video track 1',
    timestamp: Date.now(),
    operations: [{ type: 'ADD_TRACK', track: track1 }],
  });
  if (track1Result.accepted) state = track1Result.nextState;

  const clip1 = createClip({
    id: 'clip-1',
    assetId: 'asset-1',
    trackId: 'v1',
    timelineStart: toFrame(0),
    timelineEnd: toFrame(210),
    mediaIn: toFrame(0),
    mediaOut: toFrame(210),
  });
  const clip1Result = dispatch(state, {
    id: 'add-clip-1',
    label: 'Add first clip',
    timestamp: Date.now(),
    operations: [{ type: 'INSERT_CLIP', trackId: track1.id, clip: clip1 }],
  });
  if (clip1Result.accepted) state = clip1Result.nextState;

  const clip2 = createClip({
    id: 'clip-2',
    assetId: 'asset-2',
    trackId: 'v1',
    timelineStart: toFrame(240),
    timelineEnd: toFrame(540),
    mediaIn: toFrame(0),
    mediaOut: toFrame(300),
  });
  const clip2Result = dispatch(state, {
    id: 'add-clip-2',
    label: 'Add second clip',
    timestamp: Date.now(),
    operations: [{ type: 'INSERT_CLIP', trackId: track1.id, clip: clip2 }],
  });
  if (clip2Result.accepted) state = clip2Result.nextState;

  return new TimelineEngine({ initialState: state });
}

// Sample video thumbnail gradients / images for V3 clip previews
const sampleThumbnails = new Map<string, string>([
  [
    'asset-1',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=320&auto=format&fit=crop&q=60',
  ],
  [
    'asset-2',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=320&auto=format&fit=crop&q=60',
  ],
]);

export function TimelineEditorExample() {
  const engine = useMemo(() => createDemoEngine(), []);

  return (
    <div
      style={{
        height: 380,
        border: '1px solid var(--border, #2a2b36)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <MediaAssetsProvider initialThumbnails={sampleThumbnails}>
        <TimelineProvider engine={engine} initialPpf={8}>
          <TimelineLayout
            variant="v3"
            pages={[
              { id: 'page-1', name: 'Page 1' },
              { id: 'page-2', name: 'Page 2' },
            ]}
            activePage="page-1"
          />
        </TimelineProvider>
      </MediaAssetsProvider>
    </div>
  );
}
