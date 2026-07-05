# Phase 1 Remediation Plan — Consolidated Findings

**Sources:** ARCHITECTURE-REVIEW.md, CHAOS-ENGINEERING-REPORT.md, METRICS-VALIDATION.md
**Compiled:** 2026-07-04
**Purpose:** Single prioritized punch list to hand to an implementation agent. Fix in tier order — don't jump to Tier 2/3 while Tier 0 items are open.

---

## Tier 0 — Data corruption & silent failure (fix before anything else touches this code)

These allow invalid state to exist undetected, which undermines every other guarantee in the system.

1. **NaN propagation through MOVE_CLIP and SET_CLIP_SPEED.**
   `NaN < x`, `NaN > x`, `NaN <= x` all evaluate to `false` in JS, so NaN silently passes every numeric guard.
   Fix: replace all frame/speed numeric checks in `validators.ts` and `invariants.ts` with `Number.isNaN(x) || x <op> y`.

2. **`checkInvariants` crashes instead of returning violations on malformed state.**
   It's the last line of defense — it must never throw. Add null/array guards in `checkCaptionBounds`, `checkMarkerBounds`, and any other unguarded iteration.

3. **`clip.trackId === track.id` is never checked.** (Flagged independently by both the architecture review and the hostile-consumer pass — highest-confidence finding in the whole audit.)
   Fix: add the check inside `checkTrack()` in `invariants.ts`.

4. **No duplicate ID detection** (clips, tracks, markers, assets).
   Fix: `Set`-based uniqueness check in `checkInvariants`; also fix `REGISTER_ASSET` silently overwriting on duplicate ID.

5. **Frame values are never checked for integer-ness.** `timelineStart: 10.5` passes everything.
   Fix: `Number.isInteger()` check on every frame field in `checkClip`.

6. **Unknown operation types bypass validation and crash `applyOperation`.**
   `validators.ts` has `default: return null`; `apply.ts` has no `default` at all, so it returns `undefined` typed as `TimelineState`.
   Fix: add exhaustiveness checks to **both** switches: `default: { const _exhaustive: never = op; throw new Error('unreachable'); }`. This turns "add a new op type and forget a file" into a compile-time error instead of runtime corruption.

7. **Selection tool regression: drag produces `RESIZE_CLIP` instead of `MOVE_CLIP`, and multi-select drag only moves one clip.**
   This is user-facing, everyday functionality — not an edge case. 3 failing tests in `selection.test.ts` (lines 326, 343, 356). Also the reason `selection.ts` shows 0% branch coverage — the tests exist but never reach their assertions.
   Fix first, then re-check coverage; don't trust `selection.ts` coverage numbers until these pass.

---

## Tier 1 — High severity, fix next

8. **Six silent `catch { /* tool error — don't crash engine */ }` blocks in `packages/react/src/engine.ts`** (lines 284, 295, 310, 324, 339, 351). A broken tool fails invisibly — no console log, no telemetry, possible inconsistent provisional state.
   Fix: at minimum `console.error` in dev; ideally an `onError` callback on `TimelineEngineOptions`.

9. **`coreDispatch` catch block discards the real error** and returns a generic `INVARIANT_VIOLATED`, making production debugging near-impossible.
   Fix: preserve/log the original error before returning the generic rejection.

10. **Shallow immutability — mutating the returned state corrupts the previous state too.** No `Object.freeze()` anywhere; nested tracks/clips/AssetRegistry are shared references.
    Fix: `Object.freeze()` (deep, or at least one level into tracks/clips/registry) on state returned from `dispatch()`, or explicitly document the mutation contract if freezing is too costly for perf. Don't leave it implicit.

11. **Negative `timelineStart`/`timelineEnd` not checked independently** in the invariant checker (only caught at the validator level for normal API use, not for constructed/deserialized state).

12. **Zero-duration clips (`timelineStart === timelineEnd`) can slip through** the duration-mismatch check because `0 - 0 = 0`.

13. **Track opacity not re-validated post-transaction** — only checked at the `SET_TRACK_OPACITY` validator, not in `checkInvariants`.

---

## Tier 2 — Structural cleanup (schedule, not urgent)

14. Remove the dead pure-functional history API (`createHistory`, `pushHistory`, `undo`, `redo`) in `history.ts` — never used; only `HistoryStack` is. Delete or clearly mark as deprecated/experimental.
15. `HistoryStack.pushWithCompression` mutates `this.entries` in place via index assignment — inconsistent with the rest of the immutability story. Either accept and document it as intentionally-mutable internal state, or fix it.
16. `ProvisionalManager` is a stateless wrapper adding indirection with no safety benefit — consider collapsing to a plain `ProvisionalState | null`.
17. `AssetRegistry` is typed `ReadonlyMap` but is a real mutable `Map` at runtime — the guarantee is a convention, not enforced. Consider a real immutable map wrapper if consumer mutation is a realistic risk.
18. Query functions (`findClipById`, etc.) do linear scans while `TrackIndex` and interval trees already exist elsewhere in the codebase — two parallel lookup paths with different perf characteristics. Consolidate.
19. 20 instances of `as any` / `as unknown` in production code, untested. Not asking you to eliminate all of them — audit each one, add a test for the failure mode, or remove the cast.

---

## Tier 3 — Test suite quality (do after Tier 0/1 land)

20. Rewrite implementation-detail tests as behavioral tests — e.g. `selection.test.ts` currently asserts internal tool state (`tool.getSelection().has(id)`) rather than the actual contract (clip is selected for subsequent operations).
21. Fuzz tests currently only cover single-track/single-asset/single-op scenarios. Widen to multi-track, mixed track types, multi-asset, and multi-op transactions.
22. Add integration tests for history + dispatch round-trip: undo after a compound transaction, redo matching original state, compression not losing state, serialization round-trip.
23. Add tests for the "worker-safe" claim: `structuredClone` across worker boundaries, worker-initiated dispatch, race conditions.
24. `phase7-invariants-audit.test.ts` and `invariants/global.test.ts` are near-duplicates — merge or clearly differentiate their purpose; redundant tests inflate the count without adding coverage depth.
25. Raise `vitest.config.ts` thresholds to match the actual audit bar (85% branch, 85% lines) instead of a lower CI floor.
26. Complete Stryker mutation runs on `invariants.ts` (379 mutants, timed out) and `validators.ts` using an in-process runner instead of the command runner.
27. Add assertions on rejection *reason strings* in `dispatcher.test.ts` to kill the 3 surviving mutants in the error-reporting path.
28. `validators.ts` branch coverage is 73.6% (below the 85% bar) — largely the unhandled `default` case from item #6 above; should resolve mostly on its own once that's fixed.

---

## Exit criteria — when is Phase 1 actually done?

Don't move to Phase 2 (CI/repo/publishing) until:

- [ ] All Tier 0 items fixed and verified
- [ ] All Tier 1 items fixed and verified
- [ ] Selection tool tests pass, and `selection.ts` shows real (non-zero) coverage
- [ ] The **exact same 10x fuzz suite and 60-test hostile-consumer suite** from this round are re-run against the fixed code, with **zero failures** — not new tests, the *same* adversarial tests that just found these bugs
- [ ] `checkInvariants` is verified to never throw under any malformed input (add a dedicated "never throws" property test if one doesn't exist)

Tier 2 and Tier 3 items can be ticketed and worked in parallel with Phase 2, they're not blockers to calling the engine "trustworthy."
