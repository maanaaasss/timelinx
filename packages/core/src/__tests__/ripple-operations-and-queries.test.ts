/**
 * Ripple Operations + Query System Tests
 *
 * Covers:
 *  - src/operations/ripple.ts (rippleDelete, rippleTrim, insertEdit, rippleMove, insertMove)
 *  - src/systems/queries.ts (findClipById, findTrackById, getClipsOnTrack, getClipsAtFrame,
 *    getClipsInRange, getAllClips, getAllTracks, findTrackIndex, findClipWithTrack)
 */

import { describe, it, expect } from 'vitest';

import { rippleDelete, rippleTrim, insertEdit, rippleMove, insertMove } from '../operations/ripple';
import {
  findClipById,
  findTrackById,
  getClipsOnTrack,
  getClipsAtFrame,
  getClipsInRange,
  getAllClips,
  getAllTracks,
  findTrackIndex,
  findClipWithTrack,
} from '../systems/queries';

import { createTimelineState } from '../types/state';
import { createTimeline }       from '../types/timeline';
import { createTrack, toTrackId } from '../types/track';
import { createClip, toClipId }   from '../types/clip';
import { createAsset, toAssetId } from '../types/asset';
import { toFrame, toTimecode, frameRate } from '../types/frame';
import type { TimelineState } from '../types/state';
import type { Clip }          from '../types/clip';
import type { TrackId }       from '../types/track';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TRACK_1 = toTrackId('track-1');
const TRACK_2 = toTrackId('track-2');
const ASSET_1 = toAssetId('asset-1');

function asset() {
  return createAsset({
    id: 'asset-1', name: 'Test', mediaType: 'video',
    filePath: '/media/test.mp4',
    intrinsicDuration: toFrame(9000),
    nativeFps: 30, sourceTimecodeOffset: toFrame(0), status: 'online',
  });
}

function clip(id: string, start: number, end: number, trackId: TrackId = TRACK_1): Clip {
  return createClip({
    id, assetId: 'asset-1', trackId,
    timelineStart: toFrame(start), timelineEnd: toFrame(end),
    mediaIn: toFrame(0), mediaOut: toFrame(end - start),
  });
}

function state(tracks: ReturnType<typeof createTrack>[]): TimelineState {
  const tl = createTimeline({
    id: 'tl', name: 'Test', fps: frameRate(30),
    duration: toFrame(9000), startTimecode: toTimecode('00:00:00:00'), tracks,
  });
  return createTimelineState({ timeline: tl, assetRegistry: new Map([[ASSET_1, asset()]]) });
}

// ── Ripple Operations ────────────────────────────────────────────────────────

describe('ripple operations', () => {
  describe('rippleDelete', () => {
    it('deletes clip and shifts subsequent clips left', () => {
      const s = state([createTrack({
        id: TRACK_1, name: 'V1', type: 'video',
        clips: [clip('a', 0, 100), clip('b', 100, 200), clip('c', 200, 300)],
      })]);
      const result = rippleDelete(s, 'a');
      const tracks = result.timeline.tracks;
      const clips = tracks[0]!.clips;
      expect(clips).toHaveLength(2);
      expect(clips[0]!.id).toBe('b');
      expect(clips[0]!.timelineStart).toBe(toFrame(0));
      expect(clips[1]!.id).toBe('c');
      expect(clips[1]!.timelineStart).toBe(toFrame(100));
    });

    it('throws on missing clip', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [] })]);
      expect(() => rippleDelete(s, 'nonexistent')).toThrow('Clip not found');
    });
  });

  describe('rippleTrim', () => {
    it('trims clip end and shifts subsequent clips', () => {
      const s = state([createTrack({
        id: TRACK_1, name: 'V1', type: 'video',
        clips: [clip('a', 0, 100), clip('b', 100, 200)],
      })]);
      const result = rippleTrim(s, 'a', toFrame(150));
      const clips = result.timeline.tracks[0]!.clips;
      expect(clips[0]!.timelineEnd).toBe(toFrame(150));
      expect(clips[1]!.timelineStart).toBe(toFrame(150));
    });

    it('throws on missing clip', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [] })]);
      expect(() => rippleTrim(s, 'nonexistent', toFrame(50))).toThrow('Clip not found');
    });

    it('throws when newEnd <= clip start', () => {
      const s = state([createTrack({
        id: TRACK_1, name: 'V1', type: 'video', clips: [clip('a', 100, 200)],
      })]);
      expect(() => rippleTrim(s, 'a', toFrame(50))).toThrow('New end must be after clip start');
    });
  });

  describe('insertEdit', () => {
    it('inserts clip and shifts subsequent clips right', () => {
      const s = state([createTrack({
        id: TRACK_1, name: 'V1', type: 'video',
        clips: [clip('a', 0, 100), clip('b', 200, 300)],
      })]);
      const newClip = clip('new', 0, 50);
      const result = insertEdit(s, TRACK_1, newClip, toFrame(150));
      const clips = result.timeline.tracks[0]!.clips;
      expect(clips).toHaveLength(3);
      const inserted = clips.find(c => c.id === 'new')!;
      expect(inserted.timelineStart).toBe(toFrame(150));
      expect(inserted.timelineEnd).toBe(toFrame(200));
      const shifted = clips.find(c => c.id === 'b')!;
      expect(shifted.timelineStart).toBe(toFrame(250));
    });

    it('throws on missing track', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [] })]);
      expect(() => insertEdit(s, toTrackId('bad'), clip('x', 0, 50), toFrame(0))).toThrow('Track not found');
    });
  });

  describe('rippleMove', () => {
    it('moving left closes gap and shifts subsequent clips', () => {
      const s = state([createTrack({
        id: TRACK_1, name: 'V1', type: 'video',
        clips: [clip('a', 0, 100), clip('b', 200, 300)],
      })]);
      const result = rippleMove(s, 'b', toFrame(100));
      const clips = result.timeline.tracks[0]!.clips;
      const moved = clips.find(c => c.id === 'b')!;
      expect(moved.timelineStart).toBe(toFrame(100));
    });

    it('moving right makes room at destination', () => {
      const s = state([createTrack({
        id: TRACK_1, name: 'V1', type: 'video',
        clips: [clip('a', 0, 100), clip('b', 100, 200), clip('c', 200, 300)],
      })]);
      const result = rippleMove(s, 'a', toFrame(250));
      const clips = result.timeline.tracks[0]!.clips;
      const moved = clips.find(c => c.id === 'a')!;
      expect(moved.timelineStart).toBe(toFrame(150));
    });

    it('no-op when moving to same position', () => {
      const s = state([createTrack({
        id: TRACK_1, name: 'V1', type: 'video', clips: [clip('a', 0, 100)],
      })]);
      const result = rippleMove(s, 'a', toFrame(0));
      expect(result).toBe(s);
    });

    it('throws on missing clip', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [] })]);
      expect(() => rippleMove(s, 'bad', toFrame(0))).toThrow('Clip not found');
    });

    it('throws on negative start', () => {
      const s = state([createTrack({
        id: TRACK_1, name: 'V1', type: 'video', clips: [clip('a', 100, 200)],
      })]);
      expect(() => rippleMove(s, 'a', toFrame(-10))).toThrow('before timeline start');
    });

    it('throws when moving beyond timeline duration', () => {
      const s = state([createTrack({
        id: TRACK_1, name: 'V1', type: 'video', clips: [clip('a', 0, 100)],
      })]);
      expect(() => rippleMove(s, 'a', toFrame(10000))).toThrow('beyond timeline duration');
    });
  });

  describe('insertMove', () => {
    it('moves clip and shifts destination clips right', () => {
      const s = state([createTrack({
        id: TRACK_1, name: 'V1', type: 'video',
        clips: [clip('a', 0, 100), clip('b', 100, 200), clip('c', 200, 300)],
      })]);
      const result = insertMove(s, 'a', toFrame(250));
      const clips = result.timeline.tracks[0]!.clips;
      const moved = clips.find(c => c.id === 'a')!;
      expect(moved.timelineStart).toBe(toFrame(250));
    });

    it('no-op when moving to same position', () => {
      const s = state([createTrack({
        id: TRACK_1, name: 'V1', type: 'video', clips: [clip('a', 0, 100)],
      })]);
      const result = insertMove(s, 'a', toFrame(0));
      expect(result).toBe(s);
    });

    it('throws on missing clip', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [] })]);
      expect(() => insertMove(s, 'bad', toFrame(0))).toThrow('Clip not found');
    });

    it('throws on negative start', () => {
      const s = state([createTrack({
        id: TRACK_1, name: 'V1', type: 'video', clips: [clip('a', 100, 200)],
      })]);
      expect(() => insertMove(s, 'a', toFrame(-10))).toThrow('before timeline start');
    });

    it('throws when moving beyond timeline duration', () => {
      const s = state([createTrack({
        id: TRACK_1, name: 'V1', type: 'video', clips: [clip('a', 0, 100)],
      })]);
      expect(() => insertMove(s, 'a', toFrame(10000))).toThrow('beyond timeline duration');
    });
  });
});

// ── Query System ─────────────────────────────────────────────────────────────

describe('query system', () => {
  const multiTrackState = state([
    createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [clip('c1', 0, 100), clip('c2', 100, 200)] }),
    createTrack({ id: TRACK_2, name: 'V2', type: 'audio', clips: [clip('c3', 50, 150, TRACK_2)] }),
  ]);

  describe('findClipById', () => {
    it('finds clip across tracks', () => {
      expect(findClipById(multiTrackState, 'c2')?.id).toBe('c2');
    });
    it('returns undefined for missing clip', () => {
      expect(findClipById(multiTrackState, 'nope')).toBeUndefined();
    });
  });

  describe('findTrackById', () => {
    it('finds track', () => {
      expect(findTrackById(multiTrackState, TRACK_1)?.name).toBe('V1');
    });
    it('returns undefined for missing track', () => {
      expect(findTrackById(multiTrackState, toTrackId('nope'))).toBeUndefined();
    });
  });

  describe('getClipsOnTrack', () => {
    it('returns clips for existing track', () => {
      expect(getClipsOnTrack(multiTrackState, TRACK_1)).toHaveLength(2);
    });
    it('returns empty array for missing track', () => {
      expect(getClipsOnTrack(multiTrackState, toTrackId('nope'))).toEqual([]);
    });
  });

  describe('getClipsAtFrame', () => {
    it('returns clips containing the frame', () => {
      const clips = getClipsAtFrame(multiTrackState, toFrame(75));
      expect(clips.map(c => c.id).sort()).toEqual(['c1', 'c3']);
    });
    it('returns empty when no clips at frame', () => {
      expect(getClipsAtFrame(multiTrackState, toFrame(500))).toEqual([]);
    });
  });

  describe('getClipsInRange', () => {
    it('returns overlapping clips', () => {
      const clips = getClipsInRange(multiTrackState, toFrame(80), toFrame(120));
      expect(clips.map(c => c.id).sort()).toEqual(['c1', 'c2', 'c3']);
    });
    it('returns empty for non-overlapping range', () => {
      expect(getClipsInRange(multiTrackState, toFrame(500), toFrame(600))).toEqual([]);
    });
  });

  describe('getAllClips', () => {
    it('returns all clips across tracks', () => {
      expect(getAllClips(multiTrackState)).toHaveLength(3);
    });
  });

  describe('getAllTracks', () => {
    it('returns all tracks', () => {
      expect(getAllTracks(multiTrackState)).toHaveLength(2);
    });
  });

  describe('findTrackIndex', () => {
    it('returns index for existing track', () => {
      expect(findTrackIndex(multiTrackState, TRACK_2)).toBe(1);
    });
    it('returns -1 for missing track', () => {
      expect(findTrackIndex(multiTrackState, toTrackId('nope'))).toBe(-1);
    });
  });

  describe('findClipWithTrack', () => {
    it('returns clip with track info', () => {
      const result = findClipWithTrack(multiTrackState, 'c3');
      expect(result).not.toBeNull();
      expect(result!.clip.id).toBe('c3');
      expect(result!.track.name).toBe('V2');
      expect(result!.trackIndex).toBe(1);
    });
    it('returns null for missing clip', () => {
      expect(findClipWithTrack(multiTrackState, 'nope')).toBeNull();
    });
  });
});
