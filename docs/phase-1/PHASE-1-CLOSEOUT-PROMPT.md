You are closing out the final open items from Phase 1 validation of `@timelinx/core`. Three things remain, all narrow and bounded — do not re-run the full adversarial suite, just close these specific gaps with real, executed evidence.

Context: two prior verification passes flagged that some "verified" claims in earlier reports were based on code inspection rather than actually running anything, and one real finding (Map/freeze runtime mutation) got mentioned once and then silently dropped from a later report. Do not repeat either pattern here.

---

## Task 1 — Actually execute the exhaustiveness check

Two prior reports have asserted that the `const _exhaustive: never = op` pattern in `validators.ts` and `apply.ts` will cause a compile error if a new `OperationPrimitive` variant is added without a handler. This has been claimed as verified twice, by inspection only, and never actually run.

Do this now, for real:
1. Temporarily add a new dummy variant to the `OperationPrimitive` union (e.g. `{ type: 'TEST_DUMMY_OP_DO_NOT_MERGE' }`).
2. Run `tsc` (or the project's type-check script) and confirm it fails at both the `validators.ts` and `apply.ts` exhaustiveness sites — capture the actual compiler error output.
3. Revert the dummy variant.
4. Report the actual command run and actual error output. "The pattern is sound" is not an acceptable substitute for this.

## Task 2 — Close the Map/freeze immutability question with documentation

Finding (confirmed in a prior pass, then dropped from the next report without resolution): `Object.freeze()` on `AssetRegistry` does not prevent `.set()`, `.delete()`, or `.clear()` at runtime — those operate on Map internal slots, not object properties. The `ReadonlyMap` type prevents this at compile time only. This is not being treated as a bug to fix — it's being closed as a documented contract, per the project owner's decision (Option A: document, not Option B: wrap in a runtime-enforced immutable structure).

Do this:
1. Add explicit JSDoc on the `AssetRegistry` type and/or the `TimelineState.assetRegistry` field stating plainly: mutation protection is a compile-time (TypeScript) guarantee via `ReadonlyMap`, not a runtime-enforced one; consumers using `as any`/`as unknown` casts or plain JS can still call `.set()`/`.delete()`/`.clear()` at runtime.
2. Add the same caveat to wherever the project documents its immutability guarantees (README, architecture doc, or invariants doc — check CODEBASE.md's "Immutable state" principle and add a footnote there too).
3. Do not silently drop this into a report and move on — explicitly confirm in your output that this line now exists in both the code comment and the docs, quoting the exact wording you added.

## Task 3 — Close the branch coverage gap with real tests, not threshold changes

Current state (measured, not estimated):
- `validators.ts`: 74.18% branch coverage (threshold: 85%)
- `selection.ts`: 69.56% branch coverage (threshold: 85%)

Do this:
1. Run coverage with a per-branch/uncovered-line report for both files specifically (e.g. `vitest run --coverage` with the HTML or JSON reporter, or `--coverage.reporter=text` filtered to these files).
2. Identify the *specific* uncovered branches — not just the aggregate percentage. List each uncovered line/branch and what code path it represents.
3. Write targeted tests that exercise those exact paths. Do not pad coverage with redundant tests of already-covered branches.
4. Re-run coverage and confirm both files are now ≥85% branch coverage. Report the before/after numbers per file.
5. If any uncovered branch turns out to be genuinely dead/unreachable code rather than a missing test, say so explicitly and propose removing it — do not fake coverage of unreachable code just to hit the number.

---

## Non-negotiable process rules (same as prior rounds — still binding)

- Every claim of "verified," "confirmed," or "PASS" in your output must correspond to a command you actually ran, with the actual output shown or summarized accurately. If you did not run something, write "NOT RUN" — do not imply verification through description of the pattern.
- Before submitting, re-read your own report looking for any claim that isn't backed by an actual execution in this session. Cut or flag it.
- Do not make product/architecture decisions on the project owner's behalf (e.g., don't decide Map immutability should be runtime-enforced after all) — Task 2 has an explicit decision already made; implement it, don't relitigate it.

## Output

Produce `docs/phase-1/PHASE-1-CLOSEOUT.md` with three sections matching the three tasks above, each with the actual command run, actual output/evidence, and a clear done/not-done status. End with a one-line final statement: whether Phase 1 is now fully closed with zero open items, or what's left.
