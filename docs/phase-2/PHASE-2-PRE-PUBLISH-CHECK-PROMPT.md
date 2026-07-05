Two items before `core`/`react` are actually ready to publish — both narrow.

## 1. Fix and explain the 3 remaining core test failures

1. `undo-redo.test.ts` — 2 tests failing on missing `vi` import. Add the import, confirm both pass. This should be mechanical; if it's not, say why.
2. `extreme-fuzz.test.ts` — 1 failing test currently described only as "pre-existing fuzz edge case." Not acceptable as a final explanation. Report:
   - The actual seed and counterexample fast-check printed on failure.
   - What input triggered it and what the actual vs. expected behavior was.
   - Whether this represents a genuine invariant gap (in which case it's a new Tier 0/1-class finding and should be triaged like one) or a flaky/environment-specific issue (in which case explain specifically why, e.g. a timing assumption, a platform-specific float behavior — not just asserted).
3. Re-run the full core suite after fixes and confirm 1451/1451 (or whatever the true total is) passing, no exceptions.

## 2. Reconcile the contradiction between §8.6 and §9

Once the above is resolved, make §9's "Ready to publish" verdict for `@timelinx/core` consistent with the actual, current test results — don't let a summary section assert something the detailed results above it don't support. Re-state the pass count in §9 to match reality.

## 3. Confirm the AssetRegistry runtime-enforcement change explicitly

Section 12.6 shows `AssetRegistry` is now wrapped in a throwing read-only Proxy — this is Option B, upgraded from the Option A (document-only) decision made in Phase 1 closeout. State plainly, in one line in the report: "This changes the previously documented Option A decision to Option B (runtime-enforced) — implemented during the dispatcher fix because [reason]." Don't let this read as if Option B was the plan all along. If there's a reason it had to change as part of the dispatcher fix (rather than being an independent choice), explain that reason.

## Process rule (unchanged)
Every claim must be backed by something actually run in this session. If §9's "ready to publish" can't be backed by a clean, currently-passing test run, don't write it.

## Output
Update `docs/phase-2/PHASE-2-CI-CD-PIPELINE.md` in place with the resolved test results and the explicit note on item 3.
