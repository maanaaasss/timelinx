You need to get all the Phase 1/2 work actually onto GitHub and confirm CI runs, so the job name is selectable in branch protection settings. This also resolves an earlier-flagged issue: the repo's default branch is currently `redesign/modern-browser-native`, not `main`.

## Step 1 — Check current state

1. Run `git status` and `git branch -a` to see what's committed, what's uncommitted, and what branches exist locally and on the remote.
2. Run `git log --oneline -10` on the current branch to see recent history.
3. Report this plainly before doing anything else — I need to know what we're actually starting from (e.g., is all the Phase 1/2 work committed already, or still sitting uncommitted?).

## Step 2 — Get everything committed

If there's uncommitted work (there likely is — all the Tier 0-3 fixes, CI workflows, changesets config, eslint configs, etc.), commit it in logically grouped commits rather than one giant blob if practical (e.g., "Phase 1: bug fixes and invariant hardening", "Phase 1: test coverage improvements", "Phase 2: CI/CD and release infrastructure"). If splitting cleanly isn't practical given how the work happened, one clear commit is fine — don't force artificial separation.

## Step 3 — Establish `main` as the real trunk

1. Determine whether a `main` branch already exists (locally or on remote) and what it contains.
2. If `main` doesn't exist or is stale/empty: create/update it from the current branch (`redesign/modern-browser-native` or wherever this work lives) so `main` reflects the actual current, validated state of the project.
3. Push `main` to the remote.
4. On GitHub, set `main` as the default branch (Settings → General → Default branch). If you have GitHub CLI (`gh`) available, you can do this directly: `gh repo edit --default-branch main`. Otherwise, tell me the exact manual step and I'll do it.
5. Confirm the old default branch (`redesign/modern-browser-native`) — don't delete it yet, just leave it as-is. We can clean up stale branches later; not now.

## Step 4 — Trigger CI and report the real job name(s)

1. Push to `main` (or open a small PR into `main` — either works to trigger the workflow, but pushing directly is fine here since branch protection isn't active yet).
2. Wait for/check the GitHub Actions run (via `gh run list` and `gh run view` if `gh` is available, or tell me to check the Actions tab manually).
3. Report the actual job name(s) as they appear in the Actions UI — this is literally just the `jobs.<job_id>.name` (or the `<job_id>` itself if no `name` is set) from `ci.yml`. Don't guess from reading the YAML; confirm it's what actually shows up after a real run, since that's what the branch protection UI will list.
4. If the workflow fails on this first real run (differences between local and CI environment are common — e.g. lockfile drift, Node version, missing env vars), fix whatever's broken and re-run until it's green. Report what broke and what you changed, if anything.

## Step 5 — Report back

Give me:
- Confirmation `main` is now the default branch on GitHub
- The exact job name(s) to select in the branch protection "require status checks" list
- Link to the successful Actions run
- Anything that broke and how it was fixed

## Process rule (unchanged from prior rounds)
Everything above should be based on commands you actually ran against the real repo/remote, not assumed. If `gh` CLI isn't available and something needs to be done manually on GitHub's website, say so explicitly and give me the exact steps rather than guessing at the outcome.
