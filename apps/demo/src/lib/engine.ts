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
    id: 'asset-intro',
    name: 'Intro Sequence',
    mediaType: 'video',
    intrinsicDuration: toFrame(300),
    nativeFps: fps,
    filePath: '',
    sourceTimecodeOffset: toFrame(0),
  });

  const videoAsset2 = createAsset({
    id: 'asset-interview',
    name: 'Interview A-Cam',
    mediaType: 'video',
    intrinsicDuration: toFrame(600),
    nativeFps: fps,
    filePath: '',
    sourceTimecodeOffset: toFrame(0),
  });

  const videoAsset3 = createAsset({
    id: 'asset-broll-1',
    name: 'B-Roll Cityscape',
    mediaType: 'video',
    intrinsicDuration: toFrame(240),
    nativeFps: fps,
    filePath: '',
    sourceTimecodeOffset: toFrame(0),
  });

  const audioAsset1 = createAsset({
    id: 'asset-music',
    name: 'Background Music',
    mediaType: 'audio',
    intrinsicDuration: toFrame(1200),
    nativeFps: fps,
    filePath: '',
    sourceTimecodeOffset: toFrame(0),
  });

  const audioAsset2 = createAsset({
    id: 'asset-voiceover',
    name: 'Voiceover Take 3',
    mediaType: 'audio',
    intrinsicDuration: toFrame(500),
    nativeFps: fps,
    filePath: '',
    sourceTimecodeOffset: toFrame(0),
  });

  const subtitleAsset = createAsset({
    id: 'asset-subs',
    name: 'Captions SRT',
    mediaType: 'subtitle',
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
        id: 'clip-intro',
        assetId: videoAsset1.id,
        trackId: 'track-v1',
        timelineStart: toFrame(0),
        timelineEnd: toFrame(270),
        mediaIn: toFrame(0),
        mediaOut: toFrame(270),
        name: 'Intro',
      }),
      createClip({
        id: 'clip-interview',
        assetId: videoAsset2.id,
        trackId: 'track-v1',
        timelineStart: toFrame(300),
        timelineEnd: toFrame(750),
        mediaIn: toFrame(0),
        mediaOut: toFrame(450),
        name: 'Interview',
      }),
      createClip({
        id: 'clip-broll',
        assetId: videoAsset3.id,
        trackId: 'track-v1',
        timelineStart: toFrame(780),
        timelineEnd: toFrame(960),
        mediaIn: toFrame(0),
        mediaOut: toFrame(180),
        name: 'B-Roll',
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
        timelineStart: toFrame(150),
        timelineEnd: toFrame(400),
        mediaIn: toFrame(50),
        mediaOut: toFrame(300),
        name: 'Title Overlay',
      }),
      createClip({
        id: 'clip-broll2',
        assetId: videoAsset3.id,
        trackId: 'track-v2',
        timelineStart: toFrame(600),
        timelineEnd: toFrame(800),
        mediaIn: toFrame(30),
        mediaOut: toFrame(230),
        name: 'B-Roll Cutaway',
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
        timelineEnd: toFrame(960),
        mediaIn: toFrame(0),
        mediaOut: toFrame(960),
        name: 'Music',
      }),
    ],
  });

  const a2Track = createTrack({
    id: 'track-a2',
    name: 'A2',
    type: 'audio',
    height: 64,
    clips: [
      createClip({
        id: 'clip-vo',
        assetId: audioAsset2.id,
        trackId: 'track-a2',
        timelineStart: toFrame(60),
        timelineEnd: toFrame(510),
        mediaIn: toFrame(0),
        mediaOut: toFrame(450),
        name: 'Voiceover',
      }),
      createClip({
        id: 'clip-vo2',
        assetId: audioAsset2.id,
        trackId: 'track-a2',
        timelineStart: toFrame(540),
        timelineEnd: toFrame(750),
        mediaIn: toFrame(50),
        mediaOut: toFrame(260),
        name: 'VO Continuation',
      }),
    ],
  });

  const s1Track = createTrack({
    id: 'track-s1',
    name: 'S1',
    type: 'subtitle',
    height: 48,
  });

  const assetRegistry = new Map<AssetId, Asset>([
    [videoAsset1.id, videoAsset1],
    [videoAsset2.id, videoAsset2],
    [videoAsset3.id, videoAsset3],
    [audioAsset1.id, audioAsset1],
    [audioAsset2.id, audioAsset2],
    [subtitleAsset.id, subtitleAsset],
  ]);

  const timeline = createTimeline({
    id: 'demo-timeline',
    name: 'Demo Project',
    fps,
    duration: toFrame(2700),
    startTimecode: '01:00:00:00' as Timecode,
    tracks: [v1Track, v2Track, a1Track, a2Track, s1Track],
  });

  const state = createTimelineState({ timeline, assetRegistry });

  engine = new TimelineEngine({ initialState: state, pipeline: mockPipeline });

  return engine;
}

export function resetEngine(): void {
  engine = null;
}
