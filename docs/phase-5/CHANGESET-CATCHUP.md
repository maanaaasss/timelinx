# Changeset Catchup Report

## Context

All changes between `@timelinx/core@1.0.0-beta.1` / `@timelinx/react@1.0.0-beta.3` (last publish at `2c169c0`) and current `main` had zero changesets recorded. This report documents every public-surface change identified from git history and the changeset added for it.

## Changesets Added (15 total)

### `@timelinx/core` — 10 changesets

| Changeset | Bump | Covers |
|-----------|------|--------|
| `fix-insert-generator-name` | patch | `INSERT_GENERATOR` now passes `name` to clip; exhaustive switch default |
| `add-caption-and-generator-exports` | minor | Caption types/functions + Generator types/functions added to public API |
| `add-subpath-exports` | minor | New `@timelinx/core/serialization` and `@timelinx/core/media` entry points |
| `add-caption-tool-support` | minor | Caption support in SelectionTool (drag), RazorTool (slice), RippleDeleteTool, RippleTrimTool, RollTrimTool; `supportsCaptions()` on ITool; `findClipWithTrack` query |
| `keyframe-tool-auto-create-effect` | minor | KeyframeTool auto-creates brightness effect on effect-less clips |
| `dispatch-freeze-state` | patch | Dispatch returns Object.freeze'd state + read-only assetRegistry proxy |
| `clip-update-perf` | patch | Conditional re-sort in `updateClip`; early return in `shiftLinkedMarkers` |
| `validation-tolerance` | patch | Duration-mismatch validation relaxed to ±0.5 frames |
| `keyboard-handler-null-engine` | patch | KeyboardHandler accepts null engine (no-ops transport actions) |
| `deprecate-provisional-manager` | patch | ProvisionalManager type + helpers marked @deprecated |

### `@timelinx/react` — 5 changesets

| Changeset | Bump | Covers |
|-----------|------|--------|
| `add-react-hooks` | minor | 7 new hooks (useAllTracks, useFps, useClipEffects, useClipTransition, useTrackCaptions, useAllTransitions, useSelectedCaptionIds); context-based re-exports; useClip Rules of Hooks fix; useActiveTool memoization |
| `react-caption-gesture-routing` | minor | Caption gesture routing in engine; keyboard shortcut activation via tool.shortcutKey; selectedCaptionIds in snapshot |
| `fix-tool-router-null-target` | patch | Snapshot pointer events before rAF to prevent null currentTarget |
| `react-error-boundaries` | patch | onError callback on all event handlers; dispatch rejection logging |
| `tool-router-destroy` | patch | destroy() method on ToolRouterHandlers; useToolRouter deps fix |

## Intended Version Bumps

| Package | Current | After | Type |
|---------|---------|-------|------|
| `@timelinx/core` | `1.0.0-beta.1` | `1.0.0-beta.2` | minor (new public API surface) |
| `@timelinx/react` | `1.0.0-beta.3` | `1.0.0-beta.4` | minor (new hooks + caption routing) |

Note: `changeset status` reports `@timelinx/react` as "major" due to a known prerelease-version interaction — when a dependency gets a minor bump, changesets treats `>=1.0.0-beta.x` ranges as potentially breaking. The actual intended bump is minor.

## Notable Behavior Changes (deserve review before release)

1. **`dispatch-freeze-state`** — dispatch now returns frozen state. Code that mutated dispatch results will throw.
2. **`keyframe-tool-auto-create-effect`** — clicking an effect-less clip with KeyframeTool now creates a default brightness effect.
3. **`clip-update-perf`** — metadata-only clip updates no longer re-sort the clip array.

## PR / CI Status

- Branch: `changeset-catchup`
- PR: [#19](https://github.com/maanaaasss/timelinx/pull/19)
- CI: **PASS** ([`Build & Test`](https://github.com/maanaaasss/timelinx/actions/runs/29083416012/job/86331372090) — 1m56s)
