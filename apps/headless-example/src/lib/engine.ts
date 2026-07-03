/**
 * Engine setup for the headless example.
 *
 * Demonstrates how to bootstrap @timelinx/core from scratch
 * without any @timelinx/ui dependency.
 */
import {
  createTimeline,
  createTimelineState,
  createTrack,
  createClip,
  createAsset,
  toFrame,
  frameRate,
} from '@timelinx/core';
import type { TimelineState, Asset, Track, Timecode, AssetId, PipelineConfig, VideoFrameResult, CompositeResult } from '@timelinx/core';
import { TimelineEngine } from '@timelinx/react';

let engine: TimelineEngine | null = null;

const mockPipeline: PipelineConfig = {
  videoDecoder: async (request): Promise<VideoFrameResult> => ({
    clipId: request.clipId,
    mediaFrame: request.mediaFrame,
    width: 1920,
    height: 1080,
    bitmap: null,
  }),
  compositor: async (request): Promise<CompositeResult> => ({
    timelineFrame: request.timelineFrame,
    bitmap: null,
  }),
};

export function getEngine(): TimelineEngine {
  if (engine) return engine;

  const fps = frameRate(30);

  const videoAsset1 = createAsset({
    id: 'asset-clip-a',
    name: 'Interview A-Cam',
    mediaType: 'video',
    intrinsicDuration: toFrame(600),
    nativeFps: fps,
    filePath: '',
    sourceTimecodeOffset: toFrame(0),
  });

  const videoAsset2 = createAsset({
    id: 'asset-clip-b',
    name: 'B-Roll Cityscape',
    mediaType: 'video',
    intrinsicDuration: toFrame(300),
    nativeFps: fps,
    filePath: '',
    sourceTimecodeOffset: toFrame(0),
  });

  const audioAsset1 = createAsset({
    id: 'asset-music',
    name: 'Background Music',
    mediaType: 'audio',
    intrinsicDuration: toFrame(900),
    nativeFps: fps,
    filePath: '',
    sourceTimecodeOffset: toFrame(0),
  });

  const v1Track = createTrack({
    id: 'track-v1',
    name: 'V1',
    type: 'video',
    height: 80,
    clips: [
      createClip({
        id: 'clip-a-1',
        assetId: videoAsset1.id,
        trackId: 'track-v1',
        timelineStart: toFrame(0),
        timelineEnd: toFrame(270),
        mediaIn: toFrame(0),
        mediaOut: toFrame(270),
        name: 'Interview',
      }),
      createClip({
        id: 'clip-b-1',
        assetId: videoAsset2.id,
        trackId: 'track-v1',
        timelineStart: toFrame(300),
        timelineEnd: toFrame(540),
        mediaIn: toFrame(0),
        mediaOut: toFrame(240),
        name: 'B-Roll',
      }),
      createClip({
        id: 'clip-a-2',
        assetId: videoAsset1.id,
        trackId: 'track-v1',
        timelineStart: toFrame(570),
        timelineEnd: toFrame(810),
        mediaIn: toFrame(270),
        mediaOut: toFrame(510),
        name: 'Interview 2',
      }),
    ],
  });

  const v2Track = createTrack({
    id: 'track-v2',
    name: 'V2',
    type: 'video',
    height: 80,
    clips: [
      createClip({
        id: 'clip-overlay',
        assetId: videoAsset1.id,
        trackId: 'track-v2',
        timelineStart: toFrame(90),
        timelineEnd: toFrame(330),
        mediaIn: toFrame(100),
        mediaOut: toFrame(340),
        name: 'Title Card',
      }),
    ],
  });

  const a1Track = createTrack({
    id: 'track-a1',
    name: 'A1',
    type: 'audio',
    height: 64,
    clips: [
      createClip({
        id: 'clip-music',
        assetId: audioAsset1.id,
        trackId: 'track-a1',
        timelineStart: toFrame(0),
        timelineEnd: toFrame(810),
        mediaIn: toFrame(0),
        mediaOut: toFrame(810),
        name: 'Music',
      }),
    ],
  });

  const assetRegistry = new Map<AssetId, Asset>([
    [videoAsset1.id, videoAsset1],
    [videoAsset2.id, videoAsset2],
    [audioAsset1.id, audioAsset1],
  ]);

  const timeline = createTimeline({
    id: 'headless-demo',
    name: 'Headless Demo',
    fps,
    duration: toFrame(2700),
    startTimecode: '01:00:00:00' as Timecode,
    tracks: [v1Track, v2Track, a1Track],
  });

  const state = createTimelineState({ timeline, assetRegistry });

  engine = new TimelineEngine({ initialState: state, pipeline: mockPipeline });

  return engine;
}

export function resetEngine(): void {
  engine = null;
}
