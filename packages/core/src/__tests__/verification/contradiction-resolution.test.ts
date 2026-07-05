/**
 * VERIFICATION TESTS — Contradiction Resolution
 *
 * These tests directly address the contradictions between TIER-0-RESULTS.md
 * (which claims items #3 and #5 were "already implemented (pre-existing)")
 * and ARCHITECTURE-REVIEW.md (which cited these as the two highest-confidence
 * findings in the entire audit).
 *
 * Each test constructs a state that would violate the invariant if the gap
 * described in the original architecture review still exists.
 * If the test PASSES, the gap is closed. If it FAILS, the gap is open.
 */

import { describe, it, expect } from 'vitest';
import { checkInvariants } from '../../validation/invariants';
import { createTimelineState, CURRENT_SCHEMA_VERSION } from '../../types/state';
import { createTimeline } from '../../types/timeline';
import { createTrack } from '../../types/track';
import { createClip } from '../../types/clip';
import { createAsset, toAssetId } from '../../types/asset';
import { toFrame, toTimecode } from '../../types/frame';

function makeBaseState() {
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

// ── Item #3: clip.trackId === track.id ───────────────────────────────────────

describe('VERIFICATION: clip.trackId === track.id check (Item #3)', () => {
  it('clip with wrong trackId is detected by checkInvariants', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    // Construct a clip with trackId pointing to a non-existent track
    const badClip = { ...clip, trackId: 'ghost-track' as any };
    const tracks = state.timeline.tracks.map(t =>
      t.id === 'track-1' ? { ...t, clips: [badClip] } : t,
    );
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    const violations = checkInvariants(badState);
    // The check should flag this: clip.trackId ('ghost-track') != track.id ('track-1')
    expect(violations.some(v => v.entityId === 'clip-1')).toBe(true);
  });

  it('clip with correct trackId passes', () => {
    const state = makeBaseState();
    const violations = checkInvariants(state);
    // No trackId mismatch violations
    expect(violations.filter(v => v.entityId === 'clip-1')).toHaveLength(0);
  });
});

// ── Item #5: Frame values must be integers ───────────────────────────────────

describe('VERIFICATION: Frame values must be integers (Item #5)', () => {
  it('clip with non-integer timelineStart is detected', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    // Create a clip with non-integer timelineStart (10.5)
    const badClip = { ...clip, timelineStart: 10.5 };
    const tracks = state.timeline.tracks.map(t =>
      t.id === 'track-1' ? { ...t, clips: [badClip] } : t,
    );
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    const violations = checkInvariants(badState);
    // The check should flag this: timelineStart (10.5) must be an integer
    expect(violations.some(v => v.entityId === 'clip-1')).toBe(true);
  });

  it('clip with non-integer timelineEnd is detected', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    // Create a clip with non-integer timelineEnd (200.7)
    const badClip = { ...clip, timelineEnd: 200.7 };
    const tracks = state.timeline.tracks.map(t =>
      t.id === 'track-1' ? { ...t, clips: [badClip] } : t,
    );
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    const violations = checkInvariants(badState);
    // The check should flag this: timelineEnd (200.7) must be an integer
    expect(violations.some(v => v.entityId === 'clip-1')).toBe(true);
  });

  it('clip with non-integer mediaIn is detected', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    // Create a clip with non-integer mediaIn (0.3)
    const badClip = { ...clip, mediaIn: 0.3 };
    const tracks = state.timeline.tracks.map(t =>
      t.id === 'track-1' ? { ...t, clips: [badClip] } : t,
    );
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    const violations = checkInvariants(badState);
    // The check should flag this: mediaIn (0.3) must be an integer
    expect(violations.some(v => v.entityId === 'clip-1')).toBe(true);
  });

  it('clip with non-integer mediaOut is detected', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    // Create a clip with non-integer mediaOut (200.9)
    const badClip = { ...clip, mediaOut: 200.9 };
    const tracks = state.timeline.tracks.map(t =>
      t.id === 'track-1' ? { ...t, clips: [badClip] } : t,
    );
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    const violations = checkInvariants(badState);
    // The check should flag this: mediaOut (200.9) must be an integer
    expect(violations.some(v => v.entityId === 'clip-1')).toBe(true);
  });

  it('clip with all integer frame values passes', () => {
    const state = makeBaseState();
    const violations = checkInvariants(state);
    // No integer violations
    expect(violations.filter(v => v.entityId === 'clip-1')).toHaveLength(0);
  });
});
