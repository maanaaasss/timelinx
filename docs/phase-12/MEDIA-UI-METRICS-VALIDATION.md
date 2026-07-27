# Metrics Validation Report — Media UI Layer (Phases 10–11)

**Reviewer:** External adversarial reviewer
**Date:** 2026-07-26
**Scope:** Coverage metrics and resource leak measurement for `packages/ui/src/utils/media-import.ts`, `packages/ui/src/components/canvas-compositor.tsx`, `packages/ui/src/hooks/use-export.ts`, `packages/ui/src/context/media-assets-context.tsx`

---

## 1. Test Suite Execution

Tests run against `packages/ui` with vitest 2.1.9:

```
Test Files  2 passed (2)
     Tests  18 passed (18)
  Start at  14:28:01
  Duration  489ms
```

**Test files found in `packages/ui/src/__tests__/`:**
- `audio-schedule.test.ts` — 10 tests
- `export-frame-clock.test.ts` — 8 tests

**Total: 18 tests across 2 files.** All pass.

---

## 2. Coverage Numbers (branch, statement, function, line)

Executed with `@vitest/coverage-v8` (matched to vitest 2.1.9). Coverage measured against all source files, then filtered to the four files under review.

### Raw coverage output (v8 provider)

```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
canvas-compositor  |    1.89 |      100 |       0 |    1.89 | 30-474, 485-607
media-import.ts    |       0 |      100 |     100 |       0 | 8-243
use-export.ts      |   16.23 |    76.92 |   23.07 |   16.23 | 77-97, 99-110, 221-390, 590-613, 621-687
media-assets-ctx   |    5.88 |      100 |       0 |    5.88 | 28-94, 97-102
```

**Explanation of anomalies:** Branch coverage of 100% and function coverage of 100% at 0% statement coverage occurs because v8 instruments at the module level — importing the module touches the module-level declarations (type aliases, interfaces, constant declarations) but not any function bodies. The functions appear "covered" by type signature but their bodies are uncovered.

### Per-file analysis

#### `src/utils/media-import.ts`

| Metric | Value | Notes |
|---|---|---|
| Statement coverage | **0%** | No tests exercise any function body |
| Branch coverage | 100% | Artifact of v8 branch detection on type-level code |
| Function coverage | 100% | Artifact — v8 counts type exports as "functions" |
| Line coverage | **0%** | Lines 8–243 entirely uncovered |

**Zero test coverage.** `extractVideoMetadata`, `extractAudioMetadata`, `extractImageMetadata`, `extractMetadata`, `detectMediaType`, and `withTimeout` have no tests whatsoever. The entire import pipeline — the entry point for all real user media — is untested. No test covers:
- The timeout path (C1 finding)
- The `video.onerror` path
- The zero-duration validation
- The `canvas.getContext('2d')` null path
- Any audio or image extraction path

#### `src/components/canvas-compositor.tsx`

| Metric | Value | Notes |
|---|---|---|
| Statement coverage | **1.89%** | Only module-level const declarations covered |
| Branch coverage | **0%** | All branches in functions uncovered |
| Function coverage | **0%** | No function bodies exercised |
| Line coverage | **1.89%** | Lines 30–474, 485–607 uncovered |

**Effectively 0% coverage.** The `MediaElementPool` class, `renderCompositorFrame`, `renderLayer`, `renderVideo`, `renderImage`, `renderGenerator`, `buildFilterString`, `applyTransform`, `findClipAndTrack`, `resolveAssetSrc`, `isImageSource`, `clipMediaTime`, and the `CompositorPreview` React component all have zero tests. The core rendering logic — the heart of the compositor — is entirely untested.

#### `src/hooks/use-export.ts`

| Metric | Value | Notes |
|---|---|---|
| Statement coverage | **16.23%** | Only the pure exported functions covered |
| Branch coverage | **76.92%** | Pure function branches well-covered; class branches at 0% |
| Function coverage | **23.07%** | 3/13 functions covered |
| Line coverage | **16.23%** | Lines 77–97, 99–110, 221–390, 590–613, 621–687 uncovered |

**What's covered:** `computeAudioSchedule` (10 tests), `advanceExportFrameClock` (5 tests), `getExportDurationFrames` (3 tests). These are the pure, stateless functions intentionally extracted for testability.

**What's uncovered:** `collectAudioClips`, `loadAudioBuffer`, `getSupportedMimeType`, `checkExportSupport`, the entire `ExportRunner` class (constructor, `run()`, `cancel()`, `cleanup()`, `startPendingAudio()`), and the `useExport` hook itself. The H3 A/V sync finding, the H4 double-cleanup finding, the H1 mid-export deletion behavior, and the audio scheduling in `startPendingAudio` are all entirely untested.

#### `src/context/media-assets-context.tsx`

| Metric | Value | Notes |
|---|---|---|
| Statement coverage | **5.88%** | Only import statements and createContext call covered |
| Branch coverage | 100% | Same v8 artifact as above |
| Function coverage | **0%** | No function bodies exercised |
| Line coverage | **5.88%** | Lines 28–94, 97–102 uncovered |

**Effectively 0% meaningful coverage.** `MediaAssetsProvider`, `useMediaAssets`, `addImportedAsset`, `removeImportedAsset`, `getBlobUrl`, `getFile`, `getThumbnail`, `getAllThumbnails`, and the cleanup effect are all untested.

---

## 3. Coverage Summary Across Four Files

| File | Stmt | Branch | Func | Lines | Meaningful coverage? |
|---|---|---|---|---|---|
| `media-import.ts` | 0% | 100%* | 100%* | 0% | **No** |
| `canvas-compositor.tsx` | 1.89% | 0% | 0% | 1.89% | **No** |
| `use-export.ts` | 16.23% | 76.92% | 23.07% | 16.23% | **Partial** — pure functions only |
| `media-assets-context.tsx` | 5.88% | 100%* | 0% | 5.88% | **No** |

*100% branch on 0% statement coverage is a v8 instrumentation artifact for module-level declarations.

**Overall verdict:** 3 of the 4 files have zero meaningful test coverage. The one partial exception (`use-export.ts`) covers only the pure utility functions. All DOM-dependent, AudioContext-dependent, MediaRecorder-dependent, and React-hook-dependent code is completely untested.

---

## 4. Resource Cleanup Measurement

### 4a. Can cleanup be measured concretely?

The validation prompt asks whether resource cleanup can be measured — e.g., a repeated import/remove cycle with memory measurements before/after.

**Status: NOT RUN** — Meaningful measurement requires a browser environment with access to:
- `performance.measureUserAgentSpecificMemory()` (Chrome, behind origin trial / flag)
- DevTools heap snapshots via automation (Puppeteer/Playwright)
- Or manual DevTools measurement

These are not available in the Node/vitest test environment used here.

### 4b. What static analysis says about cleanup correctness

**Blob URL cleanup in `media-import.ts`:**

| Path | Cleanup? |
|---|---|
| `extractVideoMetadata` — success | ✅ `cleanup()` called in `seeked` handler |
| `extractVideoMetadata` — `loadedmetadata` error (zero duration) | ✅ `cleanup()` called before reject |
| `extractVideoMetadata` — `video.onerror` | ✅ `cleanup()` called before reject |
| `extractVideoMetadata` — `canvas.getContext` null | ✅ `cleanup()` called before reject |
| `extractVideoMetadata` — **timeout** | ❌ blob URL **never revoked** (C1) |
| `extractVideoMetadata` — `canvas.toDataURL` throws | ✅ `cleanup()` in catch block |
| `extractAudioMetadata` — success | ✅ `cleanup()` called |
| `extractAudioMetadata` — error | ✅ `cleanup()` called |
| `extractAudioMetadata` — **timeout** | ❌ blob URL **never revoked** (C1) |
| `extractImageMetadata` — success | ✅ `revoke(url)` called |
| `extractImageMetadata` — error | ✅ `revoke(url)` called |
| `extractImageMetadata` — **timeout** | ❌ blob URL **never revoked** (C1) |

**MediaElementPool cleanup in `canvas-compositor.tsx`:**

| Event | Cleanup? |
|---|---|
| Component unmount | ✅ `pool.destroy()` called (removes all `<video>` from DOM, revokes nothing — blob URLs are managed by context) |
| Clip deleted from timeline | ❌ Pool entry **not removed** (C2) |
| Asset removed from context | ❌ Pool entry **not removed** (H1 — stale src) |

**ExportRunner cleanup in `use-export.ts`:**

| Event | Cleanup? |
|---|---|
| Export completes normally | ✅ `cleanup()` via `.finally()` |
| Export throws | ✅ `cleanup()` via `.finally()` |
| Export cancelled | ⚠️ `cleanup()` called twice (H4 — safe but fragile) |
| Export canvas blob URL | N/A — no blob URL; canvas is created fresh and GC'd |
| Audio sources | ✅ `source.stop()` in cleanup loop |
| AudioContext | ✅ `audioCtx.close()` in cleanup |
| MediaStream tracks | ✅ `track.stop()` in cleanup |
| MediaRecorder | ✅ `.stop()` called before recorder settles |
| Downloaded file blob URL | ❌ **Never revoked** — `url = URL.createObjectURL(blob)` (line 537), used for `<a href=url download>`, never revoked |

**MediaAssetsProvider cleanup:**

| Event | Cleanup? |
|---|---|
| Provider unmount | ✅ All blob URLs revoked in useEffect cleanup |
| `removeImportedAsset` | ✅ Blob URL revoked |
| `addImportedAsset` called with duplicate assetId | ❌ Previous blob URL **not revoked** (L5) |

### 4c. Export download blob URL leak

The export download URL created at line 537 (`URL.createObjectURL(blob)`) is used for the auto-download anchor (`<a href=url download>`) and stored in state as `downloadUrl`. It is never revoked. The state is reset on the next export start (the previous `downloadUrl` is overwritten with `null`), but the old URL is never revoked. One export blob URL leaks per completed export for the session lifetime.

This is a different leak from C1 — the export blob URL is typically 1–100 MB of WebM data kept alive in memory. A user who runs 10 exports in a session leaks 10 export files worth of memory.

**Severity: MEDIUM** — not in the four files explicitly under review (the auto-download logic is in `ExportRunner.run()` which is in scope), but missed by the architecture review above. Adding here.

---

## 5. Test Coverage Gaps — What Tests Are Missing

The following test categories have zero coverage and represent the highest-priority gaps:

### Priority 1 — Resource lifecycle (untestable without browser mocks)
- Blob URL cleanup on timeout: requires `setTimeout` mock + `withTimeout` under controlled conditions
- Pool eviction: requires JSDOM or happy-dom environment (vitest supports `environment: 'jsdom'`)

### Priority 2 — Import error paths
- `extractVideoMetadata` with a `video.onerror` event
- `extractVideoMetadata` with `videoWidth === 0` (audio-only video)
- `extractImageMetadata` with a corrupt image
- `extractAudioMetadata` with `duration = Infinity`
- `withTimeout` timing behavior

### Priority 3 — Context correctness
- `addImportedAsset` / `getBlobUrl` round-trip
- `removeImportedAsset` revokes correct URL
- Double-register case (L5)
- `getAllThumbnails` returns live reference (H2)

### Priority 4 — Export pipeline (requires mock of MediaRecorder + canvas)
- `collectAudioClips` operator precedence (H3)
- `startPendingAudio` timing against `audioCtx.currentTime`
- `cancel()` + double `cleanup()` sequence (H4)
- Export when blob URL is revoked mid-run (H1)

### Priority 5 — Compositor rendering (requires canvas API)
- `buildFilterString` for each effect type
- `renderVideo` with `readyState < 2` (stale frame)
- `renderGenerator` with multi-line text (word wrap)
- `isImageSource` with blob URL filePath fallback (M3)

---

## 6. Environment Limitations

The following tests were not feasible in this environment and are marked **NOT RUN**:

| Test | Reason NOT RUN |
|---|---|
| Large file (>100MB) import timing | File not available; browser required |
| Memory measurement via `performance.measureUserAgentSpecificMemory()` | Browser + origin trial required |
| Pool growth measurement (heap snapshots) | Puppeteer/Playwright required |
| Safari export flow | Safari not available |
| MediaRecorder real encoding | Browser required |
| `canvas.captureStream()` availability | Browser required |
| AudioContext A/V sync measurement | Browser + oscilloscope/analysis required |
| Sub-1-second export empty file reproduction | Browser required |
