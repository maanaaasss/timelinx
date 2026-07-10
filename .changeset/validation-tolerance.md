---
"@timelinx/core": patch
---

Relax `validateClip` duration-mismatch check from exact equality (`timelineDuration !== mediaDuration`) to ±0.5 frame tolerance (`Math.abs(timelineDuration - mediaDuration) > 0.5`). Boundary is **inclusive**: exactly 0.5 is tolerated, > 0.5 is rejected.

**Why this is safe (now proven with boundary tests):**

The system normally produces integer frame values — `frame()`, `secondsToFrames()`, `rationalTimeToFrames()` all use `Math.round()`. For integer frames, the tolerance is functionally identical to strict equality: 0 is tolerated, ≥1 is rejected. No existing behavior changes.

The tolerance becomes relevant only when non-integer frame values enter via `toFrame()` (a plain cast, no rounding) — e.g., from fractional frame-rate conversions where floating-point arithmetic produces sub-frame drift. The tolerance correctly:
- **Tolerates** 0.4-frame drift (below threshold, legitimate rounding noise)
- **Rejects** 0.6-frame mismatch (above threshold, real duration corruption)
- **Tolerates** exactly 0.5 (inclusive boundary, confirmed by test)
- **Rejects** 0.5001 (exclusive cutoff, confirmed by test)

Boundary tests added to `src/__tests__/systems-validation.test.ts` (6 new cases).
