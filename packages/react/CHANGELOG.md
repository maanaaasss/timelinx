# Changelog

## 1.0.0

### Minor Changes

- [#19](https://github.com/maanaaasss/timelinx/pull/19) [`351fd1d`](https://github.com/maanaaasss/timelinx/commit/351fd1d8b93eec03e3ec468bbe103b315a402328) Thanks [@maanaaasss](https://github.com/maanaaasss)! - Add 7 new reactive hooks for the editor panels:

  - `useAllTracks(engine)` — returns all tracks reactively (single subscription)
  - `useFps(engine)` — returns timeline FPS reactively
  - `useClipEffects(engine, clipId)` — returns effects for a specific clip
  - `useClipTransition(engine, clipId)` — returns transition for a specific clip
  - `useTrackCaptions(engine, trackId)` — returns captions for a specific track
  - `useAllTransitions(engine)` — returns all clips with transitions
  - `useSelectedCaptionIds(engine)` — returns selected caption IDs reactively

  Also add context-based re-exports: `useAllTracksContext`, `useFpsContext`, `useClipEffectsContext`, `useClipTransitionContext`, `useTrackCaptionsContext`, `useAllTransitionsContext`.

  Fix `useClip` — was broken by conditional hook call. Now delegates to `useAllTracks` to comply with Rules of Hooks.

  Memoize `useActiveTool` return value to prevent unnecessary re-renders.

- [#19](https://github.com/maanaaasss/timelinx/pull/19) [`351fd1d`](https://github.com/maanaaasss/timelinx/commit/351fd1d8b93eec03e3ec468bbe103b315a402328) Thanks [@maanaaasss](https://github.com/maanaaasss)! - Caption gesture routing in `TimelineEngine`:

  - `handlePointerDown` detects clicks on captions (`event.captionId != null`) and routes to the active tool if it supports captions, otherwise falls back to `SelectionTool`
  - `handlePointerMove` and `handlePointerUp` continue routing through the same gesture tool until the pointer goes up
  - Engine snapshot now includes `selectedCaptionIds`

  Also adds keyboard shortcut activation: `handleKeyDown` now checks `tool.shortcutKey` on all registered tools and activates the matching tool. Previously, only the `KeyboardHandler`'s hardcoded bindings (J/K/L, Space, arrows) worked.

### Patch Changes

- [#19](https://github.com/maanaaasss/timelinx/pull/19) [`351fd1d`](https://github.com/maanaaasss/timelinx/commit/351fd1d8b93eec03e3ec468bbe103b315a402328) Thanks [@maanaaasss](https://github.com/maanaaasss)! - Fix `tool-router.ts` null `currentTarget` crash: pointer events are now snapshot at fire time (fields like `clientX`, `target`, `currentTarget`, `getBoundingClientRect()` captured immediately) instead of reading `e.currentTarget` inside the rAF callback. The rAF callback had been reading `e.currentTarget` after React's synthetic event pool recycled the event, causing null reference errors.

  Also snapshot the event in `onPointerMove` for the same reason — React nullifies `currentTarget` after the handler returns.

- [#19](https://github.com/maanaaasss/timelinx/pull/19) [`351fd1d`](https://github.com/maanaaasss/timelinx/commit/351fd1d8b93eec03e3ec468bbe103b315a402328) Thanks [@maanaaasss](https://github.com/maanaaasss)! - Add `onError` callback support to all pointer and keyboard event handlers in `TimelineEngine`. Tool errors (e.g., thrown by a tool's `onPointerDown`/`onPointerMove`/`onPointerUp`/`onKeyDown`) are now caught and forwarded to `options.onError(err, context)` instead of propagating to the caller. This prevents a single tool crash from breaking the entire event pipeline.

  Also add dispatch rejection logging: when `coreDispatch` rejects a transaction, the engine logs `[TimelineEngine] Dispatch rejected: <reason> — <message>` with the transaction details.

- [#19](https://github.com/maanaaasss/timelinx/pull/19) [`351fd1d`](https://github.com/maanaaasss/timelinx/commit/351fd1d8b93eec03e3ec468bbe103b315a402328) Thanks [@maanaaasss](https://github.com/maanaaasss)! - Add `destroy()` method to `ToolRouterHandlers` returned by `createToolRouter`. Cancels any pending rAF and clears snapshot state. Should be called on component unmount to prevent state updates on an unmounted component.

  Fix `useToolRouter` memoization: now includes `getPixelsPerFrame` and `getScrollLeft` in the deps array, so the router is recreated when these callbacks change.

- Updated dependencies [[`351fd1d`](https://github.com/maanaaasss/timelinx/commit/351fd1d8b93eec03e3ec468bbe103b315a402328), [`351fd1d`](https://github.com/maanaaasss/timelinx/commit/351fd1d8b93eec03e3ec468bbe103b315a402328), [`351fd1d`](https://github.com/maanaaasss/timelinx/commit/351fd1d8b93eec03e3ec468bbe103b315a402328), [`351fd1d`](https://github.com/maanaaasss/timelinx/commit/351fd1d8b93eec03e3ec468bbe103b315a402328), [`bebe6f7`](https://github.com/maanaaasss/timelinx/commit/bebe6f7566d8366c044a0e2ff191b9dac8e962e3), [`351fd1d`](https://github.com/maanaaasss/timelinx/commit/351fd1d8b93eec03e3ec468bbe103b315a402328), [`351fd1d`](https://github.com/maanaaasss/timelinx/commit/351fd1d8b93eec03e3ec468bbe103b315a402328), [`351fd1d`](https://github.com/maanaaasss/timelinx/commit/351fd1d8b93eec03e3ec468bbe103b315a402328), [`351fd1d`](https://github.com/maanaaasss/timelinx/commit/351fd1d8b93eec03e3ec468bbe103b315a402328), [`351fd1d`](https://github.com/maanaaasss/timelinx/commit/351fd1d8b93eec03e3ec468bbe103b315a402328), [`bebe6f7`](https://github.com/maanaaasss/timelinx/commit/bebe6f7566d8366c044a0e2ff191b9dac8e962e3), [`351fd1d`](https://github.com/maanaaasss/timelinx/commit/351fd1d8b93eec03e3ec468bbe103b315a402328)]:
  - @timelinx/core@1.0.0

All notable changes to `@webpacked-timeline/react` are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0-beta.1] - 2026-03-07

### Added

- `TimelineEngine` orchestrator class — wires core's dispatcher, `HistoryStack`, `PlaybackEngine`, `SnapIndexManager`, `TrackIndex`, `KeyboardHandler`, and all 12 built-in tools
- `TimelineProvider` context + `TimelineContext` for React tree
- 20+ hooks with `useSyncExternalStore` for granular re-renders:
  - `useEngine`, `useTimeline`, `useTrackIds`, `useTrack`, `useClip`, `useClips`
  - `useMarkers`, `useHistory`, `useCanUndo`, `useCanRedo`
  - `usePlayheadFrame`, `useIsPlaying`, `usePlaybackEngine`, `usePlayhead`, `usePlayheadEvent`
  - `useActiveToolId`, `useActiveTool`, `useCursor`
  - `useProvisional`, `useSelectedClipIds`, `useChange`
- Engine-first hook variants: `useTimelineWithEngine`, `useTrackIdsWithEngine`, `useTrackWithEngine`, `useClipWithEngine`, `useProvisionalWithEngine`
- `useVirtualWindow` and `useVisibleClips` for viewport-aware rendering
- `createToolRouter` adapter and `useToolRouter` hook for pointer/keyboard event wiring
- `EngineSnapshot` type for stable external store contract
- `DEFAULT_PLAYHEAD_STATE` constant
- 187 tests passing
