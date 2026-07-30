# Phase 13: Editor Real-Install Verification

## Summary

Switched `apps/editor` from workspace-linked `@timelinx/core`, `@timelinx/react`, and `@timelinx/ui` to real published npm versions. Build, typecheck, and all87 tests pass against the registry packages. One critical finding: `@timelinx/react@1.0.0-beta.5` was published with `"@timelinx/core": "workspace:*"` in its dependencies, making it uninstallable via npm.

---

## 1. Dependency Switch

### Published versions confirmed (npm registry)

| Package | Latest Published | Used |
|---|---|---|
| `@timelinx/core` | `1.0.0-beta.3` | `^1.0.0-beta.3` |
| `@timelinx/react` | `1.0.0-beta.5` | `^1.0.0-beta.5` |
| `@timelinx/ui` | `1.0.0-beta.2` | `^1.0.0-beta.2` |

### Changes made

**`apps/editor/package.json`** — swapped `workspace:*` to real semver ranges:
```json
"@timelinx/core": "^1.0.0-beta.3",
"@timelinx/react": "^1.0.0-beta.5",
"@timelinx/ui": "^1.0.0-beta.2",
```

**`pnpm-workspace.yaml`** — excluded editor from workspace (same pattern as demo):
```yaml
packages:
  - "packages/*"
  - "apps/*"
  - "!apps/demo"
  - "!apps/editor"
```

### Registry resolution verified

```
node_modules/@timelinx/core  →  1.0.0-beta.3  (pnpm store, not workspace symlink)
node_modules/@timelinx/react →  1.0.0-beta.5  (pnpm store, not workspace symlink)
node_modules/@timelinx/ui    →  1.0.0-beta.2  (pnpm store, not workspace symlink)
```

---

## 2. Critical Finding: npm Cannot Install `@timelinx/react@1.0.0-beta.5`

### The problem

`@timelinx/react@1.0.0-beta.5` was published to npm with this in its `package.json`:

```json
"dependencies": {
  "@timelinx/core": "workspace:*"
}
```

The `workspace:*` protocol is a pnpm-specific feature. npm does not understand it and fails with:

```
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "workspace:": workspace:*
```

This means **no npm user can install `@timelinx/react@1.0.0-beta.5`**. They would need to use pnpm or yarn with specific workspace protocol support.

### How it was worked around

Used `pnpm install --ignore-workspace` in the `apps/editor` directory, which understands the `workspace:*` protocol and resolves it correctly from the registry.

### Contrast with earlier versions

`@timelinx/react@1.0.0-beta.3` (used by `apps/demo`) has the correct dependency:
```json
"dependencies": {
  "@timelinx/core": "^1.0.0-beta.1"
}
```

This was fixed at some point between beta.3 and beta.5 — or rather, it was correct in beta.3 and regressed in beta.5.

### Fix required

`@timelinx/react` needs a patch release (e.g. `1.0.0-beta.6`) where the `workspace:*` protocol is replaced with the actual resolved version before publish. The changeset publish pipeline should handle this automatically via `@changesets/cli` — if it doesn't, the publish config needs investigation.

---

## 3. Build & Typecheck Results

| Step | Result |
|---|---|
| `pnpm install --ignore-workspace` | ✅ 267 packages installed |
| `tsc --noEmit` (typecheck) | ✅ Clean, zero errors |
| `vite build` | ✅ 42 modules, 367 KB JS + 55 KB CSS |
| `vite dev` (dev server) | ✅ Starts on localhost:5173, serves HTML |

---

## 4. Test Results

```
✓ src/__tests__/media-import.test.ts     (13 tests)
✓ src/__tests__/export-duration.test.ts  (10 tests)
✓ src/__tests__/App.test.tsx              ( 7 tests)
✓ src/__tests__/features.test.tsx        (57 tests)

Test Files  4 passed (4)
     Tests  87 passed (87)
  Duration  2.05s
```

### Feature coverage in tests (all passing against published packages)

| # | Feature | Tests |
|---|---|---|
| 1 | Multi-track timeline (4 tracks) | 2 |
| 2 | Clip rendering with data attributes | 2 |
| 3 | Undo/redo | 2 |
| 4 | Markers (add, state) | 2 |
| 5 | Tool activation & switching | 2 |
| 6 | Playhead (start, seek) | 2 |
| 7 | UI components (toolbar, panels, status bar) | 6 |
| 8 | Clip selection via engine API | 1 |
| 9 | Clip operations (insert, delete, move) | 2 |
| 10 | Split at playhead | 1 |
| 11 | Effects dispatch (add, remove, toggle) | 3 |
| 12 | Transitions dispatch (add, delete) | 2 |
| 13 | Keyframes dispatch (add, delete) | 2 |
| 14 | Captions dispatch (add, edit, delete) | 3 |
| 15 | Inspector (SET_CLIP_TRANSFORM) | 1 |
| 16 | KeyframeTool auto-create effect | 1 |
| 17 | Text clips on timeline | 1 |
| 18 | Keyboard shortcuts → tool activation | 4 |
| 19 | Default clip transform data | 1 |
| 20 | TransitionTool drag-to-create | 1 |
| 21 | Reactive hooks re-render on state change | 4 |
| 22 | Inspector numeric input buffering | 1 |
| 23 | Transition delete via UI | 1 |
| 24 | Caption creation via UI | 2 |
| 25 | Text clip drag-to-move | 1 |
| 26 | Text clip DOM structure | 7 |

---

## 5. API Surface: Published vs Local

### Symbols used by editor: 63 total

| Package | Symbols Used | In Published? | Gaps |
|---|---|---|---|
| `@timelinx/core` | 35 (22 values +13 types) | 35/35 ✅ | 0 |
| `@timelinx/react` | 20 (all values) | 20/20 ✅ | 0 |
| `@timelinx/ui` | 8 (5 values +3 CSS) | 8/8 ✅ | 0 |

**Zero API gaps.** Every symbol the editor imports exists in the published versions.

### Notable: editor uses a small fraction of available exports

- `@timelinx/core` exports ~160+ symbols; editor uses 35
- `@timelinx/react` exports ~50 symbols; editor uses 20
- `@timelinx/ui` exports ~80+ symbols; editor uses 5 JS +3 CSS

This is expected — the editor is a consumer app, not a test harness for every API.

---

## 6. Gap Analysis: Published vs Local

No functional gaps found between published and local code for the editor's use case. All features the editor exercises (timeline creation, clip CRUD, effects, transitions, keyframes, captions, markers, undo/redo, tool routing, inspector, keyboard shortcuts, drag operations, text clips, media import) work identically against the published packages.

The only real gap is the **packaging bug** in `@timelinx/react@1.0.0-beta.5` (`workspace:*` in published dependencies), which prevents npm-based installation.

---

## 7. What Would Need a Fresh Release

| Item | Severity | Action |
|---|---|---|
| `@timelinx/react@1.0.0-beta.5` has `workspace:*` in deps | **Critical** | Publish `1.0.0-beta.6` with resolved version |

No code changes needed — just a correctly-published version of `@timelinx/react`.

---

## 8. Files Changed

| File | Change |
|---|---|
| `apps/editor/package.json` | `workspace:*` → real semver ranges |
| `pnpm-workspace.yaml` | Added `!apps/editor` exclusion |
| `apps/editor/pnpm-lock.yaml` | Generated (new, isolated lockfile) |

---

## 9. Comparison with `apps/demo`

| Aspect | `apps/demo` (Phase 4) | `apps/editor` (Phase 13) |
|---|---|---|
| Packages tested | `core`, `react` | `core`, `react`, `ui` |
| Package manager | npm | pnpm (--ignore-workspace) |
| Lockfile | `package-lock.json` | `pnpm-lock.yaml` |
| Build | ✅ | ✅ |
| Typecheck | ✅ | ✅ |
| Tests | ✅ | ✅ 87/87 |
| Issue found | None | `workspace:*` in published react |

`apps/demo` used `@timelinx/react@1.0.0-beta.3` which had correct deps. The beta.5 regression would have blocked demo too if it had tried to upgrade.
