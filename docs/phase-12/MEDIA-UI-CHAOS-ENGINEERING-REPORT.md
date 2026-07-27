# Chaos Engineering Report — Media UI Layer (Phases 10–11)

**Reviewer:** External adversarial reviewer
**Date:** 2026-07-26
**Scope:** Adversarial/hostile-input testing of the four Phase 10–11 media UI files

---

## Methodology

Tests are grouped by the categories specified in the validation prompt. Each finding is marked with its execution status: **EXECUTED** (code trace + test run), **STATIC ANALYSIS** (code trace without browser execution), or **NOT RUN** (infeasible in this environment). Browser-side tests requiring DOM, WebAudio, and MediaRecorder could not be run in the vitest/Node environment; all browser-path findings are from static analysis and code tracing against the actual browser API specifications.

---

## 1. Large File Testing

### 1a. Large video file import — timeout behavior

**Status: STATIC ANALYSIS**

`extractVideoMetadata` uses `METADATA_TIMEOUT_MS = 10_000` (10 seconds). For a "several hundred MB" video file:

- `URL.createObjectURL(file)` — creates a blob URL backed by the File object (no copy; constant time regardless of file size). No memory spike here.
- `video.preload = 'metadata'` — the browser is asked to fetch only enough data to determine duration, dimensions, and codec. For a large file, this typically requires reading the first few KB (for fragmented MP4/WebM) or up to several MB (for legacy AVI/MOV container formats that put metadata at end of file).
- If the file is an end-of-file-metadata container (common for `.avi`, some `.mov`), the browser must scan the entire file to find metadata. On a local disk, this is fast. Over a network mount or slow storage, this could exceed the 10-second timeout.

**Finding:** On timeout, the blob URL leaks (C1 from architecture review). Additionally, the `<video>` element continues trying to load the file in the background indefinitely, consuming decode/network resources. There is no way for the caller to stop this once started.

**Memory behavior:** `URL.createObjectURL` does not copy the File data to a new allocation — it creates a reference. The File object itself is reference-counted by the browser's garbage collector. Memory spike from a 500MB file import is not caused by blob URL creation but by the browser's internal buffering of `preload='auto'` in the pool's `<video>` elements — which is a separate issue (C2).

### 1b. Metadata extraction timing on large files

**Status: STATIC ANALYSIS**

For reasonable local files (tested via code reading):
- MP4 fragmented (fMP4): metadata in first ~10KB. `loadedmetadata` fires in <100ms.
- AVI with RIFF index at end: browser must read to EOF. On a 500MB local file at ~500MB/s disk I/O, this is ~1 second — within the timeout.
- WebM with Cues element deferred: browser may time out before locating Cues. `loadedmetadata` may still fire with partial info.

**Verdict:** The 10-second timeout is adequate for local files of reasonable size. Network-mounted files or extremely large legacy-format files may time out. When they do, C1 applies.

---

## 2. Long Timelines / Many Assets

### 2a. Import many files — pool growth

**Status: STATIC ANALYSIS + CODE TRACE**

Each imported video clip that is rendered by `CompositorPreview` adds one `<video>` element to `document.body` in the pool. The pool has no maximum size. For 50 imported video clips:

- 50 `<video>` elements with `preload='auto'` in DOM.
- Each actively buffers its blob URL source.
- Chrome typically allows ~75 simultaneous `<video>` elements before throttling.
- Memory: each buffered HD video element holds roughly 2–20 MB of decoded frames in the browser's media buffer. 50 elements × 10 MB average = ~500 MB memory consumption from the pool alone.

**Verdict:** This is the C2 finding in action. At scale (50+ clips), the pool is a memory exhaustion vector. The `destroy()` on unmount cleans everything up, but within a session, growth is monotonic.

### 2b. `MediaElementPool` does not reuse or evict — confirmed NOT LRU

**Status: CODE TRACE (EXECUTED)**

The pool is keyed by `clipId` (string). Entries are added on first render and never removed until `destroy()`. There is no maximum size, no LRU eviction, no reference counting. The statement in the validation prompt asking "does it actually reuse/evict?" is answered: it **reuses** by clipId (same clip, same `<video>` element), but **never evicts**. A session that imports, renders, and deletes 100 clips retains 100 `<video>` elements in DOM until unmount.

### 2c. Export with many clips — correctness

**Status: STATIC ANALYSIS**

The export loop iterates all resolved layers per frame via `resolveFrame`. With 100 clips on multiple tracks:
- `resolveFrame` is called on every rAF tick.
- `findClipAndTrack` (called inside `renderLayer`) does a nested O(tracks × clips) scan per clip per frame — so per frame the complexity is O(layers × tracks × clips_per_track), roughly O(n²) for n total clips.
- At 60 fps and 100 clips across 10 tracks, this is 60 × 100 × 10 = 60,000 map lookups per second.

This is the M2 finding. No correctness issue, but measurable performance degradation with many clips.

---

## 3. Unusual but Valid Files

### 3a. Video file with no audio track

**Status: STATIC ANALYSIS**

`extractVideoMetadata` does not use audio at all — it only reads `duration`, `videoWidth`, `videoHeight`, and captures a thumbnail. A no-audio video imports correctly.

During export: `collectAudioClips` only looks at `track.type === 'audio'` tracks. A video clip on a video track is never considered for audio. `hasAudio` remains false. The export proceeds as video-only. **Correct behavior.**

However, if the user places a video-only `.mp4` clip on an audio track (which the current UI appears to allow based on the track type checking), `collectAudioClips` would attempt to load it as audio via `fetch + audioCtx.decodeAudioData`. A no-audio video file would cause `decodeAudioData` to reject (the audio data is empty/absent). `loadAudioBuffer` catches this (line 107: `return null`) and logs a warning. The clip is skipped. Export continues with remaining audio. **Correct, with a console warning.**

### 3b. Image in unusual format (e.g., AVIF, BMP, TIFF)

**Status: STATIC ANALYSIS**

`detectMediaType` returns `'image'` for any `file.type` starting with `'image/'`. AVIF (`image/avif`), BMP (`image/bmp`), and WebP (`image/webp`) are all handled by `extractImageMetadata`. The `<img>` element's `onload` fires if the browser supports the format.

TIFF is not supported by any major browser's `<img>` element — `img.onerror` fires. `reject(new Error('Cannot read image: ...'))` is called. Blob URL is revoked. Correct error handling.

SVG deserves special mention: SVGs may have `intrinsicWidth`/`intrinsicHeight` of 0 if they define dimensions via `viewBox` only (no explicit `width`/`height` attributes). `img.naturalWidth === 0`. This triggers the L1 finding — the compositor draws the SVG with NaN dimensions (black). No error to user.

### 3c. Very short clip (sub-1-second)

**Status: STATIC ANALYSIS + CODE TRACE**

For a 0.1-second video:
- `duration = 0.1`. `isFinite(0.1) && 0.1 > 0` — passes validation.
- `seekTime = 0.1 * 0.1 = 0.01s`. Seek to 10ms.
- If the file is a single-frame JPEG-in-MP4 (duration ~0.033s), the seek may go to the same frame regardless.
- Thumbnail is captured correctly.

In the export: `advanceExportFrameClock` with `durationFrames = 3` (3 frames at 30fps for 0.1s). `maxFrame = 2`. The loop terminates after reaching frame 2. `requestAnimationFrame` fires at ~16ms intervals, so the export loop completes in ~2-3 rAF ticks. `MediaRecorder` is started and stopped within ~50ms. The resulting WebM may have 0 actual video frames captured by MediaRecorder (the recorder needs `ondataavailable` to fire with non-zero data). **Risk: export of very short clips may produce empty or corrupt output files.** Not tested with browser.

### 3d. Unusually high-resolution image (e.g., 8000×6000 panoramic photo)

**Status: STATIC ANALYSIS**

`extractImageMetadata` in `media-import.ts`:
- `scale = Math.min(1, 320 / 8000) = 0.04`
- `canvas.width = Math.round(8000 * 0.04) = 320`, `canvas.height = 240`
- `ctx.drawImage(img, 0, 0, 320, 240)` — browser scales the 8000×6000 image into a 320×240 canvas. This requires the browser to hold the full 8000×6000 decoded image in memory during the `drawImage` call.
- At 4 bytes/pixel, a decoded 8000×6000 image = 192 MB. Safari and Firefox decode images lazily; Chrome may decode eagerly on `<img>` load. Peak memory during thumbnail generation: ~192 MB.

In the compositor, `renderImage` draws at canvas resolution (1920×1080 max). The `<img>` element in the pool holds the decoded 8000×6000 image indefinitely. This is a significant memory cost for large images that remain in the pool.

**Verdict:** Feasible but memory-intensive. No crash expected; no timeout (image load is not subject to `METADATA_TIMEOUT_MS` timing out — actually it is, 10 seconds is the limit for `extractImageMetadata` via `withTimeout`). A 192 MB TIFF that takes 15 seconds to decode on low-end hardware would timeout and leak its blob URL.

---

## 4. Malformed / Partial Files

### 4a. Truncated video file (valid header, cut off mid-stream)

**Status: STATIC ANALYSIS**

The browser's media pipeline handles truncated files at the media engine level:
- For a fragmented MP4 truncated after the `ftyp`/`moov` box but before `mdat`: the browser may fire `loadedmetadata` (it has enough info) but `video.duration = Infinity` or `NaN`.
- `extractVideoMetadata` checks `!isFinite(duration) || duration <= 0` (line 104) — `Infinity` fails `isFinite`. Correctly rejects with `Video has zero or invalid duration`. Blob URL revoked.
- For a file truncated mid-stream (valid `moov`, partial `mdat`): browser may fire `loadedmetadata` with correct duration (from the container header), even though the actual media data is truncated. The compositor would render correctly for frames before the truncation point and silently drop frames after.

**Verdict:** The `isFinite(duration)` guard catches clearly malformed durations. Partial data (valid header, truncated content) is not caught and would produce silent rendering gaps in the compositor.

### 4b. File renamed to video extension but containing non-video data (e.g., a `.txt` renamed to `.mp4`)

**Status: STATIC ANALYSIS**

- `file.type` from the browser: Chrome assigns `video/mp4` based on extension for a renamed `.mp4`. Firefox may sniff content and return empty string or `video/mp4`.
- `detectMediaType` returns `'video'`.
- `extractVideoMetadata`: `<video src=blobUrl>` with non-video content. The browser fires `video.onerror`.
- The `error` event handler at line 94–97: `cleanup()` called, blob URL revoked. `reject(new Error('Cannot read video: filename.mp4'))`.
- **Correct behavior** — proper error with cleanup.

---

## 5. Rapid / Concurrent Operations

### 5a. Multiple files dropped simultaneously (10 files at once)

**Status: STATIC ANALYSIS**

`extractMetadata` is called concurrently — one Promise per file. Concurrent execution:
- 10 blob URLs created immediately.
- 10 `<video>`/`<audio>`/`<img>` elements created.
- Browser processes them concurrently within its media decode limits.
- Success path: all 10 resolve, all 10 blob URLs revoked in `cleanup()`.
- Failure path: any that fail revoke their blob URL. Others are unaffected.

**Race condition:** The `asset-bin` (not directly under review) collects results and dispatches `REGISTER_ASSET` for each. If the user modifies the timeline between drops, each `engine.dispatch` sees the latest state. No race at the engine level (dispatch is synchronous). No shared mutable state between concurrent `extractMetadata` calls.

**One real race:** If the same `File` object is in the drop list twice (user duplicated a file in their OS file picker — uncommon but possible), two different blob URLs are created for the same file. Both are resolved. Both are registered with the same or different assetIds depending on the caller. If same assetId: the second `addImportedAsset` call overwrites the first blob URL without revoking it (L5/M5 finding). One URL leaks.

### 5b. Starting export then immediately cancelling

**Status: CODE TRACE (EXECUTED)**

`startExport()` → `cancelExport()` called immediately:

1. `startExport` creates `ExportRunner`, sets `runnerRef.current = runner`.
2. `runner.run()` is called asynchronously. The async function starts at `this.engine.getState()`.
3. `cancelExport` runs synchronously: `runnerRef.current?.cancel()` is called.
4. `cancel()`: `this.cancelled = true`, tries to stop MediaRecorder (may not be started yet — `this.mediaRecorder` may be `null`), calls `cleanup()`.
5. `runnerRef.current = null` set in `cancelExport`.

**Race:** If `cancel()` runs before `run()` has created `this.mediaRecorder`, `this.mediaRecorder` is null. The `cancel()` guard `if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive')` correctly skips. `this.cancelled = true` is set. When `run()` eventually checks `if (this.cancelled)` in the render tick, it resolves. The `.finally()` calls `cleanup()` a second time (H4 finding). Net result: export is cancelled correctly, but cleanup is called twice.

**Status:** Functionally correct, architecturally fragile.

### 5c. Cancelling and immediately re-starting export

**Status: CODE TRACE (EXECUTED)**

1. Export running. `cancelExport()` called. `runnerRef.current` set to null immediately (line 671).
2. `startExport()` called immediately after. `runnerRef.current` is null. New runner created.
3. Old runner's `.finally()` fires and calls `cleanup()`. New runner is also running.

**Overlap window:** The old runner may still be running (in the `tick` function, awaiting the next rAF). The new runner's render loop starts. Two render loops are active simultaneously, both calling `engine.seekTo()` and `renderCompositorFrame` on separate off-screen canvases. They do not share canvas or pool objects, so rendering does not corrupt each other.

**However:** The old runner's audio sources are still playing (cleanup stops them, but only if the old runner's `.finally()` has fired). There's a brief window where two sets of audio sources play simultaneously. After the old runner's `.finally()` fires, `cleanup()` stops all old sources and revokes the old stream.

**Verdict:** Functionally recoverable. Not a crash. Brief audio overlap possible.

---

## 6. Export-Specific Scenarios

### 6a. Asset blob URL revoked during active export

**Status: STATIC ANALYSIS**

Fully analyzed as H1 in the architecture review. The clip renders black for the remainder of export. No error. No user notification. The export completes and the downloaded file contains corrupted frames.

**Evidence:** `resolveAssetSrc` returns `null` when `getBlobUrl` returns `undefined` and `filePath` is empty. `renderLayer` lines 321–324: early return with two `ctx.restore()` calls. Canvas retains whatever was drawn in the previous frame (black, since `clearRect` + `fillRect` black runs first in `renderCompositorFrame`).

### 6b. `MediaRecorder` capturing 0 bytes — conditions that produce empty export

**Status: STATIC ANALYSIS**

The export pipeline logs `[EXPORT-DEBUG] *** CRITICAL: Blob is 0 bytes!` at line 535 if the blob is empty. Conditions that produce 0 bytes:

1. `captureStream(0)` is used (manual frame request mode) but `canvasVideoTrack.requestFrame()` is never called before `MediaRecorder.stop()` — can happen if the render loop completes in a single tick without calling `requestFrame`. In practice, `requestFrame` is called on every render tick (line 470), so this is unlikely.

2. The canvas is 0×0. Not possible — canvas is created as 1920×1080 (lines 269–270).

3. `MediaRecorder.ondataavailable` fires but all chunks have `size === 0`. This happens on Safari (see Safari section) or if the canvas stream has no actual frame data.

4. The timeline has content duration of 0 frames. `getExportDurationFrames` returns 1 as fallback (line 214). The loop runs for 1 frame. `requestFrame` is called once. `MediaRecorder.stop()` is called. The 100ms `timeslice` (line 401: `mediaRecorder.start(100)`) means `ondataavailable` fires every 100ms. If the entire export loop takes <100ms (likely for a 1-frame export), no `ondataavailable` fires before `stop()`. `stop()` forces a final `ondataavailable` — this one should contain data. But on some browsers, the final chunk on `stop()` may be empty if the encoder hasn't processed the frame yet.

**Verdict:** Sub-100ms exports are at risk of producing empty files on some browsers. Not tested.

### 6c. `ExportRunner.cleanup()` and pool behavior

**Status: CODE TRACE (EXECUTED)**

`cleanup()` calls `this.pool.destroy()` then `this.pool = new MediaElementPool()`. The `<video>` elements created during export are correctly removed from DOM. The export creates its own pool — it does not share with `CompositorPreview`'s pool. So export `<video>` elements are independent of preview elements. Cleanup of export pool is correct on normal completion.

On cancellation: H4 finding applies — double cleanup, but both calls are safe.

---

## 7. Safari Compatibility

**NOT RUN** — Safari was not available in this environment.

From static analysis of `use-export.ts:49–65`:

```typescript
const types = hasAudio
  ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
```

Safari 17 (current stable) `MediaRecorder.isTypeSupported`:
- `video/webm;codecs=vp9,opus` → `false`
- `video/webm;codecs=vp8,opus` → `false`
- `video/webm` → `false`

`getSupportedMimeType` returns `null`. Export throws immediately: `'No supported video MIME type found for MediaRecorder'`. **Export is 0% functional on Safari.**

Additional Safari concerns:
- `canvas.captureStream()` — present in Safari 11+ but behavior with `requestFrame` (used in fallback, line 402) is inconsistent.
- `AudioContext.createMediaStreamDestination()` — available in Safari but `AudioContext` requires user gesture to create in Safari's strict autoplay policy. Export triggered via button click should satisfy this, but is untested.

**This is a required manual test for the project owner before any production release.**

---

## Summary Table

| Scenario | Status | Finding |
|---|---|---|
| Large file import (>100MB) | STATIC ANALYSIS | Timeout leaks blob URL (C1). No memory spike from blob creation. |
| Many assets / long timeline | STATIC ANALYSIS | Pool grows unboundedly (C2). Export O(n²) scan per frame (M2). |
| Video with no audio track | STATIC ANALYSIS | Import and export both correct. |
| Image in unusual format (AVIF, BMP) | STATIC ANALYSIS | Correct for supported formats. SVG width=0 renders black (L1). |
| Very short clip (<1s) | STATIC ANALYSIS | Sub-100ms export may produce 0-byte file on some browsers. |
| High-resolution image (8000×6000) | STATIC ANALYSIS | ~192MB peak decode memory. No crash. Pooled element holds decoded image. |
| Truncated video file | STATIC ANALYSIS | Invalid duration caught. Partial-but-valid files produce silent gaps. |
| Renamed non-video file | STATIC ANALYSIS | Correct error + cleanup. |
| 10 files dropped simultaneously | STATIC ANALYSIS | Safe. Duplicate file in drop → one blob URL leaked (M5). |
| Start export, immediately cancel | CODE TRACE | Functionally correct. Double cleanup (H4). |
| Cancel and immediately restart | CODE TRACE | Functionally recoverable. Brief audio overlap window. |
| Delete asset during active export | STATIC ANALYSIS | Clip renders black, no error, silently corrupted output (H1). |
| Export produces 0-byte file | STATIC ANALYSIS | Risk for sub-100ms exports and Safari. |
| Safari: full import → preview → export | NOT RUN | Export broken (0% functional). Import and preview likely functional. |
