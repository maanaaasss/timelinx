# @timelinx/react Dependency Fix

## Bug

`@timelinx/react@1.0.0-beta.1` was published via plain `npm publish` with `"@timelinx/core": "workspace:*"` in its `dependencies`. This protocol string is meaningless outside a pnpm/yarn workspace — any real `npm install @timelinx/react` fails to resolve it.

## Step 1 — Fix and Bump

### Changes Made

**`packages/react/package.json`**:
- `version`: `1.0.0-beta.1` → `1.0.0-beta.2`
- `dependencies["@timelinx/core"]`: `workspace:*` → `^1.0.0-beta.1`

### Monorepo Workspace Protocol Audit

| Package | Published? | `workspace:` in dependencies | `workspace:` in devDependencies |
|---------|-----------|------------------------------|--------------------------------|
| `@timelinx/core` | Yes (public) | None | None |
| `@timelinx/react` | Yes (public) | **FIXED** (was `workspace:*`) | None |
| `@timelinx/ui` | No (private) | None | `workspace:*` (core, react) |
| `@timelinx/collab` | No (private) | `workspace:*` (core) | None |
| `@timelinx/ai` | No (private) | `workspace:*` (core) | None |
| `@timelinx/media-web` | No (private) | None | `workspace:*` (core) |

Only `@timelinx/react` had the bug — it's the only published package with `workspace:*` in `dependencies`. Private packages don't matter (they never get published).

## Step 2 — Build and Dry-Run Verification

### Build

```
$ pnpm build
CLI Building entry: src/index.ts
ESM dist/index.js 28.81 KB — Build success in 63ms
CJS dist/index.cjs 31.84 KB — Build success in 63ms
DTS dist/index.d.cts 12.58 KB, dist/index.d.ts 12.58 KB — Build success in 474ms
```

### npm pack --dry-run

```
📦 @timelinx/react@1.0.0-beta.2
Tarball Contents
1.1kB LICENSE
4.2kB README.md
32.6kB dist/index.cjs
12.9kB dist/index.d.cts
12.9kB dist/index.d.ts
29.5kB dist/index.js
2.0kB package.json
Tarball Details
filename: timelinx-react-1.0.0-beta.2.tgz
package size: 21.0 kB
unpacked size: 95.3 kB
total files: 7
```

### Extracted package.json Verification

Real `npm pack` → `tar -xzf` → `cat package/package.json` confirmed:

```json
"dependencies": {
  "@timelinx/core": "^1.0.0-beta.1"
}
```

**NOT** `workspace:*`. The tarball ships the real semver range.

## Step 3 — Changesets Automation Analysis

### What `updateInternalDependencies: "patch"` Controls

This setting in `.changeset/config.json` tells `changeset version` how to update version ranges for internal workspace dependencies when a package is bumped. With `"patch"`, when a dependency's version changes, the dependent package's range is updated to reference the new version with a `^` prefix.

### Critical Finding: `changeset version` Does NOT Rewrite `workspace:*`

Simulation results:

**Test 1**: Changeset for `@timelinx/react` only
- Before: `"@timelinx/core": "workspace:*"`
- After: `"@timelinx/core": "workspace:*"` (unchanged)

**Test 2**: Changeset for both `@timelinx/core` and `@timelinx/react`
- Before: `"@timelinx/core": "workspace:*"`
- After: `"@timelinx/core": "workspace:*"` (unchanged)

`changeset version` does **not** rewrite `workspace:*` to a real semver range. It only updates version ranges that are already real semver strings.

### Why This Isn't a Problem for the Automated Path

The rewrite happens at **publish time**, not version time:

- `pnpm publish` **automatically rewrites** `workspace:*` → the actual resolved version before publishing to the registry. This is built into pnpm's publish logic.
- `pnpm changeset publish` calls `pnpm publish` under the hood, so it inherits this rewriting behavior.
- `npm publish` does **not** understand `workspace:` protocol — it publishes the literal string, which is exactly what caused this bug.

**Conclusion**: The original bug was caused by using `npm publish` directly instead of `pnpm publish`. The automated changesets pipeline (`pnpm changeset publish`) is safe because pnpm handles the rewrite at publish time.

### Recommendation

The automated pipeline is safe. However, for defense-in-depth, consider replacing `workspace:*` with real semver ranges (`^1.0.0-beta.1`) in published packages' `dependencies` fields. This eliminates the dependency on pnpm's publish-time rewrite and makes the intent explicit in source control.

## Step 4 — Deprecation Command

After `1.0.0-beta.2` is actually published, deprecate the broken version:

```bash
npm deprecate @timelinx/react@1.0.0-beta.1 "Broken dependency reference (workspace:* leaked into published package.json) — use 1.0.0-beta.2 or later"
```

## Go/No-Go

**GO** — `packages/react` is ready for manual `npm publish --tag beta` for `1.0.0-beta.2`.

- The `workspace:*` dependency has been replaced with `^1.0.0-beta.1`
- Version bumped to `1.0.0-beta.2`
- Build succeeds
- `npm pack` tarball verified to contain the real semver range
- The changesets automation path (`pnpm changeset publish`) is safe — pnpm rewrites `workspace:*` at publish time, so this bug won't recur once the automated pipeline takes over
- The bug was specific to the manual `npm publish` shortcut taken for the very first release
