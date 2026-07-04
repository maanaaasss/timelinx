/**
 * Fixture builders for tests.
 *
 * Provides reusable, composable functions for constructing TimelineState
 * objects with sensible defaults. Override any field as needed.
 *
 * Usage:
 *   import { buildState, buildClip, buildTrack, buildAsset } from './helpers/buildState';
 *   const state = buildState({ tracks: [buildTrack('v1', 'video', [buildClip('c1')])] });
 */

import { createTimelineState } from '../../types/state';
import { createTimeline } from '../../types/timeline';
import { createTrack, toTrackId } from '../../types/track';
import { createClip, toClipId } from '../../types/clip';
import { createAsset, toAssetId } from '../../types/asset';
import { toFrame, toTimecode, frameRate } from '../../types/frame';
import type { TimelineState } from '../../types/state';
import type { Track, TrackId, TrackType } from '../../types/track';
import type { Clip, ClipId } from '../../types/clip';
import type { Asset, AssetId } from '../../types/asset';
import type { TimelineFrame, FrameRate } from '../../types/frame';

// ── Asset builder ────────────────────────────────────────────────────────────

export function buildAsset(overrides: {
  id?: string;
  name?: string;
  mediaType?: TrackType;
  intrinsicDuration?: number;
  fps?: FrameRate;
} = {}): Asset {
  const id = overrides.id ?? 'asset-1';
  return createAsset({
    id,
    name: overrides.name ?? `Asset ${id}`,
    mediaType: overrides.mediaType ?? 'video',
    filePath: `/media/${id}.mp4`,
    intrinsicDuration: toFrame(overrides.intrinsicDuration ?? 600),
    nativeFps: overrides.fps ?? 30,
    sourceTimecodeOffset: toFrame(0),
    status: 'online',
  });
}

// ── Clip builder ─────────────────────────────────────────────────────────────

export function buildClip(overrides: {
  id?: string;
  assetId?: string;
  trackId?: string;
  start?: number;
  end?: number;
  mediaIn?: number;
  mediaOut?: number;
  speed?: number;
} = {}): Clip {
  const id = overrides.id ?? 'clip-1';
  const start = overrides.start ?? 0;
  const end = overrides.end ?? 100;
  const mediaIn = overrides.mediaIn ?? start;
  const mediaOut = overrides.mediaOut ?? end;
  return createClip({
    id,
    assetId: overrides.assetId ?? 'asset-1',
    trackId: overrides.trackId ?? 'track-1',
    timelineStart: toFrame(start),
    timelineEnd: toFrame(end),
    mediaIn: toFrame(mediaIn),
    mediaOut: toFrame(mediaOut),
    speed: overrides.speed ?? 1.0,
  });
}

// ── Track builder ────────────────────────────────────────────────────────────

export function buildTrack(
  id: string,
  type: TrackType,
  clips: Clip[] = [],
  overrides: { locked?: boolean; muted?: boolean } = {},
): Track {
  return createTrack({
    id,
    name: `Track ${id}`,
    type,
    clips,
    locked: overrides.locked ?? false,
    muted: overrides.muted ?? false,
  });
}

// ── State builder ────────────────────────────────────────────────────────────

export interface StateBuilderParams {
  assets?: Asset[];
  tracks?: Track[];
  duration?: number;
  fps?: FrameRate;
}

/**
 * Build a complete TimelineState from minimal inputs.
 * Auto-creates a default video asset and track with one clip if none provided.
 */
export function buildState(params: StateBuilderParams = {}): TimelineState {
  const assets = params.assets ?? [buildAsset()];
  const duration = params.duration ?? 3000;

  let tracks = params.tracks;
  if (!tracks) {
    const clip = buildClip();
    const track = buildTrack('track-1', 'video', [clip]);
    tracks = [track];
  }

  const timeline = createTimeline({
    id: 'tl',
    name: 'Test Timeline',
    fps: params.fps ?? 30,
    duration: toFrame(duration),
    startTimecode: toTimecode('00:00:00:00'),
    tracks,
  });

  const registry = new Map<AssetId, Asset>(
    assets.map(a => [a.id as AssetId, a]),
  );

  return createTimelineState({ timeline, assetRegistry: registry });
}

// ── Multi-track state builder ────────────────────────────────────────────────

export function buildMultiTrackState(config: {
  tracks: Array<{ id: string; type: TrackType; clips: Array<{ id: string; start: number; end: number }> }>;
  duration?: number;
  assetDuration?: number;
}): TimelineState {
  const assetId = 'asset-1';
  const asset = buildAsset({ id: assetId, intrinsicDuration: config.assetDuration ?? 9000 });

  const tracks = config.tracks.map(t =>
    buildTrack(
      t.id,
      t.type,
      t.clips.map(c =>
        buildClip({
          id: c.id,
          assetId,
          trackId: t.id,
          start: c.start,
          end: c.end,
          mediaIn: c.start,
          mediaOut: c.end,
        }),
      ),
    ),
  );

  return buildState({
    assets: [asset],
    tracks,
    duration: config.duration ?? 9000,
  });
}
