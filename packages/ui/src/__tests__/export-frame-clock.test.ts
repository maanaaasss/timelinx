import { describe, expect, it } from 'vitest';
import {
  advanceExportFrameClock,
  getExportDurationFrames,
} from '../hooks/use-export';
import {
  createClip,
  createTimeline,
  createTimelineState,
  createTrack,
  frameRate,
  toFrame,
} from '@timelinx/core';

describe('advanceExportFrameClock', () => {
  it('keeps frame 0 until enough elapsed time accumulates for a whole frame', () => {
    const result = advanceExportFrameClock({
      currentFrame: 0,
      frameAccum: 0,
      elapsedMs: 16,
      fps: 30,
      durationFrames: 300,
    });

    expect(result.currentFrame).toBe(0);
    expect(result.frameAccum).toBeCloseTo(0.48, 10);
  });

  it('advances frames from elapsed time without reading a playback snapshot', () => {
    const result = advanceExportFrameClock({
      currentFrame: 0,
      frameAccum: 0,
      elapsedMs: 100,
      fps: 30,
      durationFrames: 300,
    });

    expect(result.currentFrame).toBe(3);
    expect(result.frameAccum).toBeCloseTo(0, 10);
  });

  it('preserves fractional frame carry between ticks', () => {
    const first = advanceExportFrameClock({
      currentFrame: 0,
      frameAccum: 0,
      elapsedMs: 20,
      fps: 30,
      durationFrames: 300,
    });
    const second = advanceExportFrameClock({
      currentFrame: first.currentFrame,
      frameAccum: first.frameAccum,
      elapsedMs: 20,
      fps: 30,
      durationFrames: 300,
    });

    expect(first.currentFrame).toBe(0);
    expect(second.currentFrame).toBe(1);
    expect(second.frameAccum).toBeCloseTo(0.2, 10);
  });

  it('caps large timestamp jumps and leaves the remainder to catch up later', () => {
    const result = advanceExportFrameClock({
      currentFrame: 10,
      frameAccum: 0,
      elapsedMs: 1000,
      fps: 30,
      durationFrames: 300,
    });

    expect(result.currentFrame).toBe(13);
    expect(result.frameAccum).toBeCloseTo(27, 10);
  });

  it('clamps at the final timeline frame', () => {
    const result = advanceExportFrameClock({
      currentFrame: 298,
      frameAccum: 0,
      elapsedMs: 100,
      fps: 30,
      durationFrames: 300,
    });

    expect(result.currentFrame).toBe(299);
    expect(result.frameAccum).toBeCloseTo(0, 10);
  });
});

describe('getExportDurationFrames', () => {
  it('falls back to one frame for an empty zero-duration timeline', () => {
    const state = createTimelineState({
      timeline: createTimeline({
        id: 't',
        name: 'Empty',
        fps: frameRate(30),
        duration: toFrame(0),
      }),
    });

    expect(getExportDurationFrames(state)).toBe(1);
  });

  it('uses actual content end when timeline duration is stale after trimming audio', () => {
    const imageClip = createClip({
      id: 'image-clip',
      assetId: 'image-asset',
      trackId: 'v1',
      timelineStart: toFrame(0),
      timelineEnd: toFrame(150),
      mediaIn: toFrame(0),
      mediaOut: toFrame(150),
    });
    const trimmedAudioClip = createClip({
      id: 'audio-clip',
      assetId: 'audio-asset',
      trackId: 'a1',
      timelineStart: toFrame(0),
      timelineEnd: toFrame(90),
      mediaIn: toFrame(0),
      mediaOut: toFrame(90),
    });

    const state = createTimelineState({
      timeline: createTimeline({
        id: 't',
        name: 'Trimmed export',
        fps: frameRate(30),
        duration: toFrame(1200),
        tracks: [
          createTrack({
            id: 'v1',
            name: 'Video',
            type: 'video',
            clips: [imageClip],
          }),
          createTrack({
            id: 'a1',
            name: 'Audio',
            type: 'audio',
            clips: [trimmedAudioClip],
          }),
        ],
      }),
    });

    expect(getExportDurationFrames(state)).toBe(150);
  });

  it('preserves leading gaps by exporting through the last content frame', () => {
    const state = createTimelineState({
      timeline: createTimeline({
        id: 't',
        name: 'Gapped',
        fps: frameRate(30),
        duration: toFrame(10),
        tracks: [
          createTrack({
            id: 'v1',
            name: 'Video',
            type: 'video',
            clips: [
              createClip({
                id: 'late-clip',
                assetId: 'image-asset',
                trackId: 'v1',
                timelineStart: toFrame(120),
                timelineEnd: toFrame(180),
                mediaIn: toFrame(0),
                mediaOut: toFrame(60),
              }),
            ],
          }),
        ],
      }),
    });

    expect(getExportDurationFrames(state)).toBe(180);
  });
});
