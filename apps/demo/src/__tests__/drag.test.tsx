import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';
import {
  createAsset,
  createClip,
  createTrack,
  createTimeline,
  createTimelineState,
  toFrame,
  frameRate,
  toTrackId,
} from '@timelinx/core';
import { TimelineEngine } from '@timelinx/react';
import { createToolRouter } from '@timelinx/react';

function createTestEngine() {
  const asset = createAsset({
    id: 'asset-video',
    name: 'Video.mp4',
    mediaType: 'video',
    filePath: '/media/video.mp4',
    intrinsicDuration: toFrame(6000),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  const timeline = createTimeline({
    id: 'tl-1',
    name: 'Test Timeline',
    fps: frameRate(30),
    duration: toFrame(10800),
  });

  const track = createTrack({
    id: 'v1',
    name: 'Video Track',
    type: 'video',
  });

  const clip = createClip({
    id: 'clip-1',
    assetId: 'asset-video',
    trackId: 'v1',
    timelineStart: toFrame(100),
    timelineEnd: toFrame(400),
    mediaIn: toFrame(100),
    mediaOut: toFrame(400),
  });

  const state = createTimelineState({
    timeline,
    assetRegistry: new Map([[asset.id, asset]]),
  });

  const engine = new TimelineEngine({ initialState: state });

  engine.dispatch({
    id: 'init',
    label: 'Initialize',
    timestamp: Date.now(),
    operations: [
      { type: 'ADD_TRACK', track },
      { type: 'INSERT_CLIP', trackId: toTrackId('v1'), clip },
    ],
  });

  return engine;
}

function makeFakePointerEvent(overrides: {
  clientX?: number;
  clientY?: number;
  buttons?: number;
  target?: HTMLElement;
  currentTarget?: HTMLElement;
} = {}) {
  return {
    clientX: overrides.clientX ?? 0,
    clientY: overrides.clientY ?? 0,
    buttons: overrides.buttons ?? 1,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ctrlKey: false,
    preventDefault: vi.fn(),
    target: overrides.target ?? null,
    currentTarget: overrides.currentTarget ?? {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 2000, height: 200 }),
    },
  } as any;
}

describe('Demo drag-to-move', () => {
  it('clip starts at timelineStart=100', () => {
    const engine = createTestEngine();
    const state = engine.getState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    expect(Number(clip.timelineStart)).toBe(100);
  });

  it('tool router processes pointer events and dispatches MOVE_CLIP', async () => {
    const engine = createTestEngine();
    const PPF = 2;

    const handlers = createToolRouter({
      engine,
      getPixelsPerFrame: () => PPF,
    });

    // Create a fake DOM structure: container > track > clip
    const clipEl = document.createElement('div');
    clipEl.dataset.clipId = 'clip-1';
    clipEl.dataset.trackId = 'v1';
    clipEl.getBoundingClientRect = () => ({
      left: 200, top: 0, width: 600, height: 50,
      right: 800, bottom: 50, x: 200, y: 0, toJSON: () => {},
    });

    const container = document.createElement('div');
    container.dataset.timelineContainer = 'true';
    container.appendChild(clipEl);
    container.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 2000, height: 200,
      right: 2000, bottom: 200, x: 0, y: 0, toJSON: () => {},
    });

    // Pointer down on clip at x=300 (container-relative)
    const down = makeFakePointerEvent({
      clientX: 300,
      clientY: 25,
      buttons: 1,
      target: clipEl,
      currentTarget: container,
    });
    act(() => {
      handlers.onPointerDown(down);
    });

    // Move past threshold: 50px right
    const move1 = makeFakePointerEvent({
      clientX: 350,
      clientY: 25,
      buttons: 1,
      target: clipEl,
      currentTarget: container,
    });
    act(() => {
      handlers.onPointerMove(move1);
    });

    // The tool router uses requestAnimationFrame, so flush it
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    // The provisional state should show the clip has moved
    const provisional = engine.getSnapshot().provisional;
    if (provisional && provisional.clips.length > 0) {
      expect(Number(provisional.clips[0]!.timelineStart)).not.toBe(100);
    }

    // Pointer up to commit the move
    const up = makeFakePointerEvent({
      clientX: 350,
      clientY: 25,
      buttons: 0,
      target: clipEl,
      currentTarget: container,
    });
    act(() => {
      handlers.onPointerUp(up);
    });

    const stateAfterUp = engine.getState();
    const clipAfterUp = stateAfterUp.timeline.tracks[0]!.clips[0]!;
    // After pointer up with drag, the clip should have moved
    expect(Number(clipAfterUp.timelineStart)).not.toBe(100);
  });

  it('click without drag does not move clip', async () => {
    const engine = createTestEngine();
    const PPF = 2;

    const handlers = createToolRouter({
      engine,
      getPixelsPerFrame: () => PPF,
    });

    const clipEl = document.createElement('div');
    clipEl.dataset.clipId = 'clip-1';
    clipEl.dataset.trackId = 'v1';
    clipEl.getBoundingClientRect = () => ({
      left: 200, top: 0, width: 600, height: 50,
      right: 800, bottom: 50, x: 200, y: 0, toJSON: () => {},
    });

    const container = document.createElement('div');
    container.dataset.timelineContainer = 'true';
    container.appendChild(clipEl);
    container.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 2000, height: 200,
      right: 2000, bottom: 200, x: 0, y: 0, toJSON: () => {},
    });

    // Pointer down
    const down = makeFakePointerEvent({
      clientX: 300,
      clientY: 25,
      buttons: 1,
      target: clipEl,
      currentTarget: container,
    });
    act(() => {
      handlers.onPointerDown(down);
    });

    // Move only 2px (below 4px threshold)
    const move = makeFakePointerEvent({
      clientX: 302,
      clientY: 25,
      buttons: 1,
      target: clipEl,
      currentTarget: container,
    });
    act(() => {
      handlers.onPointerMove(move);
    });

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    // Pointer up
    const up = makeFakePointerEvent({
      clientX: 302,
      clientY: 25,
      buttons: 0,
      target: clipEl,
      currentTarget: container,
    });
    act(() => {
      handlers.onPointerUp(up);
    });

    const state = engine.getState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    // Should NOT have moved
    expect(Number(clip.timelineStart)).toBe(100);
  });
});
