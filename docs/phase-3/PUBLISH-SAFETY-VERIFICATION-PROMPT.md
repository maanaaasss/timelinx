You're verifying a specific safety finding before PR #1 merges: a root-level `npm pack --dry-run` produced a 330-file, 7.1MB tarball named `timelinx@1.0.0` containing all 6 packages' source, tests, internal reports, and docs — meaning the repo root is currently publishable by accident. You're confirming the fix and getting real per-package evidence, not summarizing.

## Step 1 — Check and fix the root package.json

1. Show the current contents of the root `package.json`.
2. Confirm whether `"private": true` is present. If not, add it.
3. After adding it, run `npm publish --dry-run` from the repo root and confirm it now refuses/errors out because the package is private. Paste the actual command output.
4. Also run `npm pack --dry-run` from root again — report whether it still produces a tarball (some npm versions still allow `pack` on private packages even though `publish` refuses) and paste the actual output either way. If `pack` still succeeds on a private package, note that explicitly — it means `private: true` protects against accidental `publish` but not accidental `pack`, which is worth knowing.

## Step 2 — Check `private` field on all 4 packages that should be private

For each of `packages/ai`, `packages/collab`, `packages/media-web`, `packages/ui`:
1. Show the current `"private"` field value in each `package.json` (or confirm it's absent).
2. If absent or `false`, set it to `true`.
3. Run `npm publish --dry-run` inside each of these 4 package directories and confirm each one refuses due to being private. Paste actual output for all 4.

## Step 3 — Get real per-package tarball evidence for core and react

For `packages/core`:
1. `cd packages/core && npm pack --dry-run`
2. Paste the complete, actual, unedited output — full file list, package size, unpacked size, total file count. Do not summarize or truncate.

For `packages/react`:
1. `cd packages/react && npm pack --dry-run`
2. Same — complete actual output.

For both, explicitly check: does the file list include ONLY `dist/`, `package.json`, `README.md`, `LICENSE` (and similar top-level metadata) — or does it include `src/`, tests, config files, or anything else? State plainly, per package, yes or no, with the file list as evidence.

## Step 4 — Confirm `files` field is actually what's causing the clean result

For `core` and `react`, show the actual `files` field from `package.json` (or `.npmignore` if used instead) so it's clear *why* the tarball is clean — not just that it is.

## Step 5 — One more real check: does root `private: true` break anything?

Run the full CI-equivalent locally after the `private: true` change (`pnpm install`, `pnpm build`, `pnpm test`) to confirm marking the root private didn't break the pnpm workspace tooling (it shouldn't — this is standard for pnpm monorepos — but confirm rather than assume). Paste a summary of pass/fail, not full logs, for this step only.

## Process rule (unchanged from every prior round)
Paste real, actual command output for every claim. No "confirmed clean" or "verified" without the literal output backing it. If something fails or looks wrong, report it exactly as it is — don't smooth it into a pass.

## Output

Produce a single file: `docs/phase-3/PUBLISH-SAFETY-VERIFICATION.md`, structured as:

1. Root package.json — before/after, dry-run publish/pack results (Step 1)
2. Private packages audit — table of all 4 packages, before/after `private` value, dry-run publish result (Step 2)
3. Core tarball — full real `npm pack --dry-run` output (Step 3)
4. React tarball — full real `npm pack --dry-run` output (Step 3)
5. `files` field evidence for core and react (Step 4)
6. Post-change sanity check — pnpm install/build/test result (Step 5)
7. One-line final verdict: is it now actually safe to run `npm publish` only from inside `packages/core` and `packages/react`, with everything else structurally prevented from being accidentally published? Say yes only if every step above actually supports it.

Do not run the real `npm publish` in this session — dry-runs only.
