# Index Rebuild Scope Verification

**Date:** 2026-07-28
**Claim:** "After every accepted dispatch, the engine rebuilds interval trees for ALL tracks and regenerates ALL snap points, even if only a single clip on one track changed — O(n) waste that would become a bottleneck at scale."

## Verdict: **Correct — the claim is accurate.**

---

## Evidence

### 1. TrackIndex.build() — global, from scratch, every dispatch

`packages/core/src/engine/track-index.ts:22-39`

```typescript
build(state: TimelineState): void {
    const intervals: Array<{ start: number; end: number; data: ClipEntry }> = [];
    const tracks = state.timeline.tracks;
    for (let i = 0; i < tracks.length; i++) {      // ALL tracks
        const track = tracks[i]!;
        for (const clip of track.clips) {            // ALL clips
            const start = clip.timelineStart as number;
            const end = clip.timelineEnd as number;
            intervals.push({ start, end, data: { clip, track, trackIndex: i } });
        }
    }
    this.tree.build(intervals);                      // full rebuild
    this.built = true;
}
```

No scoping. No diffing. Iterates every clip on every track, rebuilds the entire interval tree.

### 2. buildSnapIndex() — global, from scratch

`packages/core/src/snap-index.ts:83-142`

```typescript
export function buildSnapIndex(state, playheadFrame, enabled = true): SnapIndex {
    const points: SnapPoint[] = [];
    for (const track of state.timeline.tracks) {     // ALL tracks
        for (const clip of track.clips) {             // ALL clips
            points.push({ frame: clip.timelineStart, type: 'ClipStart', ... });
            points.push({ frame: clip.timelineEnd,   type: 'ClipEnd',   ... });
        }
    }
    // + playhead, + beat grid
    points.sort((a, b) => a.frame - b.frame);        // full sort
    return { points, builtAt: Date.now(), enabled };
}
```

Same pattern: every clip on every track, no scoping.

### 3. The trigger path — two separate rebuilds per dispatch

**Path A: `TimelineEngine._rebuildAndNotify()`** (`packages/react/src/engine.ts:249-262`)

```typescript
private _rebuildAndNotify(state: TimelineState, change: StateChange): void {
    this.trackIndex.build(state);           // rebuild #1 (interval tree)
    this.snapManager.scheduleRebuild(state); // schedule snap rebuild #1
    this.playback?.updateState(state);       // triggers Path B
    ...
}
```

**Path B: `PlaybackEngine.updateState()`** (`packages/core/src/engine/playback-engine.ts:61-67`)

```typescript
updateState(state: TimelineState): void {
    this.state = state;
    this.trackIndex.build(state);           // rebuild #2 (interval tree)
    this.snapManager.scheduleRebuild(state); // schedule snap rebuild #2
    ...
}
```

`TimelineEngine` and `PlaybackEngine` each own separate `TrackIndex` and `SnapIndexManager` instances (not shared — confirmed at `packages/react/src/engine.ts:160-163`). So a single dispatch triggers **two full interval-tree rebuilds** and **two snap-index rebuilds** (the snap rebuilds are debounced separately via `queueMicrotask`, but they still both fire).

### 4. diffStates exists but is NOT used for scoping rebuilds

`diffStates()` (`packages/core/src/types/state-change.ts:33-81`) produces a `StateChange` with a `clipIds: Set<ClipId>` field identifying exactly which clips changed. This information is used **only** for React re-render optimization in hooks — it is never passed to `TrackIndex.build()` or `buildSnapIndex()` to scope the rebuild.

---

## Cost Estimate (20 tracks, 1000 clips)

| Operation | Complexity | Per-dispatch work (×2 instances) |
|---|---|---|
| `TrackIndex.build()` | O(n log n) — centered interval tree construction | 2 × (1000 log₂ 1000) ≈ 20,000 comparisons + memory alloc |
| `buildSnapIndex()` | O(n) collect + O(n log n) sort | 2 × (2000 points collected + 2000 log 2000 sort) ≈ 24,000 ops |
| `diffStates()` | O(t × c) per track pair | Already runs, result discarded for index scoping |

**Total per dispatch: ~44,000 operations + GC pressure from interval array allocation.**

### Is this a bottleneck?

**At the current project scale (basic tool, not competing with Resolve):** No. The benchmarks at `packages/core/src/__tests__/phase7-benchmark.test.ts` test 40 tracks / 200 clips and pass comfortably within thresholds:
- `buildSnapIndex() × 100 calls < 200ms` (line 148) — ~2ms per build
- `TrackIndex.build` + `resolveFrame() × 1000 < 80ms` (line 190)

At 1000 clips (5× the benchmark), expect ~10ms per dispatch for all rebuilds combined. Imperceptible to users.

**At scale (50+ tracks, 10,000+ clips):** This becomes meaningful. At 10k clips:
- Interval tree build: ~260k comparisons × 2 = ~520k ops
- Snap index: ~20k points, sort ~300k ops × 2
- Combined: ~1.1M ops + array allocation/GC
- Estimated: ~50-100ms per dispatch — starts eating into 16ms frame budget if dispatching during interaction (drag).

### What would a scoped rebuild look like?

The infrastructure already exists: `diffStates()` produces `clipIds` identifying exactly changed clips. A scoped rebuild could:
1. Identify which tracks contain changed clips
2. Rebuild only those tracks' interval subtrees (or use a mutable interval tree with insert/delete)
3. Regenerate snap points only for changed clips (add/remove from sorted array)

But this is premature optimization for the current scale. The double-rebuild across `TimelineEngine` + `PlaybackEngine` is a simpler and more impactful fix to address first if perf becomes a concern.

---

## Reviewer Credibility Note

The architecture review's claim is **factually correct** and demonstrates real code reading. This is one of several claims made; others include:
- Async pipeline gaps — unverified
- Plugin architecture absence — unverified
- Floating-point invariant brittleness — **confirmed outdated** (fixed and boundary-tested in an earlier phase)

The reviewer's accuracy on this claim suggests their other claims deserve serious investigation rather than dismissal.
