import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import {
  createTimeline,
  createTimelineState,
  createTrack,
  createClip,
  createAsset,
  toFrame,
  frameRate,
  toTrackId,
} from '@timelinx/core';
import { TimelineEngine } from '@timelinx/react';
import { TimelineCtx } from '../context/timeline-context';
import { Clip } from '../components/timeline/clip';

function createTestSetup() {
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
    duration: toFrame(9000),
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
        timelineStart: toFrame(100),
        timelineEnd: toFrame(500),
        mediaIn: toFrame(0),
        mediaOut: toFrame(400),
      }),
    ],
  });

  const track2 = createTrack({
    id: 'v2',
    name: 'V2',
    type: 'video',
    clips: [
      createClip({
        id: 'clip-2',
        assetId: 'asset-1',
        trackId: 'v2',
        timelineStart: toFrame(100),
        timelineEnd: toFrame(500),
        mediaIn: toFrame(0),
        mediaOut: toFrame(400),
      }),
    ],
  });

  const assetRegistry = new Map([[asset.id, asset]]);
  const state = createTimelineState({
    timeline: { ...timeline, tracks: [track1, track2] },
    assetRegistry,
  });

  const engine = new TimelineEngine({ initialState: state });
  return { engine, track1, track2 };
}

describe('Clip Razor Tool End-to-End', () => {
  it('splits clip via engine.handlePointerDown/Up when in razor mode', () => {
    const { engine, track1 } = createTestSetup();
    engine.activateTool('razor');

    const initialClips = engine.getState().timeline.tracks[0].clips;
    expect(initialClips).toHaveLength(1);

    const clip = initialClips[0];
    const ppf = 10;

    const { container } = render(
      <TimelineCtx.Provider value={{ engine, ppf, setPpf: () => {} }}>
        <Clip
          clip={clip}
          clipType="video"
          ppf={ppf}
          engine={engine}
          isSelected={false}
        />
      </TimelineCtx.Provider>
    );

    const clipEl = container.querySelector('.tl-v2-clip') as HTMLElement;
    expect(clipEl).not.toBeNull();

    // Mock getBoundingClientRect
    vi.spyOn(clipEl, 'getBoundingClientRect').mockReturnValue({
      left: 1000,
      top: 100,
      width: 4000,
      height: 80,
      x: 1000,
      y: 100,
      bottom: 180,
      right: 5000,
      toJSON: () => {},
    });

    // Click at offset 1000px into clip element = 100 frames from timelineStart (atFrame = 200)
    fireEvent.click(clipEl, {
      clientX: 2000,
      clientY: 140,
    });

    const updatedClips = engine.getState().timeline.tracks[0].clips;
    expect(updatedClips).toHaveLength(2);
    expect(updatedClips[0].timelineStart).toBe(100);
    expect(updatedClips[0].timelineEnd).toBe(200);
    expect(updatedClips[1].timelineStart).toBe(200);
    expect(updatedClips[1].timelineEnd).toBe(500);
  });

  it('slices across all tracks on Shift+click in razor mode', () => {
    const { engine, track1 } = createTestSetup();
    engine.activateTool('razor');

    const state = engine.getState();
    expect(state.timeline.tracks[0].clips).toHaveLength(1);
    expect(state.timeline.tracks[1].clips).toHaveLength(1);

    const clip = state.timeline.tracks[0].clips[0];
    const ppf = 10;

    const { container } = render(
      <TimelineCtx.Provider value={{ engine, ppf, setPpf: () => {} }}>
        <Clip
          clip={clip}
          clipType="video"
          ppf={ppf}
          engine={engine}
          isSelected={false}
        />
      </TimelineCtx.Provider>
    );

    const clipEl = container.querySelector('.tl-v2-clip') as HTMLElement;

    vi.spyOn(clipEl, 'getBoundingClientRect').mockReturnValue({
      left: 1000,
      top: 100,
      width: 4000,
      height: 80,
      x: 1000,
      y: 100,
      bottom: 180,
      right: 5000,
      toJSON: () => {},
    });

    // Shift+click at offset 1000px (atFrame = 200)
    fireEvent.click(clipEl, {
      clientX: 2000,
      clientY: 140,
      shiftKey: true,
    });

    const updatedState = engine.getState();
    // Both tracks should have been sliced at frame 200
    expect(updatedState.timeline.tracks[0].clips).toHaveLength(2);
    expect(updatedState.timeline.tracks[1].clips).toHaveLength(2);
  });
});
