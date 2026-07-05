You're getting `@timelinx/react@1.0.0-beta.2` ready to publish from a clean state. The fix (workspace:* dependency + version bump) is committed and pushed to `chore/pre-publish-docs-metadata` (commit `e85b89a`). Do not run `pnpm publish` or `npm publish` in this session — get everything to the point where it's ready, verify it, and stop there. The actual publish command will be run manually afterward.

## Step 1 — Check PR and CI status

1. Use `gh pr list` and `gh pr view` (or check manually if `gh` isn't available) to find the PR associated with the `chore/pre-publish-docs-metadata` branch. Report its number and current state (open/merged, mergeable or conflicting).
2. Check the CI run status for the latest commit (`e85b89a`) on that branch — `gh pr checks <number>` or `gh run list --branch chore/pre-publish-docs-metadata`. Report the actual status: passing, failing, or still running. If still running, wait and poll until it completes, then report the final result.
3. If CI is failing, investigate why and report what's broken — do not merge a failing PR. Fix it if it's something in scope of this task (e.g., related to the version bump); flag it for a decision if it's unrelated.

## Step 2 — Merge once green

1. Once CI passes, merge the PR into `main` (via `gh pr merge <number> --squash` or whatever merge strategy matches how prior PRs in this repo were merged — check git log for the pattern, e.g. look at how PR #1 was merged if it already has been).
2. Confirm the merge succeeded and `main` now contains commit `e85b89a`'s changes.

## Step 3 — Get local `main` clean and up to date

1. `git checkout main && git pull`
2. `git status` — confirm a genuinely clean working tree (this is what `pnpm publish` will check).
3. `cd packages/react` and rebuild from this clean state: `pnpm build` (or root-level `pnpm build` if that's the established pattern). Paste actual output.

## Step 4 — Final pre-publish verification (no actual publish)

1. `npm pack --dry-run` inside `packages/react` — paste full output, confirm version shows `1.0.0-beta.2` and file list is still just `dist/`, `package.json`, `LICENSE`, `README.md`.
2. Confirm `git status` is still clean (the build step shouldn't have dirtied it, but verify — if `dist/` is gitignored this should be fine, just confirm).
3. Report explicitly: is the working tree clean right now, such that `pnpm publish --tag beta` would proceed without the `ERR_PNPM_GIT_UNCLEAN` error hit last time?

## Output

Report plainly:
- PR number, merge status, CI result
- Confirmation `main` is up to date locally with a clean working tree
- The exact command to run next (should just be `cd packages/react && pnpm publish --tag beta`, run manually)
- Anything that blocked progress and needs a decision before publishing

Do not run the publish command yourself — stop after verification and hand back control.
