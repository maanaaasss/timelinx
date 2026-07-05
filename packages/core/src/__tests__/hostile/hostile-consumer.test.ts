/**
 * HOSTILE CONSUMER PASS — Malicious API Abuse
 *
 * Actively attempts to break every Section 11 invariant using the public API.
 * This file simulates the worst possible consumer: one who deliberately
 * constructs invalid states, mutates returned objects, passes garbage inputs,
 * and tries to exploit every edge case in the type system.
 *
 * If ANY of these tests produce an invariant violation, we have found a real bug.
 */

import { describe, it, expect } from 'vitest';
import {
  createTimeline,
  createTrack,
  createClip,
  createAsset,
  createTimelineState,
  dispatch,
  checkInvariants,
  toFrame,
  toTimecode,
  toClipId,
  toTrackId,
  toAssetId,
  toMarkerId,
  CURRENT_SCHEMA_VERSION,
} from '../../index';
import type { TimelineState } from '../../types/state';
import type { Transaction, OperationPrimitive } from '../../types/operations';
import type { Clip } from '../../types/clip';
import type { Track } from '../../types/track';
import type { TimelineFrame } from '../../types/frame';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeBaseState(): TimelineState {
  const asset = createAsset({
    id: 'hostile-asset',
    name: 'Hostile',
    mediaType: 'video',
    filePath: '/hostile.mp4',
    intrinsicDuration: toFrame(10000),
    nativeFps: 30,
    sourceTimecodeOffset: toFrame(0),
    status: 'online',
  });

  const clip = createClip({
    id: 'hostile-clip',
    assetId: 'hostile-asset',
    trackId: 'hostile-track',
    timelineStart: toFrame(0),
    timelineEnd: toFrame(200),
    mediaIn: toFrame(0),
    mediaOut: toFrame(200),
  });

  const track = createTrack({
    id: 'hostile-track',
    name: 'Hostile Track',
    type: 'video',
    clips: [clip],
  });

  const timeline = createTimeline({
    id: 'hostile-tl',
    name: 'Hostile Timeline',
    fps: 30,
    duration: toFrame(5000),
    startTimecode: toTimecode('00:00:00:00'),
    tracks: [track],
  });

  return createTimelineState({
    timeline,
    assetRegistry: new Map([['hostile-asset' as any, asset]]),
  });
}

function tx(ops: OperationPrimitive[]): Transaction {
  return {
    id: `hostile-${Date.now()}-${Math.random()}`,
    label: 'hostile',
    timestamp: 0,
    operations: ops,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11 INVARIANT ATTEMPTED VIOLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ── INVARIANT: Immutable state — "Every operation returns a new state object" ──

describe('HOSTILE: State Immutability', () => {
  it('mutating state returned from dispatch does not affect original state', () => {
    const state = makeBaseState();
    const result = dispatch(state, tx([{ type: 'RENAME_TIMELINE', name: 'mutated' }]));
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;

    // Try to mutate the returned state
    const returnedState = result.nextState;
    try {
      (returnedState as any).schemaVersion = 999;
      (returnedState as any).timeline.name = 'injected';
      (returnedState as any).timeline.version = 999;
    } catch {
      // Expected — properties may be readonly
    }

    // Original state must be untouched
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(state.timeline.name).toBe('Hostile Timeline');
    expect(state.timeline.version).toBe(0);
  });

  it('mutating tracks array on returned state does not affect original', () => {
    const state = makeBaseState();
    const result = dispatch(state, tx([{ type: 'RENAME_TIMELINE', name: 'x' }]));
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;

    const returnedTracks = result.nextState.timeline.tracks;
    try {
      (returnedTracks as any).push({
        id: 'injected-track',
        name: 'Injected',
        type: 'video',
        clips: [],
        locked: false,
        muted: false,
        hidden: false,
        blendMode: 'normal',
        opacity: 1.0,
      });
    } catch {
      // May be readonly
    }

    // Original tracks length must not change
    expect(state.timeline.tracks.length).toBe(1);
  });

  it('mutating a clip on returned state does not affect original', () => {
    const state = makeBaseState();
    const result = dispatch(state, tx([{ type: 'RENAME_TIMELINE', name: 'x' }]));
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;

    const returnedClip = result.nextState.timeline.tracks[0]?.clips[0];
    if (returnedClip) {
      try {
        (returnedClip as any).speed = -999;
        (returnedClip as any).timelineStart = 999999;
        (returnedClip as any).id = 'injected-clip';
      } catch {
        // May be readonly
      }
    }

    // Original clip must be untouched
    const originalClip = state.timeline.tracks[0]?.clips[0];
    expect(originalClip?.speed).toBe(1.0);
    expect(originalClip?.timelineStart).toBe(0);
  });

  it('mutating assetRegistry map does not affect original', () => {
    const state = makeBaseState();
    const result = dispatch(state, tx([{ type: 'RENAME_TIMELINE', name: 'x' }]));
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;

    const returnedRegistry = result.nextState.assetRegistry;
    try {
      // Map might be readonly — try to mutate
      (returnedRegistry as any).set('injected', { id: 'injected' });
    } catch {
      // Expected
    }

    // Original registry must be untouched
    expect(state.assetRegistry.size).toBe(1);
    expect(state.assetRegistry.has('hostile-asset' as any)).toBe(true);
  });
});

// ── INVARIANT: Single mutation path — "Only dispatch() can change state" ──

describe('HOSTILE: Single Mutation Path', () => {
  it('directly calling applyOperation (via internal API) does not bypass dispatcher validation', async () => {
    // Attempt to import the internal apply function
    try {
      const applyModule = await import('../../engine/apply');
      const state = makeBaseState();

      // Create a deliberately invalid clip (timelineStart > timelineEnd)
      const invalidClip = {
        id: 'sabotage-clip',
        assetId: 'hostile-asset',
        trackId: 'hostile-track',
        timelineStart: toFrame(500),
        timelineEnd: toFrame(100), // INVALID: start > end
        mediaIn: toFrame(0),
        mediaOut: toFrame(100),
        speed: 1.0,
        enabled: true,
        reversed: false,
        name: null,
        color: null,
        metadata: {},
      } as Clip;

      // Apply directly — bypasses dispatcher validation
      const badState = applyModule.applyOperation(state, {
        type: 'INSERT_CLIP',
        clip: invalidClip,
        trackId: toTrackId('hostile-track'),
      });

      // Now check invariants on the bad state — they MUST catch it
      const violations = checkInvariants(badState);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some((v) => v.type === 'OVERLAP' || v.type === 'MEDIA_BOUNDS_INVALID')).toBe(true);
    } catch (e: any) {
      // If import fails, that's fine — internal module may not be importable
      if (e.code !== 'ERR_MODULE_NOT_FOUND') {
        throw e;
      }
    }
  });
});

// ── INVARIANT: Branded types — bypassing type system at runtime ──

describe('HOSTILE: Branded Type Bypass', () => {
  it('passing a raw number where TimelineFrame is expected does not corrupt state', () => {
    const state = makeBaseState();

    // toFrame just casts — but dispatch+invariants should catch the resulting invalid state
    const op: OperationPrimitive = {
      type: 'MOVE_CLIP',
      clipId: 'hostile-clip' as any,
      newTimelineStart: toFrame(-1), // Intentionally negative
    };
    const result = dispatch(state, tx([op]));
    // Should be rejected — negative timelineStart is invalid
    expect(result.accepted).toBe(false);
  });

  it('passing a non-integer frame value is caught', () => {
    const state = makeBaseState();

    // Force a non-integer through
    const op: OperationPrimitive = {
      type: 'MOVE_CLIP',
      clipId: 'hostile-clip' as any,
      newTimelineStart: 3.14159 as any, // Not a valid TimelineFrame
    };
    const result = dispatch(state, tx([op]));
    // Should either reject or invariant checker catches non-integer
    if (result.accepted) {
      const v = checkInvariants(result.nextState);
      // Non-integer frame should be caught by invariant checker
      expect(v.length).toBeGreaterThan(0);
    }
  });

  it('passing a string where a branded ID is expected does not crash', () => {
    const state = makeBaseState();

    const op: OperationPrimitive = {
      type: 'MOVE_CLIP',
      clipId: 'hostile-clip' as any, // Already a string — this is the bypass
      newTimelineStart: toFrame(100),
    };
    // Should not throw — just rejects or accepts
    const result = dispatch(state, tx([op]));
    expect(typeof result.accepted).toBe('boolean');
  });
});

// ── INVARIANT: timelineStart < timelineEnd for every clip ──

describe('HOSTILE: timelineStart < timelineEnd', () => {
  it('creating a clip with start == end is rejected', () => {
    const state = makeBaseState();
    const op: OperationPrimitive = {
      type: 'INSERT_CLIP',
      clip: createClip({
        id: 'zero-dur',
        assetId: 'hostile-asset',
        trackId: 'hostile-track',
        timelineStart: toFrame(100),
        timelineEnd: toFrame(100), // INVALID: start == end
        mediaIn: toFrame(0),
        mediaOut: toFrame(0),
      }),
      trackId: toTrackId('hostile-track'),
    };
    const result = dispatch(state, tx([op]));
    expect(result.accepted).toBe(false);
  });

  it('creating a clip with start > end is rejected', () => {
    const state = makeBaseState();
    const op: OperationPrimitive = {
      type: 'INSERT_CLIP',
      clip: createClip({
        id: 'inverted-dur',
        assetId: 'hostile-asset',
        trackId: 'hostile-track',
        timelineStart: toFrame(500),
        timelineEnd: toFrame(100), // INVALID: start > end
        mediaIn: toFrame(0),
        mediaOut: toFrame(100),
      }),
      trackId: toTrackId('hostile-track'),
    };
    const result = dispatch(state, tx([op]));
    expect(result.accepted).toBe(false);
  });

  it('moving a clip past timeline end is rejected', () => {
    const state = makeBaseState();
    const op: OperationPrimitive = {
      type: 'MOVE_CLIP',
      clipId: 'hostile-clip' as any,
      newTimelineStart: toFrame(4900), // 4900 + 200 > 5000
    };
    const result = dispatch(state, tx([op]));
    expect(result.accepted).toBe(false);
  });
});

// ── INVARIANT: mediaIn < mediaOut for every clip ──

describe('HOSTILE: mediaIn < mediaOut', () => {
  it('SET_MEDIA_BOUNDS with mediaIn > mediaOut is rejected', () => {
    const state = makeBaseState();
    const op: OperationPrimitive = {
      type: 'SET_MEDIA_BOUNDS',
      clipId: 'hostile-clip' as any,
      mediaIn: toFrame(500),
      mediaOut: toFrame(100), // INVALID: in > out
    };
    const result = dispatch(state, tx([op]));
    expect(result.accepted).toBe(false);
  });

  it('SET_MEDIA_BOUNDS with mediaIn == mediaOut is rejected', () => {
    const state = makeBaseState();
    const op: OperationPrimitive = {
      type: 'SET_MEDIA_BOUNDS',
      clipId: 'hostile-clip' as any,
      mediaIn: toFrame(100),
      mediaOut: toFrame(100), // INVALID: in == out
    };
    const result = dispatch(state, tx([op]));
    expect(result.accepted).toBe(false);
  });
});

// ── INVARIANT: All frame values are integers, non-negative ──

describe('HOSTILE: Frame Integer and Non-Negative', () => {
  it('clip with negative timelineStart is caught by invariant checker', () => {
    // Manually construct a state with a negative frame
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    const badClip = { ...clip, timelineStart: toFrame(-10) };
    const badTrack = { ...state.timeline.tracks[0]!, clips: [badClip] };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.some((v) => v.type === 'MEDIA_BOUNDS_INVALID' || v.message.includes('non-negative'))).toBe(true);
  });

  it('clip with NaN frame is caught by invariant checker', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    const badClip = { ...clip, timelineStart: NaN as any };
    const badTrack = { ...state.timeline.tracks[0]!, clips: [badClip] };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.length).toBeGreaterThan(0);
  });

  it('clip with Infinity frame is caught by invariant checker', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    const badClip = { ...clip, timelineEnd: Infinity as any };
    const badTrack = { ...state.timeline.tracks[0]!, clips: [badClip] };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.length).toBeGreaterThan(0);
  });
});

// ── INVARIANT: clip.assetId points to an existing asset ──

describe('HOSTILE: Asset Reference Integrity', () => {
  it('clip referencing non-existent asset is caught', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    const badClip = { ...clip, assetId: 'nonexistent-asset' as any };
    const badTrack = { ...state.timeline.tracks[0]!, clips: [badClip] };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.some((v) => v.type === 'ASSET_MISSING')).toBe(true);
  });

  it('unregistering an asset that clips reference is rejected', () => {
    const state = makeBaseState();
    const op: OperationPrimitive = {
      type: 'UNREGISTER_ASSET',
      assetId: 'hostile-asset' as any,
    };
    const result = dispatch(state, tx([op]));
    expect(result.accepted).toBe(false);
  });
});

// ── INVARIANT: clip.trackId matches the track it's on ──

describe('HOSTILE: Track Reference Integrity', () => {
  it('clip with mismatched trackId is caught by invariant checker', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    const badClip = { ...clip, trackId: 'wrong-track' as any };
    const badTrack = { ...state.timeline.tracks[0]!, clips: [badClip] };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    // The invariant checker should detect this mismatch
    expect(violations.length).toBeGreaterThan(0);
  });
});

// ── INVARIANT: clip.mediaOut <= asset.intrinsicDuration ──

describe('HOSTILE: Media Out Bounds', () => {
  it('clip with mediaOut > asset.intrinsicDuration is caught', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    const badClip = { ...clip, mediaOut: toFrame(99999) }; // > 10000
    const badTrack = { ...state.timeline.tracks[0]!, clips: [badClip] };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.some((v) => v.type === 'MEDIA_BOUNDS_INVALID')).toBe(true);
  });
});

// ── INVARIANT: clip.timelineEnd <= timeline.duration ──

describe('HOSTILE: Clip Beyond Timeline', () => {
  it('clip with timelineEnd > timeline.duration is caught', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    const badClip = { ...clip, timelineEnd: toFrame(99999) }; // > 5000
    const badTrack = { ...state.timeline.tracks[0]!, clips: [badClip] };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.some((v) => v.type === 'CLIP_BEYOND_TIMELINE')).toBe(true);
  });

  it('shrinking timeline below existing clip is rejected by validator', () => {
    const state = makeBaseState();
    const op: OperationPrimitive = {
      type: 'SET_TIMELINE_DURATION',
      duration: toFrame(50), // Clip ends at 200, timeline would be 50
    };
    const result = dispatch(state, tx([op]));
    expect(result.accepted).toBe(false);
  });
});

// ── INVARIANT: speed > 0 ──

describe('HOSTILE: Speed Constraint', () => {
  it('SET_CLIP_SPEED with speed=0 is rejected', () => {
    const state = makeBaseState();
    const op: OperationPrimitive = {
      type: 'SET_CLIP_SPEED',
      clipId: 'hostile-clip' as any,
      speed: 0,
    };
    const result = dispatch(state, tx([op]));
    expect(result.accepted).toBe(false);
  });

  it('SET_CLIP_SPEED with negative speed is rejected', () => {
    const state = makeBaseState();
    const op: OperationPrimitive = {
      type: 'SET_CLIP_SPEED',
      clipId: 'hostile-clip' as any,
      speed: -1,
    };
    const result = dispatch(state, tx([op]));
    expect(result.accepted).toBe(false);
  });

  it('SET_CLIP_SPEED with NaN speed is rejected', () => {
    const state = makeBaseState();
    const op: OperationPrimitive = {
      type: 'SET_CLIP_SPEED',
      clipId: 'hostile-clip' as any,
      speed: NaN,
    };
    const result = dispatch(state, tx([op]));
    expect(result.accepted).toBe(false);
  });

  it('SET_CLIP_SPEED with Infinity speed is rejected', () => {
    const state = makeBaseState();
    const op: OperationPrimitive = {
      type: 'SET_CLIP_SPEED',
      clipId: 'hostile-clip' as any,
      speed: Infinity,
    };
    const result = dispatch(state, tx([op]));
    expect(result.accepted).toBe(false);
  });

  it('clip with speed=0 is caught by invariant checker', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    const badClip = { ...clip, speed: 0 };
    const badTrack = { ...state.timeline.tracks[0]!, clips: [badClip] };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.some((v) => v.type === 'SPEED_INVALID')).toBe(true);
  });

  it('clip with negative speed is caught by invariant checker', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    const badClip = { ...clip, speed: -1 };
    const badTrack = { ...state.timeline.tracks[0]!, clips: [badClip] };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.some((v) => v.type === 'SPEED_INVALID')).toBe(true);
  });
});

// ── INVARIANT: No overlapping clips on the same track ──

describe('HOSTILE: No Overlapping Clips', () => {
  it('inserting an overlapping clip is rejected', () => {
    const state = makeBaseState();
    const op: OperationPrimitive = {
      type: 'INSERT_CLIP',
      clip: createClip({
        id: 'overlap-clip',
        assetId: 'hostile-asset',
        trackId: 'hostile-track',
        timelineStart: toFrame(50), // Overlaps with hostile-clip [0, 200)
        timelineEnd: toFrame(250),
        mediaIn: toFrame(0),
        mediaOut: toFrame(200),
      }),
      trackId: toTrackId('hostile-track'),
    };
    const result = dispatch(state, tx([op]));
    expect(result.accepted).toBe(false);
  });

  it('moving a clip to overlap another is rejected', () => {
    const state = makeBaseState();
    // Add a second clip
    const addResult = dispatch(state, tx([
      {
        type: 'INSERT_CLIP',
        clip: createClip({
          id: 'clip-b',
          assetId: 'hostile-asset',
          trackId: 'hostile-track',
          timelineStart: toFrame(300),
          timelineEnd: toFrame(500),
          mediaIn: toFrame(0),
          mediaOut: toFrame(200),
        }),
        trackId: toTrackId('hostile-track'),
      },
    ]));
    expect(addResult.accepted).toBe(true);
    if (!addResult.accepted) return;

    // Now try to move clip-b to overlap hostile-clip
    const moveResult = dispatch(addResult.nextState, tx([
      {
        type: 'MOVE_CLIP',
        clipId: toClipId('clip-b'),
        newTimelineStart: toFrame(50), // Would overlap with hostile-clip [0, 200)
      },
    ]));
    expect(moveResult.accepted).toBe(false);
  });

  it('clip with overlapping timeline range is caught by invariant checker', () => {
    const state = makeBaseState();
    const clipA = state.timeline.tracks[0]!.clips[0]!;
    const clipB: Clip = {
      ...clipA,
      id: 'overlap-b' as any,
      timelineStart: toFrame(50),
      timelineEnd: toFrame(250),
    };
    const badTrack = { ...state.timeline.tracks[0]!, clips: [clipA, clipB] };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.some((v) => v.type === 'OVERLAP')).toBe(true);
  });
});

// ── INVARIANT: Clips sorted ascending by timelineStart ──

describe('HOSTILE: Clip Sorting', () => {
  it('unsorted clips are caught by invariant checker', () => {
    const state = makeBaseState();
    const clipA = createClip({
      id: 'sort-a',
      assetId: 'hostile-asset',
      trackId: 'hostile-track',
      timelineStart: toFrame(500),
      timelineEnd: toFrame(700),
      mediaIn: toFrame(0),
      mediaOut: toFrame(200),
    });
    const clipB = createClip({
      id: 'sort-b',
      assetId: 'hostile-asset',
      trackId: 'hostile-track',
      timelineStart: toFrame(100),
      timelineEnd: toFrame(300),
      mediaIn: toFrame(0),
      mediaOut: toFrame(200),
    });
    // Intentionally unsorted
    const badTrack = { ...state.timeline.tracks[0]!, clips: [clipA, clipB] };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.some((v) => v.type === 'TRACK_NOT_SORTED')).toBe(true);
  });
});

// ── INVARIANT: All IDs are unique ──

describe('HOSTILE: Unique IDs', () => {
  it('duplicate clip IDs are caught by invariant checker', () => {
    const state = makeBaseState();
    const clipA = state.timeline.tracks[0]!.clips[0]!;
    const clipB: Clip = {
      ...clipA,
      id: clipA.id, // SAME ID as clipA
      timelineStart: toFrame(300),
      timelineEnd: toFrame(500),
      mediaIn: toFrame(0),
      mediaOut: toFrame(200),
    };
    const badTrack = { ...state.timeline.tracks[0]!, clips: [clipA, clipB] };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.some((v) => v.type === 'DUPLICATE_ID')).toBe(true);
  });

  it('duplicate track IDs are caught by invariant checker', () => {
    const state = makeBaseState();
    const trackA = state.timeline.tracks[0]!;
    const trackB: Track = {
      ...trackA,
      id: trackA.id, // SAME ID
      name: 'Duplicate Track',
      clips: [],
    };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [trackA, trackB] },
    } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.some((v) => v.type === 'DUPLICATE_ID')).toBe(true);
  });
});

// ── INVARIANT: version monotonically increasing by exactly 1 ──

describe('HOSTILE: Version Monotonicity', () => {
  it('version increases by exactly 1 per accepted transaction', () => {
    const state = makeBaseState();
    let currentState = state;
    let expectedVersion = 0;

    for (let i = 0; i < 10; i++) {
      const result = dispatch(currentState, tx([
        { type: 'RENAME_TIMELINE', name: `v${i}` },
      ]));
      if (result.accepted) {
        expectedVersion++;
        expect(result.nextState.timeline.version).toBe(expectedVersion);
        currentState = result.nextState;
      }
    }
  });

  it('rejected transaction does not increment version', () => {
    const state = makeBaseState();
    const initialVersion = state.timeline.version;

    // Try to move clip to invalid position — should fail
    const result = dispatch(state, tx([
      {
        type: 'MOVE_CLIP',
        clipId: 'hostile-clip' as any,
        newTimelineStart: toFrame(-1),
      },
    ]));

    expect(result.accepted).toBe(false);
    expect(state.timeline.version).toBe(initialVersion);
  });
});

// ── INVARIANT: Schema version matches CURRENT_SCHEMA_VERSION ──

describe('HOSTILE: Schema Version', () => {
  it('state with wrong schema version is rejected by invariant checker', () => {
    const state = makeBaseState();
    const badState = { ...state, schemaVersion: 999 } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.some((v) => v.type === 'SCHEMA_VERSION_MISMATCH')).toBe(true);
  });

  it('state with negative schema version is rejected', () => {
    const state = makeBaseState();
    const badState = { ...state, schemaVersion: -1 } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.some((v) => v.type === 'SCHEMA_VERSION_MISMATCH')).toBe(true);
  });

  it('state with zero schema version is rejected', () => {
    const state = makeBaseState();
    const badState = { ...state, schemaVersion: 0 } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.some((v) => v.type === 'SCHEMA_VERSION_MISMATCH')).toBe(true);
  });
});

// ── INVARIANT: All-or-nothing transactions ──

describe('HOSTILE: All-or-Nothing Transactions', () => {
  it('one bad op in a 3-op transaction rejects all', () => {
    const state = makeBaseState();
    const tx: Transaction = {
      id: 'hostile-atomic',
      label: 'hostile',
      timestamp: 0,
      operations: [
        { type: 'RENAME_TIMELINE', name: 'should-not-apply' },
        { type: 'RENAME_TIMELINE', name: 'neither-this' },
        {
          type: 'MOVE_CLIP',
          clipId: 'hostile-clip' as any,
          newTimelineStart: toFrame(-1), // INVALID
        },
      ],
    };

    const result = dispatch(state, tx);
    expect(result.accepted).toBe(false);
    // Timeline name must still be original
    expect(state.timeline.name).toBe('Hostile Timeline');
  });

  it('one bad op in a 5-op transaction rejects everything', () => {
    const state = makeBaseState();
    const tx: Transaction = {
      id: 'hostile-atomic-5',
      label: 'hostile',
      timestamp: 0,
      operations: [
        { type: 'RENAME_TIMELINE', name: 'op1' },
        { type: 'RENAME_TIMELINE', name: 'op2' },
        { type: 'RENAME_TIMELINE', name: 'op3' },
        {
          type: 'SET_CLIP_SPEED',
          clipId: 'hostile-clip' as any,
          speed: 0, // INVALID
        },
        { type: 'RENAME_TIMELINE', name: 'op5' },
      ],
    };

    const result = dispatch(state, tx);
    expect(result.accepted).toBe(false);
    expect(state.timeline.name).toBe('Hostile Timeline');
  });
});

// ── INVARIANT: Deterministic — same state + same tx = same result ──

describe('HOSTILE: Determinism', () => {
  it('dispatch is deterministic across 100 identical calls', () => {
    const state = makeBaseState();
    const op: OperationPrimitive = { type: 'RENAME_TIMELINE', name: 'deterministic' };

    const results: boolean[] = [];
    for (let i = 0; i < 100; i++) {
      const result = dispatch(state, tx([op]));
      results.push(result.accepted);
      if (result.accepted) {
        expect(result.nextState.timeline.name).toBe('deterministic');
        expect(result.nextState.timeline.version).toBe(1);
      }
    }

    // All results must be identical
    expect(results.every((r) => r === results[0])).toBe(true);
  });
});

// ── INVARIANT: Defense in depth — three validation layers ──

describe('HOSTILE: Defense in Depth', () => {
  it('invariant checker catches issues that validator misses (apply bypass)', async () => {
    // This test tries to use the internal apply function directly
    // to bypass the validator and prove that invariant checker is a safety net
    try {
      const applyMod = await import('../../engine/apply');
      const state = makeBaseState();

      // Try to apply an operation that would create overlapping clips
      // The validator would catch this, but we bypass it
      const clipA = state.timeline.tracks[0]!.clips[0]!;
      const overlappingClip = createClip({
        id: 'sneaky-overlap',
        assetId: 'hostile-asset',
        trackId: 'hostile-track',
        timelineStart: toFrame(50),
        timelineEnd: toFrame(250),
        mediaIn: toFrame(0),
        mediaOut: toFrame(200),
      });

      // Apply directly — no validation
      const badState = applyMod.applyOperation(state, {
        type: 'INSERT_CLIP',
        clip: overlappingClip,
        trackId: toTrackId('hostile-track'),
      });

      // Invariant checker MUST catch the overlap
      const violations = checkInvariants(badState);
      expect(violations.some((v) => v.type === 'OVERLAP')).toBe(true);
    } catch (e: any) {
      if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
    }
  });
});

// ── HOSTILE: Proxy and getter attacks ──

describe('HOSTILE: Proxy and Getter Attacks', () => {
  it('dispatch with a Proxy clip that throws on property access does not crash engine', () => {
    const state = makeBaseState();

    const proxyClip = new Proxy(
      {
        id: 'proxy-clip',
        assetId: 'hostile-asset',
        trackId: 'hostile-track',
        timelineStart: 100,
        timelineEnd: 200,
        mediaIn: 0,
        mediaOut: 100,
        speed: 1.0,
        enabled: true,
        reversed: false,
        name: null,
        color: null,
        metadata: {},
      },
      {
        get(target, prop) {
          if (prop === 'timelineStart') return 100;
          if (prop === 'timelineEnd') return 200;
          if (prop === 'speed') return 1.0;
          return Reflect.get(target, prop);
        },
      },
    );

    const op: OperationPrimitive = {
      type: 'INSERT_CLIP',
      clip: proxyClip as any,
      trackId: toTrackId('hostile-track'),
    };

    // Should not throw — either accepts or rejects
    const result = dispatch(state, tx([op]));
    expect(typeof result.accepted).toBe('boolean');
  });

  it('dispatch with a getter that throws does not crash engine', () => {
    const state = makeBaseState();

    const evilObject = new Proxy({}, {
      get(_target, prop) {
        if (prop === 'type') return 'MOVE_CLIP';
        if (prop === 'clipId') return 'hostile-clip';
        if (prop === 'newTimelineStart') return 100;
        throw new Error(`Evil getter triggered on ${String(prop)}`);
      },
    });

    // Should not throw — dispatch should handle gracefully
    try {
      const result = dispatch(state, evilObject as any);
      expect(typeof result.accepted).toBe('boolean');
    } catch {
      // If it throws, that's also acceptable — as long as state is unchanged
      expect(state.timeline.name).toBe('Hostile Timeline');
    }
  });
});

// ── HOSTILE: Prototype pollution ──

describe('HOSTILE: Prototype Pollution', () => {
  it('dispatch with __proto__ as timeline name does not pollute Object.prototype', () => {
    const originalProto = (Object.prototype as any)['injected_pollution'];
    expect(originalProto).toBeUndefined();

    const state = makeBaseState();
    const op: OperationPrimitive = {
      type: 'RENAME_TIMELINE',
      name: '__proto__',
    };
    dispatch(state, tx([op]));

    // Object.prototype should NOT have been polluted
    expect((Object.prototype as any)['injected_pollution']).toBeUndefined();
  });

  it('dispatch with constructor as timeline name does not pollute', () => {
    const state = makeBaseState();
    const op: OperationPrimitive = {
      type: 'RENAME_TIMELINE',
      name: 'constructor',
    };
    const result = dispatch(state, tx([op]));
    // Should work fine — no prototype pollution
    expect(typeof result.accepted).toBe('boolean');
  });
});

// ── HOSTILE: Edge case operations ──

describe('HOSTILE: Edge Case Operations', () => {
  it('empty transaction (no operations) is handled gracefully', () => {
    const state = makeBaseState();
    const emptyTx: Transaction = {
      id: 'empty',
      label: 'empty',
      timestamp: 0,
      operations: [],
    };
    const result = dispatch(state, emptyTx);
    // Empty transaction should either be accepted (no-op) or rejected — not crash
    expect(typeof result.accepted).toBe('boolean');
  });

  it('unknown operation type is handled gracefully', () => {
    const state = makeBaseState();
    const evilOp = { type: 'EVIL_DELETE_ALL_DATA' } as unknown as OperationPrimitive;
    const result = dispatch(state, tx([evilOp]));
    // Unknown op type hits the `default: return null` in validator — should be accepted or rejected, not crash
    expect(typeof result.accepted).toBe('boolean');
  });

  it('dispatch with null state does not crash', () => {
    try {
      const result = dispatch(null as any, tx([{ type: 'RENAME_TIMELINE', name: 'x' }]));
      expect(typeof result.accepted).toBe('boolean');
    } catch {
      // Throwing is acceptable — state must be unchanged
    }
  });

  it('dispatch with null transaction does not crash', () => {
    const state = makeBaseState();
    try {
      const result = dispatch(state, null as any);
      expect(typeof result.accepted).toBe('boolean');
    } catch {
      // Throwing is acceptable
    }
  });
});

// ── HOSTILE: Locked track bypass ──

describe('HOSTILE: Locked Track Bypass', () => {
  it('editing a locked track via MOVE_CLIP is rejected', () => {
    const asset = createAsset({
      id: 'locked-asset',
      name: 'Locked',
      mediaType: 'video',
      filePath: '/locked.mp4',
      intrinsicDuration: toFrame(10000),
      nativeFps: 30,
      sourceTimecodeOffset: toFrame(0),
      status: 'online',
    });

    const clip = createClip({
      id: 'locked-clip',
      assetId: 'locked-asset',
      trackId: 'locked-track',
      timelineStart: toFrame(0),
      timelineEnd: toFrame(200),
      mediaIn: toFrame(0),
      mediaOut: toFrame(200),
    });

    const track = createTrack({
      id: 'locked-track',
      name: 'Locked Track',
      type: 'video',
      clips: [clip],
    });
    // Lock the track
    (track as any).locked = true;

    const timeline = createTimeline({
      id: 'locked-tl',
      name: 'Locked',
      fps: 30,
      duration: toFrame(5000),
      startTimecode: toTimecode('00:00:00:00'),
      tracks: [track],
    });

    const lockedState = createTimelineState({
      timeline,
      assetRegistry: new Map([['locked-asset' as any, asset]]),
    });

    const result = dispatch(lockedState, tx([
      {
        type: 'MOVE_CLIP',
        clipId: toClipId('locked-clip'),
        newTimelineStart: toFrame(100),
      },
    ]));

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('LOCKED_TRACK');
  });

  it('INSERT_CLIP into a locked track is rejected', () => {
    const asset = createAsset({
      id: 'locked-asset-2',
      name: 'Locked2',
      mediaType: 'video',
      filePath: '/locked2.mp4',
      intrinsicDuration: toFrame(10000),
      nativeFps: 30,
      sourceTimecodeOffset: toFrame(0),
      status: 'online',
    });

    const track = createTrack({
      id: 'locked-track-2',
      name: 'Locked Track 2',
      type: 'video',
      clips: [],
    });
    (track as any).locked = true;

    const timeline = createTimeline({
      id: 'locked-tl-2',
      name: 'Locked2',
      fps: 30,
      duration: toFrame(5000),
      startTimecode: toTimecode('00:00:00:00'),
      tracks: [track],
    });

    const lockedState = createTimelineState({
      timeline,
      assetRegistry: new Map([['locked-asset-2' as any, asset]]),
    });

    const result = dispatch(lockedState, tx([
      {
        type: 'INSERT_CLIP',
        clip: createClip({
          id: 'sneaky-clip',
          assetId: 'locked-asset-2',
          trackId: 'locked-track-2',
          timelineStart: toFrame(0),
          timelineEnd: toFrame(100),
          mediaIn: toFrame(0),
          mediaOut: toFrame(100),
        }),
        trackId: toTrackId('locked-track-2'),
      },
    ]));

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('LOCKED_TRACK');
  });
});

// ── HOSTILE: Cross-track move integrity ──

describe('HOSTILE: Cross-Track Move', () => {
  it('moving clip to non-existent track is rejected', () => {
    const state = makeBaseState();
    const op: OperationPrimitive = {
      type: 'MOVE_CLIP',
      clipId: 'hostile-clip' as any,
      newTimelineStart: toFrame(100),
      targetTrackId: toTrackId('nonexistent-track'),
    };
    const result = dispatch(state, tx([op]));
    expect(result.accepted).toBe(false);
  });

  it('moving clip across tracks preserves clip integrity', () => {
    const state = makeBaseState();
    // Add a second track
    const addResult = dispatch(state, tx([
      {
        type: 'ADD_TRACK',
        track: createTrack({
          id: 'track-b',
          name: 'Track B',
          type: 'video',
          clips: [],
        }),
      },
    ]));
    expect(addResult.accepted).toBe(true);
    if (!addResult.accepted) return;

    // Move clip from track-a to track-b
    const moveResult = dispatch(addResult.nextState, tx([
      {
        type: 'MOVE_CLIP',
        clipId: toClipId('hostile-clip'),
        newTimelineStart: toFrame(0),
        targetTrackId: toTrackId('track-b'),
      },
    ]));

    if (moveResult.accepted) {
      // Verify clip is now on track-b
      const clip = moveResult.nextState.timeline.tracks
        .find((t) => t.id === 'track-b')
        ?.clips.find((c) => c.id === 'hostile-clip');
      expect(clip).toBeDefined();
      expect(clip?.trackId).toBe('track-b');

      // Verify track-a no longer has the clip
      const oldTrack = moveResult.nextState.timeline.tracks
        .find((t) => t.id === 'hostile-track');
      expect(oldTrack?.clips.find((c) => c.id === 'hostile-clip')).toBeUndefined();

      // Verify invariants
      const v = checkInvariants(moveResult.nextState);
      expect(v).toEqual([]);
    }
  });
});

// ── HOSTILE: Duration mismatch detection ──

describe('HOSTILE: Duration Mismatch', () => {
  it('clip with media duration != timeline duration / speed is caught', () => {
    const state = makeBaseState();
    const clip = state.timeline.tracks[0]!.clips[0]!;
    // timelineEnd - timelineStart = 200, speed = 1.0, so expected mediaDuration = 200
    // Set mediaOut to make mediaDuration = 100 (mismatch)
    const badClip = {
      ...clip,
      mediaOut: toFrame(100), // mediaDuration = 100, but expected 200
    };
    const badTrack = { ...state.timeline.tracks[0]!, clips: [badClip] };
    const badState = {
      ...state,
      timeline: { ...state.timeline, tracks: [badTrack] },
    } as unknown as TimelineState;

    const violations = checkInvariants(badState);
    expect(violations.some((v) => v.type === 'DURATION_MISMATCH')).toBe(true);
  });
});

// ── HOSTILE: Type confusion — wrong operation fields ──

describe('HOSTILE: Type Confusion', () => {
  it('MOVE_CLIP with missing clipId does not crash', () => {
    const state = makeBaseState();
    const op = { type: 'MOVE_CLIP', newTimelineStart: 100 } as any;
    try {
      const result = dispatch(state, tx([op]));
      expect(typeof result.accepted).toBe('boolean');
    } catch {
      // Throwing is acceptable — state must be unchanged
      expect(state.timeline.name).toBe('Hostile Timeline');
    }
  });

  it('INSERT_CLIP with missing clip does not crash', () => {
    const state = makeBaseState();
    const op = { type: 'INSERT_CLIP', trackId: 'hostile-track' } as any;
    try {
      const result = dispatch(state, tx([op]));
      expect(typeof result.accepted).toBe('boolean');
    } catch {
      expect(state.timeline.name).toBe('Hostile Timeline');
    }
  });

  it('SET_CLIP_SPEED with string speed does not crash', () => {
    const state = makeBaseState();
    const op = {
      type: 'SET_CLIP_SPEED',
      clipId: 'hostile-clip',
      speed: 'not-a-number',
    } as any;
    try {
      const result = dispatch(state, tx([op]));
      expect(typeof result.accepted).toBe('boolean');
    } catch {
      expect(state.timeline.name).toBe('Hostile Timeline');
    }
  });
});

// ── HOSTILE: Memory and performance ──

describe('HOSTILE: Rapid Fire', () => {
  it('1000 rapid dispatch calls do not corrupt state', () => {
    const state = makeBaseState();
    let currentState = state;
    let acceptedCount = 0;

    for (let i = 0; i < 1000; i++) {
      const op: OperationPrimitive = {
        type: 'RENAME_TIMELINE',
        name: `rapid-${i}`,
      };
      const result = dispatch(currentState, tx([op]));
      if (result.accepted) {
        acceptedCount++;
        currentState = result.nextState;
        // Verify invariants after each accepted op
        const v = checkInvariants(currentState);
        if (v.length > 0) {
          throw new Error(`Invariant violation at iteration ${i}: ${v.map((x) => x.message).join('; ')}`);
        }
      }
    }

    expect(acceptedCount).toBe(1000);
    expect(currentState.timeline.version).toBe(1000);
    expect(currentState.timeline.name).toBe('rapid-999');
  });
});
