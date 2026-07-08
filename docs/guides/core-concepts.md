# Core Concepts

This guide explains the architectural foundations of `@timelinx/core`. Every code snippet is taken directly from the test suite and verified against the current source.

## Table of Contents

1. [The Dispatch Model](#1-the-dispatch-model)
2. [Transactions and Atomicity](#2-transactions-and-atomicity)
3. [The Invariant System](#3-the-invariant-system)
4. [Undo/Redo via HistoryStack](#4-undoredo-via-historystack)
5. [Tools](#5-tools)

---

## 1. The Dispatch Model

All state mutation in Timelinx flows through a single function: `dispatch()`. There is no other way to modify `TimelineState`. This is the most important architectural rule in the engine.

**Source:** `packages/core/src/engine/dispatcher.ts`

### The Four-Step Algorithm

When you call `dispatch(state, transaction)`, the engine executes four steps:

1. **Validate and apply (interleaved):** For each operation in the transaction, validate it against the current rolling state, then immediately apply it. If any operation fails validation, return immediately — zero operations are committed.
2. **Invariant check:** Run `checkInvariants()` on the full proposed state. If any invariant is violated, reject.
3. **Freeze:** Wrap the `assetRegistry` in a read-only `Proxy` (throws on `.set()`/`.delete()`/`.clear()`), then `Object.freeze()` the entire state tree.
4. **Commit:** Bump `timeline.version` by 1 and return `{ accepted: true, nextState }`.

The key detail is that validation and application are **interleaved**, not separate phases. Each operation sees the state as modified by the previous operation. This is critical for compound transactions:

```ts
// From packages/core/src/__tests__/dispatcher.test.ts
it('multi-primitive transaction applies all ops atomically', () => {
  const state = makeState();
  const tx = makeTx('Multi-op', [
    { type: 'RENAME_TIMELINE', name: 'Step 1' },
    { type: 'SET_TIMELINE_DURATION', duration: toFrame(6000) },
  ]);
  const result = dispatch(state, tx);
  expect(result.accepted).toBe(true);
  if (!result.accepted) return;
  expect(result.nextState.timeline.name).toBe('Step 1');
  expect(result.nextState.timeline.duration).toBe(6000);
});
```

### All-or-Nothing

If a single operation in a multi-op transaction fails, the entire transaction is rejected and state is unchanged:

```ts
// From packages/core/src/__tests__/dispatcher.test.ts
it('all-or-nothing: one bad primitive in a 3-op transaction rejects all', () => {
  const state = makeState();
  const tx = makeTx('Partial fail', [
    { type: 'RENAME_TIMELINE', name: 'Good Op 1' },
    { type: 'DELETE_CLIP', clipId: toClipId('no-such-clip') },
    { type: 'SET_TIMELINE_DURATION', duration: toFrame(9000) },
  ]);
  const result = dispatch(state, tx);
  expect(result.accepted).toBe(false);
  if (result.accepted) return;
  expect(result.reason).toBe('ASSET_MISSING');
  // State must be completely unchanged
  expect(state.timeline.name).toBe('Dispatch Test');
  expect(state.timeline.duration).toBe(3000);
});
```

### Rolling Validation

Validation runs against the state **as it currently stands** during the loop, not against the original state. This matters for transactions like `[DELETE_CLIP, INSERT_CLIP]` where the insert must see the post-delete state:

```ts
// From packages/core/src/engine/dispatcher.ts (lines 38-49)
let proposedState = state;
for (const op of transaction.operations) {
  const rejection = validateOperation(proposedState, op);
  if (rejection) {
    return { accepted: false, reason: rejection.reason, message: rejection.message };
  }
  proposedState = applyOperation(proposedState, op);
}
```

### Immutability Guarantees

After dispatch, the returned `nextState` is deeply frozen. The `assetRegistry` Map is wrapped in a `Proxy` that throws `TypeError` on any mutation attempt — this covers both compile-time `ReadonlyMap` protection and runtime enforcement against `as any` casts:

```ts
// From packages/core/src/engine/dispatcher.ts (lines 75-88)
const frozenRegistry = new Proxy(
  proposedState.assetRegistry as Map<unknown, unknown>,
  {
    get(target, prop, receiver) {
      if (prop === 'set' || prop === 'delete' || prop === 'clear') {
        throw new TypeError(
          `Cannot modify frozen AssetRegistry: ${(prop as string).toUpperCase()} is disabled`,
        );
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  },
) as typeof proposedState.assetRegistry;
```

Structural sharing is preserved intentionally — `Object.is` checks on selector results don't trigger unnecessary React re-renders.

---

## 2. Transactions and Atomicity

Transactions batch multiple operations into a single history entry. They are the mechanism behind advanced edits (ripple, roll, razor split) that involve multiple state changes that should undo as a single step.

**Source:** `packages/core/src/engine/transactions.ts`

### Transaction Lifecycle

```ts
// From packages/core/src/__tests__/clip-ops-asset-registry-transactions.test.ts
it('creates transaction context', () => {
  const tx = beginTransaction(baseState);
  expect(tx.initialState).toBe(baseState);
  expect(tx.currentState).toBe(baseState);
  expect(tx.operations).toHaveLength(0);
  expect(tx.finalized).toBe(false);
});

it('applies operation to state', () => {
  let tx = beginTransaction(baseState);
  tx = applyOperation(tx, s => removeClip(s, 'a'));
  expect(tx.operations).toHaveLength(1);
  expect(tx.currentState.timeline.tracks[0]!.clips).toHaveLength(0);
});

it('returns final state', () => {
  let tx = beginTransaction(baseState);
  tx = applyOperation(tx, s => removeClip(s, 'a'));
  const result = commitTransaction(tx);
  expect(result.timeline.tracks[0]!.clips).toHaveLength(0);
});

it('returns initial state (rollback)', () => {
  let tx = beginTransaction(baseState);
  tx = applyOperation(tx, s => removeClip(s, 'a'));
  const result = rollbackTransaction(tx);
  expect(result).toBe(baseState);
});
```

### Key Properties

- **Ephemeral:** Transactions are not stored in timeline state — they exist only during the batching process.
- **Immediate application, deferred validation:** Operations apply to `currentState` immediately (so later ops depend on earlier ones), but validation happens at the `dispatch` layer.
- **Caller responsibility:** `commitTransaction` returns the final state, but the caller must validate it and push it to history.
- **Finalized guard:** Once committed or rolled back, the context is marked `finalized: true` and further operations throw.

---

## 3. The Invariant System

`checkInvariants()` is the final safety net that runs after every proposed state change inside the dispatcher. It returns an array of `InvariantViolation` objects — an empty array means the state is valid.

**Source:** `packages/core/src/validation/invariants.ts` (635 lines)

### What It Checks

The invariant checker enforces **24 distinct violation types** across these categories:

| Category | Violation Types | What It Catches |
|----------|----------------|-----------------|
| **Schema** | `SCHEMA_VERSION_MISMATCH` | State from a future engine version |
| **Identity** | `DUPLICATE_ID` | Duplicate clip, track, marker, or asset IDs |
| **Overlap** | `OVERLAP` | Two clips sharing any frame on the same track |
| **Asset** | `ASSET_MISSING` | Clip references non-existent asset |
| **Track type** | `TRACK_TYPE_MISMATCH` | Audio clip on video track (or vice versa) |
| **Media bounds** | `MEDIA_BOUNDS_INVALID`, `DURATION_MISMATCH` | mediaIn/mediaOut out of range, duration mismatch |
| **Timeline bounds** | `CLIP_BEYOND_TIMELINE` | Clip extends past timeline duration |
| **Sort order** | `TRACK_NOT_SORTED` | Clips not ascending by timelineStart |
| **Speed** | `SPEED_INVALID` | Speed <= 0 |
| **Frame integrity** | `INVALID_RANGE` | Non-finite, non-integer, or negative frame values; zero-duration clips |
| **Track properties** | `INVALID_OPACITY` | Opacity outside [0, 1] |
| **Markers** | `MARKER_OUT_OF_BOUNDS` | Marker frame outside timeline bounds |
| **In/Out points** | `IN_OUT_INVALID` | inPoint >= outPoint or outside timeline |
| **Beat grid** | `BEAT_GRID_INVALID` | BPM <= 0, invalid time signature |
| **Captions** | `CAPTION_OUT_OF_BOUNDS`, `CAPTION_OVERLAP` | Caption exceeds timeline, overlapping captions |
| **Effects** | `EFFECT_NOT_FOUND`, `EFFECT_INDEX_OUT_OF_RANGE`, `INVALID_RENDER_STAGE`, `KEYFRAME_NOT_FOUND`, `KEYFRAME_ORDER_VIOLATION` | Invalid effect/keyframe state |
| **Transitions** | `INVALID_RANGE` (via transition checks) | durationFrames <= 0, invalid alignment |
| **Groups** | `LINK_GROUP_NOT_FOUND`, `TRACK_GROUP_NOT_FOUND` | Broken group references |

### What It Does NOT Check

The invariant system is a **state validator**, not a business logic enforcer. It does not check:

- Whether a clip's content makes sense (e.g., is the video actually usable)
- Whether operations are semantically correct (that's the caller's responsibility)
- Whether the timeline is "ready for export" (no quality checks)
- Cross-package constraints (e.g., media-web adapter compatibility)

### Usage in Tests

Every test that mutates state should run `checkInvariants()` afterward:

```ts
// From packages/core/src/__tests__/history.test.ts
it('multiple undo/redo cycles maintain invariant compliance', () => {
  let state = makeStateWithClip();
  let h = createHistory(state);

  for (let i = 1; i <= 5; i++) {
    const s = apply(getCurrentState(h), [
      { type: 'RENAME_TIMELINE', name: `State ${i}` },
      { type: 'MOVE_CLIP', clipId: toClipId('clip-1'), newTimelineStart: toFrame(i * 10) },
    ]);
    h = pushHistory(h, s);
  }

  // Undo all the way back — invariants still hold at every step
  for (let i = 4; i >= 0; i--) {
    h = undo(h);
    expect(checkInvariants(getCurrentState(h))).toEqual([]);
  }
});
```

### Violation Detection Examples

```ts
// From packages/core/src/__tests__/invariants.test.ts
it('detects two clips that overlap by one frame', () => {
  const state = makeBaseState();
  const clip2 = createClip({
    id: 'clip-2', assetId: 'asset-1', trackId: 'track-1',
    timelineStart: toFrame(50), timelineEnd: toFrame(150),
    mediaIn: toFrame(50), mediaOut: toFrame(150),
  });
  // ... add clip2 to same track as clip1 ...
  const violations = checkInvariants(badState);
  expect(violations.some(v => v.type === 'OVERLAP')).toBe(true);
});

it('flags a clip referencing an asset that is not in the registry', () => {
  // ... create clip with assetId 'non-existent-asset' ...
  const violations = checkInvariants(badState);
  expect(violations.some(v => v.type === 'ASSET_MISSING' && v.entityId === 'clip-ghost')).toBe(true);
});
```

---

## 4. Undo/Redo via HistoryStack

Timelinx provides two undo/redo APIs: a pure-function API (deprecated, kept for backward compatibility) and the `HistoryStack` class with compression, checkpoints, and persistence.

**Source:** `packages/core/src/engine/history.ts`

### Pure Function API (Deprecated)

```ts
// From packages/core/src/__tests__/history.test.ts
it('creates history with no past or future', () => {
  const h = createHistory(makeState('S0'));
  expect(canUndo(h)).toBe(false);
  expect(canRedo(h)).toBe(false);
  expect(getCurrentState(h).timeline.name).toBe('S0');
});

it('clears future when a new state is pushed', () => {
  let h = createHistory(makeState('S0'));
  h = pushHistory(h, makeState('S1'));
  h = undo(h);                      // future = [S1]
  h = pushHistory(h, makeState('S2')); // future should clear
  expect(canRedo(h)).toBe(false);
  expect(getCurrentState(h).timeline.name).toBe('S2');
});

it('respects the history limit', () => {
  let h = createHistory(makeState('S0'), 3);
  h = pushHistory(h, makeState('S1'));
  h = pushHistory(h, makeState('S2'));
  h = pushHistory(h, makeState('S3'));
  h = pushHistory(h, makeState('S4')); // oldest (S0) should be dropped
  h = undo(h); // -> S3
  h = undo(h); // -> S2
  h = undo(h); // -> S1
  expect(getCurrentState(h).timeline.name).toBe('S1');
  expect(canUndo(h)).toBe(false); // S0 was evicted
});
```

### HistoryStack Class

The current API uses a single `entries[]` array with an `undoIndex` pointer (more memory-efficient than separate past/future arrays). It supports:

- **Compression:** `pushWithCompression()` can coalesce rapid successive edits into a single undo step via `TransactionCompressor`.
- **Checkpoints:** Named snapshots at specific undo indices that can be saved and restored.
- **Serialization:** Versioned JSON format for persistence (`serialize()` / `static deserialize()`).

### Round-Trip Guarantees

Every undo/redo cycle is validated against the invariant system:

```ts
// From packages/core/src/__tests__/history.test.ts
it('undo after a compound transaction restores original state', () => {
  let state = makeStateWithClip();
  let h = createHistory(state);

  const newState = apply(state, [
    { type: 'RENAME_TIMELINE', name: 'Renamed' },
    { type: 'MOVE_CLIP', clipId: toClipId('clip-1'), newTimelineStart: toFrame(100) },
  ]);
  h = pushHistory(h, newState);

  expect(getCurrentState(h).timeline.name).toBe('Renamed');
  expect(getCurrentState(h).timeline.tracks[0]!.clips[0]!.timelineStart).toBe(100);

  h = undo(h);
  expect(getCurrentState(h).timeline.name).toBe('Test');
  expect(getCurrentState(h).timeline.tracks[0]!.clips[0]!.timelineStart).toBe(0);
  expect(checkInvariants(getCurrentState(h))).toEqual([]);
});
```

---

## 5. Tools

A "tool" in Timelinx is an object implementing the `ITool` interface. Tools handle pointer and keyboard events and translate them into dispatch transactions. They are the bridge between user interaction and state mutation.

**Source:** `packages/core/src/tools/types.ts`, `packages/core/src/tools/registry.ts`

### The ITool Interface

Every tool implements:

```ts
interface ITool {
  readonly id: ToolId;
  readonly cursor: string;
  onPointerDown(event: TimelinePointerEvent, modifiers: Modifiers, context: ToolContext): void;
  onPointerMove(event: TimelinePointerEvent, modifiers: Modifiers, context: ToolContext): void;
  onPointerUp(event: TimelinePointerEvent, modifiers: Modifiers, context: ToolContext): void;
  onPointerLeave?(event: TimelinePointerEvent, modifiers: Modifiers, context: ToolContext): void;
  onKeyDown?(event: TimelineKeyEvent, modifiers: Modifiers, context: ToolContext): boolean;
  onKeyUp?(event: TimelineKeyEvent, modifiers: Modifiers, context: ToolContext): boolean;
}
```

### Tool Categories

The 12 built-in tools fall into three categories:

**Selection & Navigation:**
- `SelectionTool` — click to select, rubber-band for multi-select
- `HandTool` — pan the timeline view
- `ZoomTool` — click/scroll to zoom

**Editing:**
- `RazorTool` — split clips at click point
- `RippleTrimTool` — trim a clip edge, rippling subsequent clips
- `RollTrimTool` — trim the cut point between two adjacent clips
- `SlipTool` — slide clip content without moving the clip
- `SlideTool` — move a clip between its neighbors without overlapping
- `RippleDeleteTool` — delete a clip and ripple-fill the gap
- `RippleInsertTool` — insert a clip at a point, rippling subsequent clips

**Effects & Transitions:**
- `TransitionTool` — add/adjust transitions between clips
- `KeyframeTool` — add/adjust keyframes on effects

### Tool Registry

Tools are registered in a `ToolRegistry` created via `createRegistry()`. Only one tool can be active at a time. The React `TimelineEngine` auto-registers all 12 tools; the core package requires manual registration.

### Provisional State

During drag operations (trim, slip, slide), tools set "provisional state" — a preview of what the clip will look like when the drag completes. This is separate from committed state and is cleared on `pointerUp`. The `useClip` hook in React checks provisional state first, so the UI updates live during drags.

For the full API reference of each tool, see the generated [API documentation](../api/).
