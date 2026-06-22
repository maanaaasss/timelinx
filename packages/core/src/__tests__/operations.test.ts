import { describe, it, expect } from 'vitest';
import {
  addClip,
  removeClip,
  moveClip,
  resizeClip,
  trimClip,
  updateClip,
  moveClipToTrack,
} from '../operations/clip-operations';
import {
  addTrack,
  removeTrack,
  moveTrack,
  updateTrack,
  toggleTrackMute,
  toggleTrackLock,
  toggleTrackSolo,
  setTrackHeight,
} from '../operations/track-operations';
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
} from '../index';
import type { TimelineState } from '../types/state';
import type { Clip } from '../types/clip';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAsset(id = 'asset-1') {
  return createAsset({
    id,
    name:                 'Test Video',
    mediaType:            'video',
    filePath:             '/media/test.mp4',
    intrinsicDuration:    toFrame(600),
    nativeFps:            30,
    sourceTimecodeOffset: toFrame(0),
    status:               'online',
  });
}

function makeClip(overrides: Partial<{
  id: string; assetId: string; trackId: string;
  timelineStart: number; timelineEnd: number;
  mediaIn: number; mediaOut: number;
}> = {}): Clip {
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

function makeState(): TimelineState {
  const asset = makeAsset();
  const clip = makeClip();
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

// ===========================================================================
// CLIP OPERATIONS
// ===========================================================================

describe('clip-operations', () => {
  describe('addClip', () => {
    it('adds a clip to a track', () => {
      const state = makeState();
      const newClip = makeClip({ id: 'clip-2', timelineStart: 200, timelineEnd: 300, mediaIn: 200, mediaOut: 300 });
      const next = addClip(state, 'track-1', newClip);
      const track = next.timeline.tracks[0]!;
      expect(track.clips).toHaveLength(2);
      expect(track.clips.some(c => c.id === 'clip-2')).toBe(true);
    });

    it('returns state unchanged for unknown track', () => {
      const state = makeState();
      const newClip = makeClip({ id: 'clip-2' });
      const next = addClip(state, 'nonexistent', newClip);
      expect(next).toBe(state);
    });

    it('sorts clips by timelineStart', () => {
      const state = makeState();
      const late = makeClip({ id: 'late', timelineStart: 200, timelineEnd: 300, mediaIn: 200, mediaOut: 300 });
      const next = addClip(state, 'track-1', late);
      const track = next.timeline.tracks[0]!;
      expect(track.clips[0]!.id).toBe('clip-1'); // 0-100 comes first
      expect(track.clips[1]!.id).toBe('late');   // 200-300 comes second
    });
  });

  describe('removeClip', () => {
    it('removes a clip by id', () => {
      const state = makeState();
      const next = removeClip(state, 'clip-1');
      const track = next.timeline.tracks[0]!;
      expect(track.clips).toHaveLength(0);
    });

    it('returns structurally equal state for unknown clip', () => {
      const state = makeState();
      const next = removeClip(state, 'nonexistent');
      expect(next).toStrictEqual(state);
    });

    it('only removes the target clip', () => {
      const state = makeState();
      const clip2 = makeClip({ id: 'clip-2', timelineStart: 200, timelineEnd: 300, mediaIn: 200, mediaOut: 300 });
      let s = addClip(state, 'track-1', clip2);
      s = removeClip(s, 'clip-1');
      const track = s.timeline.tracks[0]!;
      expect(track.clips).toHaveLength(1);
      expect(track.clips[0]!.id).toBe('clip-2');
    });
  });

  describe('moveClip', () => {
    it('moves a clip to a new position', () => {
      const state = makeState();
      const next = moveClip(state, 'clip-1', toFrame(200));
      const clip = next.timeline.tracks[0]!.clips[0]!;
      expect(clip.timelineStart).toBe(toFrame(200));
      expect(clip.timelineEnd).toBe(toFrame(300)); // duration preserved
    });

    it('preserves media bounds', () => {
      const state = makeState();
      const next = moveClip(state, 'clip-1', toFrame(50));
      const clip = next.timeline.tracks[0]!.clips[0]!;
      expect(clip.mediaIn).toBe(toFrame(0));
      expect(clip.mediaOut).toBe(toFrame(100));
    });

    it('returns state unchanged for unknown clip', () => {
      const state = makeState();
      const next = moveClip(state, 'nonexistent', toFrame(100));
      expect(next).toBe(state);
    });
  });

  describe('resizeClip', () => {
    it('resizes left edge and adjusts mediaIn', () => {
      const state = makeState();
      const next = resizeClip(state, 'clip-1', toFrame(20), toFrame(100));
      const clip = next.timeline.tracks[0]!.clips[0]!;
      expect(clip.timelineStart).toBe(toFrame(20));
      expect(clip.mediaIn).toBe(toFrame(20));
      expect(clip.timelineEnd).toBe(toFrame(100));
      expect(clip.mediaOut).toBe(toFrame(100));
    });

    it('resizes right edge and adjusts mediaOut', () => {
      const state = makeState();
      const next = resizeClip(state, 'clip-1', toFrame(0), toFrame(120));
      const clip = next.timeline.tracks[0]!.clips[0]!;
      expect(clip.timelineStart).toBe(toFrame(0));
      expect(clip.mediaIn).toBe(toFrame(0));
      expect(clip.timelineEnd).toBe(toFrame(120));
      expect(clip.mediaOut).toBe(toFrame(120));
    });

    it('returns state unchanged for unknown clip', () => {
      const state = makeState();
      const next = resizeClip(state, 'nonexistent', toFrame(0), toFrame(100));
      expect(next).toBe(state);
    });
  });

  describe('trimClip', () => {
    it('updates media bounds without changing timeline', () => {
      const state = makeState();
      const next = trimClip(state, 'clip-1', toFrame(10), toFrame(90));
      const clip = next.timeline.tracks[0]!.clips[0]!;
      expect(clip.mediaIn).toBe(toFrame(10));
      expect(clip.mediaOut).toBe(toFrame(90));
      expect(clip.timelineStart).toBe(toFrame(0));
      expect(clip.timelineEnd).toBe(toFrame(100));
    });
  });

  describe('updateClip', () => {
    it('updates arbitrary clip properties', () => {
      const state = makeState();
      const next = updateClip(state, 'clip-1', { enabled: false });
      const clip = next.timeline.tracks[0]!.clips[0]!;
      expect(clip.enabled).toBe(false);
    });

    it('returns structurally equal state for unknown clip', () => {
      const state = makeState();
      const next = updateClip(state, 'nonexistent', { enabled: false });
      expect(next).toStrictEqual(state);
    });
  });

  describe('moveClipToTrack', () => {
    it('moves a clip to a different track', () => {
      const state = makeState();
      const track2 = createTrack({
        id:    'track-2',
        name:  'Video 2',
        type:  'video',
        clips: [],
      });
      let s = addTrack(state, track2);
      s = moveClipToTrack(s, 'clip-1', 'track-2');
      const t1 = s.timeline.tracks.find(t => t.id === 'track-1')!;
      const t2 = s.timeline.tracks.find(t => t.id === 'track-2')!;
      expect(t1.clips).toHaveLength(0);
      expect(t2.clips).toHaveLength(1);
      expect(t2.clips[0]!.trackId).toBe('track-2');
    });

    it('returns state unchanged for same track', () => {
      const state = makeState();
      const next = moveClipToTrack(state, 'clip-1', 'track-1');
      expect(next).toBe(state);
    });

    it('returns state unchanged for unknown clip', () => {
      const state = makeState();
      const next = moveClipToTrack(state, 'nonexistent', 'track-2');
      expect(next).toBe(state);
    });

    it('returns state unchanged for unknown target track', () => {
      const state = makeState();
      const next = moveClipToTrack(state, 'clip-1', 'nonexistent');
      expect(next).toBe(state);
    });

    it('returns state unchanged for track type mismatch', () => {
      const audioAsset = makeAsset('audio-1');
      const audioClip = makeClip({ id: 'audio-clip', assetId: 'audio-1' });
      const audioTrack = createTrack({
        id:    'audio-track',
        name:  'Audio 1',
        type:  'audio',
        clips: [audioClip],
      });
      const videoTrack = createTrack({
        id:    'track-1',
        name:  'Video 1',
        type:  'video',
        clips: [makeClip()],
      });
      const timeline = createTimeline({
        id:            'tl-1',
        name:          'Test',
        fps:           frameRate(30),
        duration:      toFrame(9000),
        startTimecode: toTimecode('00:00:00:00'),
        tracks:        [videoTrack, audioTrack],
      });
      const state = createTimelineState({
        timeline,
        assetRegistry: new Map([
          [toAssetId('asset-1'), makeAsset()],
          [toAssetId('audio-1'), audioAsset],
        ]),
      });
      // Try to move audio clip to video track
      const next = moveClipToTrack(state, 'audio-clip', 'track-1');
      expect(next).toBe(state);
    });
  });
});

// ===========================================================================
// TRACK OPERATIONS
// ===========================================================================

describe('track-operations', () => {
  describe('addTrack', () => {
    it('adds a track to the end', () => {
      const state = makeState();
      const track2 = createTrack({
        id:    'track-2',
        name:  'Audio 1',
        type:  'audio',
        clips: [],
      });
      const next = addTrack(state, track2);
      expect(next.timeline.tracks).toHaveLength(2);
      expect(next.timeline.tracks[1]!.id).toBe('track-2');
    });

    it('preserves existing tracks', () => {
      const state = makeState();
      const track2 = createTrack({
        id:    'track-2',
        name:  'Audio 1',
        type:  'audio',
        clips: [],
      });
      const next = addTrack(state, track2);
      expect(next.timeline.tracks[0]!.id).toBe('track-1');
    });
  });

  describe('removeTrack', () => {
    it('removes a track by id', () => {
      const state = makeState();
      const next = removeTrack(state, 'track-1');
      expect(next.timeline.tracks).toHaveLength(0);
    });

    it('preserves other tracks', () => {
      const state = makeState();
      const track2 = createTrack({
        id:    'track-2',
        name:  'Audio 1',
        type:  'audio',
        clips: [],
      });
      let s = addTrack(state, track2);
      s = removeTrack(s, 'track-1');
      expect(s.timeline.tracks).toHaveLength(1);
      expect(s.timeline.tracks[0]!.id).toBe('track-2');
    });
  });

  describe('moveTrack', () => {
    it('moves a track to a new position', () => {
      const state = makeState();
      const track2 = createTrack({
        id:    'track-2',
        name:  'Audio 1',
        type:  'audio',
        clips: [],
      });
      let s = addTrack(state, track2);
      s = moveTrack(s, 'track-2', 0);
      expect(s.timeline.tracks[0]!.id).toBe('track-2');
      expect(s.timeline.tracks[1]!.id).toBe('track-1');
    });

    it('returns state unchanged for unknown track', () => {
      const state = makeState();
      const next = moveTrack(state, 'nonexistent', 0);
      expect(next).toBe(state);
    });
  });

  describe('updateTrack', () => {
    it('updates track properties', () => {
      const state = makeState();
      const next = updateTrack(state, 'track-1', { name: 'Renamed' });
      expect(next.timeline.tracks[0]!.name).toBe('Renamed');
    });

    it('returns state unchanged for unknown track', () => {
      const state = makeState();
      const next = updateTrack(state, 'nonexistent', { name: 'X' });
      expect(next).toBe(state);
    });
  });

  describe('toggleTrackMute', () => {
    it('toggles mute on', () => {
      const state = makeState();
      const next = toggleTrackMute(state, 'track-1');
      expect(next.timeline.tracks[0]!.muted).toBe(true);
    });

    it('toggles mute off', () => {
      const state = makeState();
      let s = toggleTrackMute(state, 'track-1');
      s = toggleTrackMute(s, 'track-1');
      expect(s.timeline.tracks[0]!.muted).toBe(false);
    });
  });

  describe('toggleTrackLock', () => {
    it('toggles lock on', () => {
      const state = makeState();
      const next = toggleTrackLock(state, 'track-1');
      expect(next.timeline.tracks[0]!.locked).toBe(true);
    });

    it('toggles lock off', () => {
      const state = makeState();
      let s = toggleTrackLock(state, 'track-1');
      s = toggleTrackLock(s, 'track-1');
      expect(s.timeline.tracks[0]!.locked).toBe(false);
    });
  });

  describe('toggleTrackSolo', () => {
    it('toggles solo on', () => {
      const state = makeState();
      const next = toggleTrackSolo(state, 'track-1');
      expect(next.timeline.tracks[0]!.solo).toBe(true);
    });

    it('toggles solo off', () => {
      const state = makeState();
      let s = toggleTrackSolo(state, 'track-1');
      s = toggleTrackSolo(s, 'track-1');
      expect(s.timeline.tracks[0]!.solo).toBe(false);
    });
  });

  describe('setTrackHeight', () => {
    it('sets height within bounds', () => {
      const state = makeState();
      const next = setTrackHeight(state, 'track-1', 100);
      expect(next.timeline.tracks[0]!.height).toBe(100);
    });

    it('clamps to minimum 40', () => {
      const state = makeState();
      const next = setTrackHeight(state, 'track-1', 10);
      expect(next.timeline.tracks[0]!.height).toBe(40);
    });

    it('clamps to maximum 200', () => {
      const state = makeState();
      const next = setTrackHeight(state, 'track-1', 300);
      expect(next.timeline.tracks[0]!.height).toBe(200);
    });
  });
});

// ---------------------------------------------------------------------------
// Immutability checks
// ---------------------------------------------------------------------------

describe('immutability', () => {
  it('addClip does not mutate original state', () => {
    const state = makeState();
    const originalTracks = state.timeline.tracks;
    addClip(state, 'track-1', makeClip({ id: 'new' }));
    expect(state.timeline.tracks).toBe(originalTracks);
  });

  it('removeClip does not mutate original state', () => {
    const state = makeState();
    const originalTracks = state.timeline.tracks;
    removeClip(state, 'clip-1');
    expect(state.timeline.tracks).toBe(originalTracks);
  });

  it('moveClip does not mutate original state', () => {
    const state = makeState();
    const originalClips = state.timeline.tracks[0]!.clips;
    moveClip(state, 'clip-1', toFrame(200));
    expect(state.timeline.tracks[0]!.clips).toBe(originalClips);
  });

  it('addTrack does not mutate original state', () => {
    const state = makeState();
    const originalTracks = state.timeline.tracks;
    addTrack(state, createTrack({ id: 't2', name: 'T2', type: 'audio', clips: [] }));
    expect(state.timeline.tracks).toBe(originalTracks);
  });
});
