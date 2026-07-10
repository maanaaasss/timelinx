# Architecture Review — `@timelinx/media-web`

**Reviewer:** External adversarial reviewer (no prior involvement)
**Date:** 2026-07-10
**Scope:** `packages/media-web/src/` — all adapters, workers, and entry point

---

## Summary

`@timelinx/media-web` is a browser-native media adapter layer wrapping WebCodecs, WebAudio, WebGL, Canvas, and MediaRecorder. It provides 5 adapters (decoder, waveform, thumbnail, export, compositor) and 2 off-main-thread workers (thumbnail, waveform).

**Verdict:** The package is early-stage scaffolding with placeholder implementations. Every adapter currently renders colored rectangles instead of processing real media. This is not a criticism of the placeholder approach — it's a valid development strategy. But the architecture has several structural problems that will become real bugs when real implementations replace the placeholders.

| Severity | Count |
|---|---|
| CRITICAL | 3 |
| HIGH | 6 |
| MEDIUM | 8 |
| LOW | 4 |

---

## CRITICAL Findings

### C1. WebGLCompositor leaks GPU textures on every frame

**File:** `src/adapters/webgl-compositor.ts:236-280`

The `drawLayer` method creates a new WebGL texture (`gl.createTexture()`) on every call, uploads pixel data, draws, then deletes it. This is the correct cleanup pattern in isolation — but the method also calls `gl.getUniformLocation()` for `u_texture` and `u_opacity` on every draw call. `getUniformLocation` is expensive and should be cached.

More critically: if `drawLayer` throws between `gl.createTexture()` (line 240) and `gl.deleteTexture()` (line 279), the texture leaks permanently. There is no try/finally around the texture lifecycle. In a real compositing loop processing hundreds of frames per session, any transient error (e.g., context loss) will accumulate leaked GPU resources until the browser kills the context.

**Recommendation:** Wrap texture lifecycle in try/finally. Cache uniform locations in `initWebGL`.

### C2. WebGLCompositor silently degrades to broken state on shader compile failure

**File:** `src/adapters/webgl-compositor.ts:104-107`

```typescript
if (!vertexShader || !fragmentShader) {
  console.error('Failed to compile shaders');
  return;  // ← returns from initWebGL, leaving this.gl set but this.program null
}
```

After this return, `this.gl` is non-null but `this.program` is null. The `composite()` method checks `if (!this.gl || !this.program)` and falls back to Canvas2D — but `drawLayer()` does NOT check `this.program`. If `composite()` is ever refactored to call `drawLayer()` before the null check, or if a consumer calls internal methods, the GL state is in a half-initialized zombie. This is a latent bug.

**Recommendation:** Either throw on shader failure (fail loud) or set `this.gl = null` to ensure clean fallback.

### C3. SimpleExportAdapter has no actual frame capture — export produces empty video

**File:** `src/adapters/simple-export.ts:119-180`

The `exportFromCanvasStream` method calls `captureStream()` on the first frame, starts a `MediaRecorder`, then loops through frames calling `frameProvider(i)` — but never draws the returned canvas to the stream's source canvas. The comment on line 154 says "The frameProvider should already be drawing to a visible canvas," but `captureStream` captures from the canvas it was called on, not from arbitrary canvases.

This means the current implementation records whatever was on the first canvas at the moment `captureStream` was called. If the first canvas is static (e.g., an offscreen buffer), the export produces a static image or empty video. The `1ms` delay on line 160 is a band-aid that doesn't solve the fundamental problem.

**Severity:** CRITICAL because this is the export path — a consumer trusting this code would produce corrupt output files with no error.

---

## HIGH Findings

### H1. WebCodecsDecoderAdapter.decode() always returns placeholder — real decoding is dead code

**File:** `src/adapters/webcodecs-decoder.ts:116-140`

The `decode` method checks the cache, checks `isSupported()`, then unconditionally calls `createPlaceholderFrame()`. The `configureDecoder` method creates real `VideoDecoder` instances but they are never used — the `output` callback (line 75) is empty. The decoder is configured but never fed data, and decoded frames are never retrieved.

This means the `decoders` Map grows unboundedly as clips are configured, and `destroy()` must close them all. But since no frames are ever decoded, the frame cache is always empty, and the `concurrency` config is unused.

**Impact:** Any consumer relying on actual video decoding gets colored rectangles. The API surface promises WebCodecs but delivers nothing.

### H2. Worker clients don't propagate worker errors to the caller

**File:** `src/workers/waveform-worker.ts:269-301`, `src/workers/thumbnail-worker.ts:279-293`

Both `WaveformWorkerClient.handleWorkerMessage` and `ThumbnailWorkerClient.handleWorkerMessage` handle the `error` message type, but the thumbnail worker client silently drops the error — it just deletes the job from `processing` and calls `processQueue()`. No callback is invoked, no promise is rejected, no error is logged.

The waveform client does call `job.onError?.(event.data.message)`, which is better — but only if the caller provided an `onError` callback. If they didn't, the error vanishes.

**Impact:** Silent data loss. A worker crash during thumbnail extraction looks identical to successful completion from the caller's perspective.

### H3. ThumbnailExtractorAdapter.createThumbnailWorker uses document.createElement in environments that may not have it

**File:** `src/adapters/thumbnail-extractor.ts:68-73`

The `getVideoElement` method calls `document.createElement('video')` unconditionally. If this adapter is instantiated in a Worker context (where `document` is undefined), this throws. The adapter has no `isSupported()` check and no environment detection.

The `extractThumbnail` method does check for `OffscreenCanvas` and `document` before creating a canvas (lines 95-104), but the fallback at line 105 creates a fake object via `as unknown as HTMLCanvasElement` — this object has `getContext: () => null`, so the subsequent `canvas.getContext('2d')` returns `null`, and the entire drawing block is skipped. The consumer gets a cache entry pointing to a fake canvas with no content.

### H4. WebAudioWaveformAdapter.getAudioContext doesn't handle AudioContext constructor failure

**File:** `src/adapters/webaudio-waveform.ts:54-63`

`new AudioContext()` can throw `NotAllowedError` (if called without user gesture in some browsers) or `NotSupportedError` (if the browser limits AudioContext instances). The method has no try/catch. If the constructor throws, `this.audioContext` remains null, and subsequent calls will retry and throw again.

### H5. Frame cache in WebCodecsDecoderAdapter uses string key that could collide

**File:** `src/adapters/webcodecs-decoder.ts:107`

```typescript
const cacheKey = `${request.clipId}-${request.mediaFrame}`;
```

If `clipId` contains a hyphen (e.g., `"clip-1"`) and `mediaFrame` is `0`, the key is `"clip-1-0"`. But if `clipId` is `"clip"` and `mediaFrame` is `1-0` (which is just `1`), the key is also `"clip-1"`. This is a theoretical collision risk. In practice, `mediaFrame` is a branded `TimelineFrame` (number), so the real risk is two different clips with IDs like `"a-b"` and `"a"` with appropriate frames colliding. Low probability but the fix is trivial (use a separator that can't appear in IDs, or use a Map-of-Maps).

### H6. ThumbnailWorkerClient doesn't send cancel messages to workers

**File:** `src/workers/thumbnail-worker.ts:243-253`

`cancelRequest` removes the entry from the queue and `processing` map, but never sends a `{ type: 'cancel' }` message to the worker that's currently processing the request. The worker continues processing a job the client has already forgotten about, wasting cycles and potentially sending a result message that the client will silently drop (since the key is no longer in `processing`).

---

## MEDIUM Findings

### M1. Type safety gaps (14 instances of `as any`/`as unknown`)

**Files:** 14 total across source and tests

Source code instances (2):
- `src/adapters/thumbnail-extractor.ts:105` — `as unknown as HTMLCanvasElement` for Node.js fallback. This creates a duck-typed object that doesn't implement the full interface.
- `src/workers/thumbnail-worker.ts:112` — `as unknown as Transferable` for `postMessage` transfer. `ImageBitmap` and `ImageData` are both `Transferable`, so this cast is hiding a type inference issue rather than a real problem.

Test instances (12): All are `as any` for branded type parameters (`ClipId`, `TimelineFrame`, `AssetId`). These are acceptable in tests but indicate the branded types are annoying to construct in test code — a test helper factory would be cleaner.

### M2. LRU cache in ThumbnailExtractorAdapter is O(n) for eviction

**File:** `src/adapters/thumbnail-extractor.ts:204-220`

The `addToCache` method iterates all entries to find the oldest when the cache is full. With the default `cacheSize` of 500, this is a linear scan on every insertion after the cache fills. For a video editor scrubbing through hundreds of frames, this is called frequently.

**Recommendation:** Use a doubly-linked list + Map for O(1) LRU, or at minimum track the oldest entry.

### M3. extractPeaks produces NaN for empty segments

**File:** `src/adapters/webaudio-waveform.ts:175-197`

If `totalPeaks` exceeds `rawData.length`, then `samplesPerPeak` becomes 0, and the inner loop `for (let j = start; j < end; j++)` never executes. `min` stays `Infinity`, `max` stays `-Infinity`, and `rms = Math.sqrt(0 / 0) = NaN`. The caller receives peaks with `Infinity` and `NaN` values.

### M4. SimpleExportAdapter.exportFrameAsImage returns null for unknown canvas types

**File:** `src/adapters/simple-export.ts:228-240`

If the canvas is neither `HTMLCanvasElement` nor `OffscreenCanvas` (e.g., a polyfill or the fake canvas from `thumbnail-extractor.ts:105`), the method resolves with `null` silently. No error, no warning.

### M5. WaveformWorkerClient.cancelJob doesn't actually cancel in-flight work

**File:** `src/workers/waveform-worker.ts:234-244`

Similar to H6: `cancelJob` removes from queue and deletes from `activeJobs`, but the comment on line 243 says "Would send cancel message to worker" — it doesn't. The worker continues processing.

### M6. WebGLCompositor.resize doesn't update the canvas for OffscreenCanvas

**File:** `src/adapters/webgl-compositor.ts:296-302`

`resize` only updates `HTMLCanvasElement` dimensions. If the canvas is an `OffscreenCanvas`, the dimensions are silently NOT updated. OffscreenCanvas doesn't have `.width`/`.height` setters in the same way — you'd need to create a new OffscreenCanvas.

### M7. ThumbnailExtractorAdapter.extractBatch semaphore doesn't actually limit concurrency

**File:** `src/adapters/thumbnail-extractor.ts:147-162`

The semaphore pattern pushes promises to an array and calls `Promise.race` when the array reaches the concurrency limit. But `extractThumbnail` is synchronous up to the cache check, then returns immediately with a cached result or placeholder. Since there's no real async work (no actual video decoding), all promises resolve instantly, making the concurrency limit meaningless. When real async work is added, this pattern will work — but the current test suite will never catch concurrency bugs.

### M8. SimpleExportAdapter doesn't handle MediaRecorder.ondataavailable ordering

**File:** `src/adapters/simple-export.ts:138-141`

`ondataavailable` pushes chunks to `this.recordedChunks`. The `MediaRecorder` spec guarantees chunks arrive in order, but if the recorder errors mid-stream, partial chunks remain in the array. The `finally` block (line 201) resets `recordedChunks`, but the error path (line 190) returns the partial blob before `finally` runs — actually no, the `catch` runs first, returns, then `finally` runs. But the returned `ExportResult` has `success: false` and no blob, so the partial chunks are discarded correctly. This is actually fine on closer inspection — downgrading from MEDIUM to LOW.

---

## LOW Findings

### L1. Dead code: `concurrency` config in WebCodecsDecoderAdapter

**File:** `src/adapters/webcodecs-decoder.ts:16`

The `concurrency` config option is stored but never read. The decoder doesn't implement any concurrency limiting.

### L2. Dead code: `WaveformPeak` type duplicated in worker

**File:** `src/workers/waveform-worker.ts:24-28`

`WaveformPeak` is defined in both `webaudio-waveform.ts` and `waveform-worker.ts`. The comment says "duplicated from core for worker context" but this type isn't in core — it's defined in the adapter. If the two definitions drift, the worker returns incompatible data.

### L3. isWebGLSupported leaks a canvas element

**File:** `src/index.ts:68-76`

The function creates a canvas, gets a GL context, then loses the context. But the canvas itself is never removed or garbage-collected explicitly. In a tight loop calling this function, canvas elements accumulate. (The GC will eventually collect them, but it's sloppy.)

### L4. ThumbnailWorkerClient.processQueue processes at most `workers.length` items

**File:** `src/workers/thumbnail-worker.ts:258-273`

The `while` condition checks `this.processing.size < this.workers.length`. With the default pool size of 2, only 2 thumbnails process at a time. This is correct for a worker pool, but the queue can grow to 1000 items (default `maxQueueSize`). If thumbnails take any real time, the queue will back up quickly. The priority eviction (line 229-233) helps, but only evicts one item at a time — if all 1000 are `high` priority, no eviction happens and the queue overflows silently (the `push` on line 235 just adds beyond the limit).

---

## Structural Observations (not rated)

### All 5 adapters are placeholder implementations

Every adapter renders colored rectangles with frame numbers. This is acknowledged in the code comments and is valid for early development. However:

1. The API surfaces are already public and typed — consumers will code against them.
2. When real implementations replace placeholders, every finding above that depends on "the current code is synchronous/placeholder" becomes a real bug.
3. The test suite only tests placeholder behavior — it will need complete rewriting when real implementations land.

### No Safari/Webkit handling

The package detects `WebCodecs` via `typeof VideoDecoder !== 'undefined'` but doesn't handle Safari's historical partial/inconsistent WebCodecs support. Safari's `VideoDecoder` has had bugs with certain codecs and hardware acceleration modes. The package assumes binary support (yes/no) rather than feature-probing specific codec+resolution combinations.

### Workers are never tested

The `src/workers/` directory has **0% coverage** across all metrics. The worker implementations (`createWaveformWorker`, `createThumbnailWorker`) and their clients (`WaveformWorkerClient`, `ThumbnailWorkerClient`) are completely untested. This is the most complex code in the package (message passing, job queues, priority scheduling, pool management) and has zero test coverage.
