# Changeset Catchup Report

## Context

All changes between `@timelinx/core@1.0.0-beta.1` / `@timelinx/react@1.0.0-beta.3` (last publish at `2c169c0`) and current `main` had zero changesets recorded. This report documents every public-surface change identified from git history and the changeset added for it.

## Changesets Added (17 total)

### `@timelinx/core` — 12 changesets

| Changeset | Bump | Covers |
|-----------|------|--------|
| `fix-insert-generator-name` | patch | `INSERT_GENERATOR` now passes `name` to clip; exhaustive switch default |
| `add-caption-and-generator-exports` | minor | Caption types/functions + Generator types/functions added to public API |
| `add-subpath-exports` | minor | New `@timelinx/core/serialization` and `@timelinx/core/media` entry points |
| `add-caption-tool-support` | minor | Caption support in SelectionTool (drag), RazorTool (slice), RippleDeleteTool, RippleTrimTool, RollTrimTool; `supportsCaptions()` on ITool; `findClipWithTrack` query |
| `keyframe-tool-auto-create-effect` | minor | KeyframeTool auto-creates brightness effect on effect-less clips |
| `selection-ripple-trim-default` | **minor** | **SelectionTool edge-drag now defaults to ripple trim (resize + shift downstream). Alt+edge for roll trim.** |
| `createclip-default-transform` | patch | `createClip()` always applies DEFAULT_CLIP_TRANSFORM instead of omitting `transform` |
| `dispatch-freeze-state` | patch | Dispatch returns Object.freeze'd state + read-only assetRegistry proxy |
| `clip-update-perf` | patch | Conditional re-sort in `updateClip`; early return in `shiftLinkedMarkers` |
| `validation-tolerance` | patch | Duration-mismatch validation relaxed to ±0.5 frames (see note below) |
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

1. **`selection-ripple-trim-default`** — Edge-drag on a clip now shifts all downstream clips. Anyone relying on edge-drag only resizing the target clip must now hold Alt/Option.
2. **`dispatch-freeze-state`** — dispatch now returns frozen state. Code that mutated dispatch results will throw.
3. **`keyframe-tool-auto-create-effect`** — clicking an effect-less clip with KeyframeTool now creates a default brightness effect.
4. **`createclip-default-transform`** — clips always have a `transform` object now; `clip.transform === undefined` checks will break.
5. **`validation-tolerance`** — Duration mismatch relaxed. See dedicated note below.

## `validation-tolerance` — Boundary Tests (Proven Safe)

**Origin:** This change arrived in commit `4aa7828` ("feat: implement collaborative editing module and expand editor applications suite") — a large, mixed commit with no focused rationale and no boundary test.

**Investigation:** The check is `Math.abs(timelineDuration - mediaDuration) > 0.5` (strict `>`, not `>=`). The system normally produces integer frame values (`frame()`, `secondsToFrames()`, `rationalTimeToFrames()` all use `Math.round()`). For integer frames, the tolerance is **functionally identical to strict equality**: 0 is tolerated, ≥1 is rejected. The tolerance only becomes relevant when non-integer frame values enter via `toFrame()` (plain cast, no rounding) — e.g., from fractional frame-rate conversions with floating-point drift.

**Boundary tests added** (6 new cases in `systems-validation.test.ts`):

| Case | Diff | Expected | Result |
|------|------|----------|--------|
| Integer frames, zero diff | 0 | tolerated | ✅ |
| Integer frames, 1-frame mismatch | 1 | rejected | ✅ |
| Sub-frame drift | 0.4 | tolerated | ✅ |
| Real mismatch | 0.6 | rejected | ✅ |
| Exact boundary | 0.5 | tolerated (inclusive) | ✅ |
| Just past boundary | 0.5001 | rejected | ✅ |

**Conclusion:** The tolerance is correct. It tolerates legitimate floating-point rounding noise (< 0.5 frames) while still catching real duration corruption (≥ 0.5001 frames). The strict Phase 1 equality check was overly aggressive for fractional frame-rate content; the relaxation is sound.

## PR / CI Status

- Branch: `changeset-catchup`
- PR: [#19](https://github.com/maanaaasss/timelinx/pull/19)
- CI: **PASS** ([`Build & Test`](https://github.com/maanaaasss/timelinx/actions/runs/29083416012/job/86331372090) — 1m56s)
