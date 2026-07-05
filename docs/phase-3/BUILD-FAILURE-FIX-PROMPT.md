The last verification pass found `pnpm build` failing in `packages/core` with: `Cannot write file 'dist/internal.d.ts' because it would overwrite input file`. This was labeled "pre-existing, unrelated" and set aside — that's not acceptable here, because the clean tarball evidence gathered in the same report was generated from whatever `dist/` already existed on disk, not from a successful fresh build. Fix this properly before anything gets published.

## Step 1 — Diagnose the actual cause

This error pattern (`declaration output would overwrite input file`) almost always means one of:
- `tsconfig.json` has `declaration`/`declarationMap` enabled and its `outDir` overlaps with `rootDir` or with where tsup is also trying to emit `.d.ts` files, so TypeScript's own emit collides with tsup's DTS generation step.
- A source file literally named `internal.d.ts` exists somewhere it shouldn't.

Find the actual root cause — look at `packages/core/tsconfig.json`, `packages/core/tsup.config.ts`, and confirm whether there's a genuine file collision or a config overlap. Report exactly what you find, don't guess.

## Step 2 — Fix it properly, not by disabling checks

Fix the actual configuration conflict (e.g., disable `declaration`/`declarationMap` in `tsconfig.json` if tsup is solely responsible for `.d.ts` generation, or adjust `outDir`/`rootDir` so they don't overlap). Do not fix this by deleting error output, ignoring the step, or wrapping the build script to swallow the error — the build must actually succeed.

## Step 3 — Prove it with a clean run

1. Delete `packages/core/dist` entirely first (`rm -rf packages/core/dist`) so there's no chance of stale output masking the problem.
2. Run `pnpm build` from a clean state and paste the complete actual output. Confirm all 6 packages build successfully, `core` included.
3. Confirm `dist/` was regenerated (check file timestamps or just confirm it exists post-deletion).

## Step 4 — Re-verify the tarball is still clean, from the freshly-built dist

Now that `dist/` is freshly and successfully built (not stale), re-run:
1. `cd packages/core && npm pack --dry-run` — paste full actual output.
2. `cd packages/react && npm pack --dry-run` — paste full actual output.

Confirm the file lists and sizes are consistent with what was reported before (or note and explain any differences — a fresh build might legitimately produce slightly different chunk hashes/sizes, that's fine, just confirm the *contents* are still just `dist/`, `package.json`, `README.md`, `LICENSE`).

## Step 5 — Re-run the full test suite against the fresh build

`pnpm test` — confirm the same pass counts as before (1451 core, 156 react, etc.) against the newly built code, not leftover artifacts.

## Step 6 — Check CI isn't hiding the same problem

Since GitHub Actions CI previously reported a successful "Build & Test" run, but a local build just failed — figure out why CI passed if this is genuinely broken. Possibilities: CI's environment differs (e.g., a clean checkout doesn't have the same locally-cached `dist/` state and behaves differently), or the failure is specific to something in the local dev environment (leftover files, node_modules state) rather than the repo itself. Determine which, and state clearly whether the failure is a real repo-level bug or a local-environment artifact — these have very different implications for whether CI can be trusted for the actual publish.

## Process rule (unchanged)
Real command output only. If Step 2's fix doesn't fully resolve it on the first attempt, say so and keep iterating — don't report success until `pnpm build` genuinely exits 0 from a clean `dist/` deletion.

## Output
Append a new section to `docs/phase-3/PUBLISH-SAFETY-VERIFICATION.md`: "Build Failure Root Cause & Fix", including the diagnosis, the fix applied, and the fresh clean-build evidence from Steps 3-6. Update the final verdict (§7) only if all of this actually checks out — otherwise state plainly what's still blocking.
