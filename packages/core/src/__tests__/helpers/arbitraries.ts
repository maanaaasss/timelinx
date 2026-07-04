/**
 * fast-check arbitraries for property-based testing.
 *
 * Generate random but plausible operations, clips, tracks, and states
 * to fuzz the engine with random input sequences.
 */

import * as fc from 'fast-check';
import { createClip, toClipId } from '../../types/clip';
import { createTrack, toTrackId } from '../../types/track';
import { createAsset, toAssetId } from '../../types/asset';
import { createTimeline } from '../../types/timeline';
import { createTimelineState } from '../../types/state';
import { toFrame, toTimecode } from '../../types/frame';
import { dispatch } from '../../engine/dispatcher';
import { checkInvariants } from '../../validation/invariants';
import type { TimelineState } from '../../types/state';
import type { OperationPrimitive, Transaction } from '../../types/operations';
import type { ClipId } from '../../types/clip';
import type { TrackId } from '../../types/track';
import type { AssetId } from '../../types/asset';
import type { TimelineFrame } from '../../types/frame';

// ── ID counters (deterministic within a single property run) ─────────────────

let clipCounter = 0;
let trackCounter = 0;
let assetCounter = 0;
let txCounter = 0;

export function resetCounters(): void {
  clipCounter = 0;
  trackCounter = 0;
  assetCounter = 0;
  txCounter = 0;
}

function nextClipId(): ClipId {
  return toClipId(`fc-clip-${++clipCounter}`);
}

function nextTrackId(): TrackId {
  return toTrackId(`fc-track-${++trackCounter}`);
}

function nextAssetId(): AssetId {
  return toAssetId(`fc-asset-${++assetCounter}`);
}

function nextTxId(): string {
  return `fc-tx-${++txCounter}`;
}

// ── Primitive arbitraries ────────────────────────────────────────────────────

/** Generate a random non-negative integer frame within a range. */
export function arbitraryFrame(max: number = 10000): fc.Arbitrary<number> {
  return fc.integer({ min: 0, max });
}

/** Generate a random positive speed value. */
export function arbitrarySpeed(): fc.Arbitrary<number> {
  return fc.oneof(
    fc.constant(1.0),
    fc.constant(0.5),
    fc.constant(2.0),
    fc.float({ min: Math.fround(0.01), max: Math.fround(4.0) }),
  );
}

/** Generate a random clip with valid internal structure. */
export function arbitraryClip(
  trackId: string,
  assetId: string,
  assetDuration: number = 600,
): fc.Arbitrary<{ start: number; end: number; clip: ReturnType<typeof createClip> }> {
  return fc.tuple(
    fc.integer({ min: 0, max: 5000 }),
    fc.integer({ min: 1, max: Math.min(500, assetDuration) }),
  ).map(([start, duration]) => {
    const end = start + duration;
    const mediaIn = 0;
    const mediaOut = duration;
    const id = nextClipId();
    return {
      start,
      end,
      clip: createClip({
        id,
        assetId,
        trackId,
        timelineStart: toFrame(start),
        timelineEnd: toFrame(end),
        mediaIn: toFrame(mediaIn),
        mediaOut: toFrame(mediaOut),
      }),
    };
  });
}

/** Generate a random operation primitive against an existing state. */
export function arbitraryOperation(
  state: TimelineState,
): fc.Arbitrary<OperationPrimitive> {
  const allClips = state.timeline.tracks.flatMap(t => t.clips);
  const allTrackIds = state.timeline.tracks.map(t => t.id);
  const assetIds = Array.from(state.assetRegistry.keys());

  const ops: fc.Arbitrary<OperationPrimitive>[] = [];

  // MOVE_CLIP — if there are clips
  if (allClips.length > 0 && allTrackIds.length > 0) {
    ops.push(
      fc.tuple(
        fc.constantFrom(...allClips),
        fc.integer({ min: 0, max: state.timeline.duration as number }),
        fc.constantFrom(...allTrackIds),
      ).map(([clip, newStart, targetTrackId]) => ({
        type: 'MOVE_CLIP' as const,
        clipId: clip.id,
        newTimelineStart: toFrame(newStart),
        targetTrackId: targetTrackId as TrackId,
      })),
    );
  }

  // DELETE_CLIP — if there are clips
  if (allClips.length > 0) {
    ops.push(
      fc.constantFrom(...allClips).map(clip => ({
        type: 'DELETE_CLIP' as const,
        clipId: clip.id,
      })),
    );
  }

  // INSERT_CLIP — generate a new clip
  if (allTrackIds.length > 0 && assetIds.length > 0) {
    ops.push(
      fc.tuple(
        fc.constantFrom(...allTrackIds),
        fc.constantFrom(...assetIds),
        fc.integer({ min: 0, max: Math.max(0, (state.timeline.duration as number) - 100) }),
        fc.integer({ min: 1, max: 200 }),
      ).map(([trackId, assetId, start, dur]) => {
        const id = nextClipId();
        return {
          type: 'INSERT_CLIP' as const,
          clip: createClip({
            id,
            assetId,
            trackId,
            timelineStart: toFrame(start),
            timelineEnd: toFrame(start + dur),
            mediaIn: toFrame(0),
            mediaOut: toFrame(dur),
          }),
          trackId: trackId as TrackId,
        };
      }),
    );
  }

  // RENAME_TIMELINE
  ops.push(
    fc.string({ minLength: 1, maxLength: 20 }).map(name => ({
      type: 'RENAME_TIMELINE' as const,
      name,
    })),
  );

  // SET_TIMELINE_DURATION
  ops.push(
    fc.integer({ min: 100, max: 100000 }).map(dur => ({
      type: 'SET_TIMELINE_DURATION' as const,
      duration: toFrame(dur),
    })),
  );

  // ADD_TRACK
  ops.push(
    fc.tuple(
      fc.string({ minLength: 1, maxLength: 10 }),
      fc.constantFrom('video' as const, 'audio' as const),
    ).map(([name, type]) => ({
      type: 'ADD_TRACK' as const,
      track: createTrack({
        id: nextTrackId(),
        name: `Track ${name}`,
        type,
        clips: [],
      }),
    })),
  );

  // SET_CLIP_SPEED — if there are clips
  if (allClips.length > 0) {
    ops.push(
      fc.tuple(
        fc.constantFrom(...allClips),
        arbitrarySpeed(),
      ).map(([clip, speed]) => ({
        type: 'SET_CLIP_SPEED' as const,
        clipId: clip.id,
        speed,
      })),
    );
  }

  // SET_CLIP_ENABLED — if there are clips
  if (allClips.length > 0) {
    ops.push(
      fc.tuple(
        fc.constantFrom(...allClips),
        fc.boolean(),
      ).map(([clip, enabled]) => ({
        type: 'SET_CLIP_ENABLED' as const,
        clipId: clip.id,
        enabled,
      })),
    );
  }

  if (ops.length === 0) {
    // Fallback: just rename the timeline
    ops.push(
      fc.constant({ type: 'RENAME_TIMELINE' as const, name: 'empty' }),
    );
  }

  return fc.oneof(...ops);
}

/** Generate a sequence of random operations against a starting state. */
export function arbitraryOperationSequence(
  initialState: TimelineState,
): fc.Arbitrary<OperationPrimitive[]> {
  return fc.array(arbitraryOperation(initialState), { maxLength: 20 });
}

/** Generate a valid initial state for fuzzing. */
export function arbitraryInitialState(): fc.Arbitrary<TimelineState> {
  return fc.tuple(
    fc.integer({ min: 1000, max: 50000 }),
    fc.integer({ min: 1, max: 3 }),
  ).map(([duration, numTracks]) => {
    const assetId = nextAssetId();
    const asset = createAsset({
      id: assetId,
      name: 'Fuzz Asset',
      mediaType: 'video',
      filePath: '/media/fuzz.mp4',
      intrinsicDuration: toFrame(10000),
      nativeFps: 30,
      sourceTimecodeOffset: toFrame(0),
      status: 'online',
    });

    const tracks = [];
    for (let i = 0; i < numTracks; i++) {
      tracks.push(
        createTrack({
          id: nextTrackId(),
          name: `V${i + 1}`,
          type: 'video',
          clips: [],
        }),
      );
    }

    const timeline = createTimeline({
      id: 'fuzz-tl',
      name: 'Fuzz Timeline',
      fps: 30,
      duration: toFrame(duration),
      startTimecode: toTimecode('00:00:00:00'),
      tracks,
    });

    return createTimelineState({
      timeline,
      assetRegistry: new Map([[assetId, asset]]),
    });
  });
}

/**
 * Execute a sequence of operations against a state, returning the final state
 * and whether all operations were accepted.
 */
export function executeOps(
  state: TimelineState,
  ops: OperationPrimitive[],
): { state: TimelineState; accepted: number; rejected: number } {
  let accepted = 0;
  let rejected = 0;

  for (const op of ops) {
    const tx: Transaction = {
      id: nextTxId(),
      label: 'fuzz',
      timestamp: 0,
      operations: [op],
    };
    const result = dispatch(state, tx);
    if (result.accepted) {
      state = result.nextState;
      accepted++;
    } else {
      rejected++;
    }
  }

  return { state, accepted, rejected };
}

/**
 * Execute a sequence of operations and assert invariants hold after each
 * accepted operation.
 */
export function executeOpsAssertingInvariants(
  state: TimelineState,
  ops: OperationPrimitive[],
): { state: TimelineState; accepted: number; rejected: number } {
  let accepted = 0;
  let rejected = 0;

  for (const op of ops) {
    const tx: Transaction = {
      id: nextTxId(),
      label: 'fuzz',
      timestamp: 0,
      operations: [op],
    };
    const result = dispatch(state, tx);
    if (result.accepted) {
      const violations = checkInvariants(result.nextState);
      if (violations.length > 0) {
        throw new Error(
          `Invariant violation after op ${op.type}: ${violations.map(v => v.message).join('; ')}`,
        );
      }
      state = result.nextState;
      accepted++;
    } else {
      rejected++;
    }
  }

  return { state, accepted, rejected };
}
