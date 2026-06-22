import { describe, it, expect } from 'vitest';
import {
  validateClip,
  validateTrack,
  validateTimeline,
  validateNoOverlap,
  validateTrackTypeMatch,
} from '../systems/validation';
import {
  createTimelineState,
  createTimeline,
  createTrack,
  createClip,
  createAsset,
  toFrame,
  frameRate,
  toTimecode,
  toAssetId,
  toTrackId,
  toClipId,
} from '../index';
import type { TimelineState } from '../types/state';
import type { Clip } from '../types/clip';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAsset(overrides: Partial<{ id: string; intrinsicDuration: number; mediaType: string }> = {}) {
  return createAsset({
    id:                   overrides.id ?? 'asset-1',
    name:                 'Test Video',
    mediaType:            (overrides.mediaType ?? 'video') as 'video',
    filePath:             '/media/test.mp4',
    intrinsicDuration:    toFrame(overrides.intrinsicDuration ?? 600),
    nativeFps:            30,
    sourceTimecodeOffset: toFrame(0),
    status:               'online',
  });
}

function makeClip(overrides: Partial<{
  id: string; assetId: string; trackId: string;
  timelineStart: number; timelineEnd: number;
  mediaIn: number; mediaOut: number;
}> = {}) {
  return createClip({
    id:            overrides.id ?? 'clip-1',
    assetId:       overrides.assetId ?? 'asset-1',
    trackId:       overrides.trackId ?? 'track-1',
    timelineStart: toFrame(overrides.timelineStart ?? 0),
    timelineEnd:   toFrame(overrides.timelineEnd ?? 100),
    mediaIn:       toFrame(overrides.mediaIn ?? 0),
    mediaOut:      toFrame(overrides.mediaOut ?? 100),
  });
}

function makeState(clipOverrides?: Partial<{ timelineStart: number; timelineEnd: number; mediaIn: number; mediaOut: number }>): TimelineState {
  const asset = makeAsset();
  const clip = makeClip(clipOverrides);
  const track = createTrack({
    id:    'track-1',
    name:  'Video 1',
    type:  'video',
    clips: [clip],
  });
  const timeline = createTimeline({
    id:            'tl-1',
    name:          'Test',
    fps:           frameRate(30),
    duration:      toFrame(9000),
    startTimecode: toTimecode('00:00:00:00'),
    tracks:        [track],
  });
  return createTimelineState({
    timeline,
    assetRegistry: new Map([[toAssetId('asset-1'), asset]]),
  });
}

// ---------------------------------------------------------------------------
// validateClip
// ---------------------------------------------------------------------------

describe('validateClip', () => {
  it('returns valid for a well-formed clip', () => {
    const state = makeState();
    const clip = makeClip();
    const result = validateClip(state, clip);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects when asset is missing', () => {
    const state = makeState();
    const clip = makeClip({ assetId: 'nonexistent' });
    const result = validateClip(state, clip);
    expect(result.valid).toBe(false);
    expect(result.errors[0]!.code).toBe('ASSET_NOT_FOUND');
  });

  it('rejects when timelineEnd <= timelineStart', () => {
    const state = makeState();
    const clip = makeClip({ timelineStart: 100, timelineEnd: 100 });
    const result = validateClip(state, clip);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_TIMELINE_BOUNDS')).toBe(true);
  });

  it('rejects when timelineEnd < timelineStart', () => {
    const state = makeState();
    const clip = makeClip({ timelineStart: 200, timelineEnd: 100 });
    const result = validateClip(state, clip);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_TIMELINE_BOUNDS')).toBe(true);
  });

  it('rejects when mediaIn < 0', () => {
    const state = makeState();
    const clip = makeClip({ mediaIn: -10, mediaOut: 90 });
    const result = validateClip(state, clip);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_MEDIA_IN')).toBe(true);
  });

  it('rejects when mediaOut <= mediaIn', () => {
    const state = makeState();
    const clip = makeClip({ mediaIn: 50, mediaOut: 50 });
    const result = validateClip(state, clip);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_MEDIA_BOUNDS')).toBe(true);
  });

  it('rejects when mediaOut > asset intrinsicDuration', () => {
    const state = makeState();
    const clip = makeClip({ mediaIn: 0, mediaOut: 700 }); // asset is 600
    const result = validateClip(state, clip);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'MEDIA_EXCEEDS_ASSET')).toBe(true);
  });

  it('rejects when timeline duration != media duration (Phase 1)', () => {
    const state = makeState();
    // timeline duration = 150 - 0 = 150, media duration = 80 - 0 = 80
    const clip = makeClip({ timelineStart: 0, timelineEnd: 150, mediaIn: 0, mediaOut: 80 });
    const result = validateClip(state, clip);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'DURATION_MISMATCH')).toBe(true);
  });

  it('collects multiple errors', () => {
    const state = makeState();
    // Valid asset, but timeline bounds inverted, mediaIn negative, mediaOut <= mediaIn
    const clip = makeClip({
      timelineStart: 200,
      timelineEnd: 100,
      mediaIn: -5,
      mediaOut: -10,
    });
    const result = validateClip(state, clip);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// validateTrack
// ---------------------------------------------------------------------------

describe('validateTrack', () => {
  it('returns valid for a track with valid clips', () => {
    const state = makeState();
    const track = state.timeline.tracks[0]!;
    const result = validateTrack(state, track);
    expect(result.valid).toBe(true);
  });

  it('rejects when track has overlapping clips', () => {
    const asset = makeAsset();
    const clip1 = makeClip({ id: 'clip-1', timelineStart: 0, timelineEnd: 100, mediaIn: 0, mediaOut: 100 });
    const clip2 = makeClip({ id: 'clip-2', timelineStart: 50, timelineEnd: 150, mediaIn: 0, mediaOut: 100 });
    const track = createTrack({
      id:    'track-1',
      name:  'Video 1',
      type:  'video',
      clips: [clip1, clip2],
    });
    const timeline = createTimeline({
      id:            'tl-1',
      name:          'Test',
      fps:           frameRate(30),
      duration:      toFrame(9000),
      startTimecode: toTimecode('00:00:00:00'),
      tracks:        [track],
    });
    const state = createTimelineState({
      timeline,
      assetRegistry: new Map([[toAssetId('asset-1'), asset]]),
    });

    const result = validateTrack(state, track);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'CLIPS_OVERLAP')).toBe(true);
  });

  it('returns valid for empty track', () => {
    const state = makeState();
    const track = createTrack({
      id:    'track-empty',
      name:  'Empty',
      type:  'video',
      clips: [],
    });
    const result = validateTrack(state, track);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateTimeline
// ---------------------------------------------------------------------------

describe('validateTimeline', () => {
  it('returns valid for a well-formed timeline', () => {
    const state = makeState();
    const result = validateTimeline(state);
    expect(result.valid).toBe(true);
  });

  it('returns valid for empty timeline', () => {
    const timeline = createTimeline({
      id:            'tl-empty',
      name:          'Empty',
      fps:           frameRate(30),
      duration:      toFrame(9000),
      startTimecode: toTimecode('00:00:00:00'),
      tracks:        [],
    });
    const state = createTimelineState({ timeline });
    const result = validateTimeline(state);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateNoOverlap
// ---------------------------------------------------------------------------

describe('validateNoOverlap', () => {
  it('returns valid when no overlap', () => {
    const clip = makeClip({ id: 'new-clip', timelineStart: 200, timelineEnd: 300 });
    const track = createTrack({
      id:    'track-1',
      name:  'Video 1',
      type:  'video',
      clips: [makeClip({ timelineStart: 0, timelineEnd: 100 })],
    });
    const result = validateNoOverlap(track, clip);
    expect(result.valid).toBe(true);
  });

  it('rejects when clip overlaps existing', () => {
    const clip = makeClip({ id: 'new-clip', timelineStart: 50, timelineEnd: 150 });
    const track = createTrack({
      id:    'track-1',
      name:  'Video 1',
      type:  'video',
      clips: [makeClip({ timelineStart: 0, timelineEnd: 100 })],
    });
    const result = validateNoOverlap(track, clip);
    expect(result.valid).toBe(false);
    expect(result.errors[0]!.code).toBe('CLIPS_OVERLAP');
  });

  it('skips self-comparison', () => {
    const existing = makeClip({ id: 'clip-1', timelineStart: 0, timelineEnd: 100 });
    const track = createTrack({
      id:    'track-1',
      name:  'Video 1',
      type:  'video',
      clips: [existing],
    });
    const result = validateNoOverlap(track, existing);
    expect(result.valid).toBe(true);
  });

  it('allows adjacent clips (no gap, no overlap)', () => {
    const clip = makeClip({ id: 'new-clip', timelineStart: 100, timelineEnd: 200 });
    const track = createTrack({
      id:    'track-1',
      name:  'Video 1',
      type:  'video',
      clips: [makeClip({ timelineStart: 0, timelineEnd: 100 })],
    });
    const result = validateNoOverlap(track, clip);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateTrackTypeMatch
// ---------------------------------------------------------------------------

describe('validateTrackTypeMatch', () => {
  it('returns valid for video clip on video track', () => {
    const state = makeState();
    const clip = makeClip();
    const track = state.timeline.tracks[0]!;
    const result = validateTrackTypeMatch(state, clip, track);
    expect(result.valid).toBe(true);
  });

  it('rejects video clip on audio track', () => {
    const state = makeState();
    const clip = makeClip();
    const audioTrack = createTrack({
      id:    'audio-1',
      name:  'Audio 1',
      type:  'audio',
      clips: [],
    });
    const result = validateTrackTypeMatch(state, clip, audioTrack);
    expect(result.valid).toBe(false);
    expect(result.errors[0]!.code).toBe('TRACK_TYPE_MISMATCH');
  });

  it('rejects audio clip on video track', () => {
    const asset = makeAsset({ id: 'audio-1', mediaType: 'audio' });
    const clip = makeClip({ id: 'audio-clip', assetId: 'audio-1' });
    const track = createTrack({
      id:    'track-1',
      name:  'Video 1',
      type:  'video',
      clips: [],
    });
    const timeline = createTimeline({
      id:            'tl-1',
      name:          'Test',
      fps:           frameRate(30),
      duration:      toFrame(9000),
      startTimecode: toTimecode('00:00:00:00'),
      tracks:        [track],
    });
    const state = createTimelineState({
      timeline,
      assetRegistry: new Map([
        [toAssetId('asset-1'), makeAsset()],
        [toAssetId('audio-1'), asset],
      ]),
    });

    const result = validateTrackTypeMatch(state, clip, track);
    expect(result.valid).toBe(false);
    expect(result.errors[0]!.code).toBe('TRACK_TYPE_MISMATCH');
  });

  it('rejects when asset is missing', () => {
    const state = makeState();
    const clip = makeClip({ assetId: 'nonexistent' });
    const track = state.timeline.tracks[0]!;
    const result = validateTrackTypeMatch(state, clip, track);
    expect(result.valid).toBe(false);
    expect(result.errors[0]!.code).toBe('ASSET_NOT_FOUND');
  });
});
