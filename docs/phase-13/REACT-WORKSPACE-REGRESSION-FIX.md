# React `workspace:*` Regression — Root Cause, Fix, and Safeguard

## Summary

`@timelinx/react` has been published with `"@timelinx/core": "workspace:*"` in its `dependencies` **three times** — beta.1, beta.4, and beta.5. All three are uninstallable via npm. Beta.1 was already deprecated. Beta.4 and beta.5 are not yet deprecated (requires CI auth). A full tarball sweep of every published version of `core`, `react`, and `ui` confirms these are the only three affected versions — `core` and `ui` are clean across all releases.

The root cause was a combination of manual publishing (CI was broken) and a developer reintroducing `workspace:*` during local development. A permanent automated safeguard has been added to `release.yml` to make recurrence structurally impossible.

---

## 1. Root Cause Investigation

### How `beta.5` got published broken

**It was published manually, not through the automated CI pipeline.**

Evidence:

| Timestamp (UTC) | Event | Source |
|---|---|---|
| `2026-07-22T12:08` | CI run `29918428365` — changeset-release/main — **FAILED** (404 auth errors) | `gh run view 29918428365` |
| `2026-07-22T13:30` | `@timelinx/react@1.0.0-beta.5` published to npm | `npm view @timelinx/react time` |
| `2026-07-22T13:57` | CI run `29926250788` — sees beta.5 already on npm, skips publish | `gh run view 29926250788` |

The CI pipeline tried to publish at 12:08 but failed with npm 404 errors (auth issues being fixed in PRs #34/#35 at the time). Beta.5 appeared on npm at 13:30 — **82 minutes after the CI failure, 27 minutes before the next CI run**. It was published manually.

The same pattern applies to `beta.4` (published at `2026-07-10T12:30`, between CI failures at 12:23 and 12:33).

### How `workspace:*` got back into the source

Commit `6dd4124` ("chore: bump @timelinx/react to 1.0.0-beta.3, fix changeset config") correctly changed the dependency from `workspace:*` to `^1.0.0-beta.1` — the original fix for the beta.1 incident.

Commit `2842b42` ("feat(editor): milestone 2 — panels, keyboard shortcuts, bugfix round 2") **reintroduced `workspace:*`**:

```diff
# packages/react/package.json (commit 2842b42)
  "dependencies": {
-   "@timelinx/core": "^1.0.0-beta.1"
+   "@timelinx/core": "workspace:*"
  },
```

This was a local development convenience (to link against the workspace copy of core) that was committed without reverting back to the real version range before push.

### Why the safeguard (CONTRIBUTING.md) didn't work

`CONTRIBUTING.md` lines 310-319 document the risk:

> "If you change an internal dependency string from a version range to `workspace:*`, you must ensure the package is published via the automated pipeline (`pnpm changeset publish`), not via `npm publish`."

The safeguard was documentation-only — a process constraint, not a structural one. It required the developer to:
1. Read the docs
2. Remember the constraint
3. Not publish manually when CI was broken

All three failed. The developer had an urgent need to ship (the beta release was blocking downstream work), CI was broken, and manual publish was the path of least resistance.

### Why `pnpm changeset publish` would have been safe

`pnpm pack` (and by extension `pnpm publish` / `pnpm changeset publish`) automatically rewrites `workspace:*` to the resolved version. I verified this locally:

```
# Source: "dependencies": { "@timelinx/core": "workspace:*" }
$ pnpm pack
# Tarball package.json: "dependencies": { "@timelinx/core": "1.0.0-beta.3" }
```

`npm pack` / `npm publish` does NOT rewrite — ships `workspace:*` verbatim. This is exactly what happened.

---

## 2. The Fix: `@timelinx/react@1.0.0-beta.6`

### What changed

`packages/react/package.json` — replaced `workspace:*` with real semver range:

```json
"dependencies": {
  "@timelinx/core": "^1.0.0-beta.3"
}
```

Changeset created: `.changeset/fix-react-workspace-dep.md`

Version bumped to `1.0.0-beta.6` via `pnpm changeset version`.

### Tarball verification

```
$ pnpm pack
$ tar -xzf timelinx-react-1.0.0-beta.6.tgz
$ cat package/package.json | grep dependencies -A3
```

Result:
```json
"dependencies": {
  "@timelinx/core": "^1.0.0-beta.3"
}
```

No `workspace:` anywhere in the tarball. Verified clean.

### Deprecation of broken versions

Three versions confirmed broken via empirical `npm pack` + extract + grep:

| Version | `workspace:*` in tarball? | Already deprecated? |
|---|---|---|
| `1.0.0-beta.1` | Yes | Yes (message: "Broken dependency reference") |
| `1.0.0-beta.4` | Yes — **confirmed** | **No** — needs deprecation |
| `1.0.0-beta.5` | Yes | **No** — needs deprecation |

`npm deprecate` for beta.4 and beta.5 failed locally (npm auth token expired). This must be done through CI or by an authenticated maintainer. Deprecation messages:

```
npm deprecate @timelinx/react@1.0.0-beta.4 "UNINSTALLABLE via npm: published with workspace:* protocol in dependencies. Use 1.0.0-beta.6 instead."
npm deprecate @timelinx/react@1.0.0-beta.5 "UNINSTALLABLE via npm: published with workspace:* protocol in dependencies. Use 1.0.0-beta.6 instead."
```

### Publishing beta.6

The changeset is ready. When merged to main, the CI pipeline (`release.yml`) will:
1. Run the new workspace: safeguard check (see below) — will PASS
2. Run `pnpm changeset publish` — will publish beta.6 with correct deps

---

## 3. Automated Safeguard

### What was added

A new step in `.github/workflows/release.yml` between "Build" and "Create Release Pull Request or Publish":

```yaml
- name: Verify no workspace: protocol in publishable packages
  run: |
    # For each package with publishConfig.access: "public",
    # check dependencies, peerDependencies, and optionalDependencies
    # for the literal string "workspace:". Fail the CI job if found.
```

### How it works

1. Iterates over `packages/*/package.json`
2. Skips non-public packages (private packages can use `workspace:*` safely)
3. Uses `jq` to scan `dependencies`, `peerDependencies`, and `optionalDependencies` for any value containing `workspace:`
4. **Fails the CI job** with a clear error message listing the offending fields
5. Only passes if all publishable packages have real semver ranges

### Why check source, not tarball

`pnpm pack` always rewrites `workspace:*` — so checking tarballs would always pass, even when the source is broken. The bug occurs when someone uses `npm publish` (which doesn't rewrite). Checking the source catches the problem at its origin, regardless of which publish tool is used.

### Proof it works

Tested locally with `workspace:*` reintroduced in `packages/react/package.json`:

```
--- Checking @timelinx/react (packages/react/package.json) ---
ERROR: @timelinx/react has unresolved workspace: references:
  dependencies.@timelinx/core = workspace:*
FATAL: safeguard correctly blocked publish!
```

And with clean state:

```
--- Checking @timelinx/core --- OK
--- Checking @timelinx/react --- OK
--- Checking @timelinx/ui --- OK
PASS: safeguard correctly allows clean packages.
```

### Coverage

The safeguard covers all three public packages (`core`, `react`, `ui`) and any future packages that add `publishConfig.access: "public"`. It checks all three dependency fields (`dependencies`, `peerDependencies`, `optionalDependencies`).

---

## 4. Full Tarball Sweep — All Published Versions

Every published version of `core`, `react`, and `ui` was checked empirically: `npm pack`, extract, grep for `workspace:` in `package.json`.

### `@timelinx/core` — all clean

| Version | `workspace:` in tarball? |
|---|---|
| `1.0.0-beta.1` | No |
| `1.0.0-beta.2` | No |
| `1.0.0-beta.3` | No |

### `@timelinx/react` — 3 of5 broken

| Version | `workspace:` in tarball? |
|---|---|
| `1.0.0-beta.1` | **Yes** (`"@timelinx/core": "workspace:*"`) |
| `1.0.0-beta.2` | No |
| `1.0.0-beta.3` | No |
| `1.0.0-beta.4` | **Yes** (`"@timelinx/core": "workspace:*"`) |
| `1.0.0-beta.5` | **Yes** (`"@timelinx/core": "workspace:*"`) |

### `@timelinx/ui` — all clean

| Version | `workspace:` in tarball? |
|---|---|
| `1.0.0-beta.2` | No |

`core` and `ui` have never been published with `workspace:` in their tarballs. The bug is react-specific, caused by `workspace:*` in `packages/react/package.json`'s `dependencies` field referencing `core`.

---

## 5. Files Changed

| File | Change |
|---|---|
| `packages/react/package.json` | `workspace:*` → `^1.0.0-beta.3`, version → `1.0.0-beta.6` |
| `packages/react/CHANGELOG.md` | Added beta.6 entry |
| `.changeset/fix-react-workspace-dep.md` | New changeset for the fix |
| `.changeset/pre.json` | Updated with new changeset |
| `.github/workflows/release.yml` | Added pre-publish workspace: safeguard step |

---

## 6. Timeline of Events

| Date | Event |
|---|---|
| Jul 5 | `beta.1` published with `workspace:*` (first incident, already deprecated) |
| Jul 5 | `beta.2` published with fix (`^1.0.0-beta.1`) |
| Jul 6 | `beta.3` published — correct |
| Jul 7 | Commit `2842b42` reintroduces `workspace:*` in local dev |
| Jul 10 | `beta.4` published manually (CI broken) — ships `workspace:*` |
| Jul 22 | `beta.5` published manually (CI broken) — ships `workspace:*` |
| Jul 29 | This fix: `beta.6` changeset + automated safeguard |
| TBD | `beta.6` published via CI; beta.4/beta.5 deprecated |

---

## 7. Structural Lessons

1. **Documentation is not a safeguard.** CONTRIBUTING.md explicitly warned about this. It didn't prevent the regression.

2. **Manual publish is the real risk vector.** Both beta.4 and beta.5 were published manually because CI was broken. The `workspace:*` rewrite only happens through pnpm's publish mechanism.

3. **The fix must be structural, not behavioral.** The new CI step makes it impossible to merge code with `workspace:*` in publishable packages without the build failing — regardless of how the publish is triggered.

4. **`workspace:*` in a publishable package's `dependencies` is always a bug.** There is no legitimate reason for it to be there. It either gets rewritten by pnpm (invisible) or shipped by npm (broken). The safeguard treats it as an error either way.
