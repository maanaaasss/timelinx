# Phase 12 Remediation Plan — Media UI Layer

**Sources:** MEDIA-UI-ARCHITECTURE-REVIEW.md, MEDIA-UI-CHAOS-ENGINEERING-REPORT.md, MEDIA-UI-METRICS-VALIDATION.md
**Compiled:** 2026-07-26
**Purpose:** Single prioritized punch list to hand to an implementation agent. Fix in tier order — don't jump to Tier 1/2 while Tier 0 items are open.

---

## Tier 0 — Resource leaks and silent data corruption (fix before anything else ships)

These produce data loss, permanent memory leaks, or silently corrupted output files with no user feedback.

1. **Blob URL leaked on every timed-out import. (C1)**
   `withTimeout` rejects the outer Promise but leaves the inner Promise's `cleanup()` call unreachable. The blob URL created by `URL.createObjectURL(file)` is never revoked. Affects `extractVideoMetadata`, `extractAudioMetadata`, and `extractImageMetadata` equally.

   Fix: refactor `withTimeout` to accept an optional `onTimeout` callback, or — more surgically — move blob URL creation inside the inner Promise's cleanup scope and attach a rejection handler to the outer Promise that revokes the URL. The simplest correct pattern:
   ```typescript
   // In withTimeout: accept an abort signal or cleanup fn
   function withTimeout<T>(
     factory: (revoke: () => void) => Promise<T>,
     ms: number,
     label: string,
   ): Promise<T>
   ```
   Alternatively: wrap `withTimeout` at the call site and chain `.catch` on the outer Promise to revoke the URL if it was already created. Either way, every rejection path — timeout OR inner error — must call `URL.revokeObjectURL`.

2. **`MediaElementPool` never evicts on clip deletion — unbounded `<video>` elements in DOM. (C2)**
   Every clip ID that is ever rendered adds a `<video>` element to `document.body` with `preload='auto'`. Elements are retained until component unmount. A session with 50+ clips holds 50+ actively-buffering video elements in the DOM simultaneously.

   Fix: add a `releaseVideo(clipId: string)` and `releaseImage(clipId: string)` method to `MediaElementPool`. The compositor or context must call `releaseVideo` when a clip is deleted from the timeline. Simplest integration point: subscribe to engine state in `CompositorPreview` (or a `useEffect` that diffs previous/current clip sets) and release entries for clip IDs no longer present. At minimum, establish a pool size cap (e.g., 20 entries) with LRU eviction to bound memory even if per-clip cleanup isn't wired up immediately.

3. **Revoking a blob URL while a pooled `<video>` still uses it produces silently corrupted export output. (H1)**
   `removeImportedAsset` calls `URL.revokeObjectURL` immediately. Any pooled `<video>` using that URL enters an error state. The compositor silently renders black frames for the rest of export. No error is surfaced.

   Fix requires coordination between the pool and the context. Two acceptable approaches:
   - **Ref-counting:** the pool tracks which blob URLs are actively in use; `removeImportedAsset` only revokes when ref count reaches zero.
   - **Synchronous pool flush:** `removeImportedAsset` calls a pool method to release the element for that clip ID before revoking the URL. This requires the context to hold a reference to the active pool(s) — an architectural change.
   At minimum as a stopgap: revoke the URL lazily (defer via `setTimeout(0)`) to allow the current render frame to complete before the URL becomes invalid.

4. **Export download URL is never revoked — every completed export leaks its blob URL. (Metrics report §4c)**
   `URL.createObjectURL(blob)` at `use-export.ts:537` is stored in `ExportState.downloadUrl` and used for the auto-download anchor. It is never revoked. One full export file (1–100 MB WebM) stays alive in memory per completed export for the session lifetime.

   Fix: revoke the previous `downloadUrl` when a new export starts (or when the user explicitly closes the export dialog after download). Add a `URL.revokeObjectURL(state.downloadUrl)` call when transitioning from `complete` or `error` back to `idle`.

5. **A/V sync error baked into every export with audio. (H3)**
   `computeAudioSchedule` is called with `audioCtxCurrentTime = 0`, producing `entry.when = 0 + timelineStartSec`. Then `startPendingAudio` starts sources at `baseTime + entry.when` where `baseTime = audioCtx.currentTime` (non-zero — audio loading took time). The offset between AudioContext creation and recording start is permanently baked into A/V sync.

   Fix: compute the audio schedule at the moment of starting, not at the moment of loading. Pass `this.audioCtx.currentTime` to `computeAudioSchedule` immediately before `startPendingAudio` is called — not at the point where the schedule is precomputed during audio loading. That is: move the `computeAudioSchedule` call from line 313 to inside `startPendingAudio`, using `this.audioCtx.currentTime` as the base. Alternatively, record `baseTime = this.audioCtx.currentTime` at the moment `mediaRecorder.start()` is called and use that as the `audioCtxCurrentTime` input to `computeAudioSchedule`.

---

## Tier 1 — High severity, fix next

6. **`getAllThumbnails()` returns a live mutable `Map` — callers can corrupt context state. (H2)**
   `thumbnailsRef.current` is returned directly. Any component that calls `.set()` or `.delete()` on the returned map mutates context internals without triggering re-renders or notifications.

   Fix: change the return type to `ReadonlyMap<string, string>` and cast at the return site:
   ```typescript
   () => thumbnailsRef.current as ReadonlyMap<string, string>
   ```
   This is zero-cost at runtime and prevents accidental mutation in TypeScript-typed code. If a genuine copy is needed (e.g., for rendering stability across renders), return `new Map(thumbnailsRef.current)`.

7. **`cancel()` + `.finally()` double-calls `cleanup()`. (H4)**
   `cancel()` calls `cleanup()` directly. The export runner's `.finally()` in the hook always calls `cleanup()` after `run()` settles. After cancellation, both fire. Currently safe due to null guards, but architecturally fragile.

   Fix: add an `isCleaned` flag to `ExportRunner`:
   ```typescript
   private cleaned = false;
   cleanup(): void {
     if (this.cleaned) return;
     this.cleaned = true;
     // ... existing cleanup
   }
   ```
   Idempotent cleanup is the correct pattern here.

8. **`withTimeout` leaves inner work running after timeout — seeks, canvas allocations, and network activity continue after the caller has given up. (H5)**
   After `withTimeout` rejects, the inner `<video>` or `<img>` element continues loading, seeking, and allocating. Resource consumption from abandoned imports is non-deterministic.

   Fix: pass an `AbortController` signal into the inner factory, or expose a cancel token. For video: set `video.src = ''` and `video.load()` from the timeout handler to abort the decode. For images: set `img.src = ''`. This converts the cleanup from "eventual, if the browser fires events" to "immediate, on timeout."

9. **Safari: export is completely non-functional. (Architecture review structural observation)**
   `getSupportedMimeType` only probes WebM MIME types. Safari's `MediaRecorder` supports only `video/mp4` (H.264/AAC). All probes return false; export throws immediately with no actionable user error.

   Fix: add `'video/mp4;codecs=avc1'` and `'video/mp4'` to the MIME type probe list. Test `captureStream()` availability separately (Safari has the API but it is unreliable; add an `isSupported` check that probes `captureStream` with a try/catch). Update the user-facing `isSupported` return value in `useExport` to return `false` on Safari until the full export path is validated there, rather than showing a broken export dialog.

   **Required manual testing by project owner:** full import → preview → export flow in Safari once MIME type probing is updated. This cannot be validated in this environment.

10. **`addImportedAsset` overwrites existing blob URL without revoking the previous one. (L5 / M5)**
    If called twice with the same `assetId`, the old blob URL silently leaks. No guard or warning.

    Fix:
    ```typescript
    const addImportedAsset = useCallback(
      (assetId: string, file: File, blobUrl: string, thumbnail?: string) => {
        // Revoke existing URL before overwriting
        const existing = blobUrlsRef.current.get(assetId);
        if (existing) URL.revokeObjectURL(existing);
        filesRef.current.set(assetId, file);
        blobUrlsRef.current.set(assetId, blobUrl);
        if (thumbnail) thumbnailsRef.current.set(assetId, thumbnail);
      },
      [],
    );
    ```

---

## Tier 2 — Structural cleanup and robustness (schedule, not blocking)

11. **`detectMediaType` trusts browser-assigned MIME type — no content validation. (M1)**
    A renamed file produces a confusing error. Files with no extension are rejected even if the browser could play them.

    Fix (minimal): after the MIME-type-based dispatch fails (i.e., the inner element fires `onerror`), attempt a fallback — try as `video`, then as `audio`, using the browser's own willingness to load as the oracle. This is optional for now; the current behavior is incorrect but user-understandable.

12. **`isImageSource` falls back to `filePath` regex — blob URLs have no extension, causing images from non-standard import paths to render black. (M3)**
    For assets with a blob URL `filePath` (or empty `filePath`), the regex returns `false` and the image asset is treated as video.

    Fix: strengthen the fallback. If `getFile()` returns undefined and `filePath` starts with `blob:`, attempt a `fetch(filePath, {method:'HEAD'})` to get the `Content-Type`, or fall back to trying the asset as an image first (since `<img>` fails fast and harmlessly, whereas `<video>` may silently produce black frames). Alternatively, require that `filePath` always be set to the original file path at import time — not the blob URL — so the extension test works.

13. **Export loop is real-time-locked, not frame-accurate — produces duplicate frames for fast video at export speed. (M2 / chaos report §3c)**
    `renderVideo` issues a seek and immediately draws, using whatever frame the `<video>` has buffered. If the seek hasn't completed, the previous frame is drawn again. At 30fps export, this is observable in fast-motion video.

    Fix (partial): use `video.requestVideoFrameCallback` (Chrome 83+, not Safari) to render only after the seek completes. This requires restructuring the render loop from synchronous-per-frame to callback-driven. The full fix is a significant architectural change and may not be worth prioritizing given the `captureStream` limitations. Short-term: document the frame-accuracy limitation explicitly.

14. **Remove or gate the 27 unconditional `console.log` statements in `ExportRunner.run()`. (M4)**
    These ship to production and include per-frame GPU readbacks (`ctx.getImageData`).

    Fix: wrap all `[EXPORT-DEBUG]` logs in a `if (import.meta.env.DEV)` guard, or extract to a `debugLog` helper that is a no-op in production builds. Remove the per-frame `getImageData` pixel read entirely — it was a debugging aid that should not be in the render loop.

15. **`ExportRunner` captures engine at construction time — stale if engine is replaced while export is in-flight. (L4)**
    `App.tsx` can swap engines via state. The running runner continues operating on the old engine.

    Fix: either (a) prevent engine replacement while export is in-flight (disable the demo/blank toggle buttons when `exportHook.state.status === 'encoding'`), or (b) call `cancelExport()` in `useEffect` when the engine prop changes. Option (a) is simpler.

---

## Tier 3 — Test coverage (do after Tier 0/1 land)

16. **`media-import.ts`: 0 tests. The entire import pipeline is untested.**
    Requires JSDOM or happy-dom environment (`vitest.config.ts` currently uses `environment: 'node'`).

    Change `vitest.config.ts` to `environment: 'jsdom'` (or `happy-dom`). Then add tests for:
    - `detectMediaType` — correct classification of video/audio/image/unsupported MIME types
    - `withTimeout` — timeout fires correctly; inner rejection propagates correctly; successful resolution cancels the timer
    - `extractVideoMetadata` — `onerror` path; zero-duration rejection; `canvas.getContext` null path; successful extraction
    - `extractAudioMetadata` — `onerror` path; `Infinity` duration rejection
    - `extractImageMetadata` — `onerror` path; `naturalWidth === 0` case

    **Blob URL revocation must be verified in these tests.** Assert that `URL.revokeObjectURL` is called in every error/timeout path. A JSDOM environment with `vi.spyOn(URL, 'revokeObjectURL')` makes this testable.

17. **`media-assets-context.tsx`: 0 meaningful tests.**
    Add tests for:
    - `addImportedAsset` / `getBlobUrl` / `getFile` / `getThumbnail` round-trip
    - `removeImportedAsset` revokes the correct URL (spy on `URL.revokeObjectURL`)
    - Double-register case: second `addImportedAsset` with same `assetId` revokes the previous URL (verifies Tier 1 item #10)
    - Unmount cleanup: all blob URLs are revoked when provider unmounts

18. **`use-export.ts` ExportRunner: 0 tests for the class itself.**
    The pure functions (`computeAudioSchedule`, `advanceExportFrameClock`, `getExportDurationFrames`) are well-tested. The class is not.

    Add tests for (with mocked `MediaRecorder`, `AudioContext`, and canvas):
    - `collectAudioClips` — correct filtering by track type and asset mediaType
    - `loadAudioBuffer` — returns null on network/decode failure without throwing
    - `cancel()` idempotency after Tier 1 item #7 is fixed (verify cleanup called exactly once)
    - Export download URL revocation after Tier 0 item #4 is fixed
    - A/V sync: verify `source.start` `when` argument equals `audioCtx.currentTime + timelineStartSec` after Tier 0 item #5 is fixed

19. **`canvas-compositor.tsx` render functions: 0 tests.**
    These require canvas API support. Options: `happy-dom` + `canvas` npm package, or `@testing-library/react` with `jsdom`.

    Add tests for:
    - `buildFilterString` — all effect types produce correct CSS filter strings; disabled effects are excluded
    - `MediaElementPool.destroy()` — all elements removed from DOM, maps cleared
    - `MediaElementPool.releaseVideo()` / `releaseImage()` after Tier 0 item #2 adds these methods
    - `clipMediaTime` — correct frame-to-seconds conversion at boundary values

20. **Switch `vitest.config.ts` to `jsdom` environment and add coverage thresholds.**
    Current config: `environment: 'node'`. This prevents any DOM-dependent test from running.
    Add to `vitest.config.ts`:
    ```typescript
    test: {
      environment: 'jsdom',
      coverage: {
        provider: 'v8',
        thresholds: {
          statements: 60,
          branches: 60,
          functions: 60,
          lines: 60,
        },
        include: [
          'src/utils/media-import.ts',
          'src/components/canvas-compositor.tsx',
          'src/hooks/use-export.ts',
          'src/context/media-assets-context.tsx',
        ],
      },
    }
    ```
    60% is a realistic target for browser-API-heavy code with JSDOM limitations. Raise to 80% once the DOM test infrastructure is established.

---

## Exit criteria — when is Phase 12 remediation done?

Do not call the media pipeline "production-ready" until:

- [ ] All Tier 0 items fixed and verified
- [ ] All Tier 1 items fixed and verified
- [ ] `URL.revokeObjectURL` is verified to be called in **every** rejection path of `extractVideoMetadata`, `extractAudioMetadata`, and `extractImageMetadata` — including the timeout path — via a test that spies on `URL.revokeObjectURL`
- [ ] `MediaElementPool` has an eviction mechanism with a verified test: create N clips, render, delete clips, assert pool size decreases
- [ ] Export download URL revocation verified by test
- [ ] The A/V sync fix is verified by inspecting `source.start` arguments in a unit test for `startPendingAudio`
- [ ] Safari export tested manually by project owner and either: (a) confirmed working with the MIME type fix, or (b) explicitly marked `isSupported: false` in the UI on Safari until it is

Tier 2 and Tier 3 items can be worked in parallel or deferred. They do not block a production release if the Tier 0/1 items are clean.

---

## Issue not in the four files but discovered during review

**Export download URL leak** (Tier 0 item #4 above) is in `use-export.ts` — which is in scope — but was not called out in the architecture review findings by name. It is added here because it was found during the metrics review and is a real resource leak.

**`collectAudioClips` operator precedence ambiguity** (architecture review H3 — later reclassified as MEDIUM after tracing all paths) produces correct results today but is a maintenance hazard. Add a comment or rewrite as:
```typescript
if (!asset || asset.kind === 'generator' || asset.mediaType !== 'audio') continue;
```
This is the same logic, but readable. No functional change needed — this is Tier 2 cleanup.
