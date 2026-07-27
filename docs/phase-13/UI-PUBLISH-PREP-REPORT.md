# @timelinx/ui — npm Publish Prep Report (Phase 13)

**Branch:** `chore/ui-publish-prep`
**PR:** [#40 — chore(ui): prepare @timelinx/ui@1.0.0-beta.1 for first public npm publish](https://github.com/maanaaasss/timelinx/pull/40)
**Commit:** `6d0a249`
**Date:** 2026-07-27

---

## 1. Package Metadata Fixes

### Before / After diff

| Field | Before | After |
|-------|--------|-------|
| `private` | `true` | *(removed)* |
| `version` | `1.0.0-beta.3` | `1.0.0-beta.1` |
| `publishConfig` | *(missing)* | `{ "access": "public" }` |
| `author` | `""` | `"Timeline Contributors"` |
| `bugs` | *(missing)* | `{ "url": "https://github.com/maanaaasss/timelinx/issues" }` |

### What was wrong and why it matters

- **`"private": true`** — pnpm publish refuses to publish private packages. First blocker.
- **`"publishConfig": { "access": "public" }`** — scoped packages (`@org/name`) default to `restricted` access on the npm registry. Publishing without this means the package would 404 for every consumer even though it appears to publish successfully. This is the **exact bug that hit `@timelinx/core` on its first publish**, requiring a hotfix. Not repeating it.
- **`author: ""`** — Empty string would appear on the npm page and searchindex. Set to match core/react.
- **`bugs` missing** — Present on every other published package in the monorepo (core, react). Added to match the standard.

### Fields confirmed present and accurate

| Field | Value |
|-------|-------|
| `description` | `"Modern browser-native React timeline UI. Drop-in components built on @timelinx/core and @timelinx/react."` |
| `keywords` | `["timeline", "react", "nle", "davinci", "video-editor", "ui", "components", "typescript"]` |
| `repository` | `{ "type": "git", "url": "https://github.com/maanaaasss/timelinx", "directory": "packages/ui" }` |
| `homepage` | `"https://github.com/maanaaasss/timelinx/blob/main/packages/ui/README.md"` |
| `bugs` | `{ "url": "https://github.com/maanaaasss/timelinx/issues" }` |
| `author` | `"Timeline Contributors"` |
| `license` | `"MIT"` |

---

## 2. Dependency Version Check — workspace:* Audit

### The risk

`workspace:*` in a `dependencies` or `peerDependencies` field of a published package would produce a broken install for every consumer (`npm ERR! No matching version found`). This is what happened with `@timelinx/react@1.0.0-beta.1`, which had to be deprecated and republished as `beta.2`.

### What @timelinx/ui has

```json
"peerDependencies": {
  "@timelinx/core": ">=1.0.0-beta.3",
  "@timelinx/react": ">=1.0.0-beta.5",
  "react": "^18.0.0 || ^19.0.0",
  "react-dom": "^18.0.0 || ^19.0.0"
},
"devDependencies": {
  "@timelinx/core": "workspace:*",
  "@timelinx/react": "workspace:*",
  ...
},
"dependencies": {
  "lucide-react": "^1.21.0"
}
```

**`workspace:*` appears ONLY in `devDependencies`** — which npm drops entirely when consumers install the package. The consumer never sees them.

**`peerDependencies`** use real semver ranges (`>=1.0.0-beta.3`, `>=1.0.0-beta.5`). No workspace protocol.

**`dependencies`** only contains `lucide-react: "^1.21.0"` — a real semver version.

### Publish command decision

**`pnpm publish --filter @timelinx/ui --otp=<code>`**

Because `workspace:*` only appears in `devDependencies`, even plain `npm publish` would be safe here (npm strips devDeps from the published manifest). However, `pnpm publish` is the established command for this monorepo and handles the `pre.json` pre-release mode correctly. Do NOT use plain `npm publish` — the `pnpm` pre-release mode state must be respected.

---

## 3. Tarball Sanity Check

### npm pack --dry-run results

```
📦  @timelinx/ui@1.0.0-beta.1
filename: timelinx-ui-1.0.0-beta.1.tgz
package size:   92.2 kB
unpacked size:  399.8 kB
total files:    90
```

**No source files, no test files, no reports.** Compare to the `webpacked-timeline` mistake: 5.9MB unpacked for a package that should have been a few hundred KB.

### File list — what's in the tarball

The tarball contains **only**:
- `dist/` — compiled JS (ES + CJS), declaration files, CSS files
- `README.md`
- `LICENSE`
- `package.json`

### What was fixed to achieve this

The original build script ran:
```bash
tsc --emitDeclarationOnly --outDir dist
```
This processed all files matching `tsconfig.json`'s `"include": ["src/**/*"]`, which **includes `src/__tests__/`**. The result was `dist/__tests__/audio-schedule.test.d.ts`, `dist/__tests__/export-frame-clock.test.d.ts`, etc. — useless to consumers.

**Fix:** Added `tsconfig.build.json` that extends the main config but excludes `src/__tests__`:
```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "src/__tests__"]
}
```

Updated build script to use `-p tsconfig.build.json`. The `dist/__tests__/` subdirectory is now gone from the output.

---

## 4. Extracted Tarball package.json (Empirical Evidence)

This is the literal `package.json` extracted from the actual `.tgz` via `tar -xzf | cat` — the same empirical method used to catch the original `workspace:*` leak:

```json
{
  "name": "@timelinx/ui",
  "version": "1.0.0-beta.1",
  "description": "Modern browser-native React timeline UI. Drop-in components built on @timelinx/core and @timelinx/react.",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./styles/structure": "./dist/structure.css",
    "./styles/tokens": "./dist/tokens.css",
    "./styles/presets/dark-pro": "./dist/presets/dark-pro.css",
    "./styles/presets/light": "./dist/presets/light.css",
    "./styles/presets/high-contrast": "./dist/presets/high-contrast.css"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "peerDependencies": {
    "@timelinx/core": ">=1.0.0-beta.3",
    "@timelinx/react": ">=1.0.0-beta.5",
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^7.0.0",
    "@testing-library/react": "^16.3.2",
    "@timelinx/core": "workspace:*",
    "@timelinx/react": "workspace:*",
    ...
  },
  "keywords": ["timeline", "react", "nle", "davinci", "video-editor", "ui", "components", "typescript"],
  "author": "Timeline Contributors",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/maanaaasss/timelinx/issues"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/maanaaasss/timelinx",
    "directory": "packages/ui"
  },
  "homepage": "https://github.com/maanaaasss/timelinx/blob/main/packages/ui/README.md",
  "publishConfig": {
    "access": "public"
  },
  "dependencies": {
    "lucide-react": "^1.21.0"
  }
}
```

> [!IMPORTANT]
> `workspace:*` appears ONLY in `devDependencies` (stripped by npm on consumer install). All `peerDependencies` and `dependencies` use real semver. **No workspace:* leak.**

---

## 5. Changeset

**File:** `.changeset/ui-first-public-release.md`
**Bump type:** `minor` (first feature-complete public release, not a patch)

The changeset documents:
- Core timeline components (TimelineEditor, TimelineToolbar, TimelineRuler, TimelineTrack, TimelineClip, TimelinePlayhead)
- Decomposed components for custom layouts
- 13 panel components (AssetBin, InspectorPanel, EffectsPanel, KeyframesPanel, CaptionsPanel, MarkersPanel, TransitionsPanel, ExportDialog, CompositorPreview, CommandPalette, etc.)
- Media import utilities with blob-URL revocation and timeout handling
- `useExport` hook (frame-clock-driven export runner)
- `MediaAssetsProvider` / `useMediaAssets` context
- CSS variable theming system with 3 presets: dark-pro, light, high-contrast
- Built-in keyboard shortcuts

**Changeset ignore list:** `.changeset/config.json` `ignore` field is `[]` (empty) — `@timelinx/ui` was never excluded. No change needed.

---

## 6. Verification Results

### typecheck
```
> @timelinx/ui@1.0.0-beta.1 typecheck
> tsc --noEmit
(clean — no output)
```

### lint
```
> @timelinx/ui@1.0.0-beta.1 lint
> eslint .
(clean — only unrelated root-level module type warning from node, not from ui code)
```

### build
```
> @timelinx/ui@1.0.0-beta.1 build
> vite build && tsc -p tsconfig.build.json --emitDeclarationOnly --outDir dist && ...

vite v5.4.21 building for production...
✓ 1788 modules transformed.
dist/index.js  152.45 kB │ gzip: 34.48 kB
dist/index.cjs  106.97 kB │ gzip: 29.09 kB
✓ built in 689ms
```

### tests
```
> @timelinx/ui@1.0.0-beta.1 test
> vitest run

✓ src/__tests__/export-runner.test.ts        (13 tests)
✓ src/__tests__/media-element-pool.test.ts   (7 tests)
✓ src/__tests__/media-import.test.ts         (15 tests)
✓ src/__tests__/h1-deferred-revocation.test.tsx (5 tests)
✓ src/__tests__/media-assets-context.test.tsx   (11 tests)
✓ src/__tests__/audio-schedule.test.ts       (10 tests)
✓ src/__tests__/export-frame-clock.test.ts   (8 tests)

Test Files  7 passed (7)
     Tests  69 passed (69)
  Duration  1.90s
```

### CI

**PR #40:** https://github.com/maanaaasss/timelinx/pull/40
**CI run:** https://github.com/maanaaasss/timelinx/actions/runs/30266316753

✅ **CI passed** — `completed: success` (2m16s). The lint warnings shown in CI output are pre-existing unused-variable annotations in `@timelinx/core`'s test files, unrelated to this PR.

---

## 7. Files Changed

| File | Change |
|------|--------|
| [`packages/ui/package.json`](file:///Users/manas/Documents/Manas/Projects/timeline/packages/ui/package.json) | Remove private, set version, add publishConfig, bugs, author |
| [`packages/ui/tsconfig.build.json`](file:///Users/manas/Documents/Manas/Projects/timeline/packages/ui/tsconfig.build.json) | New — excludes __tests__ from declaration emit |
| [`.changeset/ui-first-public-release.md`](file:///Users/manas/Documents/Manas/Projects/timeline/.changeset/ui-first-public-release.md) | New — first public release changeset (minor) |

---

## 8. What NOT Done (Intentional)

- **`npm publish` NOT run** — deliberate. The project owner publishes manually via `pnpm publish --filter @timelinx/ui --otp=<code>` once CI is confirmed green and the PR is merged to main.
- **No changes to other packages** — `core` and `react` are already published correctly. This PR touches only the files listed above.

---

## 9. Publish Checklist (for project owner, post-merge)

```bash
# 1. Merge PR #40 to main
# 2. Pull latest main
git checkout main && git pull

# 3. Build clean
pnpm --filter @timelinx/ui build

# 4. Final tarball check
cd packages/ui && npm pack --dry-run

# 5. Publish (requires OTP from authenticator app)
pnpm publish --filter @timelinx/ui --otp=<code>

# 6. Verify on npm
npm info @timelinx/ui
```
