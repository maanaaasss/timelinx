import {
  createTrack,
  createTimeline,
  createTimelineState,
  toFrame,
  frameRate,
  browserClock,
} from '@timelinx/core';
import type { PipelineConfig } from '@timelinx/core';
import { TimelineEngine } from '@timelinx/react';

const stubPipeline: PipelineConfig = {
  videoDecoder: async (req) => ({
    clipId: req.clipId,
    mediaFrame: req.mediaFrame,
    width: 1920,
    height: 1080,
    bitmap: null,
  }),
  compositor: async (req) => ({
    timelineFrame: req.timelineFrame,
    bitmap: null,
  }),
};

/**
 * Creates a blank editor engine with empty tracks.
 * No demo content — users import their own media via the Asset Bin.
 * For demo/sample content, use createDemoEngine() instead.
 */
export function createEditorEngine() {
  const timeline = createTimeline({
    id: 'tl-editor',
    name: 'Editor Timeline',
    fps: frameRate(30),
    duration: toFrame(0),
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

  const titleTrack = createTrack({
    id: 's1',
    name: 'S1 — Titles',
    type: 'video',
  });

  const state = createTimelineState({
    timeline,
    assetRegistry: new Map(),
  });

  const engine = new TimelineEngine({
    initialState: state,
    pipeline: stubPipeline,
    clock: browserClock,
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
      { type: 'ADD_TRACK', track: titleTrack },
    ],
  });

  return engine;
}
