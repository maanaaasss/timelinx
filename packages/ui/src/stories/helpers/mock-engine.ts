/**
 * Mock engine and data for Storybook stories.
 * Uses real @timelinx/core classes so all hooks work.
 */
import {
  createTimelineState,
  createTimeline,
  toFrame,
  frameRate,
  createTrack,
  createAsset,
  createClip,
  toAssetId,
  toTrackId,
  toClipId,
} from '@timelinx/core';
import { TimelineEngine } from '@timelinx/react';

export function createMockEngine() {
  const state = createTimelineState({
    timeline: createTimeline({
      id: 'tl-storybook',
      name: 'Storybook Timeline',
      fps: frameRate(30),
      duration: toFrame(3000),
    }),
  });

  const engine = new TimelineEngine({
    initialState: state,
    defaultToolId: 'selection',
  });

  // 1. Register assets first
  const assetVideo1 = createAsset({
    id: toAssetId('asset-v1'),
    name: 'Main_Footage.mp4',
    mediaType: 'video',
    filePath: '/media/video1.mp4',
    intrinsicDuration: toFrame(3000),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });
  const assetVideo2 = createAsset({
    id: toAssetId('asset-v2'),
    name: 'BRoll_Cutaway.mp4',
    mediaType: 'video',
    filePath: '/media/video2.mp4',
    intrinsicDuration: toFrame(1500),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });
  const assetAudio1 = createAsset({
    id: toAssetId('asset-a1'),
    name: 'Background_Score.wav',
    mediaType: 'audio',
    filePath: '/media/audio1.wav',
    intrinsicDuration: toFrame(3000),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  engine.dispatch({
    id: 'register-assets',
    label: 'Register mock assets',
    timestamp: Date.now(),
    operations: [
      { type: 'REGISTER_ASSET', asset: assetVideo1 },
      { type: 'REGISTER_ASSET', asset: assetVideo2 },
      { type: 'REGISTER_ASSET', asset: assetAudio1 },
    ],
  });

  // 2. Add sample tracks
  const v1 = createTrack({ id: toTrackId('v1'), name: 'V1', type: 'video' });
  const v2 = createTrack({ id: toTrackId('v2'), name: 'V2', type: 'video' });
  const a1 = createTrack({ id: toTrackId('a1'), name: 'A1', type: 'audio' });

  engine.dispatch({
    id: 'init-tracks',
    label: 'Add tracks',
    timestamp: Date.now(),
    operations: [
      { type: 'ADD_TRACK', track: v1 },
      { type: 'ADD_TRACK', track: v2 },
      { type: 'ADD_TRACK', track: a1 },
    ],
  });

  // 3. Add clips to V1
  engine.dispatch({
    id: 'init-clips-v1',
    label: 'Add clips to V1',
    timestamp: Date.now(),
    operations: [
      {
        type: 'INSERT_CLIP',
        trackId: toTrackId('v1'),
        clip: createClip({
          id: toClipId('clip-intro'),
          assetId: toAssetId('asset-v1'),
          trackId: toTrackId('v1'),
          name: 'Intro',
          timelineStart: toFrame(0),
          timelineEnd: toFrame(450),
          mediaIn: toFrame(0),
          mediaOut: toFrame(450),
          type: 'video',
        }),
      },
      {
        type: 'INSERT_CLIP',
        trackId: toTrackId('v1'),
        clip: createClip({
          id: toClipId('clip-main'),
          assetId: toAssetId('asset-v1'),
          trackId: toTrackId('v1'),
          name: 'Main Section',
          timelineStart: toFrame(480),
          timelineEnd: toFrame(1500),
          mediaIn: toFrame(480),
          mediaOut: toFrame(1500),
          type: 'video',
        }),
      },
      {
        type: 'INSERT_CLIP',
        trackId: toTrackId('v1'),
        clip: createClip({
          id: toClipId('clip-outro'),
          assetId: toAssetId('asset-v1'),
          trackId: toTrackId('v1'),
          name: 'Outro',
          timelineStart: toFrame(1530),
          timelineEnd: toFrame(2100),
          mediaIn: toFrame(1530),
          mediaOut: toFrame(2100),
          type: 'video',
        }),
      },
    ],
  });

  // 4. Add clips to V2
  engine.dispatch({
    id: 'init-clips-v2',
    label: 'Add clips to V2',
    timestamp: Date.now(),
    operations: [
      {
        type: 'INSERT_CLIP',
        trackId: toTrackId('v2'),
        clip: createClip({
          id: toClipId('clip-broll-1'),
          assetId: toAssetId('asset-v2'),
          trackId: toTrackId('v2'),
          name: 'B-Roll A',
          timelineStart: toFrame(150),
          timelineEnd: toFrame(750),
          mediaIn: toFrame(0),
          mediaOut: toFrame(600),
          type: 'video',
        }),
      },
      {
        type: 'INSERT_CLIP',
        trackId: toTrackId('v2'),
        clip: createClip({
          id: toClipId('clip-broll-2'),
          assetId: toAssetId('asset-v2'),
          trackId: toTrackId('v2'),
          name: 'B-Roll B',
          timelineStart: toFrame(900),
          timelineEnd: toFrame(1350),
          mediaIn: toFrame(600),
          mediaOut: toFrame(1050),
          type: 'video',
        }),
      },
    ],
  });

  // 5. Add clips to A1
  engine.dispatch({
    id: 'init-clips-a1',
    label: 'Add clips to A1',
    timestamp: Date.now(),
    operations: [
      {
        type: 'INSERT_CLIP',
        trackId: toTrackId('a1'),
        clip: createClip({
          id: toClipId('clip-music'),
          assetId: toAssetId('asset-a1'),
          trackId: toTrackId('a1'),
          name: 'Background Music',
          timelineStart: toFrame(0),
          timelineEnd: toFrame(2100),
          mediaIn: toFrame(0),
          mediaOut: toFrame(2100),
          type: 'audio',
        }),
      },
    ],
  });

  // Seek to frame 300 (10 seconds in)
  engine.seekTo(toFrame(300));

  return engine;
}
