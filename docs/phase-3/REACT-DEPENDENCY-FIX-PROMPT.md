You're fixing a real published bug: `@timelinx/react@1.0.0-beta.1` was published (via plain `npm publish`, not `pnpm publish`/changesets) with `"@timelinx/core": "workspace:*"` still in its dependencies. That protocol string is meaningless outside a pnpm/yarn workspace — any real `npm install @timelinx/react` will fail to resolve it. This cannot be fixed in the already-published version (npm disallows overwriting published files); it requires a new patch version.

Do NOT run `npm publish` in this session — prepare everything up to and including a verified dry-run, then stop and report. The actual publish is a deliberate manual step done outside this session.

## Step 1 — Fix the dependency and bump the version

1. In `packages/react/package.json`, change `"@timelinx/core": "workspace:*"` to a real semver range matching the currently published core version: `"^1.0.0-beta.1"`.
2. Bump `packages/react/package.json`'s own `version` field to `1.0.0-beta.2`.
3. Confirm no other package in the monorepo has the same `workspace:*`-in-published-output problem — grep all `packages/*/package.json` dependency/peerDependency/devDependency fields for `workspace:` and cross-check against which packages are actually published (public) vs private. Private packages don't matter for this bug (they never get published), but report what you find regardless.

## Step 2 — Rebuild and verify with a dry run before anything is published

1. `pnpm build` (or scoped to `packages/react` if that's sufficient — confirm `core`'s dist doesn't also need rebuilding, it shouldn't since only react's package.json changed).
2. `cd packages/react && npm pack --dry-run` — paste the full actual output, and specifically confirm the packed `package.json` inside the tarball now shows `"@timelinx/core": "^1.0.0-beta.1"`, not `workspace:*`. (You can verify this by actually extracting the dry-run tarball's package.json content, not just trusting the file list — e.g. `npm pack` for real locally into a temp dir, `tar -xzf` it, and `cat package/package.json` to see the literal dependency string that would ship. Do this for real, don't infer it.)

## Step 3 — Verify the changesets-driven path won't repeat this bug

This is the more important long-term check: confirm that future releases via `pnpm changeset publish` (through the GitHub Actions release workflow) correctly rewrite `workspace:*` to a real version automatically, unlike the plain `npm publish` that caused this bug.

1. Check `.changeset/config.json`'s `updateInternalDependencies` setting (should already be `"patch"` per earlier setup) — explain what this setting actually controls and confirm it's related to this rewrite behavior.
2. Simulate it: create a throwaway changeset (`pnpm changeset` — pick a dummy patch bump for `@timelinx/react`), then run `pnpm changeset version` (NOT `publish` — `version` just applies the version bumps and dependency updates locally without touching the registry). Inspect the resulting `packages/react/package.json` after this command runs — does it correctly show a real semver range for `@timelinx/core` instead of `workspace:*`?
3. Report the actual before/after `package.json` dependency line from this simulation as proof, then revert the throwaway changeset/version bump (`git checkout` or equivalent) so it doesn't pollute the real release — don't leave this test changeset in the repo.
4. State plainly: does the automated changesets path handle this correctly on its own? If yes, this bug is specific to the manual `npm publish` shortcut taken for the very first release and won't recur once the automated pipeline takes over. If no, that's a more serious finding — the automation itself would ship the same bug, and needs its own fix.

## Step 4 — Deprecation message ready (for after real republish)

Draft the exact command (don't run it yet — this only makes sense after `1.0.0-beta.2` is actually published):
```
npm deprecate @timelinx/react@1.0.0-beta.1 "Broken dependency reference (workspace:* leaked into published package.json) — use 1.0.0-beta.2 or later"
```

## Process rule (unchanged)
Every claim needs real command output. "Should now resolve correctly" is not verification — actually extract and read the packed package.json as described in Step 2.

## Output
Produce `docs/phase-3/REACT-DEPENDENCY-FIX.md` covering all steps above, ending with a clear go/no-go: is `packages/react` ready for you to manually run `npm publish --tag beta` for `1.0.0-beta.2`, and is the changesets automation confirmed safe for future releases or does it need its own fix first.
