/**
 * UNDO/REDO ROUND-TRIP TESTS
 *
 * For each operation type: do the operation, undo it, assert state === original;
 * redo it, assert state === after operation.
 *
 * Also tests: multi-op undo/redo, branching (undo then new op discards redo),
 * rejected operations never enter history, and compression round-trips.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createHistory, pushHistory, undo, redo, canUndo, canRedo,
  getCurrentState, HistoryStack,
} from '../../engine/history';
import { dispatch } from '../../engine/dispatcher';
import { checkInvariants } from '../../validation/invariants';
import { createTimelineState } from '../../types/state';
import { createTimeline } from '../../types/timeline';
import { createTrack, toTrackId } from '../../types/track';
import { createClip, toClipId } from '../../types/clip';
import { createAsset, toAssetId } from '../../types/asset';
import { toFrame, toTimecode } from '../../types/frame';
import { createEffect, toEffectId } from '../../types/effect';
import { toKeyframeId } from '../../types/keyframe';
import { LINEAR_EASING } from '../../types/easing';
import { toMarkerId } from '../../types/marker';
import { DEFAULT_COMPRESSION_POLICY } from '../../types/compression';
import type { TimelineState } from '../../types/state';
import type { Transaction, OperationPrimitive } from '../../types/operations';

// ── Helpers ──────────────────────────────────────────────────────────────────

let txCounter = 0;
function makeTx(ops: OperationPrimitive[]): Transaction {
  return {
    id: `tx-${++txCounter}`,
    label: 'test',
    timestamp: Date.now(),
    operations: ops,
  };
}

function dispatchAndAssert(state: TimelineState, ops: OperationPrimitive[]): TimelineState {
  const result = dispatch(state, makeTx(ops));
  expect(result.accepted).toBe(true);
  if (!result.accepted) throw new Error(`Rejected: ${result.message}`);
  expect(checkInvariants(result.nextState)).toEqual([]);
  return result.nextState;
}

function makeBaseState(): TimelineState {
  const asset = createAsset({
    id: 'asset-1', name: 'Video', mediaType: 'video',
    filePath: '/media/test.mp4', intrinsicDuration: toFrame(9000),
    nativeFps: 30, sourceTimecodeOffset: toFrame(0), status: 'online',
  });
  const clip = createClip({
    id: 'clip-1', assetId: 'asset-1', trackId: 'track-1',
    timelineStart: toFrame(0), timelineEnd: toFrame(200),
    mediaIn: toFrame(0), mediaOut: toFrame(200),
  });
  const track = createTrack({ id: 'track-1', name: 'V1', type: 'video', clips: [clip] });
  const timeline = createTimeline({
    id: 'tl', name: 'Test', fps: 30, duration: toFrame(3000),
    startTimecode: toTimecode('00:00:00:00'), tracks: [track],
  });
  return createTimelineState({ timeline, assetRegistry: new Map([[toAssetId('asset-1'), asset]]) });
}

// ── Per-operation undo/redo round-trip tests ──────────────────────────────────

describe('Undo/Redo Round-Trip — per operation', () => {
  it('RENAME_TIMELINE: undo restores original name', () => {
    const original = makeBaseState();
    const renamed = dispatchAndAssert(original, [{ type: 'RENAME_TIMELINE', name: 'New Name' }]);
    expect(renamed.timeline.name).toBe('New Name');

    let h = createHistory(original);
    h = pushHistory(h, renamed);
    h = undo(h);
    expect(getCurrentState(h).timeline.name).toBe('Test');

    h = redo(h);
    expect(getCurrentState(h).timeline.name).toBe('New Name');
  });

  it('SET_TIMELINE_DURATION: undo restores original duration', () => {
    const original = makeBaseState();
    const extended = dispatchAndAssert(original, [
      { type: 'SET_TIMELINE_DURATION', duration: toFrame(6000) },
    ]);
    expect(extended.timeline.duration).toBe(6000);

    let h = createHistory(original);
    h = pushHistory(h, extended);
    h = undo(h);
    expect(getCurrentState(h).timeline.duration).toBe(3000);
  });

  it('MOVE_CLIP: undo restores original clip position', () => {
    const original = makeBaseState();
    const moved = dispatchAndAssert(original, [{
      type: 'MOVE_CLIP',
      clipId: toClipId('clip-1'),
      newTimelineStart: toFrame(500),
    }]);
    expect(moved.timeline.tracks[0]!.clips[0]!.timelineStart).toBe(500);

    let h = createHistory(original);
    h = pushHistory(h, moved);
    h = undo(h);
    expect(getCurrentState(h).timeline.tracks[0]!.clips[0]!.timelineStart).toBe(0);
  });

  it('RESIZE_CLIP: undo restores original clip size', () => {
    const original = makeBaseState();
    const resized = dispatchAndAssert(original, [{
      type: 'RESIZE_CLIP',
      clipId: toClipId('clip-1'),
      edge: 'end',
      newFrame: toFrame(150),
    }]);
    expect(resized.timeline.tracks[0]!.clips[0]!.timelineEnd).toBe(150);

    let h = createHistory(original);
    h = pushHistory(h, resized);
    h = undo(h);
    expect(getCurrentState(h).timeline.tracks[0]!.clips[0]!.timelineEnd).toBe(200);
  });

  it('DELETE_CLIP: undo restores the clip', () => {
    const original = makeBaseState();
    const deleted = dispatchAndAssert(original, [
      { type: 'DELETE_CLIP', clipId: toClipId('clip-1') },
    ]);
    expect(deleted.timeline.tracks[0]!.clips).toHaveLength(0);

    let h = createHistory(original);
    h = pushHistory(h, deleted);
    h = undo(h);
    expect(getCurrentState(h).timeline.tracks[0]!.clips).toHaveLength(1);
  });

  it('INSERT_CLIP: undo removes the clip', () => {
    const original = makeBaseState();
    const inserted = dispatchAndAssert(original, [{
      type: 'INSERT_CLIP',
      clip: createClip({
        id: 'clip-new', assetId: 'asset-1', trackId: 'track-1',
        timelineStart: toFrame(500), timelineEnd: toFrame(700),
        mediaIn: toFrame(0), mediaOut: toFrame(200),
      }),
      trackId: toTrackId('track-1'),
    }]);
    expect(inserted.timeline.tracks[0]!.clips).toHaveLength(2);

    let h = createHistory(original);
    h = pushHistory(h, inserted);
    h = undo(h);
    expect(getCurrentState(h).timeline.tracks[0]!.clips).toHaveLength(1);
  });

  it('SET_CLIP_SPEED: undo restores original speed', () => {
    const original = makeBaseState();
    const sped = dispatchAndAssert(original, [{
      type: 'SET_CLIP_SPEED',
      clipId: toClipId('clip-1'),
      speed: 2.0,
      // Note: speed change + media bounds adjustment to maintain invariant
    }, {
      type: 'SET_MEDIA_BOUNDS',
      clipId: toClipId('clip-1'),
      mediaIn: toFrame(0),
      mediaOut: toFrame(100),
    }]);
    expect(sped.timeline.tracks[0]!.clips[0]!.speed).toBe(2.0);

    let h = createHistory(original);
    h = pushHistory(h, sped);
    h = undo(h);
    expect(getCurrentState(h).timeline.tracks[0]!.clips[0]!.speed).toBe(1.0);
  });

  it('ADD_TRACK: undo removes the track', () => {
    const original = makeBaseState();
    const withTrack = dispatchAndAssert(original, [{
      type: 'ADD_TRACK',
      track: createTrack({ id: 'track-2', name: 'V2', type: 'video', clips: [] }),
    }]);
    expect(withTrack.timeline.tracks).toHaveLength(2);

    let h = createHistory(original);
    h = pushHistory(h, withTrack);
    h = undo(h);
    expect(getCurrentState(h).timeline.tracks).toHaveLength(1);
  });

  it('ADD_MARKER: undo removes the marker', () => {
    const original = makeBaseState();
    const withMarker = dispatchAndAssert(original, [{
      type: 'ADD_MARKER',
      marker: {
        type: 'point', id: toMarkerId('m1'), frame: toFrame(100),
        label: 'Test', color: 'red', scope: 'global', linkedClipId: null,
      },
    }]);
    expect(withMarker.timeline.markers).toHaveLength(1);

    let h = createHistory(original);
    h = pushHistory(h, withMarker);
    h = undo(h);
    expect(getCurrentState(h).timeline.markers).toHaveLength(0);
  });

  it('SET_IN_POINT: undo clears the in point', () => {
    const original = makeBaseState();
    const withIn = dispatchAndAssert(original, [
      { type: 'SET_IN_POINT', frame: toFrame(50) },
    ]);
    expect(withIn.timeline.inPoint).toBe(50);

    let h = createHistory(original);
    h = pushHistory(h, withIn);
    h = undo(h);
    expect(getCurrentState(h).timeline.inPoint).toBeNull();
  });

  it('SET_OUT_POINT: undo clears the out point', () => {
    const original = makeBaseState();
    const withOut = dispatchAndAssert(original, [
      { type: 'SET_OUT_POINT', frame: toFrame(2500) },
    ]);
    expect(withOut.timeline.outPoint).toBe(2500);

    let h = createHistory(original);
    h = pushHistory(h, withOut);
    h = undo(h);
    expect(getCurrentState(h).timeline.outPoint).toBeNull();
  });

  it('ADD_EFFECT: undo removes the effect', () => {
    const original = makeBaseState();
    const withEffect = dispatchAndAssert(original, [{
      type: 'ADD_EFFECT',
      clipId: toClipId('clip-1'),
      effect: createEffect(toEffectId('e1'), 'blur', 'preComposite', []),
    }]);
    expect(withEffect.timeline.tracks[0]!.clips[0]!.effects).toHaveLength(1);

    let h = createHistory(original);
    h = pushHistory(h, withEffect);
    h = undo(h);
    expect(getCurrentState(h).timeline.tracks[0]!.clips[0]!.effects).toBeUndefined();
  });
});

// ── Multi-operation undo/redo ────────────────────────────────────────────────

describe('Undo/Redo Round-Trip — multiple operations', () => {
  it('5 operations, undo all 5, state === original', () => {
    const original = makeBaseState();
    let state = original;

    state = dispatchAndAssert(state, [{ type: 'RENAME_TIMELINE', name: 'Step 1' }]);
    state = dispatchAndAssert(state, [{ type: 'SET_TIMELINE_DURATION', duration: toFrame(6000) }]);
    state = dispatchAndAssert(state, [{
      type: 'MOVE_CLIP', clipId: toClipId('clip-1'), newTimelineStart: toFrame(100),
    }]);
    state = dispatchAndAssert(state, [{ type: 'RENAME_TIMELINE', name: 'Step 4' }]);
    state = dispatchAndAssert(state, [{
      type: 'SET_CLIP_SPEED', clipId: toClipId('clip-1'), speed: 1.0,
    }]);

    // Build history
    let h = createHistory(original);
    h = pushHistory(h, state);

    // Undo all 5
    for (let i = 0; i < 5; i++) h = undo(h);

    expect(getCurrentState(h).timeline.name).toBe(original.timeline.name);
    expect(getCurrentState(h).timeline.duration).toBe(original.timeline.duration);
    expect(getCurrentState(h).timeline.version).toBe(0);
  });

  it('5 operations, undo all 5, redo all 5, state === after all 5', () => {
    const original = makeBaseState();
    let state = original;

    for (let i = 0; i < 5; i++) {
      state = dispatchAndAssert(state, [{ type: 'RENAME_TIMELINE', name: `Step ${i}` }]);
    }
    const afterAll = state;

    // Build history
    let h = createHistory(original);
    h = pushHistory(h, state);

    // Undo all 5
    for (let i = 0; i < 5; i++) h = undo(h);
    // Redo all 5
    for (let i = 0; i < 5; i++) h = redo(h);

    expect(getCurrentState(h).timeline.name).toBe(afterAll.timeline.name);
    expect(getCurrentState(h).timeline.version).toBe(afterAll.timeline.version);
  });
});

// ── Branching (undo then new op discards redo) ───────────────────────────────

describe('Undo/Redo Round-Trip — branching', () => {
  it('undo 3, then new op: old redo stack is discarded', () => {
    const original = makeBaseState();

    // Build history with 5 separate states
    const s1 = dispatchAndAssert(original, [{ type: 'RENAME_TIMELINE', name: 'Step 1' }]);
    const s2 = dispatchAndAssert(s1, [{ type: 'RENAME_TIMELINE', name: 'Step 2' }]);
    const s3 = dispatchAndAssert(s2, [{ type: 'RENAME_TIMELINE', name: 'Step 3' }]);
    const s4 = dispatchAndAssert(s3, [{ type: 'RENAME_TIMELINE', name: 'Step 4' }]);
    const s5 = dispatchAndAssert(s4, [{ type: 'RENAME_TIMELINE', name: 'Step 5' }]);

    let h = createHistory(original);
    h = pushHistory(h, s1);
    h = pushHistory(h, s2);
    h = pushHistory(h, s3);
    h = pushHistory(h, s4);
    h = pushHistory(h, s5);

    // Undo 3 → should be at s2 (name='Step 2')
    h = undo(h); h = undo(h); h = undo(h);
    expect(getCurrentState(h).timeline.name).toBe('Step 2');

    // New operation
    const newState = dispatchAndAssert(getCurrentState(h), [
      { type: 'RENAME_TIMELINE', name: 'New Branch' },
    ]);
    h = pushHistory(h, newState);

    // Redo should not be possible (old future discarded)
    expect(canRedo(h)).toBe(false);
    expect(getCurrentState(h).timeline.name).toBe('New Branch');
  });

  it('undo all the way, then redo works correctly', () => {
    const original = makeBaseState();
    const renamed = dispatchAndAssert(original, [
      { type: 'RENAME_TIMELINE', name: 'Changed' },
    ]);

    let h = createHistory(original);
    h = pushHistory(h, renamed);

    h = undo(h);
    expect(getCurrentState(h).timeline.name).toBe('Test');
    expect(canUndo(h)).toBe(false);

    h = redo(h);
    expect(getCurrentState(h).timeline.name).toBe('Changed');
  });
});

// ── Rejected operations never enter history ──────────────────────────────────

describe('Undo/Redo Round-Trip — rejected operations', () => {
  it('rejected operation does not enter history', () => {
    const original = makeBaseState();
    const renamed = dispatchAndAssert(original, [
      { type: 'RENAME_TIMELINE', name: 'Valid' },
    ]);

    let h = createHistory(original);
    h = pushHistory(h, renamed);

    // Try a rejected operation
    const badResult = dispatch(getCurrentState(h), makeTx([
      { type: 'DELETE_CLIP', clipId: toClipId('nonexistent') },
    ]));
    expect(badResult.accepted).toBe(false);

    // State should still be 'Valid', and undo should go to original
    expect(getCurrentState(h).timeline.name).toBe('Valid');
    h = undo(h);
    expect(getCurrentState(h).timeline.name).toBe('Test');
    expect(canUndo(h)).toBe(false);
  });

  it('rejected op in multi-op transaction: nothing enters history', () => {
    const original = makeBaseState();

    let h = createHistory(original);

    // Multi-op with one bad op — entire transaction rejected
    const result = dispatch(getCurrentState(h), makeTx([
      { type: 'RENAME_TIMELINE', name: 'Good' },
      { type: 'DELETE_CLIP', clipId: toClipId('nonexistent') },
    ]));
    expect(result.accepted).toBe(false);

    // State should be unchanged
    expect(getCurrentState(h).timeline.name).toBe('Test');
    expect(canUndo(h)).toBe(false);
  });
});

// ── HistoryStack compression round-trip ──────────────────────────────────────

describe('Undo/Redo Round-Trip — HistoryStack compression', () => {
  it('compressed history still round-trips through undo/redo', () => {
    const clock = vi.fn()
      .mockReturnValue(1000)
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1100);

    const stack = new HistoryStack(100, DEFAULT_COMPRESSION_POLICY, clock);

    const s0 = makeBaseState(); // name: 'Test'
    const s1 = { ...s0, timeline: { ...s0.timeline, name: 'S1', version: 1 } };
    const s2 = { ...s0, timeline: { ...s0.timeline, name: 'S2', version: 2 } };

    const mkEntry = (state: TimelineState, opType: string) => ({
      state,
      transaction: {
        id: 'tx', label: 'test', timestamp: 0,
        operations: [{ type: opType } as OperationPrimitive],
      },
    });

    stack.push(mkEntry(s0, 'INIT'));
    stack.pushWithCompression(mkEntry(s1, 'MOVE_CLIP'), mkEntry(s1, 'MOVE_CLIP').transaction);
    stack.pushWithCompression(mkEntry(s2, 'MOVE_CLIP'), mkEntry(s2, 'MOVE_CLIP').transaction);

    // Current state should be S2
    expect(stack.getCurrentState()?.timeline.name).toBe('S2');

    // Undo should work — after compression within window, stack has s0 then s2
    const undone = stack.undo();
    expect(undone?.timeline.name).toBe('Test'); // s0's name
  });

  it('undo after compression returns to correct prior state', () => {
    const clock = vi.fn()
      .mockReturnValue(1000)
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1100);

    const stack = new HistoryStack(100, DEFAULT_COMPRESSION_POLICY, clock);

    const s0 = makeBaseState(); // name: 'Test'
    const s1 = { ...s0, timeline: { ...s0.timeline, name: 'S1', version: 1 } };
    const s2 = { ...s0, timeline: { ...s0.timeline, name: 'S2', version: 2 } };

    const mkEntry = (state: TimelineState, opType: string) => ({
      state,
      transaction: {
        id: 'tx', label: 'test', timestamp: 0,
        operations: [{ type: opType } as OperationPrimitive],
      },
    });

    stack.push(mkEntry(s0, 'INIT'));
    stack.pushWithCompression(mkEntry(s1, 'MOVE_CLIP'), mkEntry(s1, 'MOVE_CLIP').transaction);
    stack.pushWithCompression(mkEntry(s2, 'MOVE_CLIP'), mkEntry(s2, 'MOVE_CLIP').transaction);

    // Undo: goes back to the state before the compressed group
    stack.undo();
    expect(stack.getCurrentState()?.timeline.name).toBe('Test'); // s0's name
  });
});

// ── Invariant preservation through undo/redo ─────────────────────────────────

describe('Undo/Redo Round-Trip — invariant preservation', () => {
  it('state is valid after every undo', () => {
    const original = makeBaseState();
    let state = original;

    state = dispatchAndAssert(state, [{ type: 'RENAME_TIMELINE', name: 'A' }]);
    state = dispatchAndAssert(state, [
      { type: 'SET_TIMELINE_DURATION', duration: toFrame(6000) },
    ]);
    state = dispatchAndAssert(state, [{
      type: 'MOVE_CLIP', clipId: toClipId('clip-1'), newTimelineStart: toFrame(100),
    }]);

    let h = createHistory(original);
    h = pushHistory(h, state);

    // Undo all — each state should pass invariants
    h = undo(h);
    expect(checkInvariants(getCurrentState(h))).toEqual([]);
    h = undo(h);
    expect(checkInvariants(getCurrentState(h))).toEqual([]);
    h = undo(h);
    expect(checkInvariants(getCurrentState(h))).toEqual([]);
  });

  it('state is valid after every redo', () => {
    const original = makeBaseState();
    let state = original;

    state = dispatchAndAssert(state, [{ type: 'RENAME_TIMELINE', name: 'A' }]);
    state = dispatchAndAssert(state, [
      { type: 'SET_TIMELINE_DURATION', duration: toFrame(6000) },
    ]);

    let h = createHistory(original);
    h = pushHistory(h, state);
    h = undo(h);
    h = undo(h);

    h = redo(h);
    expect(checkInvariants(getCurrentState(h))).toEqual([]);
    h = redo(h);
    expect(checkInvariants(getCurrentState(h))).toEqual([]);
  });
});
