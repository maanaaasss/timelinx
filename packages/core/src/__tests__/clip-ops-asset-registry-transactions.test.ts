/**
 * Clip Operations + Asset Registry + Transaction Tests
 *
 * Covers:
 *  - src/operations/clip-operations.ts (addClip, removeClip, moveClip, resizeClip, trimClip, updateClip, moveClipToTrack)
 *  - src/systems/asset-registry.ts (registerAsset, getAsset, hasAsset, getAllAssets, unregisterAsset)
 *  - src/engine/transactions.ts (beginTransaction, applyOperation, commitTransaction, rollbackTransaction, getOperationCount)
 */

import { describe, it, expect } from 'vitest';

import { addClip, removeClip, moveClip, resizeClip, trimClip, updateClip, moveClipToTrack } from '../operations/clip-operations';
import { registerAsset, getAsset, hasAsset, getAllAssets, unregisterAsset } from '../systems/asset-registry';
import { beginTransaction, applyOperation, commitTransaction, rollbackTransaction, getOperationCount } from '../engine/transactions';

import { createTimelineState } from '../types/state';
import { createTimeline }      from '../types/timeline';
import { createTrack, toTrackId } from '../types/track';
import { createClip, toClipId }   from '../types/clip';
import { createAsset, toAssetId } from '../types/asset';
import { toFrame, toTimecode, frameRate } from '../types/frame';
import type { TimelineState } from '../types/state';
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

function makeClip(id: string, start: number, end: number, trackId: TrackId = TRACK_1) {
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

// ── Clip Operations ──────────────────────────────────────────────────────────

describe('clip operations', () => {
  describe('addClip', () => {
    it('adds clip to track', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [] })]);
      const result = addClip(s, TRACK_1, makeClip('new', 0, 100));
      expect(result.timeline.tracks[0]!.clips).toHaveLength(1);
      expect(result.timeline.tracks[0]!.clips[0]!.id).toBe('new');
    });

    it('returns unchanged state for missing track', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [] })]);
      const result = addClip(s, toTrackId('bad'), makeClip('new', 0, 100));
      expect(result).toBe(s);
    });
  });

  describe('removeClip', () => {
    it('removes clip from track', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [makeClip('a', 0, 100)] })]);
      const result = removeClip(s, 'a');
      expect(result.timeline.tracks[0]!.clips).toHaveLength(0);
    });

    it('returns same structure for missing clip', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [] })]);
      const result = removeClip(s, 'nonexistent');
      expect(result.timeline.tracks[0]!.clips).toHaveLength(0);
    });
  });

  describe('moveClip', () => {
    it('moves clip to new position', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [makeClip('a', 100, 200)] })]);
      const result = moveClip(s, 'a', toFrame(500));
      const moved = result.timeline.tracks[0]!.clips[0]!;
      expect(moved.timelineStart).toBe(toFrame(500));
      expect(moved.timelineEnd).toBe(toFrame(600));
    });

    it('returns unchanged state for missing clip', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [] })]);
      expect(moveClip(s, 'bad', toFrame(0))).toBe(s);
    });
  });

  describe('resizeClip', () => {
    it('resizes clip from left edge', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [makeClip('a', 100, 200)] })]);
      const result = resizeClip(s, 'a', toFrame(50), toFrame(200));
      const clip = result.timeline.tracks[0]!.clips[0]!;
      expect(clip.timelineStart).toBe(toFrame(50));
      expect(clip.mediaIn).toBe(toFrame(-50));
    });

    it('resizes clip from right edge', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [makeClip('a', 100, 200)] })]);
      const result = resizeClip(s, 'a', toFrame(100), toFrame(300));
      const clip = result.timeline.tracks[0]!.clips[0]!;
      expect(clip.timelineEnd).toBe(toFrame(300));
      expect(clip.mediaOut).toBe(toFrame(200));
    });

    it('returns unchanged state for missing clip', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [] })]);
      expect(resizeClip(s, 'bad', toFrame(0), toFrame(100))).toBe(s);
    });
  });

  describe('trimClip', () => {
    it('trims clip media bounds', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [makeClip('a', 100, 200)] })]);
      const result = trimClip(s, 'a', toFrame(50), toFrame(150));
      const clip = result.timeline.tracks[0]!.clips[0]!;
      expect(clip.mediaIn).toBe(toFrame(50));
      expect(clip.mediaOut).toBe(toFrame(150));
    });
  });

  describe('updateClip', () => {
    it('updates clip properties', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [makeClip('a', 100, 200)] })]);
      const result = updateClip(s, 'a', { opacity: 0.5 });
      const clip = result.timeline.tracks[0]!.clips[0]!;
      expect(clip.opacity).toBe(0.5);
    });

    it('returns same structure for missing clip', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [] })]);
      const result = updateClip(s, 'bad', { opacity: 0.5 });
      expect(result.timeline.tracks[0]!.clips).toHaveLength(0);
    });
  });

  describe('moveClipToTrack', () => {
    it('moves clip to another track', () => {
      const s = state([
        createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [makeClip('a', 0, 100)] }),
        createTrack({ id: TRACK_2, name: 'V2', type: 'video', clips: [] }),
      ]);
      const result = moveClipToTrack(s, 'a', TRACK_2);
      expect(result.timeline.tracks[0]!.clips).toHaveLength(0);
      expect(result.timeline.tracks[1]!.clips).toHaveLength(1);
      expect(result.timeline.tracks[1]!.clips[0]!.trackId).toBe(TRACK_2);
    });

    it('returns unchanged for missing clip', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [] })]);
      expect(moveClipToTrack(s, 'bad', TRACK_2)).toBe(s);
    });

    it('returns unchanged for missing target track', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [makeClip('a', 0, 100)] })]);
      expect(moveClipToTrack(s, 'a', toTrackId('bad'))).toBe(s);
    });

    it('returns unchanged when already on target track', () => {
      const s = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [makeClip('a', 0, 100)] })]);
      expect(moveClipToTrack(s, 'a', TRACK_1)).toBe(s);
    });
  });
});

// ── Asset Registry ───────────────────────────────────────────────────────────

describe('asset registry', () => {
  const baseState = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [] })]);

  describe('registerAsset', () => {
    it('registers new asset', () => {
      const result = registerAsset(baseState, asset());
      expect(result.assetRegistry.size).toBe(1);
    });
  });

  describe('getAsset', () => {
    it('returns registered asset', () => {
      const s = registerAsset(baseState, asset());
      expect(getAsset(s, 'asset-1')?.name).toBe('Test');
    });

    it('returns undefined for missing asset', () => {
      expect(getAsset(baseState, 'nope')).toBeUndefined();
    });
  });

  describe('hasAsset', () => {
    it('returns true for existing asset', () => {
      const s = registerAsset(baseState, asset());
      expect(hasAsset(s, 'asset-1')).toBe(true);
    });

    it('returns false for missing asset', () => {
      expect(hasAsset(baseState, 'nope')).toBe(false);
    });
  });

  describe('getAllAssets', () => {
    it('returns all assets', () => {
      const s = registerAsset(baseState, asset());
      expect(getAllAssets(s)).toHaveLength(1);
    });
  });

  describe('unregisterAsset', () => {
    it('removes asset', () => {
      const s = registerAsset(baseState, asset());
      const result = unregisterAsset(s, 'asset-1');
      expect(result.assetRegistry.size).toBe(0);
    });
  });
});

// ── Transactions ─────────────────────────────────────────────────────────────

describe('transactions', () => {
  const baseState = state([createTrack({ id: TRACK_1, name: 'V1', type: 'video', clips: [makeClip('a', 0, 100)] })]);

  describe('beginTransaction', () => {
    it('creates transaction context', () => {
      const tx = beginTransaction(baseState);
      expect(tx.initialState).toBe(baseState);
      expect(tx.currentState).toBe(baseState);
      expect(tx.operations).toHaveLength(0);
      expect(tx.finalized).toBe(false);
    });
  });

  describe('applyOperation', () => {
    it('applies operation to state', () => {
      let tx = beginTransaction(baseState);
      tx = applyOperation(tx, s => removeClip(s, 'a'));
      expect(tx.operations).toHaveLength(1);
      expect(tx.currentState.timeline.tracks[0]!.clips).toHaveLength(0);
    });
  });

  describe('commitTransaction', () => {
    it('returns final state', () => {
      let tx = beginTransaction(baseState);
      tx = applyOperation(tx, s => removeClip(s, 'a'));
      const result = commitTransaction(tx);
      expect(result.timeline.tracks[0]!.clips).toHaveLength(0);
    });
  });

  describe('rollbackTransaction', () => {
    it('returns initial state', () => {
      let tx = beginTransaction(baseState);
      tx = applyOperation(tx, s => removeClip(s, 'a'));
      const result = rollbackTransaction(tx);
      expect(result).toBe(baseState);
    });
  });

  describe('getOperationCount', () => {
    it('returns operation count', () => {
      let tx = beginTransaction(baseState);
      expect(getOperationCount(tx)).toBe(0);
      tx = applyOperation(tx, s => s);
      tx = applyOperation(tx, s => s);
      expect(getOperationCount(tx)).toBe(2);
    });
  });
});
