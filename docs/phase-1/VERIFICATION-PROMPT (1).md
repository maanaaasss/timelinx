You are conducting an independent, adversarial re-verification of bug fixes claimed in a prior remediation round. You did NOT write these fixes and have no stake in them being correct. Your job is to try to prove the fixes are incomplete, wrong, or cosmetic — not to confirm they work.

You will be given:
- The codebase (current state, post-fix)
- ARCHITECTURE-REVIEW.md, CHAOS-ENGINEERING-REPORT.md, METRICS-VALIDATION.md (the original Phase 1 findings)
- TIER-0-RESULTS.md, TIER-1-RESULTS.md, TIER-2-RESULTS.md, TIER-3-RESULTS.md (the claimed fixes)

Do not trust the RESULTS files' claims. Treat every "✓ Verified" as an unverified assertion until you personally confirm it with a test you run yourself.

## Priority 1 — Resolve two direct contradictions

TIER-0-RESULTS.md claims items #3 and #5 were "already implemented (pre-existing)" — i.e., no fix was actually needed. This directly contradicts ARCHITECTURE-REVIEW.md, which cited these as the two highest-confidence findings in the entire audit, with specific file/line references and (for #3) an existing test that documents the gap.

For each of these two items:
1. Locate the exact code the RESULTS file claims already handles it.
2. Write a minimal, direct test that would fail if the gap described in the original architecture review still exists (e.g., construct a state where `clip.trackId !== track.id`, or a clip with `timelineStart: 10.5`, and call `checkInvariants` on it directly).
3. Run it. Report the actual result — do not infer from reading the code, execute it.
4. If the gap is genuinely closed, say so plainly and cite the exact line where. If it's not closed, or only partially closed (e.g., checked in one function but not another, checked for one operation type but not others), report that as an open Tier 0 finding.

## Priority 2 — Re-run the exact original adversarial suites, unmodified

Re-run against the current (post-fix) code:
- The 10x fuzz suite (5,000 runs/property) described in CHAOS-ENGINEERING-REPORT.md, including the widened arbitraries (NaN, Infinity, negative frames, non-integer frames, prototype-pollution strings, 100-op sequences, 10-track/50-clip states).
- The 60-test hostile-consumer pass described in the same report.

Report pass/fail per property/test exactly as the original report did. Do not summarize as "all passed" — show the table. If anything fails, that's a new or unresolved Tier 0 bug regardless of what the RESULTS files claim.

## Priority 3 — Verify specific fix mechanics, not just outcomes

1. **Exhaustiveness checks (item #6):** Confirm the `never`-typed default cases in `validators.ts` and `apply.ts` actually produce a compile error if a new operation variant is added without a handler. Test this directly: temporarily add a dummy variant to the `OperationPrimitive` union, run `tsc`, confirm it fails to compile, then revert. Don't just read the code and assume the pattern works.

2. **Object.freeze depth (item #10):** The results claim freezing is "one level deep" on state/timeline/tracks/clips/registry. Write a test that attempts to mutate a nested property two levels down (e.g., a clip's `effects` array, or a keyframe inside a clip) and confirm whether it succeeds or throws. Report exactly how deep the immutability guarantee actually goes, since "one level deep" is ambiguous when clips themselves are nested inside tracks inside timeline.

3. **Track opacity check (item #13):** The fix uses `(track as Record<string, unknown>).opacity` because `opacity` may not be a required field on the `Track` type. Check: does the actual `Track` type include `opacity`? If it's genuinely optional, does the invariant check correctly skip tracks without it, or could it misfire? Construct a track without an opacity field and one with an out-of-range opacity and verify both behave correctly.

4. **Selection tool fix (item #7):** Re-run the specific 3 previously-failing tests plus manually construct 2-3 new scenarios not in the original test file (e.g., drag threshold edge cases, rapid click-drag-release, multi-select with 3+ clips) to check the fix generalizes rather than just satisfying the exact original test assertions.

## Priority 4 — Metrics, re-measured

1. Re-run coverage on `packages/core` and report actual numbers, especially for `validators.ts` and `selection.ts` — the RESULTS files predict these improved but the coverage improvement was not actually re-measured ("should improve," "auto-resolved" in TIER-3-RESULTS.md item 28). Get the real number.
2. Confirm the 3 previously-surviving mutants in `dispatcher.ts` (items 14-16 from METRICS-VALIDATION.md) are now killed, given the new rejection-reason assertions added in Tier 3 item 27. Re-run Stryker on `dispatcher.ts` specifically.
3. Note that Stryker mutation testing on `invariants.ts` and `validators.ts` was explicitly deferred (Tier 3 item 26) — this remains an open gap, not resolved. Don't let it disappear from the record.

## Priority 5 — New surface area check

Tier 0-3 introduced new code: `onError` callbacks, `pendingTrimEdge` state in the selection tool, exhaustiveness checks, freeze logic. New code is new risk. Spend at least one fuzz/adversarial pass specifically targeting what changed, not just re-confirming old invariants:
- Can `onError` itself throw and crash the engine (i.e., is the callback invocation itself guarded)?
- Does `pendingTrimEdge` introduce any new stuck-state possibility (e.g., set but never cleared on some exit path)?
- Does freezing state cause any silent failure elsewhere in the codebase that assumes it can mutate (e.g., in `media-web`, `ai`, or `collab` packages that may hold references to core state)?

## Output format

Produce `docs/phase-1/VERIFICATION-REPORT.md` in the same style as the original three Phase 1 reports: executive summary with a clear pass/fail verdict, tables of results, reproduction code for anything that fails, and a final section explicitly stating whether Phase 1 exit criteria (from PHASE-1-REMEDIATION-PLAN.md) are now met — yes or no, with justification either way.

If you find the fixes hold up, say so clearly and specifically — don't manufacture problems for the sake of seeming rigorous. The goal is an accurate verdict, not a critical one.

## Non-negotiable process rules

- If any task above says to run something (a test, `tsc`, a coverage tool), you must actually execute it and report the real output. "This is a standard pattern and is sound" or "verified by code inspection" is not verification — it's an assumption wearing verification's clothes. If you did not run it, say explicitly "NOT RUN" rather than folding it into a pass/fail verdict.
- Before submitting your final report, re-read it once as a hostile editor looking for internal contradictions — e.g., a metric marked PASS in one section and described as failing in another. If you find one, resolve it with an actual number, don't leave both claims standing.
- If you discover a real gap or risk (e.g., a guarantee that's compile-time-only but not runtime-enforced), report it neutrally as a finding for the project owner to decide on. Do not independently downgrade it to "low risk in practice" — that judgment isn't yours to make.
