# Tier 0 Results — Data Corruption & Silent Failure Fixes

**Date:** 2026-07-04
**Status:** All items fixed and verified
**Test suite:** 1162 tests passing across 55 test files — zero regressions

---

## Summary

| # | Finding | Fix | Verified |
|---|---------|-----|----------|
| 1 | NaN propagation through MOVE_CLIP and SET_CLIP_SPEED | Added `Number.isNaN()` guards to 12 validators + invariant checks | ✓ |
| 2 | `checkInvariants` crashes on malformed state | Added null/malformed state guard at entry | ✓ |
| 3 | `clip.trackId === track.id` never checked | Already implemented in `checkClip` (pre-existing) | ✓ |
| 4 | No duplicate ID detection | Added asset duplicate detection in `checkInvariants` + `REGISTER_ASSET` validator rejects duplicates | ✓ |
| 5 | Frame values never checked for integer-ness | Already implemented in `checkClip` (pre-existing) | ✓ |
| 6 | Unknown operation types bypass validation | Added exhaustiveness checks to both `validators.ts` and `apply.ts` | ✓ |
| 7 | Selection tool: drag produces RESIZE_CLIP, multi-select moves one clip | Refactored edge-hitting to defer trim/drag decision to pointer-up | ✓ |

---

## Files Modified

### `packages/core/src/types/operations.ts`
- Added `DUPLICATE_ID` to `ViolationType` union
- Added `UNKNOWN_OPERATION` to `RejectionReason` union

### `packages/core/src/validation/validators.ts`
- Added `Number.isNaN()` guards to 12 validators: `validateSliceClip`, `validateSetInPoint`, `validateSetOutPoint`, `validateAddMarker`, `validateMoveMarker`, `validateAddBeatGrid`, `validateInsertGenerator`, `validateAddCaption`, `validateEditCaption`, `validateAddKeyframe`, `validateMoveKeyframe`, `validateSetTrackOpacity`
- Added duplicate asset ID check to `REGISTER_ASSET` validator (was `return null` — now rejects duplicate asset IDs)
- Added exhaustiveness check to default case: `const _exhaustive: never = op` turns missing switch arms into compile-time errors

### `packages/core/src/validation/invariants.ts`
- Added null/malformed state guard at top of `checkInvariants` — returns violation instead of crashing on null/undefined state
- Added `?? []` null guard to markers iteration in `checkMarkerBounds`
- Added `Number.isNaN()` guards to `checkMarkerBounds`, `checkInOutPoints`, `checkBeatGrid`
- Added asset duplicate ID detection using `Set`-based uniqueness check in `checkInvariants`

### `packages/core/src/engine/apply.ts`
- Added default exhaustiveness check: `const _exhaustive: never = op; throw new Error(...)` — missing switch arms now throw at runtime instead of returning `undefined` typed as `TimelineState`

### `packages/core/src/tools/selection.ts`
- Added `pendingTrimEdge` field to track edge proximity without entering trim mode
- `onPointerDown`: records edge proximity as `pendingTrimEdge` instead of immediately entering `trim-edge` mode — fixes both single-drag (RESIZE_CLIP → MOVE_CLIP) and multi-select drag (1 clip → all selected clips)
- `onPointerUp`: handles trim only when below drag threshold AND `pendingTrimEdge` is set; otherwise falls through to normal drag logic
- Updated `_resetDragState` and `onCancel` to reset `pendingTrimEdge`

---

## Key Design Decisions

1. **NaN guards use `Number.isNaN(x) ||` pattern** per the remediation plan — inline with each comparison rather than separate early-return checks. Existing `Number.isFinite` checks left intact (they're strictly stronger).

2. **Selection tool fix defers mode decision** — the root cause was `onPointerDown` entering `trim-edge` mode before knowing if the user intended to drag or trim. The fix records edge proximity and decides at `onPointerUp` based on drag distance.

3. **Exhaustiveness checks use `never` typing** — adding a new operation type to `OperationPrimitive` without handling it in both `validators.ts` and `apply.ts` now produces a compile-time error.

4. **Asset duplicate detection added to both validator and invariant checker** — validator rejects `REGISTER_ASSET` with duplicate ID; invariant checker catches duplicate assets in constructed/deserialized state.
