# Architecture Review — Blind, Independent Code Review

**Reviewer:** Senior Staff Software Engineer & Expert Software Architect
**Date:** 2026-07-04
**Scope:** Full codebase — `@timelinx/core`, `@timelinx/react`, `@timelinx/ui`, `@timelinx/media-web`, `@timelinx/ai`, `@timelinx/collab`

---

## 1. Structural Fragility & Boundary Violations

### 1a. The `apply.ts` God-Switch — Single Point of Coupling for All Operations

**File:** `packages/core/src/engine/apply.ts:38-543`

The `applyOperation` function is a 650-line switch statement handling 42+ operation variants. Every new feature requires editing this single file, which creates an inherent coupling problem:

- Adding a new operation type means adding a case to this switch, editing `operations.ts` (the discriminated union), editing `validators.ts` (the validation switch), and editing `invariants.ts` (the invariant checker). Four files must be updated atomically, but there's no compile-time enforcement of this coordination.
- The switch statement in `apply.ts` (line 38) does **not** have a `default` case that throws or exhaustively checks. If a new `OperationPrimitive` variant is added to the union but not handled in `applyOperation`, the function silently falls through and returns `undefined` — which is typed as `TimelineState`. This is a type-level lie that would cause runtime crashes downstream.

### 1b. React Engine Class Violates Framework-Agnostic Core Principle

**File:** `packages/react/src/engine.ts:94-533`

The `TimelineEngine` class (533 lines) is a god object that owns:
- History (undo/redo)
- Playback engine
- Snap index management
- Track index
- Keyboard handling
- Tool registry and all tool lifecycle
- Selection state (private `_selectedClipIds` — line 114)
- Subscriber notification

This is the most tightly coupled file in the codebase. It imports 20+ symbols from `@timelinx/core` and orchestrates them in a single mutable class with 15+ private fields. Any change to the core engine's internal APIs ripples into this class.

**Specific violation:** Line 284, 295, 310, 324, 339, 351 — six `catch` blocks silently swallow all errors from tool invocations with only a comment `/* tool error — don't crash engine */`. This means a broken tool can silently corrupt state without any logging, telemetry, or user feedback.

### 1c. Branded Types Are Bypassed in Production Code

**File:** `packages/core/src/engine/apply.ts:69-72`

```typescript
trackId: (targetTrackId ?? foundClip.trackId) as typeof foundClip.trackId,
timelineEnd: (foundClip.timelineEnd + delta) as typeof foundClip.timelineEnd,
```

The `as typeof` cast erases the branded type distinction. While the runtime value might be correct, this defeats the entire purpose of branded types (Principle 5 in CODEBASE.md). The `apply.ts` file has **5 instances** of `as unknown as string` casts (lines 295, 303, 304, and in `otio-import.ts:233`) — each one is a potential type-safety escape hatch.

### 1d. AssetRegistry Is a Mutable Map at Runtime

**File:** `packages/core/src/types/state.ts:18`

```typescript
export type AssetRegistry = ReadonlyMap<AssetId, Asset>;
```

While the type is `ReadonlyMap`, the actual runtime object is `new Map(...)` which is fully mutable. Every operation in `apply.ts` creates a new Map (lines 203, 209, 217, 310), but there is nothing preventing a consumer from mutating the Map directly. The immutability guarantee is a convention, not an enforcement. A `Map` with `Object.freeze()` would be closer to the intent, or a custom immutable map type.

### 1e. HistoryStack Has Internal State Mutation Through `pushWithCompression`

**File:** `packages/core/src/engine/history.ts:223-233`

```typescript
pushWithCompression(entry: HistoryEntry, transaction: Transaction): void {
  const now = this.clock();
  if (this.compressor.shouldCompress(transaction, now)) {
    if (this.entries.length > 0) {
      this.entries[this.entries.length - 1] = entry;  // MUTATES ARRAY IN-PLACE
      return;
    }
  }
  this.push(entry);
  this.compressor.record(transaction, now);
}
```

Line 227 mutates the `entries` array in-place via index assignment. This violates the immutable-state principle for anything that holds a reference to `this.entries`. The `HistoryStack` class is fundamentally stateful (which is fine for a history stack), but the mix of immutable snapshots and mutable internal state creates confusion about what "immutable" actually means in this codebase.

---

## 2. Over-Engineering & Accrued Complexity

### 2a. Dual History API — Pure Functions AND Class

**File:** `packages/core/src/engine/history.ts:1-179` (pure functions) and `190-340` (class)

The file defines both a pure-functional history API (`createHistory`, `pushHistory`, `undo`, `redo`) **and** a stateful `HistoryStack` class with compression, checkpoints, and persistence. The pure-functional API (lines 42-179) is **never used by the React engine** — only `HistoryStack` is used (see `engine.ts:120-127`). This is dead code that adds cognitive load without value.

### 2b. Provisional Manager Is Overly Abstracted

**File:** `packages/core/src/tools/provisional.ts`

The `ProvisionalManager` is a trivially simple data holder:

```typescript
export type ProvisionalManager = { readonly current: ProvisionalState | null; };
export function createProvisionalManager(): ProvisionalManager { return { current: null }; }
export function setProvisional(_manager: ProvisionalManager, state: ProvisionalState): ProvisionalManager {
  return { current: state };
}
export function clearProvisional(_manager: ProvisionalManager): ProvisionalManager {
  return { current: null };
}
```

These functions are stateless wrappers around `{ current: ProvisionalState | null }`. The indirection adds no safety, no validation, and no encapsulation. A simple `ProvisionalState | null` variable would suffice. The `resolveClip` function (lines 70-89) does add value, but could exist as a standalone utility.

### 2c. OperationPrimitive Union Has 42+ Variants — Exhaustiveness Is Unchecked

**File:** `packages/core/src/types/operations.ts:37-103`

The discriminated union has 42+ variants. This is inherently fragile because:

- `validators.ts:78` has a `default: return null` case — meaning any **unknown** operation type passes validation silently.
- `apply.ts:38` has no `default` case — meaning an unhandled variant returns `undefined` (typed as `TimelineState`).
- There is no compile-time check ensuring the union, the validator switch, and the apply switch are in sync.

### 2d. Query Functions Are Linear Scans Where Indexes Exist

**File:** `packages/core/src/systems/queries.ts:43-51`

`findClipById` does a linear scan of all tracks' clips. But the codebase also has `TrackIndex` (used by `PlaybackEngine`) and interval trees. The query functions don't use these indexes, creating two parallel lookup paths with different performance characteristics. For a timeline with thousands of clips, this matters.

---

## 3. Missing Invariants & Silent Failures

### 3a. **CRITICAL: `clip.trackId` Is Never Validated Against the Track It's On**

**File:** `packages/core/src/validation/invariants.ts:56-102` and `CODEBASE.md:1487`

CODEBASE.md states: *"Every `clip.trackId` matches the track it's on."*

The invariant checker iterates `state.timeline.tracks`, then iterates each `track.clips`. It checks the clip's `assetId` against the registry, but **never verifies that `clip.trackId === track.id`**. A clip could have `trackId: 'ghost-track'` but physically live on `track-1`, and the invariant checker would not flag it. The test at `global.test.ts:220-244` explicitly documents this gap:

```typescript
// The clip's trackId field ('ghost-track') doesn't match the track it's on.
// The invariant checker checks track.clips, so the clip IS found on track-1
// even though its trackId says ghost-track. This is a data integrity issue
// but the current checker doesn't flag it.
```

This means `MOVE_CLIP` with a cross-track operation could leave a clip's `trackId` pointing to a non-existent track after the move, and no invariant would catch it.

### 3b. **CRITICAL: `timelineStart < timelineEnd` Is NOT Explicitly Checked**

**File:** `packages/core/src/validation/invariants.ts:108-195` and `CODEBASE.md:1484`

CODEBASE.md states: *"`timelineStart < timelineEnd` and `mediaIn < mediaOut` for every clip."*

The invariant checker checks:
- `mediaIn < 0` (line 138)
- `mediaOut > asset.intrinsicDuration` (line 147)
- Duration mismatch (line 161)
- Speed > 0 (line 183)

But it does **not** explicitly check `timelineStart < timelineEnd` or `mediaIn < mediaOut`. The duration mismatch check (line 158-169) will catch some cases indirectly (because if `timelineEnd <= timelineStart`, the `expectedMediaDuration` would be negative), but a clip with `timelineStart=100, timelineEnd=100` (zero-duration clip) would produce `expectedMediaDuration=0` and `mediaDuration=0`, passing the check with `Math.abs(0 - 0) > 0.5 === false`.

### 3c. **Frame Values Are Not Validated as Integers**

**File:** `packages/core/src/validation/invariants.ts` and `CODEBASE.md:1485`

CODEBASE.md states: *"All frame values are integers, non-negative."*

The invariant checker never calls `Number.isInteger()` on any frame value. A clip with `timelineStart: 10.5` would pass all invariant checks. The branded type `TimelineFrame` is nominal — it's just `number & { __brand: 'TimelineFrame' }` — so fractional values pass the type system. This is a silent data corruption vector, especially when serializing/deserializing (floating-point drift).

### 3d. **Duplicate IDs Are Not Checked by the Invariant Checker**

**File:** `packages/core/src/validation/invariants.ts` and `CODEBASE.md:1494`

CODEBASE.md states: *"All IDs are unique (clips, tracks, markers, assets)."*

The invariant checker has **no code** to verify ID uniqueness. The test file `global.test.ts:249-277` tests uniqueness by constructing unique Sets from arrays — but this only tests the current state, not whether the engine prevents duplicate IDs from being introduced. If `REGISTER_ASSET` is called twice with the same ID, the second call overwrites the first in the Map, which is silently accepted.

### 3e. **Track Opacity Is Not Validated in the Invariant Checker**

**File:** `packages/core/src/validation/invariants.ts` and `CODEBASE.md:1501`

CODEBASE.md states: *"Opacity values in 0-1 range"*

The validator at `validators.ts:726` checks `SET_TRACK_OPACITY` range, but the invariant checker never validates that `track.opacity` is in `[0, 1]` after every transaction. If a track's opacity is manually set to `-5` or `999` through state corruption, the invariant checker would not catch it.

### 3f. **Silent Error Swallowing in React Engine**

**File:** `packages/react/src/engine.ts:284, 295, 310, 324, 339, 351`

Six `catch` blocks silently swallow all errors from tool invocations:

```typescript
try {
  getActiveTool(this.toolRegistry).onPointerDown(event, ctx);
} catch { /* tool error — don't crash engine */ }
```

A tool that throws an exception (e.g., due to a null pointer, network error, or logic bug) will be silently ignored. The user sees nothing. The console gets nothing. The state may be partially mutated (provisional state could be left in an inconsistent state). This is the most dangerous silent failure mode in the codebase.

### 3g. **`coreDispatch` Catch in React Engine Masks Core Bugs**

**File:** `packages/react/src/engine.ts:199-203`

```typescript
try {
  result = coreDispatch(this.currentState, transaction);
} catch {
  return { accepted: false, reason: 'INVARIANT_VIOLATED', message: 'coreDispatch threw' };
}
```

If `coreDispatch` throws (e.g., due to a runtime error in `apply.ts`), the error is caught and a generic `INVARIANT_VIOLATED` rejection is returned. The actual error is lost. This makes it nearly impossible to debug production issues because the root cause is discarded.

---

## 4. Test Suite Shallowness

### 4a. Tests Are Heavily Implementation-Detail Focused

The test suite is large (850+ tests) but primarily tests **implementation details** rather than **behavioral outcomes**:

- `selection.test.ts` asserts that `tool.getSelection().has(CLIP_A_ID)` is `true` (line 164) — testing internal tool state rather than the behavioral contract ("the clip should be selected for subsequent operations").
- `dispatcher.test.ts` tests that `result.nextState.timeline.name` equals `'My Edit'` (line 93) — testing internal state shape rather than the dispatch contract.
- The tool tests (`ripple-trim.test.ts`, `roll-trim.test.ts`, etc.) assert specific internal provisional states rather than testing that the tool produces correct Transactions.

### 4b. Fuzz Tests Only Cover Single-Track, Single-Asset Scenarios

**File:** `packages/core/src/__tests__/fuzz/random-sequences.test.ts`

All fuzz tests use a single-track, single-asset initial state (`makeInitialState()` at line 33). They never test:
- Multi-track operations (cross-track moves, insert on locked track)
- Mixed track types (video + audio)
- Operations that span multiple assets
- Transactions with multiple operations (all fuzz tests use single-op transactions)

### 4c. No Integration Tests for History + Dispatch Round-Trip

There are tests for `HistoryStack` in isolation and tests for `dispatch` in isolation, but no tests that verify:
- Undo after a compound transaction (e.g., SLICE_CLIP = DELETE + INSERT×2)
- Redo state matches the originally dispatched state
- History compression doesn't lose state
- History serialization round-trip preserves all operations

### 4d. No Tests for Concurrent State Access or Worker Boundaries

The codebase claims to be "Worker-safe" (Principle 7), but there are zero tests for:
- `TimelineState` serialization across worker boundaries
- `postMessage` with `structuredClone` of state
- Worker-initiated dispatch operations
- Race conditions between main thread and worker state

### 4e. The Invariant Audit Tests Are Redundant With the Global Tests

`phase7-invariants-audit.test.ts` (375 lines) and `invariants/global.test.ts` (760 lines) test the same invariant categories with nearly identical patterns. The audit file is essentially a checklist-style re-run of the global tests with slightly different setup. This creates a false sense of coverage depth.

### 4f. No Negative Tests for `as any` / `as unknown` Escape Hatches

The codebase has 20 instances of `as any` or `as unknown` in production code (not tests). None of these are tested to verify they don't introduce runtime errors. For example, `apply.ts:295` casts `op.generator.id as unknown as string` — but no test verifies what happens when `generator.id` is not actually string-compatible.

---

## Prioritized Top 3 High-Severity Architectural Risks

### Risk 1: **Missing `clip.trackId` Validation — Silent Data Corruption** (SEVERITY: CRITICAL)

The invariant checker never verifies `clip.trackId === track.id` for clips in `track.clips`. This means:
- Cross-track MOVE operations could leave orphaned `trackId` references
- Serialization/deserialization could produce state where clips claim to be on tracks they're not
- Any consumer that reads `clip.trackId` (which is the correct way to find a clip's track) gets wrong data

**Fix:** Add `clip.trackId !== track.id` check to `checkTrack()` in `invariants.ts:56-102`.

### Risk 2: **Silent Error Swallowing in React Engine — Impossible to Debug** (SEVERITY: HIGH)

Six `catch` blocks in `engine.ts` (lines 284, 295, 310, 324, 339, 351) and the `coreDispatch` catch (line 201) silently discard all exceptions. In production, a tool bug or core engine crash becomes invisible. The user sees the UI freeze or behave unpredictably with no diagnostic information.

**Fix:** At minimum, log errors to console in development mode. Ideally, add an `onError` callback to `TimelineEngineOptions` so consumers can wire up telemetry.

### Risk 3: **No Exhaustiveness Check on OperationPrimitive — Silent Fall-Through** (SEVERITY: HIGH)

When a new `OperationPrimitive` variant is added:
- `validators.ts:78` silently passes it (`default: return null`)
- `apply.ts:38` silently returns `undefined` (typed as `TimelineState`)
- `invariants.ts` doesn't check it

This means adding a new operation type requires synchronized edits to 4 files with zero compile-time feedback if any file is missed. A single missed file produces silent runtime corruption.

**Fix:** Add `default: { const _exhaustive: never = op; throw new Error('unreachable'); }` to both `validators.ts` and `apply.ts` switch statements. This ensures the compiler catches unhandled variants at build time.
