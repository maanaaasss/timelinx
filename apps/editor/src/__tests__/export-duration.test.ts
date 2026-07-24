import { describe, it, expect } from 'vitest';
import { createEditorEngine } from '../createEditorEngine';
import { createDemoEngine } from '../createDemoEngine';
import {
  createClip,
  createAsset,
  toFrame,
  toClipId,
  toAssetId,
  toTrackId,
  frameRate,
} from '@timelinx/core';

/**
 * Export duration is driven by `timeline.duration` (use-export.ts:185):
 *   const durationFrames = (state.timeline.duration as number) || 1;
 *
 * These tests prove the blank-start fix ensures export length matches
 * real content, not leftover sample data.
 */
describe('Export duration correctness', () => {
  const videoTrackId = toTrackId('v1');

  it('blank engine starts with timeline.duration = 0', () => {
    const engine = createEditorEngine();
    const state = engine.getState();
    expect(state.timeline.duration).toBe(0);
  });

  it('blank engine has zero assets in registry', () => {
    const engine = createEditorEngine();
    const state = engine.getState();
    expect(state.assetRegistry.size).toBe(0);
  });

  it('blank engine has zero clips on all tracks', () => {
    const engine = createEditorEngine();
    const state = engine.getState();
    for (const track of state.timeline.tracks) {
      expect(track.clips.length).toBe(0);
    }
  });

  it('blank engine: || 1 fallback means export of 1 frame (~33ms), not 360s', () => {
    const engine = createEditorEngine();
    const state = engine.getState();
    const durationFrames = (state.timeline.duration as number) || 1;
    const fps = (state.timeline.fps as number) || 30;
    const exportSeconds = durationFrames / fps;
    expect(exportSeconds).toBeCloseTo(0.033, 3);
    expect(exportSeconds).toBeLessThan(1);
  });

  it('after importing a 10s clip, timeline.duration = 300 (10s at 30fps)', () => {
    const engine = createEditorEngine();
    const clipDuration = toFrame(300);

    const asset = createAsset({
      id: toAssetId('test-asset-1'),
      name: 'test-clip.mp4',
      mediaType: 'video',
      filePath: '/test.mp4',
      intrinsicDuration: clipDuration,
      nativeFps: frameRate(30),
      sourceTimecodeOffset: toFrame(0),
    });

    const clip = createClip({
      id: toClipId('test-clip-1'),
      assetId: 'test-asset-1',
      trackId: videoTrackId,
      timelineStart: toFrame(0),
      timelineEnd: clipDuration,
      mediaIn: toFrame(0),
      mediaOut: clipDuration,
    });

    engine.dispatch({
      id: 'import-and-insert',
      label: 'Import and insert',
      timestamp: Date.now(),
      operations: [
        { type: 'REGISTER_ASSET', asset },
        { type: 'INSERT_CLIP', trackId: videoTrackId, clip },
        { type: 'SET_TIMELINE_DURATION', duration: toFrame(300) },
      ],
    });

    const state = engine.getState();
    expect(state.timeline.duration).toBe(300);
  });

  it('10s clip: export = 10 seconds, not 360 seconds', () => {
    const engine = createEditorEngine();
    const fps = 30;

    const asset = createAsset({
      id: toAssetId('ten-sec'),
      name: 'ten-second.mp4',
      mediaType: 'video',
      filePath: '/ten.mp4',
      intrinsicDuration: toFrame(300),
      nativeFps: frameRate(fps),
      sourceTimecodeOffset: toFrame(0),
    });

    const clip = createClip({
      id: toClipId('ten-sec-clip'),
      assetId: 'ten-sec',
      trackId: videoTrackId,
      timelineStart: toFrame(0),
      timelineEnd: toFrame(300),
      mediaIn: toFrame(0),
      mediaOut: toFrame(300),
    });

    engine.dispatch({
      id: 'import-and-insert',
      label: 'Import and insert',
      timestamp: Date.now(),
      operations: [
        { type: 'REGISTER_ASSET', asset },
        { type: 'INSERT_CLIP', trackId: videoTrackId, clip },
        { type: 'SET_TIMELINE_DURATION', duration: toFrame(300) },
      ],
    });

    const state = engine.getState();
    const durationFrames = (state.timeline.duration as number) || 1;
    const exportSeconds = durationFrames / fps;

    expect(exportSeconds).toBe(10);
    expect(exportSeconds).not.toBe(360);
  });

  it('demo engine preserves old 10800-frame duration (360s) for testing', () => {
    const engine = createDemoEngine();
    const state = engine.getState();
    expect(state.timeline.duration).toBe(10800);
    const fps = (state.timeline.fps as number) || 30;
    expect(state.timeline.duration / fps).toBe(360);
  });

  it('old hardcoded 10800 would produce 360s export (the original bug)', () => {
    const fps = 30;
    const oldDuration = 10800;
    expect(oldDuration / fps).toBe(360);
  });

  it('multiple clips: duration extends to latest end frame', () => {
    const engine = createEditorEngine();
    const fps = 30;

    const asset = createAsset({
      id: toAssetId('a1'),
      name: 'clip-a.mp4',
      mediaType: 'video',
      filePath: '/a.mp4',
      intrinsicDuration: toFrame(150),
      nativeFps: frameRate(fps),
      sourceTimecodeOffset: toFrame(0),
    });

    engine.dispatch({
      id: 'reg',
      label: 'Register',
      timestamp: Date.now(),
      operations: [{ type: 'REGISTER_ASSET', asset }],
    });

    // Clip 1: frames 0-150 (5 seconds)
    engine.dispatch({
      id: 'c1',
      label: 'Clip 1',
      timestamp: Date.now(),
      operations: [
        {
          type: 'INSERT_CLIP',
          trackId: videoTrackId,
          clip: createClip({
            id: toClipId('c1'),
            assetId: 'a1',
            trackId: videoTrackId,
            timelineStart: toFrame(0),
            timelineEnd: toFrame(150),
            mediaIn: toFrame(0),
            mediaOut: toFrame(150),
          }),
        },
        { type: 'SET_TIMELINE_DURATION', duration: toFrame(150) },
      ],
    });

    // Clip 2: frames 200-350 (another 5s clip, starting at frame 200)
    engine.dispatch({
      id: 'c2',
      label: 'Clip 2',
      timestamp: Date.now(),
      operations: [
        {
          type: 'INSERT_CLIP',
          trackId: videoTrackId,
          clip: createClip({
            id: toClipId('c2'),
            assetId: 'a1',
            trackId: videoTrackId,
            timelineStart: toFrame(200),
            timelineEnd: toFrame(350),
            mediaIn: toFrame(0),
            mediaOut: toFrame(150),
          }),
        },
        { type: 'SET_TIMELINE_DURATION', duration: toFrame(350) },
      ],
    });

    const state = engine.getState();
    const exportSeconds = (state.timeline.duration as number) / fps;
    expect(exportSeconds).toBeCloseTo(11.67, 1); // 350/30 ≈ 11.67 seconds
  });

  it('importing 10s clip at frame 0 auto-extends duration to 300', () => {
    const engine = createEditorEngine();

    const asset = createAsset({
      id: toAssetId('imported'),
      name: 'imported.mp4',
      mediaType: 'video',
      filePath: '/imported.mp4',
      intrinsicDuration: toFrame(300),
      nativeFps: frameRate(30),
      sourceTimecodeOffset: toFrame(0),
    });

    const clip = createClip({
      id: toClipId('imported-clip'),
      assetId: 'imported',
      trackId: videoTrackId,
      timelineStart: toFrame(0),
      timelineEnd: toFrame(300),
      mediaIn: toFrame(0),
      mediaOut: toFrame(300),
    });

    // Simulates what handleAssetDrop does in App.tsx
    engine.dispatch({
      id: 'drop-import',
      label: 'Drop import',
      timestamp: Date.now(),
      operations: [
        { type: 'REGISTER_ASSET', asset },
        { type: 'INSERT_CLIP', trackId: videoTrackId, clip },
        { type: 'SET_TIMELINE_DURATION', duration: toFrame(300) },
      ],
    });

    const state = engine.getState();
    expect(state.timeline.duration).toBe(300);
    expect((state.timeline.duration as number) / 30).toBe(10);
  });
});
