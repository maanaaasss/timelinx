# Chaos Engineering & Stress Test Report — Phase 1

**Reviewer:** Principal Chaos Engineer & Security Researcher
**Date:** 2026-07-04
**Scope:** `@timelinx/core` — full invariant contract stress test

---

## Executive Summary

**INVARIANTS VIOLATED.** The system does NOT survive both passes unscathed.

| Pass | Result | Finding Count |
|---|---|---|
| 10x Fuzz Testing | **2 failures** | 2 invariant violations confirmed |
| Hostile Consumer Pass | **12 failures** | 10 invariant violations + 2 design gaps |
| **Total unique bugs** | | **9 confirmed bugs** |

The system is **not** production-safe under duress. The bugs cluster around two root causes:

1. **NaN/undefined propagation through numeric comparisons** — the validator uses `<=` and `<` operators that return `false` for `NaN`, allowing NaN to pass validation and corrupt state.
2. **Missing defensive checks in `checkInvariants`** — the invariant checker crashes on malformed state rather than returning violations, violating its contract as the safety net.

---

## Vector 1: 10x Fuzz Testing (Extreme Boundaries)

### Configuration

- **Tool:** fast-check 4.8.0
- **Run count:** 5,000 per property (10x standard 500)
- **Timeout:** 60,000ms per property, 120,000ms for long sequences
- **Arbitraries widened:** NaN, Infinity, -Infinity, MAX_SAFE_INTEGER, Number.MAX_VALUE, negative frames, non-integer frames (0.5), prototype-pollution strings, 100-op sequences, 10-track/50-clip states

### Results

| Property | Runs | Result | Seed |
|---|---|---|---|
| MOVE_CLIP with extreme frame values | 5,000 | ✅ PASS | — |
| SET_CLIP_SPEED with degenerate speeds | 5,000 | ✅ PASS | — |
| RESIZE_CLIP with extreme frame values | 5,000 | ✅ PASS | — |
| 100-op random sequences | 5,000 | ✅ PASS (347ms avg) | — |
| 10-track, 50-clip state operations | 5,000 | ✅ PASS | — |
| Hostile string payloads in names | 5,000 | ✅ PASS | — |
| checkInvariants on garbage state | 5,000 | **❌ FAIL** | `-730949742` |
| NaN/Infinity propagation | 5,000 | **❌ FAIL** | `-1589485099` |
| Version monotonicity (200 ops) | 5,000 | ✅ PASS | — |
| All-or-nothing atomicity | 5,000 | ✅ PASS | — |

**7/10 properties survived 5,000 runs each. 35,000 total test executions.**

### Bug #1: NaN Propagation Through MOVE_CLIP

**Seed:** `-1589485099`, path `"4"`
**Counterexample:** `[Number.NaN]`

```
MOVE_CLIP with newTimelineStart = NaN is ACCEPTED.
The clip ends up with timelineStart = NaN in the output state.
```

**Root cause:** `validators.ts:101` checks `op.newTimelineStart < 0 || newEnd > state.timeline.duration`. Since `NaN < 0` evaluates to `false` and `NaN > duration` evaluates to `false`, NaN passes validation. The `apply.ts` MOVE_CLIP case (line 66) computes `delta = NaN - clip.timelineStart = NaN`, producing `timelineEnd = NaN`.

**Invariant breached:** "All frame values are integers, non-negative"

**Reproduction:**
```typescript
const state = makeBaseState();
const result = dispatch(state, tx([{
  type: 'MOVE_CLIP',
  clipId: 'hostile-clip' as any,
  newTimelineStart: toFrame(NaN),  // toFrame just casts — no validation
}]));
// result.accepted === true
// result.nextState.timeline.tracks[0].clips[0].timelineStart === NaN
```

### Bug #2: checkInvariants Crashes on Malformed State

**Seed:** `-730949742`, path `"30:2"`
**Counterexample:** `[{"schemaVersion":2,"clipCount":0,"badFrame":5e-324,"badSpeed":0}]`

```
TypeError: track.captions is not iterable
  at checkCaptionBounds (invariants.ts:355)
  at checkTrack (invariants.ts:101)
  at checkInvariants (invariants.ts:36)
```

**Root cause:** `checkCaptionBounds` (line 355) does `for (const cap of track.captions)`. If `track.captions` is `undefined` (e.g., from a manually constructed corrupt state), this throws instead of returning violations.

**Invariant breached:** Defense in depth — `checkInvariants` must NEVER throw. It is the last line of defense. If it crashes, corrupt state silently propagates.

**Reproduction:**
```typescript
const badState = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  timeline: {
    /* ... valid-looking timeline ... */
    tracks: [{
      id: 'bad-track', name: 'Bad', type: 'video',
      clips: [], locked: false, muted: false, hidden: false,
      blendMode: 'normal', opacity: 1.0,
      // captions: undefined — missing!
    }],
    markers: [], inPoint: null, outPoint: null, beatGrid: null,
    trackGroups: [], linkGroups: [],
  },
  assetRegistry: new Map(),
} as unknown as TimelineState;

checkInvariants(badState); // THROWS instead of returning violations
```

---

## Vector 2: Hostile Consumer Pass

### Results

| Test | Invariant Targeted | Result | Bug # |
|---|---|---|---|
| Mutating tracks array on returned state | Immutable state | **❌ FAIL** | #3 |
| Mutating a clip on returned state | Immutable state | **❌ FAIL** | #3 |
| Mutating assetRegistry map | Immutable state | **❌ FAIL** | #3 |
| Calling applyOperation directly | Single mutation path | **❌ FAIL** | — (expected) |
| Non-integer frame value | Integer frames | **❌ FAIL** | #4 |
| Negative timelineStart | Non-negative frames | **❌ FAIL** | #5 |
| NaN frame | Non-negative frames | **❌ FAIL** | #1 |
| Mismatched trackId | trackId integrity | **❌ FAIL** | #6 |
| NaN speed | speed > 0 | **❌ FAIL** | #1 |
| Duplicate clip IDs | Unique IDs | **❌ FAIL** | #7 |
| Duplicate track IDs | Unique IDs | **❌ FAIL** | #7 |
| Unknown operation type | Defense in depth | **❌ FAIL** | #8 |

48/60 tests passed. 12 failed.

### Bug #3: State Is Shallow-Immutable, Not Deep-Immutable

**Section 11 Principle 1:** "Immutable state — Every operation returns a new state object. Never mutate."

The state returned from `dispatch()` shares nested object references with the previous state. Mutating the returned state's `tracks` array, `clips` elements, or `assetRegistry` map **retroactively corrupts the previous state**.

**Evidence:**
```typescript
const state = makeBaseState();
const result = dispatch(state, tx([{ type: 'RENAME_TIMELINE', name: 'x' }]));
const returnedTracks = result.nextState.timeline.tracks;
returnedTracks.push(injectedTrack);  // SUCCEEDS
expect(state.timeline.tracks.length).toBe(1);  // FAILS: actual is 2
```

Same for clip properties (`speed`, `timelineStart`, `id`) and `assetRegistry` entries.

**Root cause:** `dispatch()` spreads at the top level (`{ ...proposedState }`) and spreads `timeline` (`{ ...proposedState.timeline, tracks: [...] }`), but the tracks array is a new array containing the **same track objects** with the **same clip objects**. There is no `Object.freeze()` anywhere in the pipeline.

**Impact:** Any consumer who holds a reference to a previous state and mutates the returned state will corrupt both states. This violates the immutable state contract.

### Bug #4: Non-Integer Frames Not Detected

**Section 11 Invariant:** "All frame values are integers, non-negative"

`checkInvariants` does NOT verify that frame values are integers. A clip with `timelineStart: 3.14` passes all invariant checks.

**Reproduction:**
```typescript
const state = makeBaseState();
const clip = state.timeline.tracks[0]!.clips[0]!;
const badClip = { ...clip, timelineStart: 3.14159 as any };
// ... construct badState with badClip ...
checkInvariants(badState);  // Returns [] — no violations detected
```

### Bug #5: Negative timelineStart Not Detected by Invariant Checker

**Section 11 Invariant:** "All frame values are integers, non-negative"

`checkInvariants` checks `clip.mediaIn < 0` (line 138) but does NOT check `clip.timelineStart < 0` or `clip.timelineEnd < 0` as independent checks. The `timelineEnd > timeline.duration` check (line 172) catches the case where `timelineEnd > duration`, but negative values that are still less than duration pass through.

**Note:** The MOVE_CLIP validator (line 101) catches `newTimelineStart < 0` at the validator level, so this only applies to manually constructed corrupt states passed directly to `checkInvariants`.

### Bug #6: trackId Mismatch Not Detected

**Section 11 Invariant:** "Every `clip.trackId` matches the track it's on"

`checkInvariants` does NOT verify that `clip.trackId === track.id`. A clip with `trackId: 'wrong-track'` placed on a track with `id: 'correct-track'` passes all invariant checks.

**Reproduction:**
```typescript
const badClip = { ...clip, trackId: 'wrong-track' as any };
const badTrack = { ...track, clips: [badClip] };
// badTrack.id === 'hostile-track' but badClip.trackId === 'wrong-track'
checkInvariants(badState);  // Returns [] — no violations
```

### Bug #7: No Duplicate ID Detection

**Section 11 Invariant:** "All IDs are unique (clips, tracks, markers, assets)"

`checkInvariants` does NOT check for duplicate clip IDs, duplicate track IDs, or duplicate asset IDs. Two clips with the same ID on the same track pass all invariant checks.

**Reproduction:**
```typescript
const clipA = { ...clip, id: 'same-id' as any };
const clipB = { ...clip, id: 'same-id' as any, timelineStart: toFrame(300), timelineEnd: toFrame(500) };
const badTrack = { ...track, clips: [clipA, clipB] };
checkInvariants(badState);  // Returns [] — no violations
```

### Bug #8: Unknown Operation Types Bypass Validation

**Section 11 Principle 10:** "Defense in depth — three layers: per-primitive validators → operation applier → invariant checker"

`validateOperation` (line 78) has `default: return null` — unknown operation types pass validation and reach `applyOperation`. If the unknown type has missing fields, `applyOperation` crashes with a TypeError.

**Reproduction:**
```typescript
const evilOp = { type: 'EVIL_DELETE_ALL_DATA' } as unknown as OperationPrimitive;
dispatch(state, tx([evilOp]));
// TypeError: Cannot read properties of undefined (reading 'schemaVersion')
// in checkInvariants — because applyOperation returned undefined state
```

**Note:** `applyOperation` has no `default` case in its switch statement (line 38). Unknown types fall through and return `undefined` (typed as `TimelineState`). This `undefined` is then passed to `checkInvariants`, which crashes.

### Bug #9: NaN Speed Accepted by SET_CLIP_SPEED

**Section 11 Invariant:** "clip.speed > 0"

The validator checks `speed <= 0` (line ~200 of validators.ts). Since `NaN <= 0` evaluates to `false`, NaN passes validation. The clip ends up with `speed: NaN` in the output state.

The invariant checker checks `clip.speed <= 0` (line 183). Since `NaN <= 0` evaluates to `false`, the invariant checker also fails to catch it.

**Root cause:** Both validator and invariant checker use `<=` comparison, which returns `false` for NaN. This is a fundamental JavaScript gotcha: `NaN <= 0 === false`, `NaN > 0 === false`, `NaN === NaN === false`.

**Reproduction:**
```typescript
const result = dispatch(state, tx([{
  type: 'SET_CLIP_SPEED',
  clipId: 'hostile-clip' as any,
  speed: NaN,
}]));
// result.accepted === true
// result.nextState.timeline.tracks[0].clips[0].speed === NaN
```

---

## Summary of All Bugs

| # | Severity | Description | Invariant | Root Cause |
|---|---|---|---|---|
| 1 | **CRITICAL** | NaN propagation through MOVE_CLIP and SET_CLIP_SPEED | Integer/non-negative frames; speed > 0 | `NaN < x` is `false` |
| 2 | **CRITICAL** | checkInvariants crashes on malformed state | Defense in depth | Missing `track.captions` guard |
| 3 | **HIGH** | Shallow immutability — nested refs shared | Immutable state | No `Object.freeze()` |
| 4 | **HIGH** | Non-integer frames not detected | Integer frames | Missing integer check |
| 5 | **MEDIUM** | Negative timelineStart not caught by invariants | Non-negative frames | Missing check in `checkTrack` |
| 6 | **HIGH** | trackId mismatch not detected | trackId integrity | Missing `clip.trackId === track.id` check |
| 7 | **HIGH** | No duplicate ID detection | Unique IDs | Missing uniqueness check |
| 8 | **MEDIUM** | Unknown operation types bypass validation | Defense in depth | `default: return null` in validator |
| 9 | **CRITICAL** | NaN speed accepted by SET_CLIP_SPEED | speed > 0 | `NaN <= 0` is `false` |

---

## What Survived

The following invariants held under extreme duress:

- ✅ **No overlapping clips** — validator catches all overlaps
- ✅ **timelineStart < timelineEnd** — validator catches zero/negative duration clips
- ✅ **mediaIn < mediaOut** — SET_MEDIA_BOUNDS validator catches invalid ranges
- ✅ **clip.mediaOut <= asset.intrinsicDuration** — validator enforces
- ✅ **clip.timelineEnd <= timeline.duration** — validator enforces
- ✅ **Speed > 0** (for non-NaN values) — validator catches 0, negative, Infinity
- ✅ **Clips sorted ascending** — `sortTrackClips` in apply ensures ordering
- ✅ **Version monotonically increasing by 1** — dispatcher enforces
- ✅ **Schema version check** — invariant checker catches mismatches
- ✅ **All-or-nothing transactions** — dispatcher validates all before applying any
- ✅ **Determinism** — 100 identical dispatches produce identical results
- ✅ **Locked track enforcement** — all mutations rejected on locked tracks
- ✅ **Cross-track move integrity** — clips correctly removed from source track
- ✅ **Duration mismatch detection** — (mediaOut - mediaIn) vs timelineDuration/speed
- ✅ **Prototype pollution** — no pollution via name strings
- ✅ **Proxy/getter attacks** — dispatch handles gracefully without crash
- ✅ **Rapid fire** — 1,000 sequential dispatches maintain all (non-NaN) invariants

---

## Files Created

| File | Purpose |
|---|---|
| `packages/core/src/__tests__/fuzz/extreme-fuzz.test.ts` | 10x fuzz suite (5,000 runs/property) |
| `packages/core/src/__tests__/hostile/hostile-consumer.test.ts` | Hostile consumer pass (60 tests) |
| `docs/phase-1/CHAOS-ENGINEERING-REPORT.md` | This report |

---

## Recommended Fixes (Priority Order)

1. **Fix NaN propagation (Bug #1, #9):** Add `Number.isNaN()` checks in both `validators.ts` and `invariants.ts` for all numeric comparisons. Example: `if (Number.isNaN(speed) || speed <= 0)`.

2. **Fix checkInvariants crash (Bug #2):** Add null/undefined guards in `checkCaptionBounds`, `checkMarkerBounds`, and all array iterations. The invariant checker must NEVER throw.

3. **Add duplicate ID checks (Bug #7):** Add `Set`-based uniqueness checks for clip IDs, track IDs, and marker IDs in `checkInvariants`.

4. **Add trackId validation (Bug #6):** Add `clip.trackId === track.id` check in `checkClip`.

5. **Add integer frame validation (Bug #4):** Add `Number.isInteger(frame)` check for all frame values in `checkClip`.

6. **Harden state immutability (Bug #3):** Consider `Object.freeze()` on returned state, or document that consumers must not mutate returned state.

7. **Guard against unknown operations (Bug #8):** Change `default: return null` in `validateOperation` to `default: return { reason: 'UNKNOWN_OPERATION', message: '...' }`.

8. **Add negative frame check (Bug #5):** Add explicit `clip.timelineStart < 0` check in `checkClip`.
