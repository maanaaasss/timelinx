# Changelog

## 1.0.0-beta.3

### Minor Changes

- [#32](https://github.com/maanaaasss/timelinx/pull/32) [`bb0538a`](https://github.com/maanaaasss/timelinx/commit/bb0538a23ea8534f2868a71ee2c209c8428ac8c1) Thanks [@maanaaasss](https://github.com/maanaaasss)! - Export compositor-facing types from the public API:

  - Types: `ResolvedLayer`, `ResolvedCompositeRequest`, `FileAsset`, `GeneratorAsset`

  `ResolvedLayer` and `ResolvedCompositeRequest` are the output of `resolveFrame()` and are needed by any host-side compositor implementation. `FileAsset` and `GeneratorAsset` are the discriminated-union members of `Asset` and are needed when branching on asset kind (file vs. generator) in compositor or export code.

  Previously consumers had to reach into internal paths or cast through `Asset` to access these.

## 1.0.0-beta.2

### Minor Changes

- [#21](https://github.com/maanaaasss/timelinx/pull/21) [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72) Thanks [@maanaaasss](https://github.com/maanaaasss)! - Add caption types and subtitle import to the public API:

  - Types: `CaptionId`, `CaptionStyle`, `Caption`
  - Functions: `toCaptionId`, `parseSRT`, `parseVTT`, `subtitleImportToOps`, `defaultCaptionStyle`

  These were previously internal-only. Exporting them enables consumers to work with caption data and subtitle import without reaching into internal paths.

  Also add generator types to the public API:

  - Types: `GeneratorId`, `GeneratorType`, `Generator`
  - Functions: `toGeneratorId`

  Required for dispatching `INSERT_GENERATOR` operations from consumer code (e.g., text clip creation in the editor).

- [#21](https://github.com/maanaaasss/timelinx/pull/21) [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72) Thanks [@maanaaasss](https://github.com/maanaaasss)! - Add caption support to `SelectionTool`, `RazorTool`, `RippleDeleteTool`, `RippleTrimTool`, and `RollTrimTool`:

  - **SelectionTool**: new `drag-caption` mode for moving captions via pointer drag, with snap-to-edges, ghost preview, collision avoidance, and shift-click multi-selection
  - **RazorTool**: clicking a caption with the razor tool slices it into two halves at the click point
  - **RippleDeleteTool**: deleting a caption ripples all subsequent captions leftward to close the gap
  - **RippleTrimTool**: trimming a caption's edge via drag, with ripple behavior for subsequent captions
  - **RollTrimTool**: rolling the trim boundary between adjacent captions

  New `ITool` interface method: `supportsCaptions?(): boolean` — when a tool declares this, the engine routes caption pointer events to it instead of always routing to `SelectionTool`.

  Also adds `findClipWithTrack(state, clipId)` to the query surface — a utility that returns the clip, its parent track, and the track index in one call.

- [#21](https://github.com/maanaaasss/timelinx/pull/21) [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72) Thanks [@maanaaasss](https://github.com/maanaaasss)! - Add new sub-path exports for better code organization:

  - `@timelinx/core/serialization` — timeline serialization (`serializeTimeline`, `deserializeTimeline`), OTIO import/export, EDL export, AAF export, FCP XML export, project model
  - `@timelinx/core/media` — subtitle import (`parseSRT`, `parseVTT`), marker search (`findMarkersByColor`, `findMarkersByLabel`), thumbnail cache/queue, worker contracts

  These exports are moved from the main `@timelinx/core` entry point to dedicated sub-paths. The main entry point retains all tool, clip, track, effect, and keyframe APIs.

- [#21](https://github.com/maanaaasss/timelinx/pull/21) [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72) Thanks [@maanaaasss](https://github.com/maanaaasss)! - `KeyframeTool`: clicking on a clip that has no effects now auto-creates a default `brightness` effect and adds a keyframe to it, instead of silently doing nothing. The transaction includes both `ADD_EFFECT` and `ADD_KEYFRAME` operations. This removes the friction of having to manually add an effect before placing keyframes.

- [#21](https://github.com/maanaaasss/timelinx/pull/21) [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72) Thanks [@maanaaasss](https://github.com/maanaaasss)! - SelectionTool edge-drag behavior change: dragging a clip edge now defaults to **ripple trim** instead of simple resize.

  **Before:** Edge-drag produced a single `RESIZE_CLIP` operation — only the dragged clip changed size.

  **After:** Edge-drag produces `RESIZE_CLIP` + N×`MOVE_CLIP` for every downstream clip. Trimming a clip's end pushes all clips to its right rightward; trimming a start pulls all clips to its left leftward.

  **Roll trim:** Alt/Option+edge-drag gives the previous behavior at cut points between adjacent clips (both clips resize to maintain adjacency, no downstream shift).

  This changes existing behavior for any consumer already using SelectionTool's edge-drag. If you relied on edge-drag only resizing the target clip, add Alt/Option to the gesture.

### Patch Changes

- [#21](https://github.com/maanaaasss/timelinx/pull/21) [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72) Thanks [@maanaaasss](https://github.com/maanaaasss)! - Performance improvements to clip and marker operations:

  - `updateClip` (both `apply.ts` and `clip-operations.ts`) now only re-sorts the track's clip array when position-affecting fields (`timelineStart`/`timelineEnd`) actually changed — metadata-only updates skip the sort entirely
  - `shiftLinkedMarkers` now returns early when no markers reference the clip being moved, avoiding an unnecessary `map` allocation

- [#21](https://github.com/maanaaasss/timelinx/pull/21) [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72) Thanks [@maanaaasss](https://github.com/maanaaasss)! - `createClip()` now always applies `DEFAULT_CLIP_TRANSFORM` when no `transform` is provided, instead of omitting the field. Previously, clips created without an explicit `transform` had no `transform` property at all (`clip.transform === undefined`). Now every clip has a `transform` object with default values (`{ positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, anchorX: 0.5, anchorY: 0.5 }`).

  This affects any code doing `clip.transform === undefined` checks, JSON serialization comparison, or referential equality checks on the transform field of freshly-created clips.

- [#21](https://github.com/maanaaasss/timelinx/pull/21) [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72) Thanks [@maanaaasss](https://github.com/maanaaasss)! - Deprecate `ProvisionalManager` wrapper type and its helper functions (`createProvisionalManager`, `setProvisional`, `clearProvisional`). Use `ProvisionalState | null` directly instead. The functions still work but are marked `@deprecated`. The `resolveClip` function now accepts the new type signature.

- [#21](https://github.com/maanaaasss/timelinx/pull/21) [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72) Thanks [@maanaaasss](https://github.com/maanaaasss)! - `dispatch()` now returns a **frozen** `TimelineState`:

  - The returned state, timeline, tracks, and clips are all `Object.freeze()`-d — attempting to mutate them throws in strict mode, catching accidental in-place modifications
  - The `assetRegistry` Map is wrapped in a read-only proxy that throws on `.set()`, `.delete()`, `.clear()` calls
  - Shared references between successive states are preserved (no deep clone), so React hook memoization (`Object.is` comparison) continues to work correctly

  This is a **behavior change**: code that previously mutated dispatch results will now throw. All mutations should go through `dispatch()` + operations.

- [#21](https://github.com/maanaaasss/timelinx/pull/21) [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72) Thanks [@maanaaasss](https://github.com/maanaaasss)! - Fix `INSERT_GENERATOR`: the clip created by `applyOperation` now receives `name: op.generator.name` instead of `null`. Generator-backed clips (text, solid color, etc.) now display their generator name on the timeline instead of a generated ID like `gen-clip-gen-title-1`.

  Also adds exhaustive `default` case to the `applyOperation` switch — unhandled operation types now throw at runtime instead of silently falling through.

- [#21](https://github.com/maanaaasss/timelinx/pull/21) [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72) Thanks [@maanaaasss](https://github.com/maanaaasss)! - `KeyboardHandler` constructor now accepts `PlaybackEngine | null` instead of requiring a non-null engine. The handler silently no-ops transport actions (play/pause, seek, jog) when the engine is null, instead of throwing. This fixes a crash when constructing `TimelineEngine` without a `PlaybackEngine`.

- [#21](https://github.com/maanaaasss/timelinx/pull/21) [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72) Thanks [@maanaaasss](https://github.com/maanaaasss)! - Relax `validateClip` duration-mismatch check from exact equality (`timelineDuration !== mediaDuration`) to ±0.5 frame tolerance (`Math.abs(timelineDuration - mediaDuration) > 0.5`). Boundary is **inclusive**: exactly 0.5 is tolerated, > 0.5 is rejected.

  **Why this is safe (now proven with boundary tests):**

  The system normally produces integer frame values — `frame()`, `secondsToFrames()`, `rationalTimeToFrames()` all use `Math.round()`. For integer frames, the tolerance is functionally identical to strict equality: 0 is tolerated, ≥1 is rejected. No existing behavior changes.

  The tolerance becomes relevant only when non-integer frame values enter via `toFrame()` (a plain cast, no rounding) — e.g., from fractional frame-rate conversions where floating-point arithmetic produces sub-frame drift. The tolerance correctly:

  - **Tolerates** 0.4-frame drift (below threshold, legitimate rounding noise)
  - **Rejects** 0.6-frame mismatch (above threshold, real duration corruption)
  - **Tolerates** exactly 0.5 (inclusive boundary, confirmed by test)
  - **Rejects** 0.5001 (exclusive cutoff, confirmed by test)

  Boundary tests added to `src/__tests__/systems-validation.test.ts` (6 new cases).

All notable changes to `@webpacked-timeline/core` are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0-beta.1] - 2026-03-07

### Added

- Core state model: `Timeline`, `Track`, `Clip`, `Asset` with branded IDs (`ClipId`, `TrackId`, `AssetId`, `TimelineFrame`, `FrameRate`)
- Factory functions: `createTimeline`, `createTrack`, `createClip`, `createAsset`, `createTimelineState`
- Frame utilities: `toFrame`, `frameRate`, `framesToTimecode`, `framesToSeconds`, `secondsToFrames`, `FrameRates`, drop-frame support
- Atomic dispatcher with rolling-state validation (`dispatch`)
- 40+ operation primitives: `MOVE_CLIP`, `RESIZE_CLIP`, `SLICE_CLIP`, `DELETE_CLIP`, `INSERT_CLIP`, `SET_MEDIA_BOUNDS`, `SET_CLIP_ENABLED`, `SET_CLIP_SPEED`, `ADD_TRACK`, `DELETE_TRACK`, `REORDER_TRACK`, `REGISTER_ASSET`, `ADD_MARKER`, `MOVE_MARKER`, `DELETE_MARKER`, `SET_IN_POINT`, `SET_OUT_POINT`, `ADD_BEAT_GRID`, `INSERT_GENERATOR`, `ADD_CAPTION`, `EDIT_CAPTION`, `DELETE_CAPTION`, `ADD_EFFECT`, `REMOVE_EFFECT`, `ADD_KEYFRAME`, `MOVE_KEYFRAME`, `DELETE_KEYFRAME`, `SET_CLIP_TRANSFORM`, `SET_AUDIO_PROPERTIES`, `ADD_TRANSITION`, `DELETE_TRANSITION`, `LINK_CLIPS`, `UNLINK_CLIPS`, and more
- Invariant checker with 9 validation rules (`checkInvariants`)
- `HistoryStack` with undo/redo and configurable limit
- `TransactionCompressor` for merging rapid sequential edits
- Tool system: `ITool` interface, `ToolRegistry`, `ProvisionalManager` for drag previews
- 12 built-in tools: `SelectionTool`, `RazorTool`, `RippleTrimTool`, `RollTrimTool`, `SlipTool`, `SlideTool`, `RippleDeleteTool`, `RippleInsertTool`, `HandTool`, `TransitionTool`, `KeyframeTool`, `ZoomTool`
- Snap system: `SnapIndexManager`, `buildSnapIndex`, `nearest`
- `PlayheadController` with play/pause/seek and J/K/L shuttle
- `PlaybackEngine` with pipeline contracts (`VideoDecoder`, `AudioDecoder`, `Compositor`)
- `KeyboardHandler` with configurable key bindings
- Versioned JSON serialization: `serializeTimeline`, `deserializeTimeline` with automatic migration
- Export: `exportToOTIO`, `importFromOTIO`, `exportToEDL`, `exportToAAF`, `exportToFCPXML`
- SRT/VTT subtitle import: `parseSRT`, `parseVTT`, `subtitleImportToOps`
- Project model: `Project`, `Bin` with `addTimeline`, `addBin`, `serializeProject`, `deserializeProject`
- `IntervalTree` for O(log n) clip lookup
- `TrackIndex` for fast track-level queries
- `ThumbnailCache` (LRU) and `ThumbnailQueue` (priority)
- Virtual windowing: `getVisibleClips`, `getVisibleFrameRange`
- `diffStates` for efficient state change detection
- Effects, keyframes, easing curves, clip transforms, audio properties
- Transitions with alignment and duration controls
- Track groups and link groups
- Clock abstraction: `browserClock`, `nodeClock`, `createTestClock`
- 852 tests passing
