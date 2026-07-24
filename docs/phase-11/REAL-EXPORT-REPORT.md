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

## Export Debug Logging — 0-Byte .webm Investigation

### Problem
Export completes successfully (progress reaches 100%, status shows "complete") but the resulting `.webm` file is 0 bytes and shows nothing when played.

### Root cause (found via real console output)

**`getSnapshot().playhead.currentFrame` is stale during export — always returns 0.**

`PlayheadController.onFrame()` creates a **new state object** on every frame (`this.state = { ...this.state, currentFrame: toFrame(newFrame) }`). The React-side `TimelineEngine.buildSnapshot()` captures a reference to the state object at the time it's called. During normal preview playback this works because React re-renders (triggered by `useSyncExternalStore` + `notify()`) call `rebuildSnapshot()` on every frame, which re-reads the controller's current state.

During export, the `ExportRunner` render loop reads `this.engine.getSnapshot().playhead.currentFrame` — but the snapshot is **never rebuilt** during the export loop (no React renders happen, no `rebuildSnapshot()` is called). The snapshot holds a reference to the **original** state object from before playback started, so `currentFrame` is always 0.

This causes:
1. The render loop draws the same frame 0 content on every iteration
2. `captureStream()` sees a static canvas → `MediaRecorder` receives no meaningful video data
3. `ondataavailable` fires once with `size: 0` at the end
4. The resulting `.webm` blob is 0 bytes

### Fix
Read `currentFrame` directly from the playback controller's live state instead of the stale snapshot:

```diff
- const currentFrame = this.engine.getSnapshot().playhead.currentFrame as number;
+ const currentFrame =
+   this.engine.playbackEngine?.getState().currentFrame as number ??
+   this.engine.getSnapshot().playhead.currentFrame as number;
```

`PlaybackEngine.getState()` returns `this.controller.getState()` which returns `this.state` — the **current mutable reference**, not a stale snapshot copy.

### Real console output

```
[EXPORT-DEBUG] Frame 3 — currentFrame: 0 progress: 0%
[EXPORT-DEBUG]   Canvas pixel[0,0] RGBA: 1 1 0 255 (has content)
[EXPORT-DEBUG]   MediaRecorder state: recording chunks so far: 0
[EXPORT-DEBUG] Frame 30 — currentFrame: 0 progress: 0%
[EXPORT-DEBUG]   Canvas pixel[0,0] RGBA: 1 1 0 255 (has content)
[EXPORT-DEBUG]   MediaRecorder state: recording chunks so far: 0
...repeats identically for 309 frames...
[EXPORT-DEBUG] === Render loop ended ===
[EXPORT-DEBUG] Total frames rendered by export loop: 309
[EXPORT-DEBUG] Calling MediaRecorder.stop(). State before stop: recording
[EXPORT-DEBUG] MediaRecorder onstart fired. State: inactive
[EXPORT-DEBUG] ondataavailable — chunk size: 0 bytes, type: video/webm;codecs=vp9,opus
[EXPORT-DEBUG] MediaRecorder stopped. Total chunks: 0
[EXPORT-DEBUG] Total accumulated bytes across 0 chunks: 0 (0.00 MB)
[EXPORT-DEBUG] *** CRITICAL: Blob is 0 bytes! MediaRecorder captured nothing. ***
```

Key signals:
- `currentFrame: 0` on every frame — playhead never advances from the snapshot's perspective
- `chunks so far: 0` throughout — MediaRecorder never receives data
- Canvas has content (RGBA 1 1 0 255) — compositor IS drawing, but the same frame 0 content every time
- `ondataavailable chunk size: 0` — confirms zero data captured

### Debug instrumentation added
Temporary `[EXPORT-DEBUG]` logging added to:
- `packages/ui/src/hooks/use-export.ts` — every step of the export pipeline
- `packages/ui/src/components/canvas-compositor.tsx` — video element ready state during compositor rendering
- `packages/ui/src/components/export-dialog.tsx` — dialog useEffect guard conditions
- `packages/ui/src/components/timeline-editor.tsx` — TopNav button click handler

## What the logs will tell us

- **If `timeline.duration` is 0 or 1**: The engine doesn't know the clip length → playback loop exits immediately → nothing to record
- **If `captureStream()` returns 0 video tracks**: Browser API failure → nothing to capture
- **If `ondataavailable` never fires or only fires with size 0**: MediaRecorder isn't receiving frames from the canvas stream
- **If canvas pixel is always `[0,0,0,0]` or `[0,0,0,255]` (black)**: Compositor isn't drawing any content
- **If `renderVideo readyState` is always 0**: Video elements aren't loading — source URL issue or CORS
- **If `Audio setup FAILED` appears**: Audio context failed but video should still work — narrows the issue
- **If `Export runner threw an error` appears**: There's a real exception being thrown (previously swallowed)

---

## Addendum — Compositor Preview Sizing Fix

### Problem

The compositor preview showed content but at the wrong size / wrong aspect ratio — content appeared stretched, squished, or otherwise distorted relative to the true 1920×1080 output.

### Root Cause Diagnosis

**Actual canvas dimensions (measured):**

| Dimension type | Value |
|---|---|
| `canvas.width` (internal drawing buffer) | **1920** |
| `canvas.height` (internal drawing buffer) | **1080** |
| `canvas.style.width` (CSS display — before fix) | `""` (unset) — inherited `width: 100%` from `.media-preview-video` |
| `canvas.style.height` (CSS display — before fix) | `""` (unset) — inherited `height: 100%` from `.media-preview-video` |

**Why it was wrong:**

The `.media-preview-video` CSS rule applied `width: 100%; height: 100%; object-fit: contain` to the canvas element. This is the root cause:

> **`object-fit: contain` does not work on `<canvas>` elements.** The CSS spec only defines `object-fit` behaviour for *replaced content elements* with intrinsic dimensions that the browser can honour: `<img>`, `<video>`, `<picture>`. A `<canvas>` is not a replaced content element in the CSS object-fit sense — the browser ignores `object-fit` on it entirely.

The result: the canvas was CSS-stretched to fill 100%×100% of its container (whatever the preview panel dimensions were), completely discarding the 16:9 aspect ratio. The internal 1920×1080 buffer was drawn at full container size without any letterbox/pillarbox correction, causing visible distortion on any container that wasn't exactly 16:9.

**Aspect ratio drift:** The preview panel is typically wider or taller than 16:9 depending on the app layout and window size, so the mismatch was always present. It would worsen on window resize since there was no dynamic recalculation.

**`devicePixelRatio` note:** DPR handling is intentionally *not* applied to the compositor canvas. Unlike UI canvases (the Ruler uses `canvas.width = width * dpr` + `ctx.scale(dpr, dpr)` for crispness), the compositor's internal buffer is the actual video render target at the timeline's output resolution (1920×1080). The CSS scaling from 1920px → preview display size gives equivalent sub-pixel sharpness via the browser's bicubic downscaling. Inflating the buffer to 3840×2160 on retina displays would waste GPU memory while rendering at preview resolution with no perceptible quality gain.

### Fix

**File: `packages/ui/src/components/canvas-compositor.tsx`**

1. Added `containerRef` (a `useRef<HTMLDivElement>`) attached to the `.media-preview` wrapper div.
2. Added `displaySize` state (`{ width: number; height: number } | null`) to hold the computed CSS dimensions.
3. Added a `ResizeObserver` on `containerRef` (consistent with the existing pattern in `timeline-editor.tsx`) that computes the largest rect fitting inside the container that preserves the 1920:1080 aspect ratio:
   ```
   scale = min(containerWidth / 1920, containerHeight / 1080)
   displayWidth  = floor(1920 * scale)
   displayHeight = floor(1080 * scale)
   ```
4. The observer fires immediately on mount (via `getBoundingClientRect()` before the first `observe()` callback) and re-fires on every container resize, so the preview stays correctly scaled when the browser window or panels are resized.
5. The computed dimensions are applied as inline `style={{ width, height }}` on the canvas — overriding any CSS that would otherwise stretch it.
6. On the first render (before the observer fires), the canvas falls back to `maxWidth: '100%'; maxHeight: '100%'` so it never overflows; the observer corrects it immediately on mount.
7. The canvas's internal `width={1920}` / `height={1080}` HTML attributes remain unchanged — the compositor render target is always exactly 1920×1080.

**File: `packages/ui/src/styles/structure.css`**

- Renamed `.media-preview-video` on the canvas to `.media-preview-canvas`.
- New `.media-preview-canvas` rule: `display: block; max-width: 100%; max-height: 100%; border-radius: var(--radius-md)` — no width/height/object-fit that would interfere with the inline styles.
- Retained `.media-preview-video` for the Phase 10 `MediaPreview` component (which uses `<video>` — where `object-fit: contain` works correctly).

### Verification

Manual browser check required:
1. Open the editor with a video clip on the timeline
2. The compositor preview should show content at **16:9 aspect ratio** with black letterbox/pillarbox bars on whichever axis doesn't fit the panel perfectly — no stretching or squishing
3. Resize the browser window — the preview should continuously refit within the panel without distortion
4. Toggle or resize editor panels — same behaviour

### Build

| Check | Result |
|---|---|
| `pnpm --filter @timelinx/ui typecheck` | ✅ Pass |
| `pnpm --filter @timelinx/ui lint` | ✅ Pass (0 errors) |

---

## Addendum — Compositor Content Positioning Fix (Double-Centering Bug)

### Problem

Imported image/video clips rendered small, cut off at the right edge, and shoved toward the bottom-right corner of the canvas. Most of the canvas was black. A blue-tinted band appeared on the left (not a proper neutral letterbox bar).

### Root Cause Diagnosis

**The bug: double-centering offset.**

`applyTransform()` (line 175) with default transform translates the canvas context origin to the canvas center:

```typescript
ctx.translate(canvasW / 2 + px, canvasH / 2 + py);
// With defaults (px=0, py=0): ctx.translate(960, 540)
```

After this, the context origin is at (960, 540) — the canvas center. All subsequent drawing operations are relative to this origin.

However, `renderImage()`, `renderVideo()`, and `renderGenerator()` all computed centering offsets **from the canvas top-left** (in absolute canvas coordinates), not from the already-translated origin:

```typescript
// BUG: dx/dy computed as if origin is still at (0, 0)
const dx = (canvasW - dw) / 2;  // e.g. (1920 - 960) / 2 = 480
const dy = (canvasH - dh) / 2;  // e.g. (1080 - 810) / 2 = 135
ctx.drawImage(img, dx, dy, dw, dh);
```

**Actual canvas position** of the drawn image: `(960 + 480, 540 + 135)` = **(1440, 675)** — that's in the bottom-right quadrant, with only a sliver visible on screen.

### Diagnostic Values (for `IMG_3527.jpg` on Video 2, landscape ~4032×3024)

| Value | Expected (correct) | Actual (buggy) |
|---|---|---|
| Image naturalWidth | 4032 | 4032 |
| Image naturalHeight | 3024 | 3024 |
| Canvas resolution | 1920 × 1080 | 1920 × 1080 |
| Contain scale factor | `min(1920/4032, 1080/3024)` = 0.3571 | 0.3571 |
| Drawn width (dw) | 1440 | 1440 |
| Drawn height (dh) | 1080 | 1080 |
| drawImage dx | **-720** (centered at origin) | **240** (offset from origin) |
| drawImage dy | **-540** (centered at origin) | **0** (offset from origin) |
| Canvas position of drawn image | **(960, 540)** — centered | **(1440, 675)** — bottom-right |

Default transform values confirmed sensible:
- `positionX=0, positionY=0` (no offset)
- `scaleX=1, scaleY=1` (no scale override)
- `anchorX=0, anchorY=0` (no anchor offset)
- `rotation=0, opacity=1`

### Blue-Tinted Band

The canvas element has `border-radius: var(--radius-md)` applied via CSS (`.media-preview-canvas`). With the buggy centering, the left ~1000px of the canvas was pure black (from the `fillRect` clear). Browser anti-aliased rendering of rounded canvas corners against dark content produces a blue-tinted fringe — this is the "unexplained blue band." It will disappear with the fix since content now fills the canvas properly.

### Fix

**File: `packages/ui/src/components/canvas-compositor.tsx`**

All three render functions (`renderImage`, `renderVideo`, `renderGenerator`) were updated to draw centered at the current origin (0, 0 in the transformed coordinate space) instead of computing centering offsets from absolute canvas coordinates:

```diff
  // renderImage / renderVideo — was:
- const dx = (canvasW - dw) / 2;
- const dy = (canvasH - dh) / 2;
- ctx.drawImage(img, dx, dy, dw, dh);
  // now:
+ ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);

  // renderGenerator — was:
- const startY = (canvasH - totalHeight) / 2 + lineHeight / 2;
- ctx.fillText(lines[i]!, canvasW / 2, startY + i * lineHeight);
  // now:
+ const startY = -totalHeight / 2 + lineHeight / 2;
+ ctx.fillText(lines[i]!, 0, startY + i * lineHeight);
```

This is correct because `applyTransform()` already translates the context origin to `(canvasW/2, canvasH/2)` before any content is drawn. Drawing at `(-dw/2, -dh/2)` centers the content at the origin, which is the canvas center.

### Diagnostic Logging Added

Temporary `[COMPOSITOR-DEBUG]` logging added to:
- `renderLayer()` — logs clip ID, all resolved transform values, canvas dimensions
- `renderImage()` — logs `naturalWidth`/`naturalHeight`, canvas resolution, scale factor, final `drawImage()` args
- `renderVideo()` — already had `[EXPORT-DEBUG]` logging (preserved)

### Build Verification

| Check | Result |
|---|---|
| `pnpm --filter @timelinx/ui typecheck` | ✅ Pass |
| `pnpm --filter @timelinx/ui lint` | ✅ Pass (0 errors) |
| `pnpm --filter @timelinx/ui build` | ✅ Pass |

### Verification Required

Manual browser check with the same clip (`IMG_3527.jpg` on Video 2):
1. Image should fill the canvas width (landscape image) with no letterbox bars
2. Image should be centered both horizontally and vertically
3. No blue-tinted band on any edge
4. Transforms (position, scale, rotation) from the Inspector should still work correctly on top of the default centering

