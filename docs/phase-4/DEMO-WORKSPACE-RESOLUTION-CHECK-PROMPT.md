You're checking whether `apps/demo`'s registry-based dependency resolution (verified manually via a standalone `npm install` inside the folder) actually survives the real, normal setup workflow — a root-level `pnpm install`, which is what CONTRIBUTING.md documents and what CI runs. This matters because if `apps/demo` is covered by `pnpm-workspace.yaml`'s package globs, pnpm's workspace auto-linking could silently override the registry resolution the moment anyone (including CI) runs the standard install command.

## Step 1 — Check workspace membership

1. Show the contents of `pnpm-workspace.yaml`.
2. Determine whether `apps/demo` is currently matched by its package globs (e.g., an `apps/*` entry would include it).

## Step 2 — Test the real path, not the manual workaround

1. `rm -rf apps/demo/node_modules apps/demo/package-lock.json` (remove the artifacts from the manual npm install).
2. From the **repo root**: `rm -rf node_modules && pnpm install` (a full clean install, the way a new contributor or CI actually experiences it).
3. Check `apps/demo/node_modules/@timelinx/core` and `apps/demo/node_modules/@timelinx/react` — are they real installed packages, or symlinks pointing back into `packages/core`/`packages/react`? Use `ls -la` (symlinks show the `->` target plainly) and report exactly what you find, don't infer.

## Step 3 — Resolve based on what Step 2 shows

**If they're real registry packages (not symlinked):** good, the earlier finding holds even under the normal workflow. Clean up the leftover `.npmrc` line (`link-workspace-packages=false`) and confirm whether it's actually doing anything meaningful in this configuration or was cargo-culted from the manual-install approach — report which, and remove it if it's not needed.

**If they're symlinked back to the workspace packages:** this means the registry-resolution claim doesn't hold under real conditions. Fix it properly:
1. Exclude `apps/demo` from `pnpm-workspace.yaml`'s globs entirely (e.g., add a `!apps/demo` negation pattern, or restructure the glob so it's not swept in).
2. Decide and document one clear approach: either `apps/demo` is fully outside the pnpm workspace (installs its own dependencies independently, with its own lockfile, never touched by root `pnpm install`) — in which case document in `CONTRIBUTING.md` that setting up the demo requires a separate `cd apps/demo && npm install` step — or find the correct pnpm-native way to pin a workspace member to registry versions instead of local linking (check if pnpm supports this per-package, e.g. via `pnpm.overrides` or a scoped `.npmrc`, and use that instead if it's cleaner than fully excluding it).
3. Re-run the full clean-install test from Step 2 again after the fix and confirm the result actually changed — real registry packages this time, not symlinks.

## Step 4 — Fix the lockfile inconsistency either way

Regardless of which path Step 3 takes: `apps/demo` currently has a `package-lock.json` sitting inside a `pnpm-lock.yaml`-based monorepo. Resolve this cleanly:
- If `apps/demo` stays a pnpm workspace member: it shouldn't have its own lockfile at all — dependencies should be recorded in the root `pnpm-lock.yaml`.
- If `apps/demo` is excluded from the workspace: a separate `package-lock.json` (or `pnpm-lock.yaml` if you run `pnpm install` standalone inside it) is fine and expected — just make sure `CONTRIBUTING.md` and the root `.gitignore`/lockfile handling reflect this deliberately rather than accidentally.

## Step 5 — Confirm CI still works

Run `pnpm install --frozen-lockfile` from root (the exact command CI uses) after whatever fix was applied, and confirm it succeeds without complaining about `apps/demo`.

## Process rule (unchanged)
Real command output for every claim, especially the `ls -la` symlink check — that's the one piece of evidence that actually settles this question, don't paraphrase it.

## Output
Append a section to `docs/phase-4/DEMO-APP-REPORT.md`: "Workspace Resolution Verification (Root Install)" with the real findings, whatever they turn out to be, and the fix applied if one was needed.
