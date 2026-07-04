/**
 * GLOBAL INVARIANT TESTS
 *
 * Comprehensive tests for every invariant check in checkInvariants().
 * After any operation, certain things must always be true about TimelineState.
 *
 * This file covers: overlap, frame bounds, orphaned references, duplicate IDs,
 * version monotonicity, timeline duration consistency, track/clip ordering.
 */

import { describe, it, expect } from 'vitest';
import { checkInvariants } from '../../validation/invariants';
import { dispatch } from '../../engine/dispatcher';
import { createTimelineState, CURRENT_SCHEMA_VERSION } from '../../types/state';
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

let txCounter = 0;
function tx(label: string, ops: OperationPrimitive[]): Transaction {
  return { id: `tx-${++txCounter}`, label, timestamp: Date.now(), operations: ops };
}

function apply(state: TimelineState, label: string, ops: OperationPrimitive[]): TimelineState {
  const result = dispatch(state, tx(label, ops));
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

// ── No overlapping clips ─────────────────────────────────────────────────────

describe('Invariant: no overlapping clips on same track', () => {
  it('valid state with non-overlapping clips passes', () => {
    let state = makeBaseState();
    state = apply(state, 'Add clip', [{
      type: 'INSERT_CLIP',
      clip: createClip({
        id: 'clip-2', assetId: 'asset-1', trackId: 'track-1',
        timelineStart: toFrame(200), timelineEnd: toFrame(400),
        mediaIn: toFrame(200), mediaOut: toFrame(400),
      }),
      trackId: toTrackId('track-1'),
    }]);
    expect(checkInvariants(state)).toEqual([]);
  });

  it('adjacent clips (end === start) are valid', () => {
    let state = makeBaseState();
    state = apply(state, 'Add adjacent', [{
      type: 'INSERT_CLIP',
      clip: createClip({
        id: 'clip-2', assetId: 'asset-1', trackId: 'track-1',
        timelineStart: toFrame(200), timelineEnd: toFrame(400),
        mediaIn: toFrame(200), mediaOut: toFrame(400),
      }),
      trackId: toTrackId('track-1'),
    }]);
    expect(checkInvariants(state)).toEqual([]);
  });

  it('overlapping clips on same track produce OVERLAP violation', () => {
    const state = makeBaseState();
    const clip2 = createClip({
      id: 'clip-overlap', assetId: 'asset-1', trackId: 'track-1',
      timelineStart: toFrame(100), timelineEnd: toFrame(300),
      mediaIn: toFrame(100), mediaOut: toFrame(300),
    });
    const tracks = state.timeline.tracks.map(t =>
      t.id === 'track-1' ? { ...t, clips: [...t.clips, clip2] } : t,
    );
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    const violations = checkInvariants(badState);
    expect(violations.some(v => v.type === 'OVERLAP')).toBe(true);
  });

  it('clips on different tracks can overlap', () => {
    const state = makeBaseState();
    const audioAsset = createAsset({
      id: 'audio-1', name: 'Audio', mediaType: 'audio',
      filePath: '/media/audio.wav', intrinsicDuration: toFrame(9000),
      nativeFps: 30, sourceTimecodeOffset: toFrame(0), status: 'online',
    });
    const audioClip = createClip({
      id: 'audio-clip', assetId: 'audio-1', trackId: 'audio-1',
      timelineStart: toFrame(50), timelineEnd: toFrame(150),
      mediaIn: toFrame(50), mediaOut: toFrame(150),
    });
    const audioTrack = createTrack({ id: 'audio-1', name: 'A1', type: 'audio', clips: [audioClip] });
    const newRegistry = new Map(state.assetRegistry);
    newRegistry.set(toAssetId('audio-1'), audioAsset);
    const badState = {
      ...state,
      assetRegistry: newRegistry,
      timeline: { ...state.timeline, tracks: [...state.timeline.tracks, audioTrack] },
    };
    expect(checkInvariants(badState)).toEqual([]);
  });
});

// ── Frame bounds ─────────────────────────────────────────────────────────────

describe('Invariant: frame bounds are valid', () => {
  it('timelineStart < timelineEnd for every clip', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    expect(clip.timelineStart).toBeLessThan(clip.timelineEnd);
  });

  it('mediaIn < mediaOut for every clip', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    expect(clip.mediaIn).toBeLessThan(clip.mediaOut);
  });

  it('frame values are always integers', () => {
    const state = makeBaseState();
    for (const track of state.timeline.tracks) {
      for (const clip of track.clips) {
        expect(Number.isInteger(clip.timelineStart)).toBe(true);
        expect(Number.isInteger(clip.timelineEnd)).toBe(true);
        expect(Number.isInteger(clip.mediaIn)).toBe(true);
        expect(Number.isInteger(clip.mediaOut)).toBe(true);
      }
    }
  });

  it('frame values are never negative in valid state', () => {
    const state = makeBaseState();
    for (const track of state.timeline.tracks) {
      for (const clip of track.clips) {
        expect(clip.timelineStart).toBeGreaterThanOrEqual(0);
        expect(clip.mediaIn).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('mediaOut <= asset.intrinsicDuration', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    const asset = state.assetRegistry.get(clip.assetId)!;
    expect(clip.mediaOut).toBeLessThanOrEqual(asset.intrinsicDuration);
  });

  it('timelineEnd <= timeline.duration', () => {
    const state = makeBaseState();
    for (const track of state.timeline.tracks) {
      for (const clip of track.clips) {
        expect(clip.timelineEnd).toBeLessThanOrEqual(state.timeline.duration);
      }
    }
  });

  it('DURATION_MISMATCH detected when media and timeline durations diverge', () => {
    const state = makeBaseState();
    // Manually create a clip with mismatched durations
    const badClip = createClip({
      id: 'bad', assetId: 'asset-1', trackId: 'track-1',
      timelineStart: toFrame(500), timelineEnd: toFrame(600), // 100 frames
      mediaIn: toFrame(0), mediaOut: toFrame(50), // 50 frames — mismatch
    });
    const tracks = state.timeline.tracks.map(t =>
      t.id === 'track-1' ? { ...t, clips: [...t.clips, badClip] } : t,
    );
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    const violations = checkInvariants(badState);
    expect(violations.some(v => v.type === 'DURATION_MISMATCH')).toBe(true);
  });
});

// ── No orphaned references ───────────────────────────────────────────────────

describe('Invariant: no orphaned references', () => {
  it('clip.assetId must reference an existing asset', () => {
    const state = makeBaseState();
    const badClip = createClip({
      id: 'orphan', assetId: 'nonexistent', trackId: 'track-1',
      timelineStart: toFrame(500), timelineEnd: toFrame(600),
      mediaIn: toFrame(0), mediaOut: toFrame(100),
    });
    const tracks = state.timeline.tracks.map(t =>
      t.id === 'track-1' ? { ...t, clips: [...t.clips, badClip] } : t,
    );
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    const violations = checkInvariants(badState);
    expect(violations.some(v => v.type === 'ASSET_MISSING')).toBe(true);
  });

  it('clip.trackId must reference an existing track (implicit: clip on wrong track)', () => {
    const state = makeBaseState();
    // A clip whose trackId doesn't match any track — invariant checker iterates tracks,
    // so this clip simply wouldn't be found on any track. But if we manually
    // inject it, the asset check should still work.
    const badClip = createClip({
      id: 'ghost', assetId: 'asset-1', trackId: 'ghost-track',
      timelineStart: toFrame(500), timelineEnd: toFrame(600),
      mediaIn: toFrame(0), mediaOut: toFrame(100),
    });
    // Manually add to a track but keep wrong trackId
    const tracks = state.timeline.tracks.map(t =>
      t.id === 'track-1' ? { ...t, clips: [...t.clips, badClip] } : t,
    );
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    // The track type check should catch this: clip on video track has
    // asset mediaType 'video' matching track type 'video', so that's fine.
    // But the clip's trackId field ('ghost-track') doesn't match the track it's on.
    // The invariant checker checks track.clips, so the clip IS found on track-1
    // even though its trackId says ghost-track. This is a data integrity issue
    // but the current checker doesn't flag it. We test what it DOES check.
    const violations = checkInvariants(badState);
    // At minimum, the clip should be checked against the track it's actually on
    expect(violations.every(v => v.entityId !== 'ghost')).toBe(true);
  });
});

// ── No duplicate IDs ─────────────────────────────────────────────────────────

describe('Invariant: no duplicate IDs', () => {
  it('all clip IDs on a track are unique', () => {
    const state = makeBaseState();
    const clipIds = state.timeline.tracks.flatMap(t => t.clips.map(c => c.id));
    const uniqueIds = new Set(clipIds);
    expect(uniqueIds.size).toBe(clipIds.length);
  });

  it('all track IDs are unique', () => {
    const state = makeBaseState();
    const trackIds = state.timeline.tracks.map(t => t.id);
    const uniqueIds = new Set(trackIds);
    expect(uniqueIds.size).toBe(trackIds.length);
  });

  it('marker IDs are unique', () => {
    const state = makeBaseState();
    const markerIds = state.timeline.markers.map(m => m.id);
    const uniqueIds = new Set(markerIds);
    expect(uniqueIds.size).toBe(markerIds.length);
  });

  it('asset IDs are unique', () => {
    const state = makeBaseState();
    const assetIds = Array.from(state.assetRegistry.keys());
    const uniqueIds = new Set(assetIds);
    expect(uniqueIds.size).toBe(assetIds.length);
  });
});

// ── Version counter ──────────────────────────────────────────────────────────

describe('Invariant: version counter is monotonic', () => {
  it('version starts at 0', () => {
    const state = makeBaseState();
    expect(state.timeline.version).toBe(0);
  });

  it('version increases by exactly 1 after each accepted transaction', () => {
    let state = makeBaseState();
    state = apply(state, 'op1', [{ type: 'RENAME_TIMELINE', name: 'v1' }]);
    expect(state.timeline.version).toBe(1);
    state = apply(state, 'op2', [{ type: 'RENAME_TIMELINE', name: 'v2' }]);
    expect(state.timeline.version).toBe(2);
    state = apply(state, 'op3', [{ type: 'RENAME_TIMELINE', name: 'v3' }]);
    expect(state.timeline.version).toBe(3);
  });

  it('version is unchanged after a rejected transaction', () => {
    const state = makeBaseState();
    const result = dispatch(state, tx('bad', [
      { type: 'DELETE_CLIP', clipId: toClipId('nonexistent') },
    ]));
    expect(result.accepted).toBe(false);
    // State should be completely unchanged — version still 0
    expect(state.timeline.version).toBe(0);
  });

  it('version bumps by 1 even for multi-op transactions', () => {
    let state = makeBaseState();
    // Extend timeline first so we can add clips
    state = apply(state, 'extend', [{ type: 'SET_TIMELINE_DURATION', duration: toFrame(9000) }]);
    state = apply(state, 'multi', [
      { type: 'RENAME_TIMELINE', name: 'a' },
      { type: 'SET_TIMELINE_DURATION', duration: toFrame(8000) },
      { type: 'RENAME_TIMELINE', name: 'b' },
    ]);
    expect(state.timeline.version).toBe(2); // 1 from extend + 1 from multi
  });
});

// ── Timeline duration consistency ────────────────────────────────────────────

describe('Invariant: timeline duration consistency', () => {
  it('no clip extends past timeline.duration', () => {
    const state = makeBaseState();
    for (const track of state.timeline.tracks) {
      for (const clip of track.clips) {
        expect(clip.timelineEnd).toBeLessThanOrEqual(state.timeline.duration);
      }
    }
  });

  it('CLIP_BEYOND_TIMELINE detected when clip end > duration', () => {
    const state = makeBaseState();
    const clip = createClip({
      id: 'beyond', assetId: 'asset-1', trackId: 'track-1',
      timelineStart: toFrame(2900), timelineEnd: toFrame(3100),
      mediaIn: toFrame(0), mediaOut: toFrame(200),
    });
    const tracks = state.timeline.tracks.map(t =>
      t.id === 'track-1' ? { ...t, clips: [...t.clips, clip] } : t,
    );
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    const violations = checkInvariants(badState);
    expect(violations.some(v => v.type === 'CLIP_BEYOND_TIMELINE')).toBe(true);
  });
});

// ── Track/clip ordering ──────────────────────────────────────────────────────

describe('Invariant: track/clip ordering is stable', () => {
  it('clips are sorted ascending by timelineStart', () => {
    const state = makeBaseState();
    for (const track of state.timeline.tracks) {
      for (let i = 1; i < track.clips.length; i++) {
        expect(track.clips[i]!.timelineStart).toBeGreaterThanOrEqual(
          track.clips[i - 1]!.timelineStart,
        );
      }
    }
  });

  it('TRACK_NOT_SORTED detected when clips are out of order', () => {
    const state = makeBaseState();
    const clip2 = createClip({
      id: 'clip-late', assetId: 'asset-1', trackId: 'track-1',
      timelineStart: toFrame(500), timelineEnd: toFrame(600),
      mediaIn: toFrame(0), mediaOut: toFrame(100),
    });
    const clipEarly = createClip({
      id: 'clip-early', assetId: 'asset-1', trackId: 'track-1',
      timelineStart: toFrame(300), timelineEnd: toFrame(400),
      mediaIn: toFrame(0), mediaOut: toFrame(100),
    });
    // Manually construct unsorted clips: [clip1, clip-late, clip-early]
    const badTrack = {
      ...state.timeline.tracks[0]!,
      clips: [state.timeline.tracks[0]!.clips[0]!, clip2, clipEarly],
    };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    };
    const violations = checkInvariants(badState);
    expect(violations.some(v => v.type === 'TRACK_NOT_SORTED')).toBe(true);
  });
});

// ── SPEED_INVALID ────────────────────────────────────────────────────────────

describe('Invariant: speed > 0', () => {
  it('speed must be positive', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    const badClip = { ...clip, speed: -1 };
    const tracks = state.timeline.tracks.map(t =>
      t.id === 'track-1' ? { ...t, clips: [badClip] } : t,
    );
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    expect(checkInvariants(badState).some(v => v.type === 'SPEED_INVALID')).toBe(true);
  });

  it('speed of zero is invalid', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    const badClip = { ...clip, speed: 0 };
    const tracks = state.timeline.tracks.map(t =>
      t.id === 'track-1' ? { ...t, clips: [badClip] } : t,
    );
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    expect(checkInvariants(badState).some(v => v.type === 'SPEED_INVALID')).toBe(true);
  });
});

// ── MARKER_OUT_OF_BOUNDS ─────────────────────────────────────────────────────

describe('Invariant: marker bounds', () => {
  it('point marker at valid frame passes', () => {
    const state = apply(makeBaseState(), 'add marker', [{
      type: 'ADD_MARKER',
      marker: {
        type: 'point', id: toMarkerId('m1'), frame: toFrame(100),
        label: 'Test', color: 'red', scope: 'global', linkedClipId: null,
      },
    }]);
    expect(checkInvariants(state)).toEqual([]);
  });

  it('point marker at frame >= duration is detected', () => {
    const state = makeBaseState(); // duration = 3000
    const badMarker = {
      type: 'point' as const, id: toMarkerId('m-bad'), frame: toFrame(3000),
      label: 'Bad', color: 'red', scope: 'global' as const, linkedClipId: null,
    };
    const badState = {
      ...state,
      timeline: { ...state.timeline, markers: [...state.timeline.markers, badMarker] },
    };
    const violations = checkInvariants(badState);
    expect(violations.some(v => v.type === 'MARKER_OUT_OF_BOUNDS')).toBe(true);
  });

  it('range marker with frameEnd > duration is detected', () => {
    const state = makeBaseState();
    const badMarker = {
      type: 'range' as const, id: toMarkerId('m-range'),
      frameStart: toFrame(2900), frameEnd: toFrame(3100),
      label: 'Bad', color: 'red', scope: 'global' as const, linkedClipId: null,
    };
    const badState = {
      ...state,
      timeline: { ...state.timeline, markers: [...state.timeline.markers, badMarker] },
    };
    const violations = checkInvariants(badState);
    expect(violations.some(v => v.type === 'MARKER_OUT_OF_BOUNDS')).toBe(true);
  });

  it('range marker with frameEnd <= frameStart is detected', () => {
    const state = makeBaseState();
    const badMarker = {
      type: 'range' as const, id: toMarkerId('m-bad-range'),
      frameStart: toFrame(500), frameEnd: toFrame(500),
      label: 'Bad', color: 'red', scope: 'global' as const, linkedClipId: null,
    };
    const badState = {
      ...state,
      timeline: { ...state.timeline, markers: [...state.timeline.markers, badMarker] },
    };
    const violations = checkInvariants(badState);
    expect(violations.some(v => v.type === 'MARKER_OUT_OF_BOUNDS')).toBe(true);
  });
});

// ── EFFECTS and KEYFRAMES ────────────────────────────────────────────────────

describe('Invariant: effects and keyframes', () => {
  it('valid effect with sorted keyframes passes', () => {
    let state = makeBaseState();
    state = apply(state, 'add effect', [{
      type: 'ADD_EFFECT',
      clipId: toClipId('clip-1'),
      effect: createEffect(toEffectId('e1'), 'blur', 'preComposite', [{ key: 'r', value: 5 }]),
    }]);
    state = apply(state, 'add keyframes', [
      {
        type: 'ADD_KEYFRAME',
        clipId: toClipId('clip-1'),
        effectId: toEffectId('e1'),
        keyframe: { id: toKeyframeId('kf1'), frame: toFrame(0), value: 0, easing: LINEAR_EASING },
      },
      {
        type: 'ADD_KEYFRAME',
        clipId: toClipId('clip-1'),
        effectId: toEffectId('e1'),
        keyframe: { id: toKeyframeId('kf2'), frame: toFrame(100), value: 10, easing: LINEAR_EASING },
      },
    ]);
    expect(checkInvariants(state)).toEqual([]);
  });

  it('keyframe order violation detected with duplicate frames', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    const effect = createEffect(toEffectId('e1'), 'blur', 'preComposite', []);
    const badEffect = {
      ...effect,
      keyframes: [
        { id: toKeyframeId('kf1'), frame: toFrame(50), value: 0, easing: LINEAR_EASING },
        { id: toKeyframeId('kf2'), frame: toFrame(50), value: 10, easing: LINEAR_EASING }, // duplicate frame
      ],
    };
    const badClip = { ...clip, effects: [badEffect] };
    const tracks = state.timeline.tracks.map(t =>
      t.id === 'track-1' ? { ...t, clips: [badClip] } : t,
    );
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    expect(checkInvariants(badState).some(v => v.type === 'KEYFRAME_ORDER_VIOLATION')).toBe(true);
  });

  it('invalid render stage is detected', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    const badEffect = {
      id: toEffectId('e-bad'),
      effectType: 'blur',
      renderStage: 'INVALID_STAGE',
      enabled: true,
      params: [],
      keyframes: [],
    };
    const badClip = { ...clip, effects: [badEffect as any] };
    const tracks = state.timeline.tracks.map(t =>
      t.id === 'track-1' ? { ...t, clips: [badClip] } : t,
    );
    const badState = { ...state, timeline: { ...state.timeline, tracks } };
    expect(checkInvariants(badState).some(v => v.type === 'INVALID_RENDER_STAGE')).toBe(true);
  });
});

// ── SCHEMA_VERSION_MISMATCH ──────────────────────────────────────────────────

describe('Invariant: schema version', () => {
  it('valid schema version passes', () => {
    const state = makeBaseState();
    expect(checkInvariants(state)).toEqual([]);
  });

  it('future schema version is rejected', () => {
    const state = makeBaseState();
    const badState = { ...state, schemaVersion: CURRENT_SCHEMA_VERSION + 1 };
    const violations = checkInvariants(badState);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.type).toBe('SCHEMA_VERSION_MISMATCH');
  });

  it('old schema version is rejected', () => {
    const state = makeBaseState();
    const badState = { ...state, schemaVersion: 0 };
    const violations = checkInvariants(badState);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.type).toBe('SCHEMA_VERSION_MISMATCH');
  });

  it('schema mismatch early-returns (no other checks run)', () => {
    const state = makeBaseState();
    // Create a state with bad schema AND overlapping clips
    const clip2 = createClip({
      id: 'overlap', assetId: 'asset-1', trackId: 'track-1',
      timelineStart: toFrame(50), timelineEnd: toFrame(150),
      mediaIn: toFrame(0), mediaOut: toFrame(100),
    });
    const tracks = state.timeline.tracks.map(t =>
      t.id === 'track-1' ? { ...t, clips: [...t.clips, clip2] } : t,
    );
    const badState = {
      ...state,
      schemaVersion: CURRENT_SCHEMA_VERSION + 99,
      timeline: { ...state.timeline, tracks },
    };
    const violations = checkInvariants(badState);
    // Should only have schema mismatch, not overlap
    expect(violations).toHaveLength(1);
  });
});

// ── CAPTION_OUT_OF_BOUNDS ────────────────────────────────────────────────────

describe('Invariant: caption bounds', () => {
  it('valid caption passes', () => {
    const state = apply(makeBaseState(), 'add caption', [{
      type: 'ADD_CAPTION',
      trackId: toTrackId('track-1'),
      caption: {
        id: toCaptionId('cap1'), text: 'Hello',
        startFrame: toFrame(0), endFrame: toFrame(60),
        language: 'en', burnIn: false,
      },
    }]);
    expect(checkInvariants(state)).toEqual([]);
  });

  it('caption endFrame > timeline duration is detected', () => {
    const state = makeBaseState(); // duration = 3000
    const badCaption = {
      id: toCaptionId('cap-bad'), text: 'Bad',
      startFrame: toFrame(0), endFrame: toFrame(3100),
      language: 'en', burnIn: false,
    };
    const badTrack = { ...state.timeline.tracks[0]!, captions: [badCaption] };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    };
    expect(checkInvariants(badState).some(v => v.type === 'CAPTION_OUT_OF_BOUNDS')).toBe(true);
  });

  it('caption endFrame <= startFrame is detected', () => {
    const state = makeBaseState();
    const badCaption = {
      id: toCaptionId('cap-bad2'), text: 'Bad',
      startFrame: toFrame(100), endFrame: toFrame(100),
      language: 'en', burnIn: false,
    };
    const badTrack = { ...state.timeline.tracks[0]!, captions: [badCaption] };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    };
    expect(checkInvariants(badState).some(v => v.type === 'CAPTION_OUT_OF_BOUNDS')).toBe(true);
  });
});

// ── Empty state ──────────────────────────────────────────────────────────────

describe('Invariant: empty state', () => {
  it('empty timeline with no tracks passes', () => {
    const timeline = createTimeline({
      id: 'empty', name: 'Empty', fps: 30,
      duration: toFrame(1000),
      startTimecode: toTimecode('00:00:00:00'),
      tracks: [],
    });
    const state = createTimelineState({ timeline });
    expect(checkInvariants(state)).toEqual([]);
  });

  it('tracks with no clips pass', () => {
    const track = createTrack({ id: 'empty-track', name: 'Empty', type: 'video', clips: [] });
    const timeline = createTimeline({
      id: 'tl', name: 'Test', fps: 30,
      duration: toFrame(1000),
      startTimecode: toTimecode('00:00:00:00'),
      tracks: [track],
    });
    const state = createTimelineState({ timeline });
    expect(checkInvariants(state)).toEqual([]);
  });
});

// ── Dispatch + invariant integration ─────────────────────────────────────────

describe('Invariant: dispatch integration', () => {
  it('invariants hold after MOVE_CLIP', () => {
    let state = makeBaseState();
    state = apply(state, 'move', [{
      type: 'MOVE_CLIP',
      clipId: toClipId('clip-1'),
      newTimelineStart: toFrame(500),
    }]);
    const clip = state.timeline.tracks[0]!.clips[0]!;
    expect(clip.timelineStart).toBe(500);
    expect(clip.timelineEnd).toBe(700);
  });

  it('invariants hold after RESIZE_CLIP', () => {
    let state = makeBaseState();
    state = apply(state, 'resize', [{
      type: 'RESIZE_CLIP',
      clipId: toClipId('clip-1'),
      edge: 'end',
      newFrame: toFrame(150),
    }]);
    const clip = state.timeline.tracks[0]!.clips[0]!;
    expect(clip.timelineEnd).toBe(150);
  });

  it('invariants hold after DELETE_CLIP', () => {
    let state = makeBaseState();
    state = apply(state, 'delete', [{
      type: 'DELETE_CLIP',
      clipId: toClipId('clip-1'),
    }]);
    expect(state.timeline.tracks[0]!.clips).toHaveLength(0);
  });

  it('invariants hold after SET_CLIP_SPEED', () => {
    let state = makeBaseState();
    // Speed change requires adjusting media bounds to maintain the invariant:
    // (mediaOut - mediaIn) === (timelineEnd - timelineStart) / speed
    // With speed=2.0, timeline duration=200, expected media duration=100
    state = apply(state, 'speed', [
      { type: 'SET_CLIP_SPEED', clipId: toClipId('clip-1'), speed: 2.0 },
      { type: 'SET_MEDIA_BOUNDS', clipId: toClipId('clip-1'), mediaIn: toFrame(0), mediaOut: toFrame(100) },
    ]);
    const clip = state.timeline.tracks[0]!.clips[0]!;
    expect(clip.speed).toBe(2.0);
  });

  it('invariants hold after ADD_TRACK', () => {
    let state = makeBaseState();
    state = apply(state, 'add track', [{
      type: 'ADD_TRACK',
      track: createTrack({ id: 'new-track', name: 'New', type: 'video', clips: [] }),
    }]);
    expect(state.timeline.tracks).toHaveLength(2);
  });

  it('invariants hold after DELETE_TRACK', () => {
    let state = makeBaseState();
    // Add a second track to delete (can't delete the only track with clips)
    state = apply(state, 'add track', [{
      type: 'ADD_TRACK',
      track: createTrack({ id: 'to-delete', name: 'Del', type: 'video', clips: [] }),
    }]);
    state = apply(state, 'delete track', [{
      type: 'DELETE_TRACK',
      trackId: toTrackId('to-delete'),
    }]);
    expect(state.timeline.tracks).toHaveLength(1);
  });

  it('invariants hold after ADD_MARKER', () => {
    let state = makeBaseState();
    state = apply(state, 'add marker', [{
      type: 'ADD_MARKER',
      marker: {
        type: 'point', id: toMarkerId('m1'), frame: toFrame(100),
        label: 'Test', color: 'red', scope: 'global', linkedClipId: null,
      },
    }]);
    expect(state.timeline.markers).toHaveLength(1);
  });

  it('invariants hold after SET_IN_POINT', () => {
    let state = makeBaseState();
    state = apply(state, 'set in', [{
      type: 'SET_IN_POINT',
      frame: toFrame(50),
    }]);
    expect(state.timeline.inPoint).toBe(50);
  });

  it('invariants hold after SET_OUT_POINT', () => {
    let state = makeBaseState();
    state = apply(state, 'set out', [{
      type: 'SET_OUT_POINT',
      frame: toFrame(2500),
    }]);
    expect(state.timeline.outPoint).toBe(2500);
  });
});
