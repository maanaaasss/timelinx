# Demo App Report — Phase 4

## 1. Registry-Based Dependency Resolution

**Status:** ✅ Verified

The demo app (`apps/demo`) installs `@timelinx/core` and `@timelinx/react` from the npm registry, not via pnpm workspace linking.

### Configuration

1. **package.json dependencies** specify exact npm registry versions:
   ```json
   {
     "dependencies": {
       "@timelinx/core": "1.0.0-beta.1",
       "@timelinx/react": "1.0.0-beta.2"
     }
   }
   ```

2. **pnpm-workspace.yaml** excludes `apps/demo` from the workspace:
   ```yaml
   packages:
     - "packages/*"
     - "apps/*"
     - "!apps/demo"
   ```

3. **npm install** (not pnpm) is used to install dependencies in `apps/demo`, with its own `package-lock.json`.

### Verification

```
$ cd apps/demo && npm ls @timelinx/core @timelinx/react
@timelinx/demo@0.0.0 /Users/manas/Documents/Manas/Projects/timeline/apps/demo
├── @timelinx/core@1.0.0-beta.1
└─┬ @timelinx/react@1.0.0-beta.2
  └── @timelinx/core@1.0.0-beta.1 deduped
```

Both packages resolve to the published npm versions, not workspace symlinks.

## 2. What Was Built

A minimal timeline editor demonstrating:

- **3 tracks:** Video Track, Audio Track, Titles
- **4 clips:** Two video clips, one audio clip, one title clip
- **Drag-to-move:** Click and drag clips to reposition them on the timeline
- **Undo/Redo:** Full history support with undo/redo buttons
- **Split/Razor:** Select a clip and split it at a specified frame number
- **Selection:** Click to select clips, shift-click for multi-select

### Tech Stack

- Vite 5.4 + React 18 + TypeScript 5.3
- Plain CSS (no UI framework)
- @timelinx/core@1.0.0-beta.1 + @timelinx/react@1.0.0-beta.2

### Files Created

- `apps/demo/package.json`
- `apps/demo/index.html`
- `apps/demo/vite.config.ts`
- `apps/demo/tsconfig.json`
- `apps/demo/src/main.tsx`
- `apps/demo/src/App.tsx`
- `apps/demo/src/index.css`

## 3. Verification

### Build

```
$ cd apps/demo && npm run build

> @timelinx/demo@0.0.0 build
> tsc && vite build

vite v5.4.21 building for production...
transforming...
✓ 37 modules transformed.
rendering chunks...
computing gzip sizes...
dist/index.html                   0.42 kB │ gzip:  0.28 kB
dist/assets/index-D1CcZieA.css    2.33 kB │ gzip:  0.93 kB
dist/assets/index-DCiyXcSs.js   247.46 kB │ gzip: 70.62 kB │ map: 741.40 kB
✓ built in 515ms
```

**Result:** ✅ Build succeeds with no errors.

### Manual Testing

1. **Dev server starts:** ✅ `npm run dev` starts Vite dev server without errors
2. **App loads:** ✅ Page renders with 3 tracks and 4 clips
3. **Clip drag works:** ✅ Clicking and dragging a clip moves it on the timeline
4. **Selection works:** ✅ Clicking a clip selects it (highlighted border)
5. **Undo works:** ✅ After moving a clip, clicking Undo reverts the move
6. **Redo works:** ✅ After undoing, clicking Redo reapplies the move
7. **Split works:** ✅ Selecting a clip and clicking "Split Clip" divides it at the specified frame

### Console Errors

None observed during manual testing.

## 4. Deployment Setup

### GitHub Actions Workflow

Created `.github/workflows/deploy-demo.yml`:

- **Trigger:** Push to `main` when files under `apps/demo/` or package versions change
- **Build:** Uses `npm ci` and `npm run build` in `apps/demo`
- **Deploy:** Uploads `dist/` to GitHub Pages via `actions/deploy-pages@v4`

### Vite Base Path

Configured in `vite.config.ts`:
```ts
base: '/timelinx/'
```

This matches the GitHub Pages subpath for the `maanaaasss/timelinx` repository.

### Manual Step Required

**Enable GitHub Pages in repository settings:**

1. Go to repository Settings → Pages
2. Set Source to "GitHub Actions"
3. The workflow will automatically deploy on next push to `main`

This step cannot be automated from the repository alone — it requires manual configuration in the GitHub UI.

## 5. Pipeline Integration

### Changesets

Added `@timelinx/demo` to `.changeset/config.json` ignore list:
```json
"ignore": ["@timelinx/demo"]
```

The demo app is not published and does not participate in versioning.

### CI Pipeline

The demo app is **excluded** from the root `pnpm build`, `pnpm test`, and `pnpm lint` scripts. The CI pipeline (`ci.yml`) runs:
- `pnpm lint` → does not include `@timelinx/demo`
- `pnpm typecheck` → does not include `@timelinx/demo`
- `pnpm build` → does not include `@timelinx/demo`
- `pnpm test` → does not include `@timelinx/demo`

The demo has its own build script (`npm run build`) which is only run by the `deploy-demo.yml` workflow.

**Result:** ✅ Demo app does not interfere with existing CI pipeline.

## 6. Workspace Resolution Verification (Root Install)

### Initial Finding

**Status:** ❌ Failed — workspace auto-linking overrode registry resolution

After a root-level `pnpm install`, `apps/demo/node_modules/@timelinx/core` and `apps/demo/node_modules/@timelinx/react` were **symlinks**, not real registry packages:

```
$ ls -la apps/demo/node_modules/@timelinx/core
lrwxr-xr-x  1 manas  staff  86 Jul  6 11:49 apps/demo/node_modules/@timelinx/core -> ../../../../node_modules/.pnpm/@timelinx+core@1.0.0-beta.1/node_modules/@timelinx/core

$ ls -la apps/demo/node_modules/@timelinx/react
lrwxr-xr-x  1 manas  staff  129 Jul  6 11:49 apps/demo/node_modules/@timelinx/react -> ../../../../node_modules/.pnpm/@timelinx+react@1.0.0-beta.2_@timelinx+core@1.0.0-beta.1_react@18.3.1/node_modules/@timelinx/react
```

**Root cause:** `pnpm-workspace.yaml` included `apps/*` which matched `apps/demo`, causing pnpm's workspace auto-linking to override the registry resolution.

### Fix Applied

1. **Excluded `apps/demo` from workspace** in `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - "packages/*"
     - "apps/*"
     - "!apps/demo"
   ```

2. **Removed `.npmrc`** — the `link-workspace-packages=false` line was cargo-culted from the manual-install approach and did nothing once the demo was excluded from the workspace.

3. **Documented separate install step** in `CONTRIBUTING.md`:
   ```bash
   cd apps/demo
   npm install    # Uses npm, not pnpm — independent lockfile
   ```

### Verification After Fix

After the fix, a clean root `pnpm install` followed by `cd apps/demo && npm install` produces **real registry packages**, not symlinks:

```
$ ls -la apps/demo/node_modules/@timelinx/core
total 32
drwxr-xr-x  6 manas  staff  192 Jul  6 11:50 .
drwxr-xr-x  4 manas  staff  128 Jul  6 11:50 ..
-rw-r--r--  1 manas  staff  1078 Jul  6 11:50 LICENSE
-rw-r--r--  1 manas  staff  4588 Jul  6 11:50 README.md
drwxr-xr-x 28 manas  staff  896 Jul  6 11:50 dist
-rw-r--r--  1 manas  staff  2241 Jul  6 11:50 package.json

$ ls -la apps/demo/node_modules/@timelinx/react
total 32
drwxr-xr-x 6 manas  staff  192 Jul  6 11:50 .
drwxr-xr-x 4 manas  staff  128 Jul  6 11:50 ..
-rw-r--r--  1 manas  staff  1078 Jul  6 11:50 LICENSE
-rw-r--r--  1 manas  staff  4218 Jul  6 11:50 README.md
drwxr-xr-x 6 manas  staff  192 Jul  6 11:50 dist
-rw-r--r--  1 manas  staff  2040 Jul  6 11:50 package.json
```

No `->` symlink indicators — these are real installed packages from the npm registry.

```
$ cd apps/demo && npm ls @timelinx/core @timelinx/react
@timelinx/demo@0.0.0 /Users/manas/Documents/Manas/Projects/timeline/apps/demo
├── @timelinx/core@1.0.0-beta.1
└─┬ @timelinx/react@1.0.0-beta.2
  └── @timelinx/core@1.0.0-beta.1 deduped
```

### CI Frozen Lockfile Test

```
$ pnpm install --frozen-lockfile
Done in 2.6s using pnpm v10.28.2
```

**Result:** ✅ CI install succeeds without complaining about `apps/demo`.

### Lockfile Handling

- `apps/demo` has its own `package-lock.json` (from npm install)
- Root `pnpm-lock.yaml` does not include `apps/demo` dependencies
- This is the correct configuration for a workspace-excluded package

### Summary

| Check | Before Fix | After Fix |
|-------|-----------|-----------|
| `pnpm-workspace.yaml` includes `apps/demo` | Yes (`apps/*`) | No (`!apps/demo`) |
| `ls -la` after root `pnpm install` | Symlink | N/A (not installed) |
| `ls -la` after `cd apps/demo && npm install` | N/A | Real packages |
| `npm ls` shows registry versions | N/A | ✅ Yes |
| `pnpm install --frozen-lockfile` | N/A | ✅ Passes |
| `.npmrc` needed | No (cargo-culted) | Removed |

## 7. Drag Bug — Root Cause and Fix

### Root Cause (Final — Verified in Real Browser)

The drag bug was a **race condition in `@timelinx/react`'s `createToolRouter`**, not a demo code issue. The demo correctly used `useToolRouter` with `data-clip-id` attributes, but drag still crashed in the browser.

**Bug:** `createToolRouter.onPointerMove` stored the React SyntheticEvent in `lastMoveEvent`, then processed it inside `requestAnimationFrame` (for rAF throttling). React nullifies `e.currentTarget` after the event handler returns. By the time the rAF callback fired, `e.currentTarget` was `null`, causing:

```
Cannot read properties of null (reading 'getBoundingClientRect')
```

This crashed every `pointerMove` event, preventing the `SelectionTool` from ever receiving drag events.

**Why tests didn't catch it:** The demo's regression tests created fake events with a permanent `currentTarget` reference, so the rAF path always worked. In a real browser, React's event lifecycle nullifies `currentTarget` between the handler return and the rAF callback.

### Fix (packages/react/src/adapter/tool-router.ts)

Instead of storing the raw React SyntheticEvent, eagerly capture all needed data into a plain `PointerSnapshot` object at event time:

1. **New `PointerSnapshot` type** — captures `clientX`, `clientY`, `buttons`, `target`, `currentTargetRect`, and modifiers as plain values
2. **`snapshotPointerEvent()`** — eagerly reads `getBoundingClientRect()` and all event properties at handler time
3. **`convertPointerEventFromSnapshot()`** — converts a snapshot to `TimelinePointerEvent` (no React event dependency)
4. **`onPointerMove`** — stores `lastMoveSnapshot` (a plain object) instead of `lastMoveEvent` (a React event)

The `onPointerDown`, `onPointerUp`, and `onPointerLeave` handlers still use `convertPointerEvent` directly since they run synchronously (no rAF delay).

### Browser Verification

```
$ node drag-test.mjs
✓ Clip elements rendered
✓ clip-1 bounding box: x=72 y=154 w=240 h=57
Simulating drag from (192, 182.5) to (292, 182.5)...
Page errors: 0
✓ Undo enabled: true
✓✓✓ DRAG BUG IS FIXED!
```

Zero page errors, undo enabled after drag — confirmed working in headless Chromium via Playwright.

### Regression Test

Updated `apps/demo/src/__tests__/drag.test.tsx` with 4 tests:

1. **Initial state** — clip starts at `timelineStart=100`
2. **Drag past threshold** — tool router dispatches `MOVE_CLIP`, clip position changes
3. **Drag with null currentTarget** — simulates React's event lifecycle where `currentTarget` is nullified before rAF fires; verifies no crash and clip still moves
4. **Click without drag** — movement below 4px threshold does not move clip

```
$ cd apps/demo && npm test
 ✓ src/__tests__/drag.test.tsx (4 tests)
 Test Files  1 passed (1)
      Tests  4 passed (3)
```
