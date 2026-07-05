/**
 * HISTORY ENGINE TESTS — Phase 0
 *
 * Verifies that the HistoryStack correctly tracks undo/redo with
 * the pure, immutable HistoryState functions.
 */

import { describe, it, expect } from 'vitest';
import {
  createHistory,
  pushHistory,
  undo,
  redo,
  canUndo,
  canRedo,
  getCurrentState,
  clearHistory,
} from '../engine/history';
import { createTimelineState } from '../types/state';
import { createTimeline } from '../types/timeline';
import { createTrack, toTrackId } from '../types/track';
import { createClip, toClipId } from '../types/clip';
import { createAsset, toAssetId } from '../types/asset';
import { toFrame, toTimecode } from '../types/frame';
import { dispatch } from '../engine/dispatcher';
import { checkInvariants } from '../validation/invariants';
import type { Transaction, OperationPrimitive } from '../types/operations';

function makeTimeline(name: string, version = 0) {
  return createTimeline({ id: 'tl', name, fps: 30, duration: toFrame(3000), version } as any);
}

function makeState(name: string) {
  return createTimelineState({ timeline: makeTimeline(name) });
}

/** Build a state with a clip for dispatch round-trip tests. */
function makeStateWithClip() {
  const asset = createAsset({
    id: 'asset-1', name: 'V', mediaType: 'video',
    filePath: '/v.mp4', intrinsicDuration: toFrame(10000),
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

let txCounter = 0;
function makeTx(ops: OperationPrimitive[]): Transaction {
  return { id: `tx-${++txCounter}`, label: 'test', timestamp: Date.now(), operations: ops };
}

function apply(state: ReturnType<typeof makeStateWithClip>, ops: OperationPrimitive[]) {
  const result = dispatch(state, makeTx(ops));
  expect(result.accepted).toBe(true);
  if (!result.accepted) throw new Error('Rejected');
  return result.nextState;
}

describe('createHistory', () => {
  it('creates history with no past or future', () => {
    const h = createHistory(makeState('S0'));
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
    expect(getCurrentState(h).timeline.name).toBe('S0');
  });
});

describe('pushHistory', () => {
  it('moves present to past and sets new state as present', () => {
    let h = createHistory(makeState('S0'));
    h = pushHistory(h, makeState('S1'));
    expect(getCurrentState(h).timeline.name).toBe('S1');
    expect(canUndo(h)).toBe(true);
  });

  it('clears future when a new state is pushed', () => {
    let h = createHistory(makeState('S0'));
    h = pushHistory(h, makeState('S1'));
    h = undo(h);                      // future = [S1]
    h = pushHistory(h, makeState('S2')); // future should clear
    expect(canRedo(h)).toBe(false);
    expect(getCurrentState(h).timeline.name).toBe('S2');
  });

  it('respects the history limit', () => {
    let h = createHistory(makeState('S0'), 3); // limit to 3 past entries
    h = pushHistory(h, makeState('S1'));
    h = pushHistory(h, makeState('S2'));
    h = pushHistory(h, makeState('S3'));
    h = pushHistory(h, makeState('S4')); // oldest (S0) should be dropped
    // Can still undo 3 times to reach S1
    h = undo(h); // → S3
    h = undo(h); // → S2
    h = undo(h); // → S1
    expect(getCurrentState(h).timeline.name).toBe('S1');
    expect(canUndo(h)).toBe(false); // S0 was evicted
  });
});

describe('undo / redo', () => {
  it('undo returns to previous state', () => {
    let h = createHistory(makeState('S0'));
    h = pushHistory(h, makeState('S1'));
    h = undo(h);
    expect(getCurrentState(h).timeline.name).toBe('S0');
  });

  it('redo re-applies an undone state', () => {
    let h = createHistory(makeState('S0'));
    h = pushHistory(h, makeState('S1'));
    h = undo(h);
    h = redo(h);
    expect(getCurrentState(h).timeline.name).toBe('S1');
  });

  it('undo is a no-op when there is no past', () => {
    const h = createHistory(makeState('S0'));
    const h2 = undo(h);
    expect(h2).toBe(h); // reference equality — nothing changed
  });

  it('redo is a no-op when there is no future', () => {
    const h = createHistory(makeState('S0'));
    const h2 = redo(h);
    expect(h2).toBe(h);
  });

  it('multiple undo/redo cycles work correctly', () => {
    let h = createHistory(makeState('A'));
    h = pushHistory(h, makeState('B'));
    h = pushHistory(h, makeState('C'));

    h = undo(h); expect(getCurrentState(h).timeline.name).toBe('B');
    h = undo(h); expect(getCurrentState(h).timeline.name).toBe('A');
    h = redo(h); expect(getCurrentState(h).timeline.name).toBe('B');
    h = redo(h); expect(getCurrentState(h).timeline.name).toBe('C');
  });
});

describe('clearHistory', () => {
  it('resets past and future but keeps current state', () => {
    let h = createHistory(makeState('S0'));
    h = pushHistory(h, makeState('S1'));
    h = clearHistory(h);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
    expect(getCurrentState(h).timeline.name).toBe('S1');
  });
});

// ── History + dispatch round-trip integration ────────────────────────────────

describe('History + dispatch round-trip', () => {
  it('undo after a compound transaction restores original state', () => {
    let state = makeStateWithClip();
    let h = createHistory(state);

    // Compound transaction: rename + move clip
    const newState = apply(state, [
      { type: 'RENAME_TIMELINE', name: 'Renamed' },
      { type: 'MOVE_CLIP', clipId: toClipId('clip-1'), newTimelineStart: toFrame(100) },
    ]);
    h = pushHistory(h, newState);

    // Verify state changed
    expect(getCurrentState(h).timeline.name).toBe('Renamed');
    expect(getCurrentState(h).timeline.tracks[0]!.clips[0]!.timelineStart).toBe(100);

    // Undo — should restore original state
    h = undo(h);
    expect(getCurrentState(h).timeline.name).toBe('Test');
    expect(getCurrentState(h).timeline.tracks[0]!.clips[0]!.timelineStart).toBe(0);
    expect(checkInvariants(getCurrentState(h))).toEqual([]);
  });

  it('redo after undo produces state matching the original push', () => {
    let state = makeStateWithClip();
    let h = createHistory(state);

    const s1 = apply(state, [{ type: 'RENAME_TIMELINE', name: 'V1' }]);
    h = pushHistory(h, s1);
    const s2 = apply(s1, [{ type: 'RENAME_TIMELINE', name: 'V2' }]);
    h = pushHistory(h, s2);

    // Undo twice, redo once → should be at V1
    h = undo(h);
    h = undo(h);
    h = redo(h);
    expect(getCurrentState(h).timeline.name).toBe('V1');
    expect(checkInvariants(getCurrentState(h))).toEqual([]);

    // Redo again → should be at V2
    h = redo(h);
    expect(getCurrentState(h).timeline.name).toBe('V2');
    expect(checkInvariants(getCurrentState(h))).toEqual([]);
  });

  it('serialization round-trip preserves timeline data', () => {
    let state = makeStateWithClip();
    const s1 = apply(state, [
      { type: 'RENAME_TIMELINE', name: 'Serialized' },
      { type: 'MOVE_CLIP', clipId: toClipId('clip-1'), newTimelineStart: toFrame(50) },
    ]);

    // JSON round-trip — verify timeline data survives (Map doesn't serialize in JSON)
    const json = JSON.parse(JSON.stringify(s1));
    expect(json.timeline.name).toBe('Serialized');
    expect(json.timeline.tracks[0]!.clips[0]!.timelineStart).toBe(50);
    expect(json.timeline.tracks[0]!.clips[0]!.timelineEnd).toBe(250);
    expect(json.timeline.version).toBe(1);
    expect(json.schemaVersion).toBe(s1.schemaVersion);
  });

  it('pushing new state after undo clears redo history', () => {
    let state = makeStateWithClip();
    let h = createHistory(state);

    const s1 = apply(state, [{ type: 'RENAME_TIMELINE', name: 'A' }]);
    h = pushHistory(h, s1);
    const s2 = apply(s1, [{ type: 'RENAME_TIMELINE', name: 'B' }]);
    h = pushHistory(h, s2);

    // Undo to A
    h = undo(h);
    expect(getCurrentState(h).timeline.name).toBe('A');
    expect(canRedo(h)).toBe(true);

    // Push new state C — redo should be cleared
    const s3 = apply(getCurrentState(h), [{ type: 'RENAME_TIMELINE', name: 'C' }]);
    h = pushHistory(h, s3);
    expect(canRedo(h)).toBe(false);
    expect(getCurrentState(h).timeline.name).toBe('C');
  });

  it('multiple undo/redo cycles maintain invariant compliance', () => {
    let state = makeStateWithClip();
    let h = createHistory(state);

    // Build a chain of states
    for (let i = 1; i <= 5; i++) {
      const s = apply(getCurrentState(h), [
        { type: 'RENAME_TIMELINE', name: `State ${i}` },
        { type: 'MOVE_CLIP', clipId: toClipId('clip-1'), newTimelineStart: toFrame(i * 10) },
      ]);
      h = pushHistory(h, s);
    }

    // Undo all the way back
    for (let i = 4; i >= 0; i--) {
      h = undo(h);
      expect(getCurrentState(h).timeline.name).toBe(i === 0 ? 'Test' : `State ${i}`);
      expect(checkInvariants(getCurrentState(h))).toEqual([]);
    }

    // Redo all the way forward
    for (let i = 1; i <= 5; i++) {
      h = redo(h);
      expect(getCurrentState(h).timeline.name).toBe(`State ${i}`);
      expect(checkInvariants(getCurrentState(h))).toEqual([]);
    }
  });
});
