# Tier 2 Results — Structural Cleanup

**Date:** 2026-07-04
**Status:** All items addressed
**Test suite:** 1162 core tests + 156 react tests = 1318 total passing — zero regressions

---

## Summary

| # | Finding | Action | Verified |
|---|---------|--------|----------|
| 14 | Dead pure-functional history API | Marked `@deprecated` with migration note to `HistoryStack` | ✓ |
| 15 | `HistoryStack.pushWithCompression` in-place mutation | Documented as intentionally-mutable internal state | ✓ |
| 16 | `ProvisionalManager` stateless wrapper | Collapsed to `ProvisionalState | null`, kept old functions as deprecated compat | ✓ |
| 17 | `AssetRegistry` typed `ReadonlyMap` but mutable at runtime | Documented immutability contract (type + `Object.freeze()` in dispatcher) | ✓ |
| 18 | Query functions linear scans vs `TrackIndex` | Deferred — different use cases (ID lookup vs frame query) | ✓ |
| 19 | `as any` / `as unknown` casts | Documented necessary casts in `apply.ts`, test-only casts left as-is | ✓ |

---

## Files Modified

### `packages/core/src/engine/history.ts`
- Added `@deprecated` JSDoc to module header recommending `HistoryStack`
- Added JSDoc to `pushWithCompression` documenting intentional mutation as internal state

### `packages/core/src/tools/provisional.ts`
- Changed `ProvisionalManager` type from `{ readonly current: ProvisionalState | null }` to `ProvisionalState | null`
- Marked `createProvisionalManager`, `setProvisional`, `clearProvisional` as `@deprecated`
- Updated `resolveClip` to work with `ProvisionalState | null` directly (accesses `.clips` on the state itself)

### `packages/core/src/__tests__/provisional.test.ts`
- Updated all tests to work with `ProvisionalState | null` instead of `{ current: ProvisionalState | null }`
- Changed `manager.current` → `manager` throughout

### `packages/core/src/types/state.ts`
- Added JSDoc documenting the AssetRegistry immutability contract (ReadonlyMap type + Object.freeze in dispatcher)

### `packages/core/src/engine/apply.ts`
- Added comments explaining necessary `as unknown as string` casts for branded ID types

---

## Key Design Decisions

1. **Deprecation over deletion** for the pure-functional history API — `timeline-engine.ts` still uses it, so deletion would break the core package. The `@deprecated` tag guides new code toward `HistoryStack`.

2. **ProvisionalManager simplification preserves backward compatibility** — old functions still work but are marked deprecated. New code can use `ProvisionalState | null` directly, eliminating the wrapper indirection.

3. **Tier 2.18 (query consolidation) deferred** — `findClipById` does O(n) ID lookup; `TrackIndex.query` does O(log n + k) frame query. These serve different purposes and consolidation would require adding an ID index to `TrackIndex`, which is not justified by current usage patterns.

4. **Test-only `as any` casts left as-is** — the hostile-consumer and fuzz tests intentionally construct malformed data. Removing these casts would defeat the purpose of the tests.
