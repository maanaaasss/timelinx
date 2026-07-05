Three decisions have been made; implement them, plus two verification follow-ups on findings from the last session.

## 1. Switch to independent versioning
Remove the `linked` array from `.changeset/config.json` entirely. Each of the 6 packages will version independently based on its own changesets going forward.

## 2. Scope the first release to `core` + `react` only
- Set `"private": true` in `package.json` for `media-web`, `ai`, `collab`, and `ui`.
- Remove them from anything in the changesets/release config that would attempt to publish them (private packages should be skipped automatically by `changeset publish`, but confirm this explicitly — run a dry-run publish and verify only `core` and `react` are included in the output).
- Note in the repo (README or a short `docs/package-status.md`) that `media-web`, `ai`, `collab`, and `ui` exist in the monorepo but aren't yet published — this avoids anyone wondering why the folders exist but the packages aren't on npm.

## 3. Re-verify the Phase 1 exhaustiveness check post-typefix
The `AssetId`/`Asset`/`Timeline` missing-import fix in `packages/core/src/types/state.ts` may have changed what TypeScript was actually able to check during Phase 1's verified exhaustiveness test. Re-run that exact check now:
1. Add a dummy operation variant to `OperationPrimitive` as before.
2. Run `tsc` and confirm it still fails at both exhaustiveness sites (`validators.ts`, `apply.ts`) with real errors, not silently passing due to `any` leakage.
3. Revert the dummy variant.
4. Separately, do a quick sanity grep: search `packages/core/src` for other places that might reference `AssetId`, `Asset`, or `Timeline` types without importing them (the same class of bug), since the state.ts instance suggests it could exist elsewhere too. Report anything found.

## 4. Investigate the 4 failing React tests — determine bug vs. test artifact
Before treating these as "test accuracy issues" and moving on:
1. Identify the specific hooks involved in the 4 failing tests.
2. Grep the codebase (`packages/react`, and any consumers in `packages/ui` or `apps/`) for where these hooks' return values are used in a dependency array (`useEffect`, `useMemo`, `useCallback`) or passed to a `React.memo`-wrapped component.
3. If found: this is a real memoization bug — the hook should be using stable references (e.g., wrapping the return in `useMemo` with correct deps), fix it properly rather than adjusting the test.
4. If not found anywhere in current usage: it's safe to say this is a test-only concern. Update the assertions from `toBe` to `toStrictEqual` (matching what the hook actually guarantees) and note in the test file why reference equality isn't the real contract.
5. Report which case it was, with evidence (the grep results), not just a conclusion.

## Process rules (unchanged from prior rounds)
Run everything in this list for real and report actual output. If step 3 or 4 turns up something unexpected, report it plainly rather than smoothing it into the existing narrative.

## Output
Update `docs/phase-2/PHASE-2-CI-CD-PIPELINE.md`: switch section 6 to reflect independent versioning, update section 9 to show the 4 packages as private/unpublished with rationale, and add the results of items 3 and 4 as a new section.
