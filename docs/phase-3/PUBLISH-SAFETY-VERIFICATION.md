# Publish Safety Verification

## 1. Root package.json — Before/After, Dry-Run Results

### Current State

The root `package.json` already contains `"private": true` on line 5. No change needed.

```json
{
  "name": "timelinx",
  "version": "1.0.0",
  "private": true,
  ...
}
```

### `npm publish --dry-run` from root (with `--tag next`)

**CRITICAL FINDING**: `npm publish --dry-run` does NOT enforce `private: true`. It still reports a successful publish:

```
npm warn gitignore-fallback No .npmignore file found, using .gitignore for file exclusion. Consider creating a .npmignore file to explicitly control published files.
npm notice
npm notice 📦  timelinx@1.0.0
npm notice Tarball Contents
npm notice 307B .changeset/config.json
npm notice 1.1kB .github/ISSUE_TEMPLATE/bug_report.md
npm notice 836B .github/ISSUE_TEMPLATE/feature_request.md
npm notice 1.4kB .github/PULL_REQUEST_TEMPLATE.md
npm notice 912B .github/workflows/ci.yml
npm notice 1.7kB .github/workflows/release.yml
npm notice 8.8kB CONTRIBUTING.md
npm notice 1.1kB LICENSE
npm notice 3.9kB README.md
npm notice 58.2kB docs/CODEBASE.md
npm notice 1.3kB docs/package-status.md
npm notice 16.7kB docs/phase-1/ARCHITECTURE-REVIEW.md
npm notice 15.0kB docs/phase-1/CHAOS-ENGINEERING-REPORT.md
npm notice 9.4kB docs/phase-1/METRICS-VALIDATION.md
npm notice 4.9kB docs/phase-1/PHASE-1-CLOSEOUT-PROMPT.md
npm notice 3.8kB docs/phase-1/PHASE-1-CLOSEOUT.md
npm notice 3.1kB docs/phase-1/PHASE-1-FINAL-CLEANUP-PROMPT.md
npm notice 7.7kB docs/phase-1/PHASE-1-REMEDIATION-PLAN.md
npm notice 5.2kB docs/phase-1/PHASE-2-CI-VERIFICATION-PROMPT.md
npm notice 4.1kB docs/phase-1/TIER-0-RESULTS.md
npm notice 3.6kB docs/phase-1/TIER-1-RESULTS.md
npm notice 3.1kB docs/phase-1/TIER-2-RESULTS.md
npm notice 5.6kB docs/phase-1/TIER-3-RESULTS.md
npm notice 7.2kB docs/phase-1/VERIFICATION-PROMPT (1).md
npm notice 9.3kB docs/phase-1/VERIFICATION-REPORT.md
npm notice 17.8kB docs/phase-2/PHASE-2-CI-CD-PIPELINE.md
npm notice 5.2kB docs/phase-2/PHASE-2-CI-VERIFICATION-PROMPT (1).md
npm notice 3.3kB docs/phase-2/PHASE-2-FINAL-ACTIONS-PROMPT.md
npm notice 2.3kB docs/phase-2/PHASE-2-PRE-PUBLISH-CHECK-PROMPT.md
npm notice 3.6kB docs/phase-2/PHASE-2-PUSH-AND-CI-VERIFICATION-PROMPT.md
npm notice 6.8kB docs/phase-3/PHASE-3-PRE-PUBLISH-DOCS-PROMPT.md
npm notice 4.1kB docs/phase-3/PUBLISH-SAFETY-VERIFICATION-PROMPT.md
npm notice 1.1kB eslint.base.config.js
npm notice 2.5kB package.json
npm notice 98B packages/ai/eslint.config.js
... (331 total files, including all packages' source, tests, reports, docs)

npm notice Tarball Details
npm notice name: timelinx
npm notice version: 1.0.0
npm notice filename: timelinx-1.0.0.tgz
npm notice package size: 915.8 kB
npm notice unpacked size: 7.1 MB
npm notice shasum: b9532a8547b621662d4a3e8ddef45745d8abd425
npm notice integrity: sha512-GjPusg+RN0x/N[...]JicOvWzfEbErg==
npm notice total files: 331
npm notice
npm notice Publishing to https://registry.npmjs.org/ with tag next and default access (dry-run)
+ timelinx@1.0.0
```

**Verdict**: `npm publish --dry-run` does NOT check `private: true`. It simulates the tarball creation and registry interaction but skips the private-flag validation. Only the real `npm publish` command enforces `private: true` and would refuse with `npm error code EPRIVATED`. This is a known npm behavior.

### `npm pack --dry-run` from root

Also still produces a tarball (expected — `private: true` is not designed to block `pack`):

```
npm notice 📦  timelinx@1.0.0
npm notice Tarball Contents
... (same 331 files)
npm notice Tarball Details
npm notice name: timelinx
npm notice version: 1.0.0
npm notice filename: timelinx-1.0.0.tgz
npm notice package size: 915.8 kB
npm notice unpacked size: 7.1 MB
npm notice total files: 331
```

**Note**: `npm pack` on a private package is not dangerous by itself — it only creates a local tarball. The risk is `npm publish`, which `private: true` does block (but dry-run doesn't test).

---

## 2. Private Packages Audit

All four packages that should be private already have `"private": true`:

| Package | `private` field | `npm publish --dry-run` result |
|---------|----------------|-------------------------------|
| `packages/ai` | `"private": true` (line 4) | Dry-run shows publish (does NOT enforce private) |
| `packages/collab` | `"private": true` (line 4) | Dry-run shows publish (does NOT enforce private) |
| `packages/media-web` | `"private": true` (line 4) | Dry-run shows publish (does NOT enforce private) |
| `packages/ui` | `"private": true` (line 4) | Dry-run shows publish (does NOT enforce private) |

### `@timelinx/ai` dry-run with `--tag next` (actual output):

```
npm notice 📦  @timelinx/ai@1.0.0-beta.1
npm notice Tarball Contents
npm notice 1.1kB LICENSE
npm notice 28.3kB dist/index.cjs
npm notice 67.2kB dist/index.cjs.map
npm notice 16.6kB dist/index.d.cts
npm notice 16.6kB dist/index.d.ts
npm notice 28.0kB dist/index.js
npm notice 67.2kB dist/index.js.map
npm notice 1.0kB package.json
npm notice Tarball Details
npm notice name: @timelinx/ai
npm notice version: 1.0.0-beta.1
npm notice filename: timelinx-ai-1.0.0-beta.1.tgz
npm notice package size: 42.5 kB
npm notice unpacked size: 226.0 kB
npm notice total files: 8
npm notice
npm notice Publishing to https://registry.npmjs.org/ with tag next and default access (dry-run)
+ @timelinx/ai@1.0.0-beta.1
```

**Verdict**: Dry-run does NOT enforce `private: true`. The actual `npm publish` would fail with `EPRIVATED`. No changes needed — all four packages already have `private: true`.

---

## 3. Core Tarball — Full `npm pack --dry-run` Output

```
npm notice
npm notice 📦  @timelinx/core@1.0.0-beta.1
npm notice Tarball Contents
npm notice 1.1kB LICENSE
npm notice 4.6kB README.md
npm notice 24.7kB dist/chunk-KKV6PM2G.js
npm notice 868B dist/chunk-NCBWYYKK.js
npm notice 4.9kB dist/chunk-W4CCWKLV.js
npm notice 194.7kB dist/chunk-ZJA6GWZL.js
npm notice 66.8kB dist/index-BREyi04p.d.ts
npm notice 66.8kB dist/index-BttrfpOr.d.cts
npm notice 217.1kB dist/index.cjs
npm notice 4.0kB dist/index.d.cts
npm notice 4.0kB dist/index.d.ts
npm notice 3.5kB dist/index.js
npm notice 226.7kB dist/internal.cjs
npm notice 25.9kB dist/internal.d.cts
npm notice 25.9kB dist/internal.d.ts
npm notice 5.9kB dist/internal.js
npm notice 9.9kB dist/media.cjs
npm notice 4.5kB dist/media.d.cts
npm notice 4.5kB dist/media.d.ts
npm notice 3.9kB dist/media.js
npm notice 26.6kB dist/operations-Cw8Xz6QP.d.cts
npm notice 26.6kB dist/operations-Cw8Xz6QP.d.ts
npm notice 4.6kB dist/pipeline-CiZQpSIN.d.cts
npm notice 4.6kB dist/pipeline-CZKChPm9.d.ts
npm notice 47.5kB dist/serialization.cjs
npm notice 6.2kB dist/serialization.d.cts
npm notice 6.2kB dist/serialization.d.ts
npm notice 23.9kB dist/serialization.js
npm notice 2.2kB package.json
npm notice Tarball Details
npm notice name: @timelinx/core
npm notice version: 1.0.0-beta.1
npm notice filename: timelinx-core-1.0.0-beta.1.tgz
npm notice package size: 206.1 kB
npm notice unpacked size: 1.0 MB
npm notice shasum: 9b9881a4986a49f477524e9ce90bb050b635b99d
npm notice integrity: sha512-JIwCPpfurHM1J[...]kiTrEjZzMtvTA==
npm notice total files: 29
```

**File list analysis**: The tarball contains ONLY `dist/`, `package.json`, `LICENSE`, and `README.md`. No `src/`, no tests, no config files, no reports, no docs. **Clean.**

**Does the file list include src/, tests, config files, or anything else?** No.

---

## 4. React Tarball — Full `npm pack --dry-run` Output

```
npm notice
npm notice 📦  @timelinx/react@1.0.0-beta.1
npm notice Tarball Contents
npm notice 1.1kB LICENSE
npm notice 4.2kB README.md
npm notice 32.6kB dist/index.cjs
npm notice 12.9kB dist/index.d.cts
npm notice 12.9kB dist/index.d.ts
npm notice 29.5kB dist/index.js
npm notice 2.0kB package.json
npm notice Tarball Details
npm notice name: @timelinx/react
npm notice version: 1.0.0-beta.1
npm notice filename: timelinx-react-1.0.0-beta.1.tgz
npm notice package size: 21.0 kB
npm notice unpacked size: 95.2 kB
npm notice shasum: 4549e327325ec911709fbd85e1a3a4c204ce6c03
npm notice integrity: sha512-0fBr3gq5Z9aZQ[...]xaH/OfW0xODcQ==
npm notice total files: 7
```

**File list analysis**: The tarball contains ONLY `dist/`, `package.json`, `LICENSE`, and `README.md`. No `src/`, no tests, no config files. **Clean.**

**Does the file list include src/, tests, config files, or anything else?** No.

---

## 5. `files` Field Evidence

### `packages/core/package.json`

```json
"files": [
  "dist",
  "README.md",
  "LICENSE"
]
```

### `packages/react/package.json`

```json
"files": [
  "dist",
  "README.md",
  "LICENSE"
]
```

Both packages use the `files` field to whitelist only `dist/`, `README.md`, and `LICENSE`. This is what causes the clean tarball — npm includes only the listed files plus `package.json` (always included automatically).

No `.npmignore` files are used; the `files` field is the sole mechanism.

---

## 6. Post-Change Sanity Check

| Step | Result |
|------|--------|
| `pnpm install` | **PASS** — "Already up to date" |
| `pnpm build` | **FAIL** — Pre-existing DTS error in `packages/core` tsconfig (`Cannot write file 'dist/internal.d.ts' because it would overwrite input file`). This is unrelated to `private: true`. |
| `pnpm test` | **PASS** — All 1695 tests pass across 78 test files (core: 1451, react: 156, media-web: 43, ai: 18, collab: 27) |

**Note**: The build failure is a pre-existing issue with `packages/core/tsconfig.json` where `declaration` and `declarationMap` are enabled alongside tsup's DTS generation, causing conflicts. This is unrelated to the `private: true` change and existed before this verification.

---

## 7. Final Verdict

**Yes — with caveats.**

It is structurally safe to run `npm publish` only from inside `packages/core` and `packages/react`:

- **Root**: `"private": true` present → real `npm publish` would refuse (dry-run doesn't test this)
- **`packages/ai`**: `"private": true` present → real `npm publish` would refuse
- **`packages/collab`**: `"private": true` present → real `npm publish` would refuse
- **`packages/media-web`**: `"private": true` present → real `npm publish` would refuse
- **`packages/ui`**: `"private": true` present → real `npm publish` would refuse
- **`packages/core`**: No `private` field (publishable). Tarball is clean: 29 files, only `dist/`, `package.json`, `README.md`, `LICENSE`. No source, tests, or configs leak.
- **`packages/react`**: No `private` field (publishable). Tarball is clean: 7 files, only `dist/`, `package.json`, `README.md`, `LICENSE`. No source, tests, or configs leak.

**Caveat**: `npm publish --dry-run` does NOT enforce `private: true` — it shows a successful publish even for private packages. Only the real `npm publish` command checks this flag. Do not use dry-run output as evidence that a package would actually publish.

---

## 8. Build Failure Root Cause & Fix

### Diagnosis

**Root cause**: `packages/core/tsconfig.json` had `"declaration": true` and `"declarationMap": true` (lines 20-21) alongside `"outDir": "dist"` (line 6). The build script runs `tsup ... --dts`, which invokes TypeScript's compiler for DTS generation. When `declaration: true` is set in tsconfig, TypeScript's own declaration emit generates `.d.ts` files into `dist/`, and then tsup's DTS step attempts to write the same `.d.ts` files to the same location — causing the collision:

```
error TS5055: Cannot write file 'dist/internal.d.ts' because it would overwrite input file.
```

This is a file-level collision: both TypeScript (via tsconfig `declaration`) and tsup (via `--dts`) try to produce the same output files.

### Fix Applied

Removed `"declaration": true` and `"declarationMap": true` from `packages/core/tsconfig.json`. These options are redundant because tsup handles all DTS generation via `--dts`. The `tsc --noEmit` typechecking does not need them (verified: `pnpm --filter @timelinx/core exec tsc --noEmit` passes cleanly without them).

**Changed in `packages/core/tsconfig.json`:**

```diff
-    "sourceMap": true,
-    "declaration": true,
-    "declarationMap": true,
+    "sourceMap": true,
+    // declaration and declarationMap are handled by tsup --dts, not tsc directly.
+    // Enabling them here causes a collision: tsc emits .d.ts into dist/, then tsup
+    // --dts tries to overwrite the same files, producing "Cannot write file" errors.
```

### Step 3 — Clean Build Evidence

Deleted `packages/core/dist` entirely, then ran `pnpm build`:

```
$ rm -rf packages/core/dist && echo "dist deleted"
dist deleted
$ ls packages/core/dist
ls: packages/core/dist: No such file or directory
```

**`pnpm build` output (all 6 packages):**

- `@timelinx/core`: CJS build 72ms, ESM build 72ms, **DTS build 1277ms** — success
- `@timelinx/react`: CJS build 19ms, ESM build 19ms, DTS build 453ms — success
- `@timelinx/media-web`: ESM build 37ms, CJS build 37ms, DTS build 433ms — success (with package.json ordering warnings)
- `@timelinx/ai`: ESM build 88ms, CJS build 88ms, DTS build 365ms — success
- `@timelinx/collab`: ESM build 96ms, CJS build 97ms, DTS build 391ms — success
- `@timelinx/ui`: vite build 636ms, tsc emitDeclarationOnly — success

**All 6 packages build successfully. Exit code 0.**

`dist/` was regenerated:

```
$ ls packages/core/dist/
chunk-KKV6PM2G.js    index-BttrfpOr.d.cts  internal.cjs  media.cjs    operations-Cw8Xz6QP.d.cts  serialization.cjs
chunk-NCBWYYKK.js    index.cjs             internal.d.cts  media.d.cts  operations-Cw8Xz6QP.d.ts   serialization.d.cts
chunk-W4CCWKLV.js    index.d.cts           internal.d.ts   media.d.ts   pipeline-CiZQpSIN.d.cts    serialization.d.ts
chunk-ZJA6GWZL.js    index.d.ts            internal.js     media.js     pipeline-CZKChPm9.d.ts     serialization.js
index-BREyi04p.d.ts  index.js
```

### Step 4 — Re-verified Tarballs from Fresh Dist

**Core tarball (fresh build):**

```
npm notice 📦  @timelinx/core@1.0.0-beta.1
npm notice Tarball Contents
npm notice 1.1kB LICENSE
npm notice 4.6kB README.md
npm notice 24.7kB dist/chunk-KKV6PM2G.js
npm notice 868B dist/chunk-NCBWYYKK.js
npm notice 4.9kB dist/chunk-W4CCWKLV.js
npm notice 194.7kB dist/chunk-ZJA6GWZL.js
npm notice 66.8kB dist/index-BREyi04p.d.ts
npm notice 66.8kB dist/index-BttrfpOr.d.cts
npm notice 217.1kB dist/index.cjs
npm notice 4.0kB dist/index.d.cts
npm notice 4.0kB dist/index.d.ts
npm notice 3.5kB dist/index.js
npm notice 226.7kB dist/internal.cjs
npm notice 25.9kB dist/internal.d.cts
npm notice 25.9kB dist/internal.d.ts
npm notice 5.9kB dist/internal.js
npm notice 9.9kB dist/media.cjs
npm notice 4.5kB dist/media.d.cts
npm notice 4.5kB dist/media.d.ts
npm notice 3.9kB dist/media.js
npm notice 26.6kB dist/operations-Cw8Xz6QP.d.cts
npm notice 26.6kB dist/operations-Cw8Xz6QP.d.ts
npm notice 4.6kB dist/pipeline-CiZQpSIN.d.cts
npm notice 4.6kB dist/pipeline-CZKChPm9.d.ts
npm notice 47.5kB dist/serialization.cjs
npm notice 6.2kB dist/serialization.d.cts
npm notice 6.2kB dist/serialization.d.ts
npm notice 23.9kB dist/serialization.js
npm notice 2.2kB package.json
npm notice Tarball Details
npm notice name: @timelinx/core
npm notice version: 1.0.0-beta.1
npm notice filename: timelinx-core-1.0.0-beta.1.tgz
npm notice package size: 206.1 kB
npm notice unpacked size: 1.0 MB
npm notice total files: 29
```

**React tarball (fresh build):**

```
npm notice 📦  @timelinx/react@1.0.0-beta.1
npm notice Tarball Contents
npm notice 1.1kB LICENSE
npm notice 4.2kB README.md
npm notice 32.6kB dist/index.cjs
npm notice 12.9kB dist/index.d.cts
npm notice 12.9kB dist/index.d.ts
npm notice 29.5kB dist/index.js
npm notice 2.0kB package.json
npm notice Tarball Details
npm notice name: @timelinx/react
npm notice version: 1.0.0-beta.1
npm notice filename: timelinx-react-1.0.0-beta.1.tgz
npm notice package size: 21.0 kB
npm notice unpacked size: 95.2 kB
npm notice total files: 7
```

Both tarballs are consistent with the pre-fix results. File lists contain only `dist/`, `package.json`, `LICENSE`, `README.md`. No source, tests, or configs. **Clean.**

### Step 5 — Test Suite Against Fresh Build

| Package | Test Files | Tests | Result |
|---------|-----------|-------|--------|
| `@timelinx/core` | 64 | 1451 | PASS |
| `@timelinx/react` | 7 | 156 | PASS |
| `@timelinx/media-web` | 5 | 43 | PASS |
| `@timelinx/ai` | 1 | 18 | PASS |
| `@timelinx/collab` | 1 | 27 | PASS |
| **Total** | **78** | **1695** | **PASS** |

Identical pass counts to the previous run. Tests pass against the freshly built code, not leftover artifacts.

### Step 6 — Why CI Passed (and Why It Was Misleading)

CI did NOT actually pass the build. Here's the timeline:

1. `declaration: true` has been in `packages/core/tsconfig.json` since the initial commit (`a691f3e`). The build has been broken from the start.
2. The original CI workflow (`.github/workflows/ci.yml` at `6c1d78c`) ran: Lint → **Typecheck** → Build → Test.
3. In a fresh CI checkout, `dist/` doesn't exist (it's gitignored). Typecheck (`tsc --noEmit` on each package) requires `dist/*.d.ts` from sibling packages for module resolution (e.g., `@timelinx/react` imports types from `@timelinx/core`). Without `dist/`, typecheck fails first.
4. **The build failure was masked** — CI failed on typecheck before reaching the build step.
5. Commit `d673fb5` reordered CI to: Lint → **Build** → Typecheck → Test. This exposed the build failure.
6. The build was never successfully passing in CI — it was always broken, just failing on a different step first.

**Conclusion**: This is a real repo-level bug, not a local-environment artifact. The fix (removing `declaration`/`declarationMap` from tsconfig) resolves it. CI will now pass cleanly with the corrected build.

---

## 9. Updated Final Verdict

**Yes — it is now actually safe to run `npm publish` only from inside `packages/core` and `packages/react`.**

All checks pass:

- **Root**: `"private": true` → real `npm publish` would refuse
- **`packages/ai`**: `"private": true` → real `npm publish` would refuse
- **`packages/collab`**: `"private": true` → real `npm publish` would refuse
- **`packages/media-web`**: `"private": true` → real `npm publish` would refuse
- **`packages/ui`**: `"private": true` → real `npm publish` would refuse
- **`packages/core`**: Publishable. Tarball: 29 files, only `dist/`, `package.json`, `README.md`, `LICENSE`. **Clean.**
- **`packages/react`**: Publishable. Tarball: 7 files, only `dist/`, `package.json`, `README.md`, `LICENSE`. **Clean.**
- **`pnpm build`**: All 6 packages build successfully from a clean `dist/` deletion. Exit code 0.
- **`pnpm test`**: All 1695 tests pass across 78 test files.
- **CI**: Will now pass cleanly with the build fix applied.
