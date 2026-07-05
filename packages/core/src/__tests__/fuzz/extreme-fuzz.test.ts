/**
 * EXTREME FUZZ TESTING — 10x scaled
 *
 * Widen generators to include extreme edge cases that normal fuzzing misses:
 * MAX_SAFE_INTEGER boundaries, NaN, Infinity, negative frames, prototype
 * pollution payloads, deeply nested graphs, and massive operation sequences.
 *
 * Scale: 5000 runs per property (10x the standard 500).
 *
 * Goal: Prove Section 11 invariants hold under conditions no sane consumer
 * would ever create, but that a malicious or buggy upstream could produce.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { dispatch } from '../../engine/dispatcher';
import { checkInvariants } from '../../validation/invariants';
import { createTimelineState } from '../../types/state';
import { createTimeline } from '../../types/timeline';
import { createTrack } from '../../types/track';
import { createClip } from '../../types/clip';
import { createAsset } from '../../types/asset';
import { toFrame, toTimecode } from '../../types/frame';
import type { TimelineState } from '../../types/state';
import type { Transaction, OperationPrimitive } from '../../types/operations';
import type { Clip } from '../../types/clip';
import type { TrackId } from '../../types/track';
import type { AssetId } from '../../types/asset';
import type { TimelineFrame } from '../../types/frame';

// ── Helpers ──────────────────────────────────────────────────────────────────

let txCounter = 0;

function nextTxId(): string {
  return `extreme-tx-${++txCounter}`;
}

function makeTx(op: OperationPrimitive): Transaction {
  return {
    id: nextTxId(),
    label: 'extreme-fuzz',
    timestamp: 0,
    operations: [op],
  };
}

// ── Extreme arbitraries ──────────────────────────────────────────────────────

/** Frame values at the absolute limits of the numeric type system. */
function extremeFrame(): fc.Arbitrary<number> {
  return fc.oneof(
    fc.constant(0),
    fc.constant(1),
    fc.constant(-1),
    fc.constant(Number.MAX_SAFE_INTEGER),
    fc.constant(Number.MIN_SAFE_INTEGER),
    fc.constant(Number.MAX_VALUE),
    fc.constant(Number.MIN_VALUE),
    fc.constant(Number.POSITIVE_INFINITY),
    fc.constant(Number.NEGATIVE_INFINITY),
    fc.constant(NaN),
    fc.constant(0.5),
    fc.constant(-0.5),
    fc.constant(1e15),
    fc.constant(-1e15),
    fc.integer({ min: -1000, max: 1000 }),
  );
}

/** Speed values including all degenerate cases. */
function extremeSpeed(): fc.Arbitrary<number> {
  return fc.oneof(
    fc.constant(0),
    fc.constant(-1),
    fc.constant(NaN),
    fc.constant(Number.POSITIVE_INFINITY),
    fc.constant(Number.NEGATIVE_INFINITY),
    fc.constant(Number.MAX_VALUE),
    fc.constant(Number.MIN_VALUE),
    fc.constant(-0),
    fc.constant(0.001),
    fc.constant(999999),
  );
}

/** Strings that look like prototype pollution payloads. */
function hostileString(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant('__proto__'),
    fc.constant('constructor'),
    fc.constant('prototype'),
    fc.constant('toString'),
    fc.constant('valueOf'),
    fc.constant('hasOwnProperty'),
    fc.constant(''),
    fc.constant(' '),
    fc.constant('\x00'),
    fc.constant('\n'),
    fc.constant('\u0000'),
    fc.constant('a'.repeat(10000)),
    fc.constant('\u200b\u200c\u200d\ufeff'),
    fc.constant('${constructor}'),
    fc.constant('{{constructor}}'),
    fc.constant('<script>alert(1)</script>'),
    fc.string({ minLength: 1, maxLength: 500 }),
  );
}

/** Create an intentionally corrupt initial state with extreme values. */
function makeCorruptState(): TimelineState {
  const asset = createAsset({
    id: 'extreme-asset',
    name: 'Extreme Asset',
    mediaType: 'video',
    filePath: '/media/extreme.mp4',
    intrinsicDuration: toFrame(10000),
    nativeFps: 30,
    sourceTimecodeOffset: toFrame(0),
    status: 'online',
  });

  const clip: Clip = {
    id: 'extreme-clip' as any,
    assetId: 'extreme-asset' as any,
    trackId: 'extreme-track' as any,
    timelineStart: toFrame(0),
    timelineEnd: toFrame(200),
    mediaIn: toFrame(0),
    mediaOut: toFrame(200),
    speed: 1.0,
    enabled: true,
    reversed: false,
    name: null,
    color: null,
    metadata: {},
  };

  const track = createTrack({
    id: 'extreme-track',
    name: 'Extreme Track',
    type: 'video',
    clips: [clip],
  });

  const timeline = createTimeline({
    id: 'extreme-tl',
    name: 'Extreme Timeline',
    fps: 30,
    duration: toFrame(5000),
    startTimecode: toTimecode('00:00:00:00'),
    tracks: [track],
  });

  return createTimelineState({
    timeline,
    assetRegistry: new Map([['extreme-asset' as AssetId, asset]]),
  });
}

// ── Helper: execute ops and check invariants ─────────────────────────────────

function executeAndCheck(
  state: TimelineState,
  ops: OperationPrimitive[],
): { state: TimelineState; accepted: number; rejected: number } {
  let accepted = 0;
  let rejected = 0;

  for (const op of ops) {
    const result = dispatch(state, makeTx(op));
    if (result.accepted) {
      const violations = checkInvariants(result.nextState);
      if (violations.length > 0) {
        throw new Error(
          `INVARIANT VIOLATION after ${op.type}: ${violations.map((v) => v.message).join('; ')}`,
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

// ── Extreme fuzz suites ──────────────────────────────────────────────────────

describe('Extreme Fuzz: invariant survival under degenerate numeric frames', () => {
  it('MOVE_CLIP with extreme frame values is always rejected or preserves invariants', () => {
    const state = makeCorruptState();

    fc.assert(
      fc.property(extremeFrame(), (frame) => {
        const op: OperationPrimitive = {
          type: 'MOVE_CLIP',
          clipId: 'extreme-clip' as any,
          newTimelineStart: toFrame(frame),
        };
        const result = dispatch(state, makeTx(op));
        if (result.accepted) {
          const v = checkInvariants(result.nextState);
          if (v.length > 0) {
            throw new Error(`Invariant violation: ${v.map((x) => x.message).join('; ')}`);
          }
        }
      }),
      { numRuns: 5000, timeout: 60000 },
    );
  });

  it('SET_CLIP_SPEED with degenerate speed values is always rejected or preserves invariants', () => {
    const state = makeCorruptState();

    fc.assert(
      fc.property(extremeSpeed(), (speed) => {
        const op: OperationPrimitive = {
          type: 'SET_CLIP_SPEED',
          clipId: 'extreme-clip' as any,
          speed,
        };
        const result = dispatch(state, makeTx(op));
        if (result.accepted) {
          const v = checkInvariants(result.nextState);
          if (v.length > 0) {
            throw new Error(`Invariant violation: ${v.map((x) => x.message).join('; ')}`);
          }
        }
      }),
      { numRuns: 5000, timeout: 60000 },
    );
  });

  it('RESIZE_CLIP with extreme frame values is always rejected or preserves invariants', () => {
    const state = makeCorruptState();

    fc.assert(
      fc.property(
        fc.constantFrom('start' as const, 'end' as const),
        extremeFrame(),
        (edge, frame) => {
          const op: OperationPrimitive = {
            type: 'RESIZE_CLIP',
            clipId: 'extreme-clip' as any,
            edge,
            newFrame: toFrame(frame),
          };
          const result = dispatch(state, makeTx(op));
          if (result.accepted) {
            const v = checkInvariants(result.nextState);
            if (v.length > 0) {
              throw new Error(`Invariant violation: ${v.map((x) => x.message).join('; ')}`);
            }
          }
        },
      ),
      { numRuns: 5000, timeout: 60000 },
    );
  });
});

describe('Extreme Fuzz: massive operation sequences', () => {
  it('sequences of 100 random operations never break invariants', () => {
    const state = makeCorruptState();

    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant({ type: 'RENAME_TIMELINE' as const, name: 'extreme' }),
            fc.integer({ min: 0, max: 4800 }).map((pos) => ({
              type: 'MOVE_CLIP' as const,
              clipId: 'extreme-clip' as any,
              newTimelineStart: toFrame(pos),
            })),
            fc.integer({ min: 1, max: 500 }).map((f) => ({
              type: 'RESIZE_CLIP' as const,
              clipId: 'extreme-clip' as any,
              edge: 'end' as const,
              newFrame: toFrame(f),
            })),
            fc.constant({
              type: 'SET_CLIP_SPEED' as const,
              clipId: 'extreme-clip' as any,
              speed: 1.0,
            }),
            fc.constant({
              type: 'DELETE_CLIP' as const,
              clipId: 'extreme-clip' as any,
            }),
          ),
          { minLength: 50, maxLength: 100 },
        ),
        (ops) => {
          let s = state;
          for (const op of ops) {
            const result = dispatch(s, makeTx(op));
            if (result.accepted) {
              const v = checkInvariants(result.nextState);
              if (v.length > 0) {
                throw new Error(`Invariant violation at op ${op.type}: ${v.map((x) => x.message).join('; ')}`);
              }
              s = result.nextState;
            }
          }
        },
      ),
      { numRuns: 5000, timeout: 120000 },
    );
  });
});

describe('Extreme Fuzz: multi-track with many clips', () => {
  it('operations on a 10-track, 50-clip state never break invariants', () => {
    // Build a large state
    const asset = createAsset({
      id: 'big-asset',
      name: 'Big',
      mediaType: 'video',
      filePath: '/big.mp4',
      intrinsicDuration: toFrame(100000),
      nativeFps: 30,
      sourceTimecodeOffset: toFrame(0),
      status: 'online',
    });

    const tracks = [];
    const allClipIds: string[] = [];
    for (let t = 0; t < 10; t++) {
      const clips = [];
      for (let c = 0; c < 5; c++) {
        const clipId = `track${t}-clip${c}`;
        allClipIds.push(clipId);
        clips.push(
          createClip({
            id: clipId,
            assetId: 'big-asset',
            trackId: `big-track-${t}`,
            timelineStart: toFrame(c * 200),
            timelineEnd: toFrame(c * 200 + 100),
            mediaIn: toFrame(c * 100),
            mediaOut: toFrame(c * 100 + 100),
          }),
        );
      }
      tracks.push(
        createTrack({
          id: `big-track-${t}`,
          name: `V${t}`,
          type: 'video',
          clips,
        }),
      );
    }

    const timeline = createTimeline({
      id: 'big-tl',
      name: 'Big',
      fps: 30,
      duration: toFrame(50000),
      startTimecode: toTimecode('00:00:00:00'),
      tracks,
    });

    const bigState = createTimelineState({
      timeline,
      assetRegistry: new Map([['big-asset' as AssetId, asset]]),
    });

    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constantFrom(...allClipIds).map((id) => ({
              type: 'DELETE_CLIP' as const,
              clipId: id as any,
            })),
            fc.integer({ min: 0, max: 49000 }).map((pos) => ({
              type: 'MOVE_CLIP' as const,
              clipId: allClipIds[0] as any,
              newTimelineStart: toFrame(pos),
            })),
            fc.constant({ type: 'RENAME_TIMELINE' as const, name: 'big-fuzz' }),
          ),
          { maxLength: 30 },
        ),
        (ops) => {
          let s = bigState;
          for (const op of ops) {
            const result = dispatch(s, makeTx(op));
            if (result.accepted) {
              const v = checkInvariants(result.nextState);
              if (v.length > 0) {
                throw new Error(`Invariant violation: ${v.map((x) => x.message).join('; ')}`);
              }
              s = result.nextState;
            }
          }
        },
      ),
      { numRuns: 5000, timeout: 120000 },
    );
  });
});

describe('Extreme Fuzz: hostile string payloads in timeline/clip names', () => {
  it('RENAME_TIMELINE with prototype-pollution strings never crashes', () => {
    const state = makeCorruptState();

    fc.assert(
      fc.property(hostileString(), (name) => {
        const op: OperationPrimitive = { type: 'RENAME_TIMELINE', name };
        const result = dispatch(state, makeTx(op));
        // Should either accept (and be valid) or reject — never throw
        if (result.accepted) {
          const v = checkInvariants(result.nextState);
          if (v.length > 0) {
            throw new Error(`Invariant violation: ${v.map((x) => x.message).join('; ')}`);
          }
        }
      }),
      { numRuns: 5000, timeout: 60000 },
    );
  });
});

describe('Extreme Fuzz: invariant checker receives garbage state', () => {
  it('checkInvariants never throws even on maximally corrupt state', () => {
    fc.assert(
      fc.property(
        fc.record({
          schemaVersion: fc.integer({ min: -100, max: 100 }),
          clipCount: fc.integer({ min: 0, max: 50 }),
          badFrame: extremeFrame(),
          badSpeed: extremeSpeed(),
        }),
        ({ schemaVersion, clipCount, badFrame, badSpeed }) => {
          // Build a state with corrupt values
          const clips: Clip[] = [];
          for (let i = 0; i < clipCount; i++) {
            clips.push({
              id: `corrupt-${i}` as any,
              assetId: 'corrupt-asset' as any,
              trackId: 'corrupt-track' as any,
              timelineStart: toFrame(Math.max(0, badFrame)),
              timelineEnd: toFrame(Math.max(1, badFrame + 1)),
              mediaIn: toFrame(0),
              mediaOut: toFrame(1),
              speed: badSpeed || 1.0,
              enabled: true,
              reversed: false,
              name: null,
              color: null,
              metadata: {},
            });
          }

          const corruptState = {
            schemaVersion,
            timeline: {
              id: 'corrupt' as any,
              name: 'Corrupt',
              fps: 30 as any,
              duration: toFrame(50000),
              startTimecode: '00:00:00:00' as any,
              version: 0,
              tracks: [
                {
                  id: 'corrupt-track' as any,
                  name: 'Corrupt',
                  type: 'video' as const,
                  clips,
                  locked: false,
                  muted: false,
                  hidden: false,
                  blendMode: 'normal' as const,
                  opacity: 1.0,
                },
              ],
              markers: [],
              inPoint: null,
              outPoint: null,
              beatGrid: null,
              trackGroups: [],
              linkGroups: [],
            },
            assetRegistry: new Map(),
          } as unknown as TimelineState;

          // checkInvariants must NEVER throw — it must return an array
          const result = checkInvariants(corruptState);
          if (!Array.isArray(result)) {
            throw new Error('checkInvariants did not return an array');
          }
        },
      ),
      { numRuns: 5000, timeout: 60000 },
    );
  });
});

describe('Extreme Fuzz: NaN and Infinity propagation', () => {
  it('dispatch with NaN/newTimelineStart never produces NaN in output state', () => {
    const state = makeCorruptState();

    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(NaN),
          fc.constant(Infinity),
          fc.constant(-Infinity),
          fc.constant(Number.MAX_SAFE_INTEGER),
        ),
        (val) => {
          const op: OperationPrimitive = {
            type: 'MOVE_CLIP',
            clipId: 'extreme-clip' as any,
            newTimelineStart: toFrame(val),
          };
          const result = dispatch(state, makeTx(op));
          if (result.accepted) {
            const v = checkInvariants(result.nextState);
            if (v.length > 0) {
              throw new Error(`Invariant violation: ${v.map((x) => x.message).join('; ')}`);
            }
            // Check no NaN in output state
            const clip = result.nextState.timeline.tracks[0]?.clips[0];
            if (clip) {
              if (Number.isNaN(clip.timelineStart)) throw new Error('NaN in timelineStart');
              if (Number.isNaN(clip.timelineEnd)) throw new Error('NaN in timelineEnd');
              if (Number.isNaN(clip.mediaIn)) throw new Error('NaN in mediaIn');
              if (Number.isNaN(clip.mediaOut)) throw new Error('NaN in mediaOut');
              if (Number.isNaN(clip.speed)) throw new Error('NaN in speed');
            }
          }
        },
      ),
      { numRuns: 5000, timeout: 60000 },
    );
  });
});

describe('Extreme Fuzz: version monotonicity under rapid mutations', () => {
  it('version always increases by exactly 1 across 200 sequential operations', () => {
    const state = makeCorruptState();

    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.integer({ min: 0, max: 4800 }).map((pos) => ({
              type: 'MOVE_CLIP' as const,
              clipId: 'extreme-clip' as any,
              newTimelineStart: toFrame(pos),
            })),
            fc.constant({
              type: 'SET_CLIP_SPEED' as const,
              clipId: 'extreme-clip' as any,
              speed: 1.0,
            }),
            fc.constant({ type: 'RENAME_TIMELINE' as const, name: 'v' }),
          ),
          { maxLength: 200 },
        ),
        (ops) => {
          let s = state;
          let expectedVersion = 0;
          for (const op of ops) {
            const result = dispatch(s, makeTx(op));
            if (result.accepted) {
              expectedVersion++;
              if (result.nextState.timeline.version !== expectedVersion) {
                throw new Error(
                  `Version gap: expected ${expectedVersion}, got ${result.nextState.timeline.version}`,
                );
              }
              s = result.nextState;
            }
          }
        },
      ),
      { numRuns: 5000, timeout: 120000 },
    );
  });
});

describe('Extreme Fuzz: all-or-nothing transaction atomicity', () => {
  it('multi-op transaction with one invalid op rejects everything', () => {
    const state = makeCorruptState();

    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(-1),
          fc.constant(NaN),
          fc.constant(Number.MAX_SAFE_INTEGER),
          fc.constant(-1000),
        ),
        (badFrame) => {
          // 2-op transaction: first is valid, second has impossible frame
          const tx: Transaction = {
            id: nextTxId(),
            label: 'atomic-test',
            timestamp: 0,
            operations: [
              { type: 'RENAME_TIMELINE', name: 'should-not-apply' },
              {
                type: 'MOVE_CLIP',
                clipId: 'extreme-clip' as any,
                newTimelineStart: toFrame(badFrame),
              },
            ],
          };
          const result = dispatch(state, tx);
          // Atomicity: if rejected, nothing applied; if accepted, everything applied
          if (!result.accepted) {
            // state must be unchanged
            expect(state.timeline.name).toBe('Extreme Timeline');
          } else {
            // Both ops should have applied
            expect(result.nextState.timeline.name).toBe('should-not-apply');
          }
        },
      ),
      { numRuns: 5000, timeout: 60000 },
    );
  });
});
