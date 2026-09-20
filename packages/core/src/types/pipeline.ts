/**
 * Pipeline contracts — Phase 6 Step 2
 *
 * Core defines the CONTRACT (types + interfaces).
 * Host app provides the IMPLEMENTATION.
 * Core never does actual decoding or compositing.
 */

import type { ClipId } from './clip';
import type { TrackId } from './track';
import type { TimelineFrame } from './frame';
import type { PlaybackQuality } from './playhead';

// ---------------------------------------------------------------------------
// Decode contract
// ---------------------------------------------------------------------------

export type VideoFrameRequest = {
  readonly clipId: ClipId;
  readonly mediaFrame: TimelineFrame;
  readonly quality: PlaybackQuality;
};

export type AudioChunkRequest = {
  readonly clipId: ClipId;
  readonly mediaFrame: TimelineFrame;
  readonly durationFrames: number;
  readonly sampleRate: number;
};

export type VideoFrameResult = {
  readonly clipId: ClipId;
  readonly mediaFrame: TimelineFrame;
  readonly width: number;
  readonly height: number;
  readonly bitmap: unknown;
};

export type AudioChunkResult = {
  readonly clipId: ClipId;
  readonly mediaFrame: TimelineFrame;
  readonly samples: unknown;
  readonly sampleRate: number;
};

export type VideoDecoder = (request: VideoFrameRequest) => Promise<VideoFrameResult>;

export type AudioDecoder = (request: AudioChunkRequest) => Promise<AudioChunkResult>;

// ---------------------------------------------------------------------------
// Composite contract
// ---------------------------------------------------------------------------

export type CompositeLayer = {
  readonly clipId: ClipId;
  readonly trackId: TrackId;
  readonly trackIndex: number;
  readonly frame: VideoFrameResult;
  readonly opacity: number;
  readonly blendMode: string;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
};

/** Layer spec from resolveFrame (no decoded frame yet). */
export type ResolvedLayer = {
  readonly clipId: ClipId;
  readonly trackId: TrackId;
  readonly trackIndex: number;
  readonly mediaFrame: TimelineFrame;
  readonly opacity: number;
  readonly blendMode: string;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
};

export type CompositeRequest = {
  readonly timelineFrame: TimelineFrame;
  readonly layers: readonly CompositeLayer[];
  readonly width: number;
  readonly height: number;
  readonly quality: PlaybackQuality;
};

export type CompositeResult = {
  readonly timelineFrame: TimelineFrame;
  readonly bitmap: unknown;
};

/** Result of resolveFrame (layers have mediaFrame, not decoded frame). */
export type ResolvedCompositeRequest = {
  readonly timelineFrame: TimelineFrame;
  readonly layers: readonly ResolvedLayer[];
  readonly width: number;
  readonly height: number;
  readonly quality: PlaybackQuality;
};

export type Compositor = (request: CompositeRequest) => Promise<CompositeResult>;

// ---------------------------------------------------------------------------
// Thumbnail contract
// ---------------------------------------------------------------------------

export type ThumbnailRequest = {
  readonly clipId: ClipId;
  readonly mediaFrame: TimelineFrame;
  readonly width: number;
  readonly height: number;
};

export type ThumbnailResult = {
  readonly clipId: ClipId;
  readonly mediaFrame: TimelineFrame;
  readonly bitmap: unknown;
};

export type ThumbnailProvider = (request: ThumbnailRequest) => Promise<ThumbnailResult>;

// ---------------------------------------------------------------------------
// Pipeline registry
// ---------------------------------------------------------------------------

export type PipelineConfig = {
  readonly videoDecoder: VideoDecoder;
  readonly audioDecoder?: AudioDecoder;
  readonly compositor: Compositor;
  readonly thumbnailProvider?: ThumbnailProvider;
};
