# Tier 1 Results — High Severity Fixes

**Date:** 2026-07-04
**Status:** All items fixed and verified
**Test suite:** 1162 core tests + 156 react tests = 1318 total passing — zero regressions

---

## Summary

| # | Finding | Fix | Verified |
|---|---------|-----|----------|
| 8 | 6 silent `catch {}` blocks in engine.ts | Added `console.error` + optional `onError` callback to all 6 tool methods | ✓ |
| 9 | `coreDispatch` catch discards real error | Preserved original error message in rejection + calls `onError` | ✓ |
| 10 | Shallow immutability — no `Object.freeze()` | Added `Object.freeze()` to state, timeline, tracks, clips, and registry in dispatcher | ✓ |
| 11 | Negative `timelineEnd` not checked in invariant checker | Added explicit `timelineEnd < 0` check in `checkClip` | ✓ |
| 12 | Zero-duration clips slip through duration-mismatch check | Added explicit `timelineStart === timelineEnd` check with specific error message | ✓ |
| 13 | Track opacity not re-validated post-transaction | Added opacity `[0, 1]` check in `checkTrack` | ✓ |

---

## Files Modified

### `packages/react/src/types/engine-snapshot.ts`
- Added optional `onError?: (error: unknown, method: string) => void` callback to `TimelineEngineOptions`

### `packages/react/src/engine.ts`
- **`dispatch()`**: Changed `catch {}` to `catch (err)` — now preserves original error message and calls `onError`
- **`handlePointerDown()`**: Changed `catch {}` to `catch (err)` — calls `onError`
- **`handlePointerMove()`**: Changed `catch {}` to `catch (err)` — calls `onError`
- **`handlePointerUp()`**: Changed `catch {}` to `catch (err)` — calls `onError`
- **`handlePointerLeave()`**: Changed `catch {}` to `catch (err)` — calls `onError`
- **`handleKeyDown()`**: Changed `catch {}` to `catch (err)` — calls `onError`
- **`handleKeyUp()`**: Changed `catch {}` to `catch (err)` — calls `onError`

### `packages/core/src/engine/dispatcher.ts`
- Added `Object.freeze()` to `nextState`, `nextState.timeline`, each track, each clip, and `nextState.assetRegistry` after construction — prevents accidental mutation of committed state

### `packages/core/src/validation/invariants.ts`
- **`checkClip()`**: Added explicit `timelineEnd < 0` check (Tier 1.11)
- **`checkClip()`**: Added explicit `timelineStart === timelineEnd` zero-duration check with specific error message (Tier 1.12)
- **`checkClip()`**: Changed `timelineStart >= timelineEnd` to `timelineStart > timelineEnd` since zero-duration is now caught separately
- **`checkTrack()`**: Added track opacity `[0, 1]` validation (Tier 1.13)

---

## Key Design Decisions

1. **`onError` callback pattern** — tool errors are caught and forwarded to an optional callback rather than logged to console. This lets consumers decide how to handle tool failures (telemetry, UI notification, etc.) without polluting the console in production.

2. **Freeze is shallow (one level deep)** — `Object.freeze()` on state, timeline, tracks, clips, and registry. Deeper nested objects (effects, transitions, audio properties) are not frozen — this is a pragmatic compromise between safety and performance.

3. **Zero-duration clips get their own violation** — separated from the `timelineStart > timelineEnd` check to provide a more specific error message ("zero-duration clip" vs "start must be < end").

4. **Track opacity check uses cast** — `(track as Record<string, unknown>).opacity` because the `Track` type may not include `opacity` as a required field. This avoids breaking changes while still validating the value when present.
