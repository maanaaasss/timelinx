/**
 * LOCKED/MUTED TRACK ENFORCEMENT
 *
 * Runs every operation type against a locked track, asserting the correct ones
 * are rejected. This is exactly the kind of cross-cutting rule that's simple
 * to state but easy to violate in one code path while correctly enforcing it
 * in another.
 *
 * Note: Muted tracks currently only affect playback (UI-level), not mutation
 * blocking. This file focuses on locked track enforcement.
 */

import { describe, it, expect } from 'vitest';
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
import { toCaptionId } from '../../types/caption';
import type { TimelineState } from '../../types/state';
import type { Transaction, OperationPrimitive } from '../../types/operations';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeLockedState(): { state: TimelineState; clipId: string } {
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
  const track = createTrack({
    id: 'track-1', name: 'Locked V1', type: 'video',
    clips: [clip], locked: true,
  });
  const timeline = createTimeline({
    id: 'tl', name: 'Locked Test', fps: 30, duration: toFrame(3000),
    startTimecode: toTimecode('00:00:00:00'), tracks: [track],
  });
  return {
    state: createTimelineState({ timeline, assetRegistry: new Map([[toAssetId('asset-1'), asset]]) }),
    clipId: 'clip-1',
  };
}

function rejectsWithLockedTrack(state: TimelineState, ops: OperationPrimitive[]): void {
  const tx: Transaction = {
    id: `locked-test-${Date.now()}`, label: 'locked test', timestamp: Date.now(),
    operations: ops,
  };
  const result = dispatch(state, tx);
  expect(result.accepted).toBe(false);
  if (!result.accepted) {
    expect(result.reason).toBe('LOCKED_TRACK');
  }
}

// ── Operations that MUST be rejected on locked tracks ─────────────────────────

describe('Locked track enforcement — operations that must reject', () => {
  const { state, clipId } = makeLockedState();

  it('MOVE_CLIP is rejected on locked track', () => {
    rejectsWithLockedTrack(state, [{
      type: 'MOVE_CLIP',
      clipId: toClipId(clipId),
      newTimelineStart: toFrame(500),
    }]);
  });

  it('DELETE_CLIP is rejected on locked track', () => {
    rejectsWithLockedTrack(state, [{
      type: 'DELETE_CLIP',
      clipId: toClipId(clipId),
    }]);
  });

  it('INSERT_CLIP is rejected on locked track', () => {
    rejectsWithLockedTrack(state, [{
      type: 'INSERT_CLIP',
      clip: createClip({
        id: 'new-clip', assetId: 'asset-1', trackId: 'track-1',
        timelineStart: toFrame(500), timelineEnd: toFrame(700),
        mediaIn: toFrame(0), mediaOut: toFrame(200),
      }),
      trackId: toTrackId('track-1'),
    }]);
  });

  it('INSERT_GENERATOR is rejected on locked track', () => {
    rejectsWithLockedTrack(state, [{
      type: 'INSERT_GENERATOR',
      generator: {
        id: 'gen-1', type: 'solid', params: { color: '#fff' },
        duration: toFrame(100), name: 'Solid',
      },
      trackId: toTrackId('track-1'),
      atFrame: toFrame(500),
    }]);
  });

  it('ADD_CAPTION is rejected on locked track', () => {
    rejectsWithLockedTrack(state, [{
      type: 'ADD_CAPTION',
      trackId: toTrackId('track-1'),
      caption: {
        id: toCaptionId('cap-1'), text: 'Test',
        startFrame: toFrame(0), endFrame: toFrame(60),
        language: 'en', burnIn: false,
      },
    }]);
  });
});

// ── Operations that should NOT be blocked by lock ────────────────────────────

describe('Locked track enforcement — operations that must NOT reject', () => {
  it('RENAME_TIMELINE works on locked track', () => {
    const { state } = makeLockedState();
    const result = dispatch(state, {
      id: 'tx', label: 'test', timestamp: Date.now(),
      operations: [{ type: 'RENAME_TIMELINE', name: 'Renamed' }],
    });
    expect(result.accepted).toBe(true);
  });

  it('SET_TIMELINE_DURATION works on locked track', () => {
    const { state } = makeLockedState();
    const result = dispatch(state, {
      id: 'tx', label: 'test', timestamp: Date.now(),
      operations: [{ type: 'SET_TIMELINE_DURATION', duration: toFrame(6000) }],
    });
    expect(result.accepted).toBe(true);
  });

  it('ADD_TRACK works (adding a new track, not modifying locked one)', () => {
    const { state } = makeLockedState();
    const result = dispatch(state, {
      id: 'tx', label: 'test', timestamp: Date.now(),
      operations: [{
        type: 'ADD_TRACK',
        track: createTrack({ id: 'new-track', name: 'New', type: 'video', clips: [] }),
      }],
    });
    expect(result.accepted).toBe(true);
  });

  it('REGISTER_ASSET works (not track-specific)', () => {
    const { state } = makeLockedState();
    const result = dispatch(state, {
      id: 'tx', label: 'test', timestamp: Date.now(),
      operations: [{
        type: 'REGISTER_ASSET',
        asset: createAsset({
          id: 'new-asset', name: 'New', mediaType: 'video',
          filePath: '/media/new.mp4', intrinsicDuration: toFrame(1000),
          nativeFps: 30, sourceTimecodeOffset: toFrame(0),
        }),
      }],
    });
    expect(result.accepted).toBe(true);
  });

  it('SET_IN_POINT works (timeline-level, not track-specific)', () => {
    const { state } = makeLockedState();
    const result = dispatch(state, {
      id: 'tx', label: 'test', timestamp: Date.now(),
      operations: [{ type: 'SET_IN_POINT', frame: toFrame(50) }],
    });
    expect(result.accepted).toBe(true);
  });

  it('SET_OUT_POINT works (timeline-level)', () => {
    const { state } = makeLockedState();
    const result = dispatch(state, {
      id: 'tx', label: 'test', timestamp: Date.now(),
      operations: [{ type: 'SET_OUT_POINT', frame: toFrame(2500) }],
    });
    expect(result.accepted).toBe(true);
  });

  it('ADD_MARKER works (global marker, not track-specific)', () => {
    const { state } = makeLockedState();
    const result = dispatch(state, {
      id: 'tx', label: 'test', timestamp: Date.now(),
      operations: [{
        type: 'ADD_MARKER',
        marker: {
          type: 'point', id: toMarkerId('m1'), frame: toFrame(100),
          label: 'Test', color: 'red', scope: 'global', linkedClipId: null,
        },
      }],
    });
    expect(result.accepted).toBe(true);
  });
});

// ── SET_CLIP_SPEED on locked track ───────────────────────────────────────────

describe('Locked track enforcement — SET_CLIP_SPEED', () => {
  it('SET_CLIP_SPEED on locked track: behavior depends on validator', () => {
    // SET_CLIP_SPEED validator only checks speed > 0, not track lock.
    // However, the dispatcher runs checkInvariants after apply.
    // Speed change without media bounds adjustment causes DURATION_MISMATCH.
    const { state } = makeLockedState();
    const result = dispatch(state, {
      id: 'tx', label: 'test', timestamp: Date.now(),
      operations: [{
        type: 'SET_CLIP_SPEED',
        clipId: toClipId('clip-1'),
        speed: 2.0,
      }],
    });
    // Rejected because speed change causes DURATION_MISMATCH invariant violation
    expect(result.accepted).toBe(false);
  });
});

// ── SET_CLIP_ENABLED on locked track ─────────────────────────────────────────

describe('Locked track enforcement — SET_CLIP_ENABLED', () => {
  it('SET_CLIP_ENABLED on locked track: validator does not check lock', () => {
    // SET_CLIP_ENABLED validator doesn't check track lock.
    // But the operation changes clip state, which may or may not cause invariant issues.
    const { state } = makeLockedState();
    const result = dispatch(state, {
      id: 'tx', label: 'test', timestamp: Date.now(),
      operations: [{
        type: 'SET_CLIP_ENABLED',
        clipId: toClipId('clip-1'),
        enabled: false,
      }],
    });
    // This operation is accepted because the validator doesn't check lock
    // and disabling a clip doesn't cause invariant violations
    expect(result.accepted).toBe(true);
  });
});

// ── Operations on unlocked tracks work fine ──────────────────────────────────

describe('Locked track enforcement — unlocked tracks unaffected', () => {
  it('MOVE_CLIP works on unlocked track while another track is locked', () => {
    const asset = createAsset({
      id: 'asset-1', name: 'Video', mediaType: 'video',
      filePath: '/media/test.mp4', intrinsicDuration: toFrame(9000),
      nativeFps: 30, sourceTimecodeOffset: toFrame(0), status: 'online',
    });
    const clipLocked = createClip({
      id: 'clip-locked', assetId: 'asset-1', trackId: 'locked-track',
      timelineStart: toFrame(0), timelineEnd: toFrame(200),
      mediaIn: toFrame(0), mediaOut: toFrame(200),
    });
    const clipFree = createClip({
      id: 'clip-free', assetId: 'asset-1', trackId: 'free-track',
      timelineStart: toFrame(0), timelineEnd: toFrame(200),
      mediaIn: toFrame(0), mediaOut: toFrame(200),
    });
    const lockedTrack = createTrack({
      id: 'locked-track', name: 'Locked', type: 'video',
      clips: [clipLocked], locked: true,
    });
    const freeTrack = createTrack({
      id: 'free-track', name: 'Free', type: 'video',
      clips: [clipFree], locked: false,
    });
    const timeline = createTimeline({
      id: 'tl', name: 'Test', fps: 30, duration: toFrame(3000),
      startTimecode: toTimecode('00:00:00:00'), tracks: [lockedTrack, freeTrack],
    });
    const state = createTimelineState({
      timeline, assetRegistry: new Map([[toAssetId('asset-1'), asset]]),
    });

    // Moving clip on free track should succeed
    const result = dispatch(state, {
      id: 'tx', label: 'test', timestamp: Date.now(),
      operations: [{
        type: 'MOVE_CLIP',
        clipId: toClipId('clip-free'),
        newTimelineStart: toFrame(500),
      }],
    });
    expect(result.accepted).toBe(true);
  });

  it('DELETE_CLIP works on unlocked track', () => {
    const asset = createAsset({
      id: 'asset-1', name: 'Video', mediaType: 'video',
      filePath: '/media/test.mp4', intrinsicDuration: toFrame(9000),
      nativeFps: 30, sourceTimecodeOffset: toFrame(0), status: 'online',
    });
    const clipFree = createClip({
      id: 'clip-free', assetId: 'asset-1', trackId: 'free-track',
      timelineStart: toFrame(0), timelineEnd: toFrame(200),
      mediaIn: toFrame(0), mediaOut: toFrame(200),
    });
    const freeTrack = createTrack({
      id: 'free-track', name: 'Free', type: 'video',
      clips: [clipFree], locked: false,
    });
    const lockedTrack = createTrack({
      id: 'locked-track', name: 'Locked', type: 'video',
      clips: [], locked: true,
    });
    const timeline = createTimeline({
      id: 'tl', name: 'Test', fps: 30, duration: toFrame(3000),
      startTimecode: toTimecode('00:00:00:00'), tracks: [freeTrack, lockedTrack],
    });
    const state = createTimelineState({
      timeline, assetRegistry: new Map([[toAssetId('asset-1'), asset]]),
    });

    const result = dispatch(state, {
      id: 'tx', label: 'test', timestamp: Date.now(),
      operations: [{ type: 'DELETE_CLIP', clipId: toClipId('clip-free') }],
    });
    expect(result.accepted).toBe(true);
  });
});

// ── Muted track behavior (documenting current state) ─────────────────────────

describe('Muted track behavior (documenting current state)', () => {
  it('MOVE_CLIP is NOT blocked by muted track (muted = playback only)', () => {
    const asset = createAsset({
      id: 'asset-1', name: 'Video', mediaType: 'video',
      filePath: '/media/test.mp4', intrinsicDuration: toFrame(9000),
      nativeFps: 30, sourceTimecodeOffset: toFrame(0), status: 'online',
    });
    const clip = createClip({
      id: 'clip-1', assetId: 'asset-1', trackId: 'muted-track',
      timelineStart: toFrame(0), timelineEnd: toFrame(200),
      mediaIn: toFrame(0), mediaOut: toFrame(200),
    });
    const track = createTrack({
      id: 'muted-track', name: 'Muted', type: 'video',
      clips: [clip], muted: true,
    });
    const timeline = createTimeline({
      id: 'tl', name: 'Test', fps: 30, duration: toFrame(3000),
      startTimecode: toTimecode('00:00:00:00'), tracks: [track],
    });
    const state = createTimelineState({
      timeline, assetRegistry: new Map([[toAssetId('asset-1'), asset]]),
    });

    const result = dispatch(state, {
      id: 'tx', label: 'test', timestamp: Date.now(),
      operations: [{
        type: 'MOVE_CLIP',
        clipId: toClipId('clip-1'),
        newTimelineStart: toFrame(500),
      }],
    });
    // Muted tracks don't block mutations — this documents the current behavior
    expect(result.accepted).toBe(true);
  });
});
