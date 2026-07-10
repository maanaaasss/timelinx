---
"@timelinx/core": patch
---

`dispatch()` now returns a **frozen** `TimelineState`:
- The returned state, timeline, tracks, and clips are all `Object.freeze()`-d — attempting to mutate them throws in strict mode, catching accidental in-place modifications
- The `assetRegistry` Map is wrapped in a read-only proxy that throws on `.set()`, `.delete()`, `.clear()` calls
- Shared references between successive states are preserved (no deep clone), so React hook memoization (`Object.is` comparison) continues to work correctly

This is a **behavior change**: code that previously mutated dispatch results will now throw. All mutations should go through `dispatch()` + operations.
