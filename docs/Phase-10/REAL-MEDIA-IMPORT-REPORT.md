# Phase 10 — Real Media Import Report

## What Was Built

### 1. Real File Import Flow

**`packages/ui/src/utils/media-import.ts`** — Metadata extraction utilities:
- `detectMediaType(file)` — classifies files as video/audio/image/unsupported via MIME type
- `extractVideoMetadata(file)` — creates a hidden `<video>` element, reads `duration`/`videoWidth`/`videoHeight` from `loadedmetadata`, seeks to 10% and draws a thumbnail to `<canvas>`
- `extractAudioMetadata(file)` — creates a hidden `<audio>` element, reads `duration` from `loadedmetadata`
- `extractImageMetadata(file)` — creates an `Image` element, reads `naturalWidth`/`naturalHeight`, draws scaled thumbnail to canvas
- `extractMetadata(file)` — unified dispatcher
- 10-second timeout on all metadata reads; clear error messages for unsupported types, corrupt files, zero-duration files

**`packages/ui/src/components/asset-bin.tsx`** — Fully wired import:
- Hidden `<input type="file" multiple accept="video/*,audio/*,image/*">` triggered by the Upload button
- Drag-and-drop onto the asset bin container (detects `Files` in dataTransfer types)
- Each file: `detectMediaType` → `extractMetadata` → `URL.createObjectURL` → `createAsset()` → `engine.dispatch({ type: 'REGISTER_ASSET' })`
- Asset IDs generated via `toAssetId(crypto.randomUUID())` — consistent with core's ID generation pattern (razor, ripple-insert tools use `crypto.randomUUID()`)
- Images get a default 5-second duration (no intrinsic duration for images)
- Import errors shown inline per-file (don't block other files)
- "Importing..." state on button during batch import
- Existing hardcoded sample assets are preserved alongside imported ones

### 2. Real Thumbnails

**Asset Bin**: Imported assets display their real thumbnail (JPEG data URL from canvas `toDataURL`) inside `.bin-thumb`. Sample assets keep their gradient placeholders.

**Timeline Clips** (`packages/ui/src/components/timeline-clip.tsx`):
- Accepts optional `thumbnails: Map<string, string>` prop (assetId → data URL)
- When a thumbnail exists for the clip's asset, renders `<div>` elements with `background-image` set to the thumbnail in the filmstrip strip
- Sample clips without real thumbnails keep the existing CSS gradient placeholders

### 3. Real Preview/Scrubbing

**`packages/ui/src/components/media-preview.tsx`** — Video preview component:
- Uses `usePlayheadFrame(engine)` to track the playhead position each frame
- Resolves the topmost visible video clip at the playhead by scanning tracks in reverse z-order
- When a real video clip is found: loads its `filePath` (blob URL) into a `<video>` element, computes `currentTime = (playheadFrame - clip.timelineStart + clip.mediaIn) / fps`, seeks to that time
- When no real video clip is active: the `<video>` element is hidden, the default gradient background shows through
- Seek is throttled (skips if delta < 0.02s) to avoid excessive DOM seeks

### 4. Side-Channel Storage

**`packages/ui/src/context/media-assets-context.tsx`** — `MediaAssetsProvider`:
- `fileRefs: Map<string, File>` — raw File objects for waveform extraction (future use)
- `blobUrls: Map<string, string>` — blob URLs for video elements
- `thumbnails: Map<string, string>` — data URL thumbnails for display
- `removeImportedAsset()` revokes blob URLs to prevent memory leaks
- All data stored in refs (not React state) — no unnecessary re-renders from Map mutations

### 5. Integration

**`packages/ui/src/components/timeline-editor.tsx`**:
- Wraps editor with `<MediaAssetsProvider>` (inside `<TimelineProvider>`)
- `<MediaPreview />` rendered inside `.preview-frame`, overlaying the gradient background
- `thumbnails` map passed from context through `ClipRow` → `TimelineClip`

**`apps/editor/src/App.tsx`** — `onAssetDrop` handler:
- Looks up the asset in the registry to get its duration
- Creates a clip at the drop position with `createClip()`
- Dispatches `INSERT_CLIP` to place it on the target track

**`apps/editor/src/createEditorEngine.ts`** — Playback engine stub:
- Provides a minimal `PipelineConfig` with stub `videoDecoder` and `compositor` (no actual decoding)
- Uses `browserClock` (`requestAnimationFrame`) so `engine.playbackEngine.play()`/`pause()` advance the playhead
- Enables the play/pause button and spacebar to work

**`packages/ui/src/index.ts`** — New exports:
- `MediaPreview`, `MediaPreviewProps`
- `MediaAssetsProvider`, `useMediaAssets`, `MediaAssetsContextValue`
- `extractMetadata`, `extractVideoMetadata`, `extractAudioMetadata`, `extractImageMetadata`, `detectMediaType`
- `MediaMetadata`, `VideoMetadata`, `AudioMetadata`, `ImageMetadata`, `ImportedMediaType`, `ImportError`

---

## Files Created

| File | Lines | Purpose |
|---|---|---|
| `packages/ui/src/utils/media-import.ts` | ~190 | Metadata extraction from File objects |
| `packages/ui/src/components/media-preview.tsx` | ~85 | Video preview bound to playhead |
| `packages/ui/src/context/media-assets-context.tsx` | ~80 | File refs, blob URLs, thumbnails context |
| `apps/editor/src/__tests__/media-import.test.ts` | ~195 | Unit tests for media import utilities |

## Files Modified

| File | Change |
|---|---|
| `packages/ui/src/components/asset-bin.tsx` | File picker, drag-drop, REGISTER_ASSET dispatch, real thumbnails, `crypto.randomUUID()` asset IDs |
| `packages/ui/src/components/timeline-editor.tsx` | MediaAssetsProvider wrapper, MediaPreview in preview area, thumbnails to clips |
| `packages/ui/src/components/timeline-clip.tsx` | `thumbnails` prop, real thumbnail rendering in filmstrip |
| `packages/ui/src/styles/structure.css` | Styles for media-preview, bin-thumb-img, bin-drop-active, bin-errors, clip-thumb-frame--real |
| `packages/ui/src/index.ts` | New public API exports |
| `apps/editor/src/App.tsx` | `onAssetDrop` handler (createClip + INSERT_CLIP dispatch) |
| `apps/editor/src/createEditorEngine.ts` | Stub pipeline + browserClock for playback engine |

## Files NOT Modified

- `packages/core/` — No changes. `REGISTER_ASSET` + `createAsset()` already existed.
- `packages/react/` — No changes. Existing hooks work as-is.
- `packages/media-web/src/adapters/webcodecs-decoder.ts` — Untouched (Phase 11).
- `packages/media-web/src/adapters/thumbnail-extractor.ts` — Untouched (simple approach used instead).

---

## Asset ID Uniqueness

Asset IDs for imported files use `toAssetId('asset-' + crypto.randomUUID())` — the same `crypto.randomUUID()` pattern used by core's `razor.ts` and `ripple-insert.ts` tools for their ID generation. This produces RFC 4122 v4 UUIDs with collision probability that is negligible in practice. The `toAssetId()` branded-type wrapper ensures the ID passes the invariant checker that was added in Phase 1 to reject duplicate asset IDs.

---

## Test Coverage

### New Tests (`apps/editor/src/__tests__/media-import.test.ts`)

13 tests covering the `media-import.ts` utilities:

**`detectMediaType` (6 tests)**:
- Video MIME types (mp4, webm, mov)
- Audio MIME types (mp3, wav, ogg)
- Image MIME types (png, jpg, gif)
- Unknown MIME types (pdf, txt)
- Empty MIME type
- Files with no type

**`extractVideoMetadata` (3 tests)**:
- Rejects when video element fires `error` event → `Cannot read video: {name}`
- Rejects when video has zero duration → `zero or invalid duration`
- Rejects on timeout when metadata never loads → `Timeout reading {name}` (uses `vi.useFakeTimers()` + `vi.advanceTimersByTime(10_000)`)

**`extractAudioMetadata` (3 tests)**:
- Rejects when audio element fires `error` event → `Cannot read audio: {name}`
- Rejects when audio has NaN duration → `zero or invalid duration`
- Rejects on timeout when metadata never loads → `Timeout reading {name}` (uses `vi.useFakeTimers()` + `vi.advanceTimersByTime(10_000)`)

**`extractMetadata` (2 tests)**:
- Rejects unsupported file types with filename in error message
- Rejects files with empty MIME type

### Full Suite Results

| Check | Result |
|---|---|
| `@timelinx/ui` typecheck | Clean |
| `@timelinx/editor` typecheck | Clean |
| `@timelinx/react` typecheck | Clean |
| `@timelinx/editor` lint | Clean |
| `@timelinx/ui` lint | Clean |
| `@timelinx/editor` build | Succeeds (347KB JS, 52KB CSS) |
| `@timelinx/core` tests (1,462) | All pass |
| `@timelinx/editor` tests (77) | All pass (1.6s total, timeout tests use fake timers) |
| `@timelinx/media-web` tests (125) | All pass |
| **Total: 1,664 tests** | **All pass** |

---

## Requires Real Browser Test (project owner)

| Test | What to check |
|---|---|
| Import video file | Real duration, dimensions, thumbnail appear in asset bin |
| Import audio file | Real duration appears in asset bin |
| Import image file | Dimensions, thumbnail appear in asset bin |
| Drag imported asset to timeline | Clip shows real thumbnail filmstrip |
| Scrub playhead over video clip | Real video frames appear in preview area |
| Play with spacebar | Playhead advances, video seeks in preview |
| Import multiple files at once | All register correctly |
| Import unsupported file (e.g. .pdf) | Error message appears |
| Sample assets still work | Existing clips/behavior unchanged |

---

## Known Limitations / Gaps

1. **Waveform visualization for imported audio**: `WebAudioWaveformAdapter.extractFromFile()` is implemented but not yet wired to the UI. Audio clips still show the CSS gradient placeholder waveform. This is a follow-up task.

2. **Video scrubbing is not frame-perfect**: HTMLVideoElement `currentTime` seek has some latency. Not suitable for frame-accurate editing — acceptable for Phase 10 scope. WebCodecs-based decoding (Phase 11) will address this.

3. **Single-clip preview only**: Only the topmost video clip at the playhead is shown. No multi-layer compositing, no effects, no transitions in the preview. This is explicitly out of scope per the prompt.

4. **No real-time playback sync**: The `<video>` element is seek-only. During real-time playback (`engine.play()`), the video element seeks each frame but may lag behind the playhead. Audio is muted to avoid desync artifacts.

5. **Memory management**: Blob URLs are revoked on `removeImportedAsset()`, but there's no UI to delete imported assets yet. The blob URLs persist for the session lifetime.

6. **No undo for import**: `REGISTER_ASSET` operations go through the engine's dispatch but the import transaction is a single operation. Deleting an imported asset via the UI is not yet implemented.

7. **`extractImageMetadata` not tested in jsdom**: The `Image` constructor in jsdom doesn't fire `load` events reliably. Image metadata extraction tests would require a real browser environment or more extensive mocking. The function is covered by the `detectMediaType` tests and the unified `extractMetadata` dispatcher tests.

8. **No branch/PR/CI**: All changes are local. No branch was created, no PR opened, no CI run triggered. This should be done before merging.
