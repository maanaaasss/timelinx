# Architecture Review — Media UI Layer (Phases 10–11)

**Reviewer:** External adversarial reviewer (no prior involvement in Phases 10–11)
**Date:** 2026-07-26
**Scope:** `packages/ui/src/utils/media-import.ts`, `packages/ui/src/components/canvas-compositor.tsx`, `packages/ui/src/hooks/use-export.ts`, `packages/ui/src/context/media-assets-context.tsx`

---

## Summary

These four files form the complete real-media pipeline for the Timelinx editor: file ingestion (import), per-frame compositing (canvas), export rendering (MediaRecorder loop), and the shared side-channel store that bridges browser File/Blob objects to core's serializable asset registry.

The code is post-placeholder — real implementations, real browser APIs. By the standard of Phase 7 (placeholder adapters), this is substantially more complete. By the standard of Phase 1 (structural correctness, invariant enforcement, silent failure modes), there are meaningful problems. Several are user-visible data-loss risks; a few are latent bugs that only manifest under hostile input.

| Severity | Count |
|---|---|
| CRITICAL | 2 |
| HIGH | 5 |
| MEDIUM | 5 |
| LOW | 5 |

---

## CRITICAL Findings

### C1. Timeout fires but blob URL is never revoked — permanent leak per failed import

**File:** `src/utils/media-import.ts:61–141`

`extractVideoMetadata` wraps an inner Promise with `withTimeout`. If the 10-second timeout fires first, `withTimeout` rejects the outer Promise — but the inner Promise's event listeners on the `<video>` element remain live, and more importantly, the blob URL created at line 82 (`URL.createObjectURL(file)`) is never revoked because `cleanup()` only runs from inside the inner Promise's `loadedmetadata` or `error` event handlers.

**Trace:**
1. `const url = URL.createObjectURL(file)` — line 82, blob URL created.
2. Timeout fires at 10 s. `withTimeout` calls outer `reject`.
3. Caller receives error, discards the import.
4. Inner Promise's `loadedmetadata`/`error` have not fired. `cleanup()` (which calls `revoke(url)`) has not run.
5. Blob URL lives until either (a) the event eventually fires (non-deterministic), or (b) the page is unloaded.

`extractAudioMetadata` (lines 148–182) and `extractImageMetadata` (lines 188–228) have the identical pattern. Every timed-out import leaks one blob URL permanently within the session.

**Severity: CRITICAL** — silent, cumulative, permanent within a session. A user repeatedly importing large or slow-loading files will accumulate blob URLs without bound.

---

### C2. `MediaElementPool.getVideo` appends `<video>` elements to `document.body` with no eviction — pool grows unboundedly

**File:** `src/components/canvas-compositor.tsx:73–90`

```typescript
getVideo(clipId: string, src: string): HTMLVideoElement {
  let video = this.videoElements.get(clipId);
  if (!video) {
    video = document.createElement('video');
    // ...
    document.body.appendChild(video);          // appended to DOM
    this.videoElements.set(clipId, video);
  }
  // ...
}
```

Every unique `clipId` that is ever rendered creates a `<video>` element in `document.body`, held indefinitely until `pool.destroy()` (called only on component unmount). There is no `releaseVideo(clipId)` method and no eviction on clip deletion.

**Consequences:**
- User imports 20 clips, renders them, deletes 18 — 20 `<video>` elements remain in DOM, each actively buffering (`preload='auto'`).
- Each pooled `<video>` element buffering HD video is measurable memory and decode pressure.
- During export, `ExportRunner` creates its own `MediaElementPool` (line 225 in use-export.ts), so a parallel second set of `<video>` elements is appended to body during export alongside the compositor's live set.

`destroy()` correctly cleans up (pause, clear src, remove from DOM, lines 113–126). The problem is `destroy()` is only called on unmount, never on individual clip deletion.

**Severity: CRITICAL** — memory and DOM growth proportional to unique clips rendered since last mount, not clips currently on the timeline.

---

## HIGH Findings

### H1. Blob URL revoked while pool's `<video>` still uses it — clip renders black, export silently corrupted

**File:** `src/context/media-assets-context.tsx:68–77` × `src/components/canvas-compositor.tsx:84–90`

`removeImportedAsset` revokes the blob URL immediately:
```typescript
const url = blobUrlsRef.current.get(assetId);
if (url) URL.revokeObjectURL(url);
blobUrlsRef.current.delete(assetId);
```

The pool's `<video>` still has that URL as `this.src`. After revocation, the element enters a `MEDIA_ERR_SRC_NOT_SUPPORTED` error state. `getVideo` checks `this.videoSrcMap.get(clipId) !== src` (line 84) — the src string is the same revoked URL, so no reload is triggered. `video.readyState` drops below 2. `renderVideo` skips the `drawImage` call. The clip renders black.

**This is exactly the scenario the validation prompt asked about:** "What happens if a file is deleted from the Asset Bin while actively being used in an in-progress export?" During export, `getBlobUrl` returns `undefined`, `resolveAssetSrc` returns `null`, `renderLayer` hits the early-return at lines 321–324. The clip renders black for the rest of the export. The export does not fail, does not warn, and produces silently corrupted output.

**Severity: HIGH** — data loss in exported video; no error surfaced to the user.

---

### H2. `getAllThumbnails` returns a live, mutable Map reference — callers can corrupt context state

**File:** `src/context/media-assets-context.tsx:79–82`

```typescript
const getAllThumbnails = useCallback(
  () => thumbnailsRef.current,   // returns the actual internal Map
  [],
);
```

In `timeline-editor.tsx:280`:
```typescript
const thumbnails = mediaAssets.getAllThumbnails();
```

This Map is passed as a prop to `ClipRow` and `TimelineClip`. Any component that calls `.set()` or `.delete()` on it directly mutates the context's internal store without triggering any notification or re-render. The return type should be `ReadonlyMap<string, string>`.

**Severity: HIGH** — not currently exploited, but `thumbnails` is passed widely and any future consumer treating it as writable would silently corrupt context state.

---

### H3. Audio A/V sync error — schedule computed against `currentTime=0` but started when `currentTime>0`

**File:** `src/hooks/use-export.ts:313–317, 589–613`

`computeAudioSchedule` is called with `audioCtxCurrentTime = 0` (line 315). This produces `entry.when = 0 + timelineStartSec`. Then `startPendingAudio` uses `baseTime = this.audioCtx.currentTime` (the real, non-zero time at the point the audio sources are started):

```typescript
source.start(
  Math.max(this.audioCtx.currentTime, baseTime + entry.when),
  entry.offset,
  entry.duration,
);
```

For a clip at timeline frame 0: `entry.when = 0`. `source.start(max(ctxTime, ctxTime + 0))` = `source.start(ctxTime)`. MediaRecorder began recording when `captureStream` was called and recording started — but the AudioContext was already running for some time (during audio loading). The audio starts at `ctxTime` relative to the AudioContext, which is not synchronized to the video recording start.

The latency between `AudioContext` creation (line 295) and `startPendingAudio` (line 404) includes all audio loading time — potentially 100–500ms for large files. This offset is baked permanently into the export's A/V sync.

**Severity: HIGH** — measurable A/V sync error (50–500ms) on every export containing audio.

---

### H4. `ExportRunner.cancel()` calls `cleanup()`, then `.finally()` calls `cleanup()` a second time

**File:** `src/hooks/use-export.ts:560–567, 663–665`

```typescript
cancel(): void {
  this.cancelled = true;
  // ...
  this.cleanup();   // cleanup #1
}
```

In the hook:
```typescript
runner.run()
  .catch(...)
  .finally(() => {
    runner.cleanup();   // cleanup #2 — always fires after run() settles
    runnerRef.current = null;
  });
```

When `cancel()` is called: `this.cancelled = true` causes the render loop's `tick` to call `resolve()`, `run()` settles, `.finally()` fires, `cleanup()` is called a second time. The second call operates on a pool that was already destroyed and replaced with a new empty `MediaElementPool` (line 585: `this.pool = new MediaElementPool()`). The new pool's `destroy()` is called immediately — harmless, but the pattern is architecturally fragile.

**Severity: HIGH** — not a crash today due to null guards, but the double-cleanup is one refactoring away from a real double-free.

---

### H5. `withTimeout` does not abort inner work on timeout — seeks, canvas allocations, and potential late revocations continue after caller has given up

**File:** `src/utils/media-import.ts:61–69`

When `withTimeout` rejects, the inner Promise continues. For video: the `loadedmetadata` handler fires late, the video is seeked, a canvas is created, `toDataURL` is called, and `resolve()` is called on an already-rejected (settled) Promise (no-op). This means:
- Canvas allocations happen for no benefit after the timeout.
- Seek operations (network/decode activity) continue on a blob URL the caller has abandoned.
- The late `cleanup()` call does eventually revoke the blob URL — which is the only mechanism by which C1's leaked URL is ever cleaned up, but it is non-deterministic.

**Severity: HIGH** — post-error resource activity creates confusing behavior; cleanup of C1 is accidental rather than guaranteed.

---

## MEDIUM Findings

### M1. `detectMediaType` trusts MIME type from File object — extension-based, not content-validated

**File:** `src/utils/media-import.ts:49–55`

`file.type` is set by the browser from the file extension, not from file header inspection. A `.mp4` renamed to `.mp3` returns `'audio/mpeg'` and is processed as audio. `extractAudioMetadata` fails with `Cannot read audio: renamed-video.mp3` — accurate error message but no hint of the true cause. Files with no extension and empty `file.type` (common for files received via certain drag sources) fall through to `'unsupported'` even if the browser could play them.

**Severity: MEDIUM** — user confusion on edge cases; no data loss.

---

### M2. `isImageSource` uses `filePath` regex fallback — blob URLs have no extension, misclassifies assets not imported through standard flow

**File:** `src/components/canvas-compositor.tsx:156–160`

```typescript
return /\.(avif|bmp|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(asset.filePath);
```

If `getFile()` returns undefined (asset was registered without going through the import flow, e.g., OTIO import or demo mode) and `filePath` is a blob URL (`blob:http://...`), the regex finds no extension and returns `false`. The image asset is treated as video, passed to `renderVideo`, and renders black because `<video>` cannot decode an image source.

**Severity: MEDIUM** — affects non-standard import paths.

---

### M3. Export loop produces repeated frames when video seek hasn't completed — frame-accuracy not guaranteed

**File:** `src/hooks/use-export.ts:427–508` × `src/components/canvas-compositor.tsx:354–379`

The export loop drives frame advancement via wall-clock elapsed time (`advanceExportFrameClock`). `renderVideo` issues `video.currentTime = targetTime` (a seek request) and immediately calls `ctx.drawImage` if `readyState >= 2`. Video seeking is asynchronous; `readyState` stays at `>=2` with stale content until the seek completes. At export speed, the next frame arrives before the seek finishes, and the same stale video frame is drawn again. The output contains duplicate frames, reducing effective frame rate.

This is inherent to the `captureStream + MediaRecorder + rAF` architecture — it cannot be frame-accurate without a callback mechanism per frame (e.g., `requestVideoFrameCallback`).

**Severity: MEDIUM** — known limitation of the architecture, but not documented. Users expecting accurate export of fast-motion video will notice.

---

### M4. 27 unconditional `console.log` statements in `ExportRunner.run()` ship to production builds

**File:** `src/hooks/use-export.ts:257–543`

`ExportRunner.run()` contains 27 `console.log` calls (verified by count) plus per-frame logging in the render loop (lines 473–489, firing every frame for the first 3 frames of every export, then every 30 frames). `canvas-compositor.tsx` has additional per-frame logs (lines 302–315, 364–366, 406–414) gated on `_debugFrameCount <= 3`. None of these are gated on `process.env.NODE_ENV` or a debug flag.

In production, every export generates hundreds of console lines. The per-frame canvas pixel read at lines 476–485 (`ctx.getImageData(0, 0, 1, 1)`) adds a GPU readback per logged frame — measurably expensive.

**Severity: MEDIUM** — performance and professionalism issue.

---

### M5. `addImportedAsset` overwrites existing blob URL without revoking previous — double-register leaks old URL

**File:** `src/context/media-assets-context.tsx:59–66`

```typescript
blobUrlsRef.current.set(assetId, blobUrl);  // silently overwrites
```

If `addImportedAsset` is called twice with the same `assetId` (bug in caller, or re-import), the previous blob URL is overwritten without being revoked. No guard, no warning. The old blob URL leaks.

**Severity: LOW** — unlikely in current flow, but the missing guard is a correctness gap.

---

## LOW Findings

### L1. `extractVideoMetadata` does not validate `videoWidth`/`videoHeight` — zero dimensions produce NaN draw calls

**File:** `src/utils/media-import.ts:100–117`

For audio-only `.mp4` files (no video track), `video.videoWidth === 0`. `canvas.width = 0`. `canvas.toDataURL()` returns valid data for a blank canvas. Asset is registered with `width: 0, height: 0`. In compositor: `scale = Math.min(canvasW/0, canvasH/0) = Infinity`. `dw = 0 * Infinity = NaN`. `ctx.drawImage(video, NaN, NaN, NaN, NaN)` — browsers silently ignore NaN drawImage. Clip renders black with no error.

---

### L2. `as string` / `as number` casts against branded types — 8+ instances, no unjustified `as any`

**File:** `src/components/canvas-compositor.tsx` (multiple lines)

All casts found are justified by the nominal-only branded type system requiring unwrapping for use with DOM APIs. No `as any` or `as unknown` found in the four files under review — better type discipline than Phase 1's core codebase.

---

### L3. `withTimeout` loses the original rejection error as `cause`

**File:** `src/utils/media-import.ts:63`

The timeout rejection `new Error('Timeout reading ...')` provides no `cause` field. The caller cannot distinguish a timeout from other errors except by message string matching. Use `new Error('...', { cause: originalError })` pattern.

---

### L4. `ExportRunner` holds a stale `engine` reference if engine is replaced while export is in-flight

**File:** `src/hooks/use-export.ts:241–248` × `apps/editor/src/App.tsx:22–29`

`App.tsx` creates a new engine on demo/blank toggle. `ExportRunner` captures the engine at construction time. If the engine is replaced during an active export, `this.engine.seekTo()` and `this.engine.getState()` operate on the discarded engine for the remainder of the export. The hook does not cancel the in-flight export when the engine prop changes.

---

### L5. `MediaElementPool.getVideo` calls `video.load()` on src change even if element has not finished loading previous src

**File:** `src/components/canvas-compositor.tsx:84–88`

```typescript
if (this.videoSrcMap.get(clipId) !== src) {
  video.src = src;
  video.load();
  this.videoSrcMap.set(clipId, src);
}
```

`video.load()` aborts any in-progress network request and resets the element. If called repeatedly during rapid scrubbing on a slow connection, each scrub event can trigger a fresh load abort — causing the element to thrash between reset states rather than buffering. The `lastSeekRef` guard (compositor line 359) reduces redundant seeks during rendering but does not prevent rapid src changes if the clip's asset changes (e.g., via undo/redo).

---

## Browser Compatibility — Safari

**NOT RUN** — Safari was not available in this environment.

From code analysis:
- `getSupportedMimeType` (use-export.ts:49–65) only probes for WebM MIME types (`video/webm;codecs=vp9,opus`, `video/webm;codecs=vp8,opus`, `video/webm`).
- Safari's `MediaRecorder` supports only `video/mp4` (H.264/AAC) — no WebM support as of Safari 17.
- All three WebM types return `false` from `MediaRecorder.isTypeSupported` on Safari.
- `getSupportedMimeType` returns `null`.
- `ExportRunner.run()` immediately throws: `'No supported video MIME type found for MediaRecorder'`.
- **Export is completely non-functional on Safari.** This was flagged as a risk in Phase 7 and remains unaddressed.

`canvas.captureStream()` is not supported on Safari (the API exists but is behind a flag and not enabled in stable Safari as of current versions). Import and preview are unaffected since they use `<video>`, `<img>`, and Canvas2D APIs which are fully supported.

**Required manual testing for project owner:** Full import → preview → export flow in Safari, specifically testing `captureStream` availability, `MediaRecorder` MIME type probing, and `AudioContext.createMediaStreamDestination` behavior.

---

## Prioritized Top Risks

### Risk 1: Unbounded `<video>` pool growth (C2) — CRITICAL
Every clip ever rendered creates a permanently-retained `<video>` element in DOM until unmount. With `preload='auto'`, each actively buffers. In a session with many imports, this accumulates measurably.

### Risk 2: Blob URL leak on timeout (C1) — CRITICAL
Every failed or slow import leaks one blob URL per timeout expiry. Silent and cumulative.

### Risk 3: Silent export corruption when asset deleted during export (H1) — HIGH
Clip renders black in output. No error, no warning to user.

### Risk 4: A/V sync error on every audio export (H3) — HIGH
Audio schedule computed at `t=0` but started at `t>0`. 50–500ms sync error baked into every exported file.

### Risk 5: Safari export completely broken (structural) — HIGH
Zero-line fix cannot solve this — requires adding `video/mp4` MIME type support and validating `captureStream` / `AudioContext` availability.
