import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import {
  createTimeline,
  createTimelineState,
  createTrack,
  createClip,
  createAsset,
  toFrame,
  frameRate,
} from '@timelinx/core';
import { TimelineEngine } from '@timelinx/react';
import { TimelineProvider } from '../context/timeline-context';
import { TimelineLayout, TimelineLayoutV3 } from '../components/timeline/timeline-layout';

function createPopulatedEngine() {
  const asset = createAsset({
    id: 'asset-1',
    name: 'Video.mp4',
    mediaType: 'video',
    filePath: '/media/video.mp4',
    intrinsicDuration: toFrame(3000),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  const timeline = createTimeline({
    id: 'tl-1',
    name: 'Test Timeline',
    fps: frameRate(30),
    duration: toFrame(300),
  });

  const track1 = createTrack({
    id: 'v1',
    name: 'V1',
    type: 'video',
    clips: [
      createClip({
        id: 'clip-1',
        assetId: 'asset-1',
        trackId: 'v1',
        timelineStart: toFrame(0),
        timelineEnd: toFrame(200),
        mediaIn: toFrame(0),
        mediaOut: toFrame(200),
      }),
    ],
  });

  const assetRegistry = new Map([[asset.id, asset]]);
  const state = createTimelineState({
    timeline: { ...timeline, tracks: [track1] },
    assetRegistry,
  });

  const engine = new TimelineEngine({ initialState: state });
  return { engine, asset, track1 };
}

function createEmptyEngine() {
  const timeline = createTimeline({
    id: 'tl-empty',
    name: 'Empty Timeline',
    fps: frameRate(30),
    duration: toFrame(0),
  });

  const state = createTimelineState({
    timeline: { ...timeline, tracks: [] },
  });

  return new TimelineEngine({ initialState: state });
}

describe('TimelineLayout V3', () => {
  it('renders V3 layout with V3 toolbar, V3 ruler, and tracks by default', () => {
    const { engine } = createPopulatedEngine();

    const { container } = render(
      <TimelineProvider engine={engine} initialPpf={10}>
        <TimelineLayout />
      </TimelineProvider>,
    );

    // Should have V3 class
    const layout = container.querySelector('.tl-layout--v3');
    expect(layout).toBeInTheDocument();

    // Should render TimelineToolbarV3
    const toolbar = container.querySelector('.tl-toolbar-v3');
    expect(toolbar).toBeInTheDocument();

    // Should render TimelineRulerV3 track
    const ruler = container.querySelector('.tl-ruler-v3-track');
    expect(ruler).toBeInTheDocument();

    // Should render track area
    const trackArea = container.querySelector('.tl-track-area');
    expect(trackArea).toBeInTheDocument();

    // Should render clip
    const clip = container.querySelector('.tl-v2-clip');
    expect(clip).toBeInTheDocument();
  });

  it('renders TimelineEmptyState when engine has no tracks or clips', () => {
    const emptyEngine = createEmptyEngine();
    const onUpload = vi.fn();

    const { container } = render(
      <TimelineProvider engine={emptyEngine} initialPpf={10}>
        <TimelineLayoutV3 onEmptyUpload={onUpload} />
      </TimelineProvider>,
    );

    // Empty state should be visible
    const emptyState = container.querySelector('.tl-empty-state-v3');
    expect(emptyState).toBeInTheDocument();

    if (emptyState) {
      fireEvent.click(emptyState);
      expect(onUpload).toHaveBeenCalledTimes(1);
    }
  });

  it('performs Cut action on clip at playhead', () => {
    const { engine } = createPopulatedEngine();

    // Seek to frame 100 (in the middle of clip-1 which is 0..200)
    engine.seekTo(toFrame(100));

    const { container } = render(
      <TimelineProvider engine={engine} initialPpf={10}>
        <TimelineLayoutV3 />
      </TimelineProvider>,
    );

    // Click scissors (cut) button
    const cutBtn = container.querySelector('[data-action="cut"]') as HTMLButtonElement;
    expect(cutBtn).toBeInTheDocument();

    fireEvent.click(cutBtn);

    // Clips on track 0 should now be split into 2
    const clips = engine.getState().timeline.tracks[0].clips;
    expect(clips).toHaveLength(2);
    expect(clips[0].timelineStart).toBe(0);
    expect(clips[0].timelineEnd).toBe(100);
    expect(clips[1].timelineStart).toBe(100);
    expect(clips[1].timelineEnd).toBe(200);
  });

  it('performs Delete action on selected clip', () => {
    const { engine } = createPopulatedEngine();

    // Select clip-1
    engine.setSelectedClipIds(new Set(['clip-1']));
    expect(engine.getSelectedClipIds()).toContain('clip-1');

    const { container } = render(
      <TimelineProvider engine={engine} initialPpf={10}>
        <TimelineLayoutV3 />
      </TimelineProvider>,
    );

    // Click trash (delete) button
    const deleteBtn = container.querySelector('[data-action="delete"]') as HTMLButtonElement;
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    // Clips on track 0 should now be 0
    const clips = engine.getState().timeline.tracks[0].clips;
    expect(clips).toHaveLength(0);
  });

  it('handles transport: play/pause, skip to start, and skip to end', () => {
    const { engine } = createPopulatedEngine();
    engine.seekTo(toFrame(100));

    const { container } = render(
      <TimelineProvider engine={engine} initialPpf={10}>
        <TimelineLayoutV3 />
      </TimelineProvider>,
    );

    // Skip to start
    const skipStartBtn = container.querySelector('[data-action="skip-start"]') as HTMLButtonElement;
    expect(skipStartBtn).toBeInTheDocument();
    fireEvent.click(skipStartBtn);
    expect(engine.getPlayheadFrame()).toBe(0);

    // Skip to end (clamps to duration - 1)
    const skipEndBtn = container.querySelector('[data-action="skip-end"]') as HTMLButtonElement;
    expect(skipEndBtn).toBeInTheDocument();
    fireEvent.click(skipEndBtn);
    expect(engine.getPlayheadFrame()).toBe(Math.max(0, (engine.getState().timeline.duration as number) - 1));

    // Play/Pause button
    const playBtn = container.querySelector('[data-action="play"]') as HTMLButtonElement;
    expect(playBtn).toBeInTheDocument();
    fireEvent.click(playBtn);
    // After clicking play, playing state toggles
    const pauseBtn = container.querySelector('[data-action="pause"]') as HTMLButtonElement;
    expect(pauseBtn).toBeInTheDocument();
    fireEvent.click(pauseBtn);
  });

  it('handles Zoom In, Zoom Out, and Zoom Fit', () => {
    const { engine } = createPopulatedEngine();

    const { container } = render(
      <TimelineProvider engine={engine} initialPpf={10}>
        <TimelineLayoutV3 />
      </TimelineProvider>,
    );

    const zoomInBtn = container.querySelector('[data-action="zoom-in"]') as HTMLButtonElement;
    const zoomOutBtn = container.querySelector('[data-action="zoom-out"]') as HTMLButtonElement;
    const zoomFitBtn = container.querySelector('[data-action="zoom-fit"]') as HTMLButtonElement;

    expect(zoomInBtn).toBeInTheDocument();
    expect(zoomOutBtn).toBeInTheDocument();
    expect(zoomFitBtn).toBeInTheDocument();

    fireEvent.click(zoomInBtn);
    fireEvent.click(zoomOutBtn);
    fireEvent.click(zoomFitBtn);
  });
});
