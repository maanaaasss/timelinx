/**
 * TimelineEngine + Clock Tests
 *
 * Covers:
 *  - src/engine/timeline-engine.ts (TimelineEngine class - all public methods)
 *  - src/engine/clock.ts (nodeClock, createTestClock)
 */

import { describe, it, expect } from 'vitest';

import { TimelineEngine } from '../engine/timeline-engine';
import { nodeClock, createTestClock } from '../engine/clock';

import { createTimelineState } from '../types/state';
import { createTimeline }      from '../types/timeline';
import { createTrack, toTrackId } from '../types/track';
import { createClip, toClipId }   from '../types/clip';
import { createAsset, toAssetId } from '../types/asset';
import { toFrame, toTimecode, frameRate } from '../types/frame';
import type { TrackId } from '../types/track';

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

function makeState() {
  const track = createTrack({
    id: TRACK_1, name: 'V1', type: 'video',
    clips: [makeClip('c1', 0, 100), makeClip('c2', 100, 200), makeClip('c3', 200, 300)],
  });
  const tl = createTimeline({
    id: 'tl', name: 'Test', fps: frameRate(30),
    duration: toFrame(9000), startTimecode: toTimecode('00:00:00:00'), tracks: [track],
  });
  return createTimelineState({ timeline: tl, assetRegistry: new Map([[ASSET_1, asset()]]) });
}

// ── Clock Tests ──────────────────────────────────────────────────────────────

describe('clock', () => {
  describe('nodeClock', () => {
    it('has requestFrame, cancelFrame, now', () => {
      expect(typeof nodeClock.requestFrame).toBe('function');
      expect(typeof nodeClock.cancelFrame).toBe('function');
      expect(typeof nodeClock.now).toBe('function');
    });

    it('now returns a number', () => {
      expect(typeof nodeClock.now()).toBe('number');
    });

    it('requestFrame returns an id and cancelFrame cancels it', () => {
      const id = nodeClock.requestFrame(() => {});
      expect(id).toBeDefined();
      nodeClock.cancelFrame(id);
    });
  });

  describe('createTestClock', () => {
    it('returns clock, tick, getCallbacks', () => {
      const { clock, tick, getCallbacks } = createTestClock();
      expect(typeof clock.requestFrame).toBe('function');
      expect(typeof clock.cancelFrame).toBe('function');
      expect(typeof clock.now).toBe('function');
      expect(typeof tick).toBe('function');
      expect(typeof getCallbacks).toBe('function');
    });

    it('tick advances time and fires callbacks', () => {
      const { clock, tick } = createTestClock();
      let fired = false;
      clock.requestFrame(() => { fired = true; });
      tick(16);
      expect(fired).toBe(true);
      expect(clock.now()).toBe(16);
    });

    it('cancelFrame prevents callback from firing', () => {
      const { clock, tick } = createTestClock();
      let fired = false;
      const id = clock.requestFrame(() => { fired = true; });
      clock.cancelFrame(id);
      tick(16);
      expect(fired).toBe(false);
    });

    it('getCallbacks returns pending callbacks', () => {
      const { clock, getCallbacks } = createTestClock();
      clock.requestFrame(() => {});
      clock.requestFrame(() => {});
      expect(getCallbacks()).toHaveLength(2);
    });
  });
});

// ── TimelineEngine Tests ─────────────────────────────────────────────────────

describe('TimelineEngine', () => {
  describe('constructor and state', () => {
    it('creates engine with initial state', () => {
      const engine = new TimelineEngine(makeState());
      expect(engine.getState().timeline.tracks).toHaveLength(1);
    });
  });

  describe('subscribe', () => {
    it('notifies listeners on state change', () => {
      const engine = new TimelineEngine(makeState());
      let called = false;
      engine.subscribe(() => { called = true; });
      engine.setTimelineName('Changed');
      expect(called).toBe(true);
    });

    it('unsubscribe stops notifications', () => {
      const engine = new TimelineEngine(makeState());
      let count = 0;
      const unsub = engine.subscribe(() => { count++; });
      engine.setTimelineName('A');
      unsub();
      engine.setTimelineName('B');
      expect(count).toBe(1);
    });
  });

  describe('asset operations', () => {
    it('registerAsset and getAsset', () => {
      const engine = new TimelineEngine(makeState());
      const newAsset = createAsset({
        id: 'asset-2', name: 'B', mediaType: 'video',
        filePath: '/b.mp4', intrinsicDuration: toFrame(1000),
        nativeFps: 30, sourceTimecodeOffset: toFrame(0), status: 'online',
      });
      const result = engine.registerAsset(newAsset);
      expect(result.accepted).toBe(true);
      expect(engine.getAsset('asset-2')?.name).toBe('B');
    });
  });

  describe('clip operations', () => {
    it('addClip', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.addClip(TRACK_1, makeClip('new', 400, 500));
      expect(result.accepted).toBe(true);
      expect(engine.findClipById('new')).toBeDefined();
    });

    it('removeClip', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.removeClip('c1');
      expect(result.accepted).toBe(true);
      expect(engine.findClipById('c1')).toBeUndefined();
    });

    it('moveClip', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.moveClip('c1', toFrame(500));
      expect(result.accepted).toBe(true);
      expect(engine.findClipById('c1')!.timelineStart).toBe(toFrame(500));
    });

    it('resizeClip', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.resizeClip('c1', toFrame(10), toFrame(90));
      expect(result.accepted).toBe(true);
    });

    it('trimClip', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.trimClip('c1', toFrame(10), toFrame(110));
      expect(result.accepted).toBe(true);
    });

    it('moveClipToTrack', () => {
      const engine = new TimelineEngine(makeState());
      const track2 = createTrack({ id: TRACK_2, name: 'V2', type: 'video', clips: [] });
      engine.addTrack(track2);
      const result = engine.moveClipToTrack('c1', TRACK_2);
      expect(result.accepted).toBe(true);
    });
  });

  describe('track operations', () => {
    it('addTrack', () => {
      const engine = new TimelineEngine(makeState());
      const track = createTrack({ id: TRACK_2, name: 'V2', type: 'video', clips: [] });
      const result = engine.addTrack(track);
      expect(result.accepted).toBe(true);
      expect(engine.getState().timeline.tracks).toHaveLength(2);
    });

    it('removeTrack', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.removeTrack(TRACK_1);
      expect(result.accepted).toBe(true);
      expect(engine.getState().timeline.tracks).toHaveLength(0);
    });

    it('moveTrack', () => {
      const engine = new TimelineEngine(makeState());
      const track2 = createTrack({ id: TRACK_2, name: 'V2', type: 'video', clips: [] });
      engine.addTrack(track2);
      const result = engine.moveTrack(TRACK_2, 0);
      expect(result.accepted).toBe(true);
    });

    it('toggleTrackMute', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.toggleTrackMute(TRACK_1);
      expect(result.accepted).toBe(true);
    });

    it('toggleTrackLock', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.toggleTrackLock(TRACK_1);
      expect(result.accepted).toBe(true);
    });

    it('toggleTrackSolo', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.toggleTrackSolo(TRACK_1);
      expect(result.accepted).toBe(true);
    });

    it('setTrackHeight', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.setTrackHeight(TRACK_1, 80);
      expect(result.accepted).toBe(true);
    });
  });

  describe('timeline operations', () => {
    it('setTimelineDuration', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.setTimelineDuration(toFrame(5000));
      expect(result.accepted).toBe(true);
    });

    it('setTimelineName', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.setTimelineName('New Name');
      expect(result.accepted).toBe(true);
      expect(engine.getState().timeline.name).toBe('New Name');
    });
  });

  describe('history operations', () => {
    it('undo and redo', () => {
      const engine = new TimelineEngine(makeState());
      engine.moveClip('c1', toFrame(500));
      expect(engine.canUndo()).toBe(true);
      expect(engine.undo()).toBe(true);
      expect(engine.canRedo()).toBe(true);
      expect(engine.redo()).toBe(true);
    });

    it('undo returns false when nothing to undo', () => {
      const engine = new TimelineEngine(makeState());
      expect(engine.canUndo()).toBe(false);
      expect(engine.undo()).toBe(false);
    });

    it('redo returns false when nothing to redo', () => {
      const engine = new TimelineEngine(makeState());
      expect(engine.canRedo()).toBe(false);
      expect(engine.redo()).toBe(false);
    });
  });

  describe('query operations', () => {
    it('findClipById', () => {
      const engine = new TimelineEngine(makeState());
      expect(engine.findClipById('c1')?.id).toBe('c1');
      expect(engine.findClipById('nope')).toBeUndefined();
    });

    it('findTrackById', () => {
      const engine = new TimelineEngine(makeState());
      expect(engine.findTrackById(TRACK_1)?.name).toBe('V1');
      expect(engine.findTrackById(toTrackId('nope'))).toBeUndefined();
    });

    it('getClipsOnTrack', () => {
      const engine = new TimelineEngine(makeState());
      expect(engine.getClipsOnTrack(TRACK_1)).toHaveLength(3);
    });

    it('getClipsAtFrame', () => {
      const engine = new TimelineEngine(makeState());
      expect(engine.getClipsAtFrame(toFrame(50))).toHaveLength(1);
    });

    it('getClipsInRange', () => {
      const engine = new TimelineEngine(makeState());
      expect(engine.getClipsInRange(toFrame(0), toFrame(150))).toHaveLength(2);
    });

    it('getAllClips', () => {
      const engine = new TimelineEngine(makeState());
      expect(engine.getAllClips()).toHaveLength(3);
    });

    it('getAllTracks', () => {
      const engine = new TimelineEngine(makeState());
      expect(engine.getAllTracks()).toHaveLength(1);
    });
  });

  describe('ripple operations', () => {
    it('rippleDelete', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.rippleDelete('c1');
      expect(result.accepted).toBe(true);
      expect(engine.getAllClips()).toHaveLength(2);
    });

    it('rippleTrim', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.rippleTrim('c1', toFrame(150));
      expect(result.accepted).toBe(true);
    });

    it('insertEdit', () => {
      const engine = new TimelineEngine(makeState());
      const newClip = makeClip('ins', 0, 50);
      const result = engine.insertEdit(TRACK_1, newClip, toFrame(500));
      expect(result.accepted).toBe(true);
    });

    it('rippleMove', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.rippleMove('c3', toFrame(400));
      expect(result.accepted).toBe(true);
    });

    it('insertMove', () => {
      const engine = new TimelineEngine(makeState());
      const result = engine.insertMove('c3', toFrame(400));
      expect(result.accepted).toBe(true);
    });
  });
});
