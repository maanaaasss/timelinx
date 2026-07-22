# Phase 11 — Real Export Report

## What Was Built

### 1. Canvas2D Compositor (`packages/ui/src/components/canvas-compositor.tsx`)

A Canvas2D-based multi-layer compositor that replaces the single-`<video>` MediaPreview from Phase 10.

**Capabilities:**
- **Video clips**: Hidden `<video>` elements per clip, seek-based rendering via `drawImage()`, supports multiple simultaneous video clips (overlays, PiP)
- **Image clips**: `<img>` elements with `drawImage()`, aspect-ratio-preserving scaling
- **Text/generators**: Canvas text APIs (`fillText`) with word-wrap, shadow for readability, centered layout
- **Transforms**: Full `ClipTransform` support — positionX/Y, scaleX/Y, rotation, opacity, anchorX/Y — applied via canvas `translate`/`rotate`/`scale`
- **Effects**: `ctx.filter` mapping for: `blur` → `blur(Npx)`, `brightness` → `brightness()`, `contrast` → `contrast()`, `saturation` → `saturate()`, `hueRotate` → `hue-rotate()`
- **Z-order**: Renders layers bottom-to-top per `resolveFrame()` track ordering
- **Track opacity**: Multiplied with clip transform opacity

**Architecture:**
- `MediaElementPool` class caches `<video>` and `<img>` elements by clip ID
- `renderCompositorFrame()` is the core compositing function, usable by both preview and export
- `CompositorPreview` React component replaces `MediaPreview` in the timeline editor
- Uses `resolveFrame()` from `@timelinx/core` for layer resolution

### 2. Real Export via Canvas Capture (`packages/ui/src/hooks/use-export.ts`)

**`useExport` hook** — drives real-time export:

1. **Canvas capture**: `canvas.captureStream(fps)` provides a live video stream
2. **Audio routing**: `AudioContext` + `MediaStreamAudioDestinationNode` — loads and decodes all audio clips into `AudioBuffer`s, schedules `AudioBufferSourceNode.start()` at correct timeline offsets with `GainNode` for volume
3. **Stream combination**: Video + audio tracks merged into one `MediaStream`
4. **Recording**: `MediaRecorder` records the combined stream in 100ms chunks
5. **Playback driver**: Uses the engine's `playbackEngine.play()` to drive real-time playback across the full timeline duration
6. **Progress**: Tracks `currentFrame / durationFrames` during encoding
7. **Completion**: Creates Blob, auto-downloads as `.webm`
8. **Cancel**: Stops MediaRecorder, pauses playback, cleans up audio nodes

**Browser support detection**: Checks for `captureStream` and `MediaRecorder` availability.

### 3. Export UI (`packages/ui/src/components/export-dialog.tsx`)

- Modal overlay with progress bar (percentage + status text)
- Cancel button during encoding
- Download link on completion (auto-download triggered)
- Error display for unsupported browsers or export failures
- Retry button on error
- Auto-starts export when dialog opens
- Auto-closes 5 seconds after completion

### 4. Wiring

- `timeline-editor.tsx`: `MediaPreview` → `CompositorPreview`, `ExportDialog` added with `useExport` hook
- Export button in TopNav opens the export dialog
- `App.tsx`: No changes needed (export is handled internally)
- `packages/ui/src/index.ts`: Exports `CompositorPreview`, `ExportDialog`, `useExport`
- `packages/core/src/public-api.ts`: Exports `ResolvedLayer`, `ResolvedCompositeRequest`, `FileAsset`, `GeneratorAsset`
- CSS: Full export dialog styling added to `structure.css`

## Build Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` (all 7 packages) | ✅ Pass |
| `pnpm build` (all packages) | ✅ Pass |
| `pnpm lint` (all packages) | ✅ Pass (0 new errors) |
| `pnpm --filter @timelinx/core test` | ✅ 1462/1462 tests pass |
| `pnpm --filter @timelinx/ui test` | ✅ 9/9 audio scheduling tests pass |

## PR and CI

- **PR**: [#32](https://github.com/maanaaasss/timelinx/pull/32) — `feature/phase-11-real-export`
- **CI status**: ✅ Green — all checks pass
- **Fix included**: `apps/editor/src/__tests__/setup.ts` — `ResizeObserver` mock now fires callback with `width=4800` so virtual window covers all test fixture clips (was no-op `observe()`, causing `vpWidth` to stay at 1200px default)
- **Core, React, MediaWeb, Collab, AI, Editor, UI**: all pass typecheck, lint, and tests.

## Changeset

Added `.changeset/phase-11-core-exports.md` (minor bump for `@timelinx/core`):
- Exports `ResolvedLayer`, `ResolvedCompositeRequest`, `FileAsset`, `GeneratorAsset`
- These are the types any host-side compositor or export implementation needs when branching on asset kind or consuming `resolveFrame()` output.

## Audio Scheduling Tests

`packages/ui/src/__tests__/audio-schedule.test.ts` — 9 tests covering `computeAudioSchedule()`:

1. **Clip starting partway through**: frame 100 → `when = base + 100/fps` ✓
2. **Clip with non-zero mediaIn**: `mediaIn=50` → `offset = 50/fps` ✓
3. **Two overlapping clips**: independent schedules, no clobbering ✓
4. **Clip ending before export end**: `duration` capped to clip span ✓
5. **0 dB gain → linear 1.0** ✓
6. **-6 dB gain → ~0.501** ✓
7. **+6 dB gain → ~1.995** ✓
8. **No audio properties → default gain 1.0** ✓
9. **Complex scenario**: trimmed + offset + overlapping + gain ✓

## Export Starts from Frame 0 — Confirmed

The `ExportRunner.run()` method:
1. Creates a **fresh `AudioContext`** — its `currentTime` starts at ~0, independent of any prior state
2. Calls `engine.seekTo(toFrame(0))` — explicitly seeks playhead to frame 0
3. Calls `engine.playbackEngine.play()` — starts playback from frame 0

Audio scheduling is anchored to `audioCtx.currentTime`, not the playhead's prior position. Export correctness is independent of incidental UI state.

## Gaps and Known Limitations

### Effect types that don't map to Canvas2D filters
- **`colorCorrect`**: No clean `ctx.filter` equivalent. Skipped (noted as gap, not faked).
- **Any custom/host-defined effect types**: Skipped silently.

### What needs the project owner's browser test
The following could NOT be verified from this environment and require a real browser test:

1. **Canvas compositor rendering**: Whether video, image, and text clips actually render correctly on the canvas with real media files
2. **Multi-layer compositing**: Whether multiple simultaneous video clips (overlays) composite correctly with z-ordering
3. **Transform visibility**: Whether Inspector panel's transform controls (position, scale, rotation, opacity) visibly affect the composited output
4. **Effect rendering**: Whether `ctx.filter` effects (blur, brightness, contrast, saturation, hue-rotate) render correctly
5. **Export output**: Whether the exported `.webm` file plays correctly in a video player
6. **Audio-video sync**: Whether audio and video are in sync in the exported file
7. **Text clip export**: Whether text/generator clips appear correctly in the exported file
8. **Export progress UI**: Whether the progress bar, cancel, and download work correctly
9. **Browser compatibility**: Whether `captureStream` + `MediaRecorder` work in the target browser

### Suggested test scenario
Build a timeline with:
- A real imported video clip on V1 (frames 0–300)
- A text generator clip on S1 (frames 0–90) with "Welcome to TimelineX Editor"
- A real imported music track on A1 (frames 0–600)
- Apply a blur effect to the video clip
- Adjust the text clip's transform (e.g., position offset, scale)
- Click Export → verify the resulting `.webm` plays with:
  - Video visible and correctly composited
  - Text overlay visible with correct position/scale
  - Blur effect visible
  - Audio playing in sync
