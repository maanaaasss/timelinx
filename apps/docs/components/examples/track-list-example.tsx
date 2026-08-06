'use client';

import { TrackList, TimelineProvider as UITimelineProvider } from '@timelinx/ui';
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
import { useMemo, useState } from 'react';

function createEngineForTrackList() {
  const videoAsset = createAsset({
    id: 'asset-video',
    name: 'Interview.mp4',
    mediaType: 'video',
    filePath: '/media/interview.mp4',
    intrinsicDuration: toFrame(3000),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  const audioAsset = createAsset({
    id: 'asset-audio',
    name: 'Voiceover.wav',
    mediaType: 'audio',
    filePath: '/media/voiceover.wav',
    intrinsicDuration: toFrame(6000),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  const timeline = createTimeline({
    id: 'tl-tracklist',
    name: 'TrackList Demo',
    fps: frameRate(30),
    duration: toFrame(9000),
  });

  const assetRegistry = new Map([
    [videoAsset.id, videoAsset],
    [audioAsset.id, audioAsset],
  ]);
  let state = createTimelineState({ timeline, assetRegistry });

  const videoTrack = createTrack({ id: 'v1', name: 'V1', type: 'video', clips: [] });
  const vResult = dispatch(state, {
    id: 'add-video-track',
    label: 'Add video track',
    timestamp: Date.now(),
    operations: [{ type: 'ADD_TRACK', track: videoTrack }],
  });
  if (vResult.accepted) state = vResult.nextState;

  const audioTrack = createTrack({ id: 'a1', name: 'A1', type: 'audio', clips: [] });
  const aResult = dispatch(state, {
    id: 'add-audio-track',
    label: 'Add audio track',
    timestamp: Date.now(),
    operations: [{ type: 'ADD_TRACK', track: audioTrack }],
  });
  if (aResult.accepted) state = aResult.nextState;

  const clip = createClip({
    id: 'clip-1',
    assetId: 'asset-video',
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
    operations: [{ type: 'INSERT_CLIP', trackId: videoTrack.id, clip }],
  });
  if (clipResult.accepted) state = clipResult.nextState;

  return new TimelineEngine({ initialState: state });
}

export function TrackListExample() {
  const engine = useMemo(() => createEngineForTrackList(), []);
  const [trackHeights, setTrackHeights] = useState<Record<string, number>>({
    v1: 80,
    a1: 68,
  });
  const clipCounts = useMemo(() => new Map<string, number>([['v1', 1], ['a1', 0]]), []);

  const handleTrackHeightChange = (trackId: string, height: number) => {
    setTrackHeights(prev => ({ ...prev, [trackId]: height }));
  };

  return (
    <div style={{ padding: 24, background: 'var(--color-background, #1a1a1a)', borderRadius: 8 }}>
      <ReactTimelineProvider engine={engine}>
        <UITimelineProvider engine={engine} onPpfChange={() => {}}>
          <div style={{ border: '1px solid var(--color-border, #333)', borderRadius: 4, overflow: 'hidden' }}>
            <TrackList
              trackHeights={trackHeights}
              onTrackHeightChange={handleTrackHeightChange}
              clipCounts={clipCounts}
            />
          </div>
        </UITimelineProvider>
      </ReactTimelineProvider>
    </div>
  );
}
