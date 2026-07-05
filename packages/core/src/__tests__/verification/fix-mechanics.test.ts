/**
 * VERIFICATION TESTS — Fix Mechanics
 *
 * These tests verify the specific fix mechanics mentioned in the verification prompt:
 * 1. Exhaustiveness checks (item #6) - compile-time checks for new operation variants
 * 2. Object.freeze depth (item #10) - how deep the immutability guarantee goes
 * 3. Track opacity check (item #13) - correct handling of optional opacity field
 */

import { describe, it, expect } from 'vitest';
import { dispatch } from '../../engine/dispatcher';
import { applyOperation } from '../../engine/apply';
import { checkInvariants } from '../../validation/invariants';
import { createTimelineState } from '../../types/state';
import { createTimeline } from '../../types/timeline';
import { createTrack, toTrackId } from '../../types/track';
import { createClip } from '../../types/clip';
import { createAsset, toAssetId } from '../../types/asset';
import { toFrame, toTimecode } from '../../types/frame';
import type { TimelineState } from '../../types/state';
import type { Transaction, OperationPrimitive } from '../../types/operations';

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

let txCounter = 0;
function tx(ops: OperationPrimitive[]): Transaction {
  return { id: `tx-${++txCounter}`, label: 'test', timestamp: Date.now(), operations: ops };
}

// ── Item #10: Object.freeze depth ────────────────────────────────────────────

describe('VERIFICATION: Object.freeze depth (Item #10)', () => {
  it('top-level state is frozen', () => {
    const state = makeBaseState();
    const result = dispatch(state, tx([{ type: 'RENAME_TIMELINE', name: 'x' }]));
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error('Rejected');
    expect(Object.isFrozen(result.nextState)).toBe(true);
  });

  it('timeline is frozen', () => {
    const state = makeBaseState();
    const result = dispatch(state, tx([{ type: 'RENAME_TIMELINE', name: 'x' }]));
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error('Rejected');
    expect(Object.isFrozen(result.nextState.timeline)).toBe(true);
  });

  it('tracks are frozen', () => {
    const state = makeBaseState();
    const result = dispatch(state, tx([{ type: 'RENAME_TIMELINE', name: 'x' }]));
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error('Rejected');
    for (const track of result.nextState.timeline.tracks) {
      expect(Object.isFrozen(track)).toBe(true);
    }
  });

  it('clips are frozen', () => {
    const state = makeBaseState();
    const result = dispatch(state, tx([{ type: 'RENAME_TIMELINE', name: 'x' }]));
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error('Rejected');
    for (const track of result.nextState.timeline.tracks) {
      for (const clip of track.clips) {
        expect(Object.isFrozen(clip)).toBe(true);
      }
    }
  });

  it('assetRegistry is immutable (Proxy-wrapped)', () => {
    const state = makeBaseState();
    const result = dispatch(state, tx([{ type: 'RENAME_TIMELINE', name: 'x' }]));
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error('Rejected');
    const registry = result.nextState.assetRegistry;
    // Object.freeze() on a Map does not prevent .set()/.delete()/.clear() —
    // those operate on internal slots. The dispatcher wraps in a read-only Proxy.
    expect(() => (registry as any).set('x', {})).toThrow();
    expect(() => (registry as any).delete('x')).toThrow();
    expect(() => (registry as any).clear()).toThrow();
    // Read access still works
    expect(registry.size).toBeGreaterThanOrEqual(0);
    expect(typeof registry.get).toBe('function');
    expect(typeof registry.has).toBe('function');
  });

  it('clips effects array is NOT frozen (one level deep only)', () => {
    const state = makeBaseState();
    // Add an effect to the clip
    const result = dispatch(state, tx([{
      type: 'ADD_EFFECT',
      clipId: 'clip-1',
      effect: {
        id: 'effect-1',
        effectType: 'blur',
        renderStage: 'preComposite',
        enabled: true,
        params: [],
        keyframes: [],
      },
    }]));
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error('Rejected');
    
    const clip = result.nextState.timeline.tracks[0]!.clips[0]!;
    // The clip itself is frozen
    expect(Object.isFrozen(clip)).toBe(true);
    // But the effects array inside is NOT frozen (one level deep)
    expect(Object.isFrozen(clip.effects)).toBe(false);
  });
});

// ── Item #13: Track opacity check ────────────────────────────────────────────

describe('VERIFICATION: Track opacity check (Item #13)', () => {
  it('track without opacity field passes invariants', () => {
    const state = makeBaseState();
    // Track without opacity (using createTrack which doesn't set opacity by default)
    const violations = checkInvariants(state);
    expect(violations.some(v => v.type === 'INVALID_OPACITY')).toBe(false);
  });

  it('track with opacity in [0, 1] passes invariants', () => {
    const state = makeBaseState();
    // Add opacity to the track
    const track = state.timeline.tracks[0]!;
    const trackWithOpacity = { ...track, opacity: 0.5 };
    const tracks = [trackWithOpacity, ...state.timeline.tracks.slice(1)];
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    const violations = checkInvariants(badState);
    expect(violations.some(v => v.type === 'INVALID_OPACITY')).toBe(false);
  });

  it('track with opacity < 0 is detected', () => {
    const state = makeBaseState();
    const track = state.timeline.tracks[0]!;
    const trackWithOpacity = { ...track, opacity: -0.5 };
    const tracks = [trackWithOpacity, ...state.timeline.tracks.slice(1)];
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    const violations = checkInvariants(badState);
    expect(violations.some(v => v.type === 'INVALID_OPACITY')).toBe(true);
  });

  it('track with opacity > 1 is detected', () => {
    const state = makeBaseState();
    const track = state.timeline.tracks[0]!;
    const trackWithOpacity = { ...track, opacity: 1.5 };
    const tracks = [trackWithOpacity, ...state.timeline.tracks.slice(1)];
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    const violations = checkInvariants(badState);
    expect(violations.some(v => v.type === 'INVALID_OPACITY')).toBe(true);
  });

  it('track with NaN opacity is detected', () => {
    const state = makeBaseState();
    const track = state.timeline.tracks[0]!;
    const trackWithOpacity = { ...track, opacity: NaN };
    const tracks = [trackWithOpacity, ...state.timeline.tracks.slice(1)];
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    const violations = checkInvariants(badState);
    expect(violations.some(v => v.type === 'INVALID_OPACITY')).toBe(true);
  });

  it('SET_TRACK_OPACITY with out-of-range value is rejected by validator', () => {
    const state = makeBaseState();
    const result = dispatch(state, tx([{
      type: 'SET_TRACK_OPACITY',
      trackId: toTrackId('track-1'),
      opacity: 1.5,
    }]));
    expect(result.accepted).toBe(false);
  });
});

// ── Item #6: Exhaustiveness checks ───────────────────────────────────────────

describe('VERIFICATION: Exhaustiveness checks (Item #6)', () => {
  it('unknown operation type is rejected by validator', () => {
    const state = makeBaseState();
    const evilOp = { type: 'EVIL_DELETE_ALL_DATA' } as unknown as OperationPrimitive;
    const result = dispatch(state, tx([evilOp]));
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('UNKNOWN_OPERATION');
  });

  it('unknown operation type throws in applyOperation', () => {
    const state = makeBaseState();
    const evilOp = { type: 'EVIL_DELETE_ALL_DATA' } as unknown as OperationPrimitive;
    expect(() => applyOperation(state, evilOp)).toThrow('Unhandled operation type');
  });
});
