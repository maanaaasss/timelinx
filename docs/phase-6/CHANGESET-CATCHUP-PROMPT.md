Several real fixes have landed in `packages/core` and `packages/react` across the editor milestones with zero changesets recorded — meaning there's no changelog trail for any of it, and `1.0.0-beta.1`/`1.0.0-beta.3` on npm are meaningfully behind the actual repo. Reconstruct and add changesets now, before this gets any harder to piece together.

## Step 1 — Reconstruct what actually changed, from git history

Go through the commit history on `main` since the last real publish (`1.0.0-beta.1` for core, `1.0.0-beta.3` for react) and identify every commit that touched `packages/core/src` or `packages/react/src` (not test files, not docs, not the editor app) in a way that changes public behavior. Build a list. Likely candidates based on what's been reported along the way:

- Selection tool: edge-drag now defaults to ripple trim (behavior change)
- KeyframeTool: auto-creates a default effect on effect-less clips
- `createClip()`: now applies a default transform instead of omitting it
- Various invariant/validator hardening from the reactivity and caption work
- `INSERT_GENERATOR` fix: `apply.ts` now passes `name` through correctly
- New public API exports: caption types/functions, generator types/functions
- Dispatch rejection logging (if it touched core, not just the editor)
- Any other public-surface change found in the actual history — don't rely only on this list, verify against real commits

## Step 2 — Write a changeset for each logical change

Use `pnpm changeset` for each one (or group closely related changes into one changeset where it makes sense) — pick the right bump type per change:
- Bug fixes → patch
- New exports/new capabilities (generator exports, caption exports) → minor (or patch if you judge it purely additive and non-breaking — use judgment, but lean toward minor for new public API surface)
- The ripple-trim-by-default behavior change is arguably the most significant — this changes existing behavior for any consumer already using `SelectionTool`'s edge-drag. Flag this one specifically as a candidate for a clear changelog entry explaining the change, even if it stays a minor/patch version bump.

Write real, clear changeset descriptions — these become the public changelog. Don't write vague summaries like "various fixes"; describe what changed and why, as if a real user of the package will read it.

## Step 3 — Do NOT trigger an actual publish yet

Stop after the changesets are committed and pushed via a normal PR. Do not merge in a way that lets the release workflow actually publish — the project owner should review the accumulated changeset list and decide when the actual release happens, especially given the ripple-trim behavior change deserves a deliberate look before it goes out to real consumers.

## Output
Update `docs/phase-5/EDITOR-MILESTONE-2-REPORT.md` (or a new `docs/phase-5/CHANGESET-CATCHUP.md`) listing every changeset added, what it covers, and the proposed version bump for `core` and `react`. Report the PR number and CI status per the standing Definition of Done.
