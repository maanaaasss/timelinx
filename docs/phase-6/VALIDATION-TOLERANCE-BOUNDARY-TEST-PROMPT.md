The `validation-tolerance` change relaxed duration-mismatch validation to ±0.5 frames, with no test proving the boundary is actually correct. Add one now, precisely.

## Context

This invariant survived Phase 1's adversarial chaos-engineering pass as a strict check. It was relaxed later, incidentally, in a large mixed commit with no dedicated rationale or test. The relaxation might be legitimate (fractional frame rates like 29.97fps produce real floating-point rounding drift when converting between seconds and frames), but that needs to be proven, not assumed.

## Task

1. Find the actual duration-mismatch check in `validators.ts`/`invariants.ts` and confirm the exact tolerance value and comparison logic currently in place (±0.5 frames — confirm this is precisely what's implemented, not approximately).
2. Add tests that lock in the exact intended boundary:
   - A case with a genuine sub-frame drift (e.g., ~0.4 frames off) that should be **tolerated** — representing legitimate floating-point rounding from fractional frame-rate conversion (use a realistic scenario, e.g., actual 29.97fps timecode math, not an arbitrary number).
   - A case just past the tolerance boundary (e.g., ~0.6 frames off, or 1 full frame off) that should still be **rejected** — representing a real duration mismatch that must not slip through as a false negative.
   - If practical, a case at exactly the boundary to confirm which side of ±0.5 it falls on (inclusive vs. exclusive matters here — confirm and test the actual implemented behavior).
3. Run these against the current code. If the relaxed tolerance passes both cases correctly (tolerates real rounding, rejects real mismatches), that's real evidence the change is sound — document that conclusion plainly.
4. If either case fails — e.g., the tolerance is either too loose (lets a real mismatch through) or too tight (rejects legitimate rounding) — fix the actual tolerance value/logic until both cases pass correctly, don't just adjust the test to match whatever the code currently does.

## Output

Add the tests to the appropriate existing test file (likely near the other `DURATION_MISMATCH` tests already in the suite). Update the `validation-tolerance` changeset (or add a note to `CHANGESET-CATCHUP.md`) stating plainly: the tolerance is now proven correct with boundary tests, or it was found to be wrong and corrected — whichever is actually true, with the real test results as evidence.
