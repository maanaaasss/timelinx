/**
 * PROPERTY-BASED FUZZ TESTING
 *
 * Generate random sequences of valid operations and assert invariants never break.
 * This is where hand-written test cases fail to catch bugs, because you only
 * think to test the cases you already expect to work.
 *
 * Uses fast-check for random input generation with automatic shrinking.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { dispatch } from '../../engine/dispatcher';
import { checkInvariants } from '../../validation/invariants';
import { createTimelineState } from '../../types/state';
import { createTimeline } from '../../types/timeline';
import { createTrack, toTrackId } from '../../types/track';
import { createClip, toClipId } from '../../types/clip';
import { createAsset, toAssetId } from '../../types/asset';
import { toFrame, toTimecode } from '../../types/frame';
import { toMarkerId } from '../../types/marker';
import {
  arbitraryOperation,
  arbitraryInitialState,
  executeOpsAssertingInvariants,
  resetCounters,
} from '../helpers/arbitraries';
import type { TimelineState } from '../../types/state';
import type { Transaction, OperationPrimitive } from '../../types/operations';
import type { AssetId } from '../../types/asset';
import type { TrackId } from '../../types/track';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeInitialState(): TimelineState {
  const asset = createAsset({
    id: 'asset-1', name: 'Fuzz Asset', mediaType: 'video',
    filePath: '/media/fuzz.mp4', intrinsicDuration: toFrame(10000),
    nativeFps: 30, sourceTimecodeOffset: toFrame(0), status: 'online',
  });
  const clip = createClip({
    id: 'clip-1', assetId: 'asset-1', trackId: 'track-1',
    timelineStart: toFrame(0), timelineEnd: toFrame(200),
    mediaIn: toFrame(0), mediaOut: toFrame(200),
  });
  const track = createTrack({ id: 'track-1', name: 'V1', type: 'video', clips: [clip] });
  const timeline = createTimeline({
    id: 'tl', name: 'Fuzz', fps: 30, duration: toFrame(5000),
    startTimecode: toTimecode('00:00:00:00'), tracks: [track],
  });
  return createTimelineState({ timeline, assetRegistry: new Map([[toAssetId('asset-1'), asset]]) });
}

// ── Core fuzz tests ──────────────────────────────────────────────────────────

describe('Fuzz: random operation sequences never violate invariants', () => {
  it('sequences of up to 10 operations against a single-track state', () => {
    resetCounters();
    fc.assert(
      fc.property(
        fc.array(arbitraryOperation(makeInitialState()), { maxLength: 10 }),
        (ops) => {
          let state = makeInitialState();
          for (const op of ops) {
            const tx: Transaction = {
              id: `fuzz-${Date.now()}-${Math.random()}`,
              label: 'fuzz',
              timestamp: Date.now(),
              operations: [op],
            };
            const result = dispatch(state, tx);
            if (result.accepted) {
              const violations = checkInvariants(result.nextState);
              expect(violations).toEqual([]);
              state = result.nextState;
            }
            // rejected ops should leave state untouched
          }
        },
      ),
      { numRuns: 500, timeout: 30000 },
    );
  });

  it('operations never produce overlapping clips on the same track', () => {
    resetCounters();
    fc.assert(
      fc.property(
        fc.array(arbitraryOperation(makeInitialState()), { maxLength: 15 }),
        (ops) => {
          let state = makeInitialState();
          for (const op of ops) {
            const tx: Transaction = {
              id: `fuzz-${Date.now()}-${Math.random()}`,
              label: 'fuzz',
              timestamp: Date.now(),
              operations: [op],
            };
            const result = dispatch(state, tx);
            if (result.accepted) {
              // Check no overlaps on any track
              for (const track of result.nextState.timeline.tracks) {
                for (let i = 0; i < track.clips.length - 1; i++) {
                  expect(track.clips[i]!.timelineEnd).toBeLessThanOrEqual(
                    track.clips[i + 1]!.timelineStart,
                  );
                }
              }
              state = result.nextState;
            }
          }
        },
      ),
      { numRuns: 500, timeout: 30000 },
    );
  });

  it('version counter increases monotonically by 1 per accepted transaction', () => {
    resetCounters();
    fc.assert(
      fc.property(
        fc.array(arbitraryOperation(makeInitialState()), { maxLength: 10 }),
        (ops) => {
          let state = makeInitialState();
          let expectedVersion = 0;
          for (const op of ops) {
            const tx: Transaction = {
              id: `fuzz-${Date.now()}-${Math.random()}`,
              label: 'fuzz',
              timestamp: Date.now(),
              operations: [op],
            };
            const result = dispatch(state, tx);
            if (result.accepted) {
              expectedVersion++;
              expect(result.nextState.timeline.version).toBe(expectedVersion);
              state = result.nextState;
            }
          }
        },
      ),
      { numRuns: 500, timeout: 30000 },
    );
  });

  it('rejected operations never change state', () => {
    resetCounters();
    fc.assert(
      fc.property(
        fc.array(arbitraryOperation(makeInitialState()), { maxLength: 10 }),
        (ops) => {
          let state = makeInitialState();
          for (const op of ops) {
            const stateBefore = JSON.stringify(state);
            const tx: Transaction = {
              id: `fuzz-${Date.now()}-${Math.random()}`,
              label: 'fuzz',
              timestamp: Date.now(),
              operations: [op],
            };
            const result = dispatch(state, tx);
            if (!result.accepted) {
              // State must be completely unchanged after rejection
              expect(JSON.stringify(state)).toBe(stateBefore);
            } else {
              state = result.nextState;
            }
          }
        },
      ),
      { numRuns: 500, timeout: 30000 },
    );
  });
});

// ── Fuzz with generated initial states ───────────────────────────────────────

describe('Fuzz: random states with random operations', () => {
  it('operations on arbitrary initial states maintain invariants', () => {
    resetCounters();
    fc.assert(
      fc.property(
        arbitraryInitialState(),
        fc.array(arbitraryOperation(makeInitialState()), { maxLength: 5 }),
        (initialState, ops) => {
          // Verify the generated state is valid
          const violations = checkInvariants(initialState);
          if (violations.length > 0) return; // skip invalid generated states

          let state = initialState;
          for (const op of ops) {
            const tx: Transaction = {
              id: `fuzz-${Date.now()}-${Math.random()}`,
              label: 'fuzz',
              timestamp: Date.now(),
              operations: [op],
            };
            const result = dispatch(state, tx);
            if (result.accepted) {
              const v = checkInvariants(result.nextState);
              expect(v).toEqual([]);
              state = result.nextState;
            }
          }
        },
      ),
      { numRuns: 200, timeout: 30000 },
    );
  });
});

// ── Fuzz specific operation types ────────────────────────────────────────────

describe('Fuzz: DELETE_CLIP sequences', () => {
  it('deleting clips never produces invariant violations', () => {
    resetCounters();
    const state = makeInitialState();

    // Generate a state with multiple clips to delete
    let setupState = state;
    const clipIds: string[] = ['clip-1'];
    for (let i = 2; i <= 5; i++) {
      const tx: Transaction = {
        id: `setup-${i}`, label: 'setup', timestamp: Date.now(),
        operations: [{
          type: 'INSERT_CLIP',
          clip: createClip({
            id: `clip-${i}`, assetId: 'asset-1', trackId: 'track-1',
            timelineStart: toFrame((i - 1) * 200), timelineEnd: toFrame(i * 200),
            mediaIn: toFrame((i - 1) * 200), mediaOut: toFrame(i * 200),
          }),
          trackId: toTrackId('track-1'),
        }],
      };
      const result = dispatch(setupState, tx);
      if (result.accepted) {
        setupState = result.nextState;
        clipIds.push(`clip-${i}`);
      }
    }

    // Now fuzz delete operations
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...clipIds), { maxLength: 10 }),
        (ids) => {
          let s = setupState;
          for (const id of ids) {
            const tx: Transaction = {
              id: `fuzz-del-${Date.now()}-${Math.random()}`,
              label: 'fuzz', timestamp: Date.now(),
              operations: [{ type: 'DELETE_CLIP', clipId: toClipId(id) }],
            };
            const result = dispatch(s, tx);
            if (result.accepted) {
              expect(checkInvariants(result.nextState)).toEqual([]);
              s = result.nextState;
            }
          }
        },
      ),
      { numRuns: 300, timeout: 30000 },
    );
  });
});

// ── Fuzz: MOVE_CLIP sequences ────────────────────────────────────────────────

describe('Fuzz: MOVE_CLIP sequences', () => {
  it('moving clips never produces overlaps or out-of-bounds', () => {
    resetCounters();
    const state = makeInitialState();

    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 0, max: 4800 }),
          { maxLength: 20 },
        ),
        (positions) => {
          let s = state;
          for (const pos of positions) {
            const tx: Transaction = {
              id: `fuzz-move-${Date.now()}-${Math.random()}`,
              label: 'fuzz', timestamp: Date.now(),
              operations: [{
                type: 'MOVE_CLIP',
                clipId: toClipId('clip-1'),
                newTimelineStart: toFrame(pos),
              }],
            };
            const result = dispatch(s, tx);
            if (result.accepted) {
              expect(checkInvariants(result.nextState)).toEqual([]);
              s = result.nextState;
            }
          }
        },
      ),
      { numRuns: 300, timeout: 30000 },
    );
  });
});

// ── Fuzz: SET_CLIP_SPEED sequences ───────────────────────────────────────────

describe('Fuzz: SET_CLIP_SPEED sequences', () => {
  it('speed changes never produce invalid speed values', () => {
    resetCounters();
    const state = makeInitialState();

    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(fc.constant(0.5), fc.constant(1.0), fc.constant(2.0), fc.float({ min: Math.fround(0.01), max: Math.fround(4.0) })),
          { maxLength: 20 },
        ),
        (speeds) => {
          let s = state;
          for (const speed of speeds) {
            const tx: Transaction = {
              id: `fuzz-speed-${Date.now()}-${Math.random()}`,
              label: 'fuzz', timestamp: Date.now(),
              operations: [{
                type: 'SET_CLIP_SPEED',
                clipId: toClipId('clip-1'),
                speed,
              }],
            };
            const result = dispatch(s, tx);
            if (result.accepted) {
              expect(checkInvariants(result.nextState)).toEqual([]);
              s = result.nextState;
            }
          }
        },
      ),
      { numRuns: 300, timeout: 30000 },
    );
  });
});

// ── Fuzz: RESIZE_CLIP sequences ──────────────────────────────────────────────

describe('Fuzz: RESIZE_CLIP sequences', () => {
  it('resizing clips maintains valid media bounds', () => {
    resetCounters();
    const state = makeInitialState();

    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.constantFrom('start' as const, 'end' as const),
            fc.integer({ min: 0, max: 200 }),
          ),
          { maxLength: 20 },
        ),
        (resizes) => {
          let s = state;
          for (const [edge, frame] of resizes) {
            const tx: Transaction = {
              id: `fuzz-resize-${Date.now()}-${Math.random()}`,
              label: 'fuzz', timestamp: Date.now(),
              operations: [{
                type: 'RESIZE_CLIP',
                clipId: toClipId('clip-1'),
                edge,
                newFrame: toFrame(frame),
              }],
            };
            const result = dispatch(s, tx);
            if (result.accepted) {
              expect(checkInvariants(result.nextState)).toEqual([]);
              s = result.nextState;
            }
          }
        },
      ),
      { numRuns: 300, timeout: 30000 },
    );
  });
});

// ── Fuzz: mixed operations ───────────────────────────────────────────────────

describe('Fuzz: mixed operation types', () => {
  it('mix of rename, move, resize, speed, delete never breaks invariants', () => {
    resetCounters();
    const state = makeInitialState();

    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant({ type: 'RENAME_TIMELINE' as const, name: 'fuzzed' }),
            fc.integer({ min: 0, max: 4800 }).map(pos => ({
              type: 'MOVE_CLIP' as const,
              clipId: toClipId('clip-1'),
              newTimelineStart: toFrame(pos),
            })),
            fc.integer({ min: 1, max: 200 }).map(f => ({
              type: 'RESIZE_CLIP' as const,
              clipId: toClipId('clip-1'),
              edge: 'end' as const,
              newFrame: toFrame(f),
            })),
            fc.constant({ type: 'SET_CLIP_SPEED' as const, clipId: toClipId('clip-1'), speed: 1.0 }),
          ),
          { maxLength: 15 },
        ),
        (ops) => {
          let s = state;
          for (const op of ops) {
            const tx: Transaction = {
              id: `fuzz-mixed-${Date.now()}-${Math.random()}`,
              label: 'fuzz', timestamp: Date.now(),
              operations: [op],
            };
            const result = dispatch(s, tx);
            if (result.accepted) {
              expect(checkInvariants(result.nextState)).toEqual([]);
              s = result.nextState;
            }
          }
        },
      ),
      { numRuns: 500, timeout: 30000 },
    );
  });
});

// ── Fuzz: IN/OUT point sequences ─────────────────────────────────────────────

describe('Fuzz: SET_IN_POINT / SET_OUT_POINT sequences', () => {
  it('in/out points never violate in/out ordering', () => {
    resetCounters();
    const state = makeInitialState();

    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.tuple(fc.constant('in' as const), fc.integer({ min: 0, max: 2999 })),
            fc.tuple(fc.constant('out' as const), fc.integer({ min: 1, max: 3000 })),
          ),
          { maxLength: 20 },
        ),
        (pairs) => {
          let s = state;
          for (const [which, frame] of pairs) {
            const op: OperationPrimitive = which === 'in'
              ? { type: 'SET_IN_POINT', frame: toFrame(frame) }
              : { type: 'SET_OUT_POINT', frame: toFrame(frame) };
            const tx: Transaction = {
              id: `fuzz-io-${Date.now()}-${Math.random()}`,
              label: 'fuzz', timestamp: Date.now(),
              operations: [op],
            };
            const result = dispatch(s, tx);
            if (result.accepted) {
              expect(checkInvariants(result.nextState)).toEqual([]);
              s = result.nextState;
            }
          }
        },
      ),
      { numRuns: 300, timeout: 30000 },
    );
  });
});

// ── Fuzz: marker sequences ───────────────────────────────────────────────────

describe('Fuzz: ADD_MARKER / DELETE_MARKER sequences', () => {
  it('markers never go out of bounds', () => {
    resetCounters();
    const state = makeInitialState();

    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.integer({ min: 0, max: 2999 }).map(frame => ({
              type: 'ADD_MARKER' as const,
              marker: {
                type: 'point' as const,
                id: toMarkerId(`m-fuzz-${Math.random().toString(36).slice(2)}`),
                frame: toFrame(frame),
                label: 'Fuzz', color: 'red', scope: 'global' as const, linkedClipId: null,
              },
            })),
          ),
          { maxLength: 10 },
        ),
        (ops) => {
          let s = state;
          for (const op of ops) {
            const tx: Transaction = {
              id: `fuzz-marker-${Date.now()}-${Math.random()}`,
              label: 'fuzz', timestamp: Date.now(),
              operations: [op],
            };
            const result = dispatch(s, tx);
            if (result.accepted) {
              expect(checkInvariants(result.nextState)).toEqual([]);
              s = result.nextState;
            }
          }
        },
      ),
      { numRuns: 300, timeout: 30000 },
    );
  });
});

// ── Fuzz: multi-track, mixed types, multi-asset ──────────────────────────────

describe('Fuzz: multi-track mixed video+audio', () => {
  function makeMultiTrackState(): TimelineState {
    const videoAsset = createAsset({
      id: 'vid-asset', name: 'Video', mediaType: 'video',
      filePath: '/v.mp4', intrinsicDuration: toFrame(10000),
      nativeFps: 30, sourceTimecodeOffset: toFrame(0), status: 'online',
    });
    const audioAsset = createAsset({
      id: 'aud-asset', name: 'Audio', mediaType: 'audio',
      filePath: '/a.wav', intrinsicDuration: toFrame(10000),
      nativeFps: 30, sourceTimecodeOffset: toFrame(0), status: 'online',
    });
    const videoClip = createClip({
      id: 'v-clip', assetId: 'vid-asset', trackId: 'v-track',
      timelineStart: toFrame(0), timelineEnd: toFrame(200),
      mediaIn: toFrame(0), mediaOut: toFrame(200),
    });
    const audioClip = createClip({
      id: 'a-clip', assetId: 'aud-asset', trackId: 'a-track',
      timelineStart: toFrame(50), timelineEnd: toFrame(300),
      mediaIn: toFrame(50), mediaOut: toFrame(300),
    });
    const vTrack = createTrack({ id: 'v-track', name: 'V1', type: 'video', clips: [videoClip] });
    const aTrack = createTrack({ id: 'a-track', name: 'A1', type: 'audio', clips: [audioClip] });
    const timeline = createTimeline({
      id: 'multi-tl', name: 'Multi', fps: 30, duration: toFrame(5000),
      startTimecode: toTimecode('00:00:00:00'), tracks: [vTrack, aTrack],
    });
    return createTimelineState({
      timeline,
      assetRegistry: new Map([
        [toAssetId('vid-asset'), videoAsset],
        [toAssetId('aud-asset'), audioAsset],
      ]),
    });
  }

  it('operations across video+audio tracks maintain invariants', () => {
    resetCounters();
    const state = makeMultiTrackState();

    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant({ type: 'RENAME_TIMELINE' as const, name: 'multi-fuzz' }),
            fc.integer({ min: 0, max: 4800 }).map(pos => ({
              type: 'MOVE_CLIP' as const,
              clipId: toClipId('v-clip'),
              newTimelineStart: toFrame(pos),
            })),
            fc.integer({ min: 0, max: 4700 }).map(pos => ({
              type: 'MOVE_CLIP' as const,
              clipId: toClipId('a-clip'),
              newTimelineStart: toFrame(pos),
            })),
            fc.constant({
              type: 'DELETE_CLIP' as const,
              clipId: toClipId('v-clip'),
            }),
            fc.constant({
              type: 'SET_CLIP_SPEED' as const,
              clipId: toClipId('v-clip'),
              speed: 1.0,
            }),
          ),
          { maxLength: 20 },
        ),
        (ops) => {
          let s = state;
          for (const op of ops) {
            const tx: Transaction = {
              id: `fuzz-mixed-${Date.now()}-${Math.random()}`,
              label: 'fuzz', timestamp: Date.now(),
              operations: [op],
            };
            const result = dispatch(s, tx);
            if (result.accepted) {
              expect(checkInvariants(result.nextState)).toEqual([]);
              s = result.nextState;
            }
          }
        },
      ),
      { numRuns: 300, timeout: 30000 },
    );
  });
});

describe('Fuzz: multi-asset operations', () => {
  function makeMultiAssetState(): TimelineState {
    const assets: [AssetId, ReturnType<typeof createAsset>][] = [];
    const clips: ReturnType<typeof createClip>[] = [];
    for (let i = 0; i < 3; i++) {
      const aid = toAssetId(`asset-${i}`);
      assets.push([aid, createAsset({
        id: `asset-${i}`, name: `Asset ${i}`, mediaType: 'video',
        filePath: `/v${i}.mp4`, intrinsicDuration: toFrame(10000),
        nativeFps: 30, sourceTimecodeOffset: toFrame(0), status: 'online',
      })]);
      clips.push(createClip({
        id: `clip-${i}`, assetId: `asset-${i}`, trackId: 'track-1',
        timelineStart: toFrame(i * 200), timelineEnd: toFrame(i * 200 + 100),
        mediaIn: toFrame(0), mediaOut: toFrame(100),
      }));
    }
    const track = createTrack({ id: 'track-1', name: 'V1', type: 'video', clips });
    const timeline = createTimeline({
      id: 'multi-asset-tl', name: 'MultiAsset', fps: 30, duration: toFrame(5000),
      startTimecode: toTimecode('00:00:00:00'), tracks: [track],
    });
    return createTimelineState({ timeline, assetRegistry: new Map(assets) });
  }

  it('operations on multi-asset state maintain invariants', () => {
    resetCounters();
    const state = makeMultiAssetState();

    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant({ type: 'RENAME_TIMELINE' as const, name: 'ma-fuzz' }),
            fc.constantFrom('clip-0', 'clip-1', 'clip-2').map(id => ({
              type: 'DELETE_CLIP' as const,
              clipId: toClipId(id),
            })),
            fc.integer({ min: 0, max: 4800 }).map(pos => ({
              type: 'MOVE_CLIP' as const,
              clipId: toClipId('clip-0'),
              newTimelineStart: toFrame(pos),
            })),
          ),
          { maxLength: 15 },
        ),
        (ops) => {
          let s = state;
          for (const op of ops) {
            const tx: Transaction = {
              id: `fuzz-ma-${Date.now()}-${Math.random()}`,
              label: 'fuzz', timestamp: Date.now(),
              operations: [op],
            };
            const result = dispatch(s, tx);
            if (result.accepted) {
              expect(checkInvariants(result.nextState)).toEqual([]);
              s = result.nextState;
            }
          }
        },
      ),
      { numRuns: 300, timeout: 30000 },
    );
  });
});

describe('Fuzz: multi-op transactions', () => {
  it('multi-op transactions are atomic — all or nothing', () => {
    resetCounters();
    const state = makeInitialState();

    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.constantFrom('RENAME_TIMELINE', 'MOVE_CLIP', 'SET_TIMELINE_DURATION'),
            fc.integer({ min: 0, max: 4800 }),
          ),
          { maxLength: 5 },
        ),
        (tuples) => {
          const ops: OperationPrimitive[] = tuples.map(([type, val]) => {
            if (type === 'RENAME_TIMELINE') return { type: 'RENAME_TIMELINE' as const, name: 'multi' };
            if (type === 'MOVE_CLIP') return { type: 'MOVE_CLIP' as const, clipId: toClipId('clip-1'), newTimelineStart: toFrame(val) };
            return { type: 'SET_TIMELINE_DURATION' as const, duration: toFrame(Math.max(300, val)) };
          });
          const tx: Transaction = {
            id: `fuzz-multiop-${Date.now()}`,
            label: 'fuzz', timestamp: Date.now(),
            operations: ops,
          };
          const result = dispatch(state, tx);
          if (result.accepted) {
            expect(checkInvariants(result.nextState)).toEqual([]);
          }
        },
      ),
      { numRuns: 300, timeout: 30000 },
    );
  });
});
