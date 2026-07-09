import {
  createAsset,
  createClip,
  createTrack,
  createTimeline,
  createTimelineState,
  toFrame,
  frameRate,
  createEffect,
  toEffectId,
  toCaptionId,
} from '@timelinx/core';
import { TimelineEngine } from '@timelinx/react';

export function createEditorEngine() {
  const assetVideo1 = createAsset({
    id: 'asset-video-1',
    name: 'Interview.mp4',
    mediaType: 'video',
    filePath: '/media/interview.mp4',
    intrinsicDuration: toFrame(6000),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  const assetVideo2 = createAsset({
    id: 'asset-video-2',
    name: 'B-Roll.mp4',
    mediaType: 'video',
    filePath: '/media/broll.mp4',
    intrinsicDuration: toFrame(4500),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  const assetAudio = createAsset({
    id: 'asset-audio-1',
    name: 'Music.wav',
    mediaType: 'audio',
    filePath: '/media/music.wav',
    intrinsicDuration: toFrame(9000),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  const assetTitle = createAsset({
    id: 'asset-title-1',
    name: 'Title Card.png',
    mediaType: 'video',
    filePath: '/media/title.png',
    intrinsicDuration: toFrame(300),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  const timeline = createTimeline({
    id: 'tl-editor',
    name: 'Editor Timeline',
    fps: frameRate(30),
    duration: toFrame(10800),
  });

  const videoTrack1 = createTrack({
    id: 'v1',
    name: 'V1 — Main',
    type: 'video',
  });

  const videoTrack2 = createTrack({
    id: 'v2',
    name: 'V2 — Overlay',
    type: 'video',
  });

  const audioTrack = createTrack({
    id: 'a1',
    name: 'A1 — Music',
    type: 'audio',
  });

  const subtitleTrack = createTrack({
    id: 's1',
    name: 'S1 — Captions',
    type: 'subtitle',
  });

  const clip1 = createClip({
    id: 'clip-1',
    assetId: 'asset-video-1',
    trackId: 'v1',
    timelineStart: toFrame(0),
    timelineEnd: toFrame(300),
    mediaIn: toFrame(0),
    mediaOut: toFrame(300),
    effects: [
      createEffect(toEffectId('fx-blur-1'), 'blur', 'preComposite', [
        { key: 'intensity', value: 5 },
      ]),
    ],
  });

  const clip2 = createClip({
    id: 'clip-2',
    assetId: 'asset-video-1',
    trackId: 'v1',
    timelineStart: toFrame(350),
    timelineEnd: toFrame(700),
    mediaIn: toFrame(400),
    mediaOut: toFrame(750),
  });

  const clip3 = createClip({
    id: 'clip-3',
    assetId: 'asset-video-2',
    trackId: 'v1',
    timelineStart: toFrame(800),
    timelineEnd: toFrame(1200),
    mediaIn: toFrame(0),
    mediaOut: toFrame(400),
  });

  const clip4 = createClip({
    id: 'clip-4',
    assetId: 'asset-title-1',
    trackId: 'v2',
    timelineStart: toFrame(100),
    timelineEnd: toFrame(250),
    mediaIn: toFrame(0),
    mediaOut: toFrame(150),
  });

  const clip5 = createClip({
    id: 'clip-5',
    assetId: 'asset-video-2',
    trackId: 'v2',
    timelineStart: toFrame(500),
    timelineEnd: toFrame(750),
    mediaIn: toFrame(100),
    mediaOut: toFrame(350),
  });

  const clip6 = createClip({
    id: 'clip-6',
    assetId: 'asset-audio-1',
    trackId: 'a1',
    timelineStart: toFrame(0),
    timelineEnd: toFrame(600),
    mediaIn: toFrame(0),
    mediaOut: toFrame(600),
  });

  const state = createTimelineState({
    timeline,
    assetRegistry: new Map([
      [assetVideo1.id, assetVideo1],
      [assetVideo2.id, assetVideo2],
      [assetAudio.id, assetAudio],
      [assetTitle.id, assetTitle],
    ]),
  });

  const engine = new TimelineEngine({
    initialState: state,
    onZoomChange: () => {},
  });

  engine.dispatch({
    id: 'init-tracks',
    label: 'Initialize tracks',
    timestamp: Date.now(),
    operations: [
      { type: 'ADD_TRACK', track: videoTrack1 },
      { type: 'ADD_TRACK', track: videoTrack2 },
      { type: 'ADD_TRACK', track: audioTrack },
      { type: 'ADD_TRACK', track: subtitleTrack },
    ],
  });

  engine.dispatch({
    id: 'init-clips',
    label: 'Initialize clips',
    timestamp: Date.now(),
    operations: [
      { type: 'INSERT_CLIP', trackId: videoTrack1.id, clip: clip1 },
      { type: 'INSERT_CLIP', trackId: videoTrack1.id, clip: clip2 },
      { type: 'INSERT_CLIP', trackId: videoTrack1.id, clip: clip3 },
      { type: 'INSERT_CLIP', trackId: videoTrack2.id, clip: clip4 },
      { type: 'INSERT_CLIP', trackId: videoTrack2.id, clip: clip5 },
      { type: 'INSERT_CLIP', trackId: audioTrack.id, clip: clip6 },
    ],
  });

  engine.dispatch({
    id: 'init-captions',
    label: 'Initialize captions',
    timestamp: Date.now(),
    operations: [
      {
        type: 'ADD_CAPTION',
        trackId: 's1' as import('@timelinx/core').TrackId,
        caption: {
          id: toCaptionId('cap-1'),
          text: 'Welcome to TimelineX Editor',
          startFrame: toFrame(0),
          endFrame: toFrame(90),
          language: 'en-US',
          burnIn: false,
        },
      },
      {
        type: 'ADD_CAPTION',
        trackId: 's1' as import('@timelinx/core').TrackId,
        caption: {
          id: toCaptionId('cap-2'),
          text: 'This is the reference timeline editor',
          startFrame: toFrame(120),
          endFrame: toFrame(240),
          language: 'en-US',
          burnIn: false,
        },
      },
    ],
  });

  return engine;
}
