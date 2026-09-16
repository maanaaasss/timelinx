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

  // Add sample tracks with clips
  const v1 = createTrack({ id: 'v1', name: 'V1', type: 'video' });
  const v2 = createTrack({ id: 'v2', name: 'V2', type: 'video' });
  const a1 = createTrack({ id: 'a1', name: 'A1', type: 'audio' });

  const engine = new TimelineEngine({
    initialState: state,
    defaultToolId: 'selection',
  });

  // Add tracks
  engine.dispatch({
    id: 'init-tracks',
    label: 'Add tracks',
    timestamp: Date.now(),
    operations: [
      { type: 'ADD_TRACK', track: v1 },
      { type: 'ADD_TRACK', track: v2 },
      { type: 'ADD_TRACK', track: a1 },
    ],
  } as any);

  // Add sample clips to V1
  engine.dispatch({
    id: 'init-clips-v1',
    label: 'Add clips to V1',
    timestamp: Date.now(),
    operations: [
      {
        type: 'INSERT_CLIP',
        trackId: 'v1',
        clip: {
          id: 'clip-intro',
          trackId: 'v1',
          name: 'Intro',
          timelineStart: 0,
          timelineEnd: 450,
          mediaIn: 0,
          mediaOut: 450,
          type: 'video',
        },
      },
      {
        type: 'INSERT_CLIP',
        trackId: 'v1',
        clip: {
          id: 'clip-main',
          trackId: 'v1',
          name: 'Main Section',
          timelineStart: 480,
          timelineEnd: 1500,
          mediaIn: 0,
          mediaOut: 1020,
          type: 'video',
        },
      },
      {
        type: 'INSERT_CLIP',
        trackId: 'v1',
        clip: {
          id: 'clip-outro',
          trackId: 'v1',
          name: 'Outro',
          timelineStart: 1530,
          timelineEnd: 2100,
          mediaIn: 0,
          mediaOut: 570,
          type: 'video',
        },
      },
    ],
  } as any);

  // Add clips to V2
  engine.dispatch({
    id: 'init-clips-v2',
    label: 'Add clips to V2',
    timestamp: Date.now(),
    operations: [
      {
        type: 'INSERT_CLIP',
        trackId: 'v2',
        clip: {
          id: 'clip-broll-1',
          trackId: 'v2',
          name: 'B-Roll A',
          timelineStart: 150,
          timelineEnd: 750,
          mediaIn: 0,
          mediaOut: 600,
          type: 'video',
        },
      },
      {
        type: 'INSERT_CLIP',
        trackId: 'v2',
        clip: {
          id: 'clip-broll-2',
          trackId: 'v2',
          name: 'B-Roll B',
          timelineStart: 900,
          timelineEnd: 1350,
          mediaIn: 0,
          mediaOut: 450,
          type: 'video',
        },
      },
    ],
  } as any);

  // Add clips to A1
  engine.dispatch({
    id: 'init-clips-a1',
    label: 'Add clips to A1',
    timestamp: Date.now(),
    operations: [
      {
        type: 'INSERT_CLIP',
        trackId: 'a1',
        clip: {
          id: 'clip-music',
          trackId: 'a1',
          name: 'Background Music',
          timelineStart: 0,
          timelineEnd: 2100,
          mediaIn: 0,
          mediaOut: 2100,
          type: 'audio',
        },
      },
      {
        type: 'INSERT_CLIP',
        trackId: 'a1',
        clip: {
          id: 'clip-voiceover',
          trackId: 'a1',
          name: 'Voiceover',
          timelineStart: 300,
          timelineEnd: 1800,
          mediaIn: 0,
          mediaOut: 1500,
          type: 'audio',
        },
      },
    ],
  } as any);

  // Seek to frame 300 (10 seconds in)
  engine.seekTo(toFrame(300));

  return engine;
}
