# Phase 12 Remediation Walkthrough

**Date:** 2026-07-26
**Status:** Complete
**Test result:** 69 passed, 0 failed, 0 TypeScript errors

---

## Labeling correction (post-review)

The original walkthrough mislabeled the `collectAudioClips` operator-precedence cleanup
as "M1". After reading the complete original review:

- **Real M1** (`detectMediaType` trusts `File.type` — extension-based, not content-validated)
  was **not addressed in this pass**. It is tracked below under "Not addressed". The finding
  is rated MEDIUM severity, no data loss.
- The **operator-precedence cleanup** in `collectAudioClips` is a standalone maintenance fix
  with no corresponding numbered finding in the original review. It is now tagged **Maint-1**
  to distinguish it from any original finding number.

The H1 timing test gap was also identified and corrected — see T0-3 test coverage below.

---

## What was fixed

### Tier 0 — Resource leaks and silent data corruption

#### T0-1 + T1-3: Blob URL leak on timeout (C1) + inner element abort (H5)
**File:** `src/utils/media-import.ts`

`withTimeout` now accepts an optional `onTimeout` callback. All three extractors
(`extractVideoMetadata`, `extractAudioMetadata`, `extractImageMetadata`) pass their
`cleanup` function as this callback. When the timeout fires:
- The blob URL is revoked immediately (not "whenever the browser fires an event")
- The `<video>`/`<audio>` element has its `src` cleared and `load()` called to abort decode
- The `<img>` element has its `src` set to `''` to cancel the network fetch

All `cleanup` functions are idempotent (guarded by a `cleaned` boolean flag) so a late
browser event firing after the timeout does not cause a double-revoke. Validated by the
"withTimeout idempotency" test.

Also added: zero-dimension validation in `extractVideoMetadata` rejects audio-only video
containers (`videoWidth === 0`) with a clear error instead of producing NaN draw calls (L1).

#### T0-2: MediaElementPool eviction (C2)
**File:** `src/components/canvas-compositor.tsx`

`MediaElementPool` now has:
- `releaseVideo(clipId)` / `releaseImage(clipId)` — per-entry cleanup: pauses, clears src, removes from DOM
- `syncToActiveClips(activeIds: ReadonlySet<string>)` — bulk eviction for all clip IDs not in the provided set
- LRU order tracking + `MAX_POOL_SIZE = 32` cap — if 32 entries are live and a 33rd is requested, the least-recently-used entry is evicted first
- `destroy()` now iterates `_releaseVideo`/`_releaseImage` instead of `.clear()` — ensures DOM removal goes through the same cleanup path

`CompositorPreview` adds a `useEffect` that subscribes to `engine.subscribe()` and calls
`pool.syncToActiveClips()` on every state change. When a clip is deleted, its `<video>`
element is removed from `document.body` within one engine tick.

#### T0-3: Deferred blob URL revocation (H1)
**File:** `src/context/media-assets-context.tsx`

`removeImportedAsset` now defers `URL.revokeObjectURL` by one microtask
(`Promise.resolve().then(...)`) by default. This gives the current compositor or export
render frame time to finish drawing before the URL becomes invalid — eliminating the
"black frame in export" failure (H1) where revoking mid-render caused the `<video>` to
enter a `MEDIA_ERR_SRC_NOT_SUPPORTED` error state silently.

`getBlobUrl` clears synchronously (no new consumers can start using the URL after delete),
but the actual revocation is deferred.

For tests and callers that know no draw is in progress: pass `{ immediate: true }`.

**Test coverage (post-review addition):**
`src/__tests__/h1-deferred-revocation.test.tsx` (5 tests) directly simulates the race:
1. `getBlobUrl(assetId)` is called (simulating "draw starts")
2. `removeImportedAsset(assetId)` is called in the same synchronous block (simulating "user deletes clip while draw is in progress")
3. Assert URL is **not** revoked synchronously (the in-progress draw is safe)
4. Assert URL **is** revoked after `await Promise.resolve()` (exactly one microtask later)
5. Assert revoke count is exactly 1 (no double-free)

#### T0-4: Export download URL revocation
**File:** `src/hooks/use-export.ts`

`startExport` and `cancelExport` both use functional `setState` updaters that revoke
`prev.downloadUrl` before nulling it. Each export's output blob is freed when the user
starts or cancels another export.

#### T0-5: A/V sync fix (H3)
**File:** `src/hooks/use-export.ts`

Previously: `computeAudioSchedule(clips, 0, fps)` was called during audio loading, then
`startPendingAudio` added `audioCtx.currentTime` as a base — baking audio loading time
(50–500ms) as a permanent A/V offset into every exported file.

Now: `startPendingAudio(fps)` is called after `mediaRecorder.start()`. It calls
`computeAudioSchedule(loadedBuffers, audioCtx.currentTime, fps)` using the actual context
time at the moment recording begins. `entry.when` values are absolute AudioContext
timestamps; `source.start(entry.when, ...)` schedules each source at the correct moment.

---

### Tier 1 — High severity

#### T1-1: getAllThumbnails returns ReadonlyMap (H2)
**Files:** `src/context/media-assets-context.tsx`, `src/components/timeline-clip.tsx`, `src/components/timeline-editor.tsx`

Return type changed to `ReadonlyMap<string, string>`. Downstream `thumbnails` props updated.
TypeScript now prevents any caller from calling `.set()` / `.delete()` on the returned map.

#### T1-2: ExportRunner.cleanup() idempotency (H4)
**File:** `src/hooks/use-export.ts`

`private cleaned = false` flag. `cleanup()` returns immediately on second call. Both
`cancel()` and `.finally()` call `cleanup()` safely — audio sources are stopped exactly once.

#### T1-3: Inner element abort on timeout (H5)
Covered under T0-1 — `onTimeout` callback passed to `withTimeout` aborts inner element activity.

#### T1-4: Safari MIME type probing
**File:** `src/hooks/use-export.ts`

`getSupportedMimeType` now probes `video/mp4;codecs=avc1,mp4a.40.2` and `video/mp4` after
the WebM types. File extension derived from the resolved MIME type (`.mp4` or `.webm`).

**Still requires manual testing** — `captureStream + MediaRecorder` end-to-end in Safari
was not tested in this pass.

#### T1-5: Double-register blob URL guard (M5)
**File:** `src/context/media-assets-context.tsx`

`addImportedAsset` revokes the previous URL before overwriting on same `assetId`.

Note: the original review tagged this as M5 (LOW severity). It was implemented in this
pass as a correctness gap closure.

---

### Tier 2 — Structural cleanup

#### Maint-1: collectAudioClips operator clarity
**File:** `src/hooks/use-export.ts` — **no original review finding number**

The double-guard pattern:
```typescript
if (!asset || asset.kind !== 'generator' && asset.mediaType !== 'audio') continue;
if (asset.kind === 'generator') continue;
```
was consolidated into the correct single condition:
```typescript
if (!asset || asset.kind === 'generator' || asset.mediaType !== 'audio') continue;
```
This is a standalone maintenance cleanup. It was previously labeled "T2-1 (M1)" in error —
the original M1 finding is unrelated (see "Not addressed" below).

#### T2-2: Production console.log gating (M4)
**Files:** `src/hooks/use-export.ts`, `src/components/canvas-compositor.tsx`

All 27 `[EXPORT-DEBUG]` console.log calls and per-frame `ctx.getImageData` readbacks
are now wrapped in `if (import.meta.env.DEV)`. Vite tree-shakes these in production.
`tsconfig.json` updated to include `"types": ["vite/client"]`.

#### T2-3: Cancel export on engine swap (L4)
**File:** `src/hooks/use-export.ts`

`useEffect(() => { cancelExportRef.current(); }, [engine])` cancels in-flight export when
the engine prop changes, preventing the runner from operating on a stale engine reference.

---

### Tier 3 — Test coverage

**Before:** 18 tests, `environment: 'node'`
**After:** 69 tests, `environment: 'jsdom'`

New test files:
| File | Tests | What it covers |
|---|---|---|
| `h1-deferred-revocation.test.tsx` | 5 | H1 concurrent draw+delete race, microtask timing, protection window, immediate mode |
| `media-import.test.ts` | 15 | Blob URL revocation in all rejection paths including timeout (C1); idempotency |
| `media-assets-context.test.tsx` | 11 | Round-trip, deferred revocation, double-register, unmount cleanup |
| `media-element-pool.test.ts` | 7 | Pool create/reuse/release/sync/destroy/LRU cap |
| `export-runner.test.ts` | 13 | `collectAudioClips` logic, Safari MIME probing, cleanup idempotency, URL revocation |

`src/__tests__/setup.ts` stubs `URL.createObjectURL` / `URL.revokeObjectURL` for jsdom.

---

## Not addressed in this pass

### M1: detectMediaType trusts File.type — extension-based, not content-validated
**Original finding:** `src/utils/media-import.ts:49–55`

A `.mp4` renamed to `.mp3` is processed as audio and fails with `Cannot read audio:
renamed-video.mp3`. Files with no extension fall through to 'unsupported' even if the
browser could play them.

**Status: Not addressed.** This is MEDIUM severity, no data loss. Fixing it requires either
a magic-byte signature check (reading the file header) or a fallback attempt strategy
(try video extract, if it fails try audio). Both are non-trivial and were out of scope for
this remediation pass. It is documented here to prevent it from appearing "done" under
a stale label.

### M2: isImageSource regex fallback misclassifies blob URLs
**Original finding:** `src/components/canvas-compositor.tsx:156–160`
**Status: Not addressed.** Medium severity, affects non-standard import paths only.

### M3: Export frame-accuracy not guaranteed (seek asynchrony)
**Original finding:** `src/hooks/use-export.ts:427–508`
**Status: Not addressed.** Inherent architectural limitation of captureStream + rAF;
documented in the review as requiring `requestVideoFrameCallback` to fix properly.

---

## Files changed

| File | What changed |
|---|---|
| `src/utils/media-import.ts` | `withTimeout` + idempotent cleanup + L1 zero-dimension validation |
| `src/components/canvas-compositor.tsx` | Pool eviction + `syncToActiveClips` + debug log gating |
| `src/context/media-assets-context.tsx` | Deferred revocation, `ReadonlyMap`, double-register guard |
| `src/hooks/use-export.ts` | A/V sync, download URL revocation, cleanup idempotency, Safari MIME, Maint-1 clarity, log gating, engine cancel |
| `src/components/timeline-clip.tsx` | `thumbnails` prop: `Map` → `ReadonlyMap` |
| `src/components/timeline-editor.tsx` | `thumbnails` prop: `Map` → `ReadonlyMap` |
| `tsconfig.json` | Added `"types": ["vite/client"]` |
| `vitest.config.ts` | `environment: 'jsdom'`, `setupFiles`, coverage config |
| `src/__tests__/setup.ts` | New — URL API stubs for jsdom |
| `src/__tests__/h1-deferred-revocation.test.tsx` | New — 5 tests (H1 timing race) |
| `src/__tests__/media-import.test.ts` | New — 15 tests |
| `src/__tests__/media-assets-context.test.tsx` | New — 11 tests |
| `src/__tests__/media-element-pool.test.ts` | New — 7 tests |
| `src/__tests__/export-runner.test.ts` | New — 13 tests |
