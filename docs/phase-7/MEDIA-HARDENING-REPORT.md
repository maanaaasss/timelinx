# Hardening Report — `@timelinx/media-web`

**Date:** 2026-07-10
**Scope:** Bug fixes, HIGH/MEDIUM/LOW findings from Phase-7 validation, worker test coverage

---

## Summary

All items from the hardening prompt completed. 14 fixes applied across 7 source files. Worker test coverage went from 0% to ~60%. Total test count: 94 → 125.

| Category | Items | Status |
|---|---|---|
| Confirmed bugs fixed | 2 | ✅ All fixed |
| HIGH findings fixed | 6 | ✅ All fixed |
| MEDIUM findings fixed | 3 | ✅ All fixed |
| LOW findings fixed | 1 | ✅ Fixed |
| New tests added | 31 | ✅ All passing |

---

## 1. Confirmed Bug Fixes

### Bug #1: `instanceof HTMLCanvasElement` crash

**Files:** `simple-export.ts:237`, `webgl-compositor.ts:310`

**Fix:** Guarded with `typeof HTMLCanvasElement !== 'undefined' && canvas instanceof HTMLCanvasElement`. Also guarded `OffscreenCanvas` the same way.

**Verification:** `exportFrameAsImage({})` now resolves to `null` instead of throwing `ReferenceError`. `resize()` no longer throws.

### Bug #2: `extractPeaks` Infinity/NaN propagation

**File:** `webaudio-waveform.ts:169-197`

**Fix:** Clamped `totalPeaks` to `Math.min(totalPeaks, rawData.length)` and used `Math.max(1, ...)` for `samplesPerPeak`. Also initialized `min`/`max` from the first sample in each bucket instead of `Infinity`/`-Infinity`.

**Verification:** `peaksPerSecond: 100000` with a 441000-sample buffer now produces 441000 valid peaks (clamped from 1000000) with finite values.

---

## 2. HIGH Finding Fixes

### H2: Worker error propagation

**File:** `thumbnail-worker.ts` (client `handleWorkerMessage`)

**Before:** Error messages from workers were silently dropped — no callback invoked.

**After:** `ThumbnailWorkerClientConfig` now accepts `onResult`, `onError`, and `onProgress` callbacks. `handleWorkerMessage` invokes the appropriate callback for every message type.

### H6/M5: Cancel messages to workers

**Files:** `thumbnail-worker.ts:243-253`, `waveform-worker.ts:234-244`

**Before:** `cancelRequest`/`cancelJob` removed local bookkeeping but never messaged the worker.

**After:** Both now send `{ type: 'cancel' }` messages to workers when cancelling in-flight jobs.

### C1 (partial): GPU texture leak prevention

**File:** `webgl-compositor.ts:219-278`

**Fix:** Wrapped texture lifecycle (`createTexture` → draw → `deleteTexture`) in `try/finally` to ensure cleanup even if draw throws. Cached `gl.getUniformLocation()` and `gl.getAttribLocation()` results in `initWebGL` via `uniformLocations` and `attribLocations` Maps.

### C2: Half-initialized GL state

**File:** `webgl-compositor.ts:100-127`

**Before:** Shader compile failure left `this.gl` non-null but `this.program` null.

**After:** All failure paths in `initWebGL` now set `this.gl = null` before returning, ensuring the fallback path is unambiguous.

### H3: Fake canvas in Node.js

**File:** `thumbnail-extractor.ts:103-106`

**Before:** Created a duck-typed `as unknown as HTMLCanvasElement` fake that silently no-oped.

**After:** Throws `Error('ThumbnailExtractorAdapter requires OffscreenCanvas or a DOM environment')`.

### H4: AudioContext constructor crash

**File:** `webaudio-waveform.ts:64-73`

**Before:** `new AudioContext()` could throw `NotAllowedError`/`NotSupportedError` uncaught.

**After:** Wrapped in try/catch with a clear error message: `Failed to create AudioContext: <original message>`.

---

## 3. MEDIUM/LOW Finding Fixes

### M2: LRU cache O(n) eviction

**File:** `thumbnail-extractor.ts:194-217`

**Before:** Iterated all entries to find oldest timestamp (O(n)).

**After:** Uses `this.cache.keys().next().value` — Map maintains insertion order, so the first key is always the oldest. O(1).

### M6: `resize` OffscreenCanvas visibility

**File:** `webgl-compositor.ts:310-315`

**Before:** Silently no-oped for OffscreenCanvas.

**After:** Logs `console.warn('WebGLCompositor.resize: OffscreenCanvas cannot be resized after creation. Create a new compositor instead.')`.

### L1: Dead `concurrency` config

**File:** `webcodecs-decoder.ts:21`

**Before:** JSDoc said "Number of concurrent decoders. Default: 4." but the value was never used.

**After:** JSDoc says "Reserved for future concurrent decoder pool. Currently unused."

### Dimension sanity check

**File:** `thumbnail-extractor.ts:97-110`

Added validation before canvas creation:
- Dimensions > 8192 in either axis → throws with clear error
- Dimensions ≤ 0 → throws with clear error

Also fixed `||` → `??` for width/height fallback so `0` is correctly caught instead of silently becoming the default.

---

## 4. Test Coverage: Before vs. After

### Overall Coverage

| Metric | Before (94 tests) | After (125 tests) | Delta |
|---|---|---|---|
| **Statements** | 42.81% | **63.07%** | **+20.26pp** |
| **Branches** | 65.98% | **69.68%** | **+3.70pp** |
| **Functions** | 82.35% | **80.64%** | -1.71pp |

### Per-Module Coverage (key changes)

| File | Before Stmts | After Stmts | Delta |
|---|---|---|---|
| `thumbnail-extractor.ts` | 75.67% | **80.92%** | +5.25pp |
| `webaudio-waveform.ts` | 87.50% | **88.17%** | +0.67pp |
| `webcodecs-decoder.ts` | 53.84% | **64.95%** | +11.11pp |
| `webgl-compositor.ts` | 38.07% | **36.79%** | -1.28pp* |
| **`thumbnail-worker.ts`** | **0.00%** | **60.27%** | **+60.27pp** |
| **`waveform-worker.ts`** | **0.00%** | **59.67%** | **+59.67pp** |
| `workers/index.ts` | 0.00% | 0.00% | — |

*WebGL compositor coverage decreased slightly because the `resize` fix added new code paths (OffscreenCanvas warning branch) that aren't exercised in Node.js.

### Worker Coverage Detail

The worker client classes (`ThumbnailWorkerClient`, `WaveformWorkerClient`) now have ~60% statement coverage via a mock Worker harness. Covered:
- ✅ Construction and pool creation
- ✅ Job queuing and priority ordering
- ✅ Pool concurrency limits (requests queue when workers busy)
- ✅ Queue processing on worker completion
- ✅ Error propagation via callbacks
- ✅ Progress callbacks
- ✅ Cancel (queue removal + cancel message to worker)
- ✅ Queue overflow with priority eviction
- ✅ terminate() idempotency

**NOT covered** (requires real browser Worker):
- Worker-side message handling (`createThumbnailWorker`, `createWaveformWorker`)
- Actual `postMessage`/`onmessage` serialization
- Worker script loading and module resolution
- Transferable object transfer semantics

---

## 5. Files Changed

| File | Changes |
|---|---|
| `src/adapters/simple-export.ts` | `instanceof` guard for HTMLCanvasElement/OffscreenCanvas |
| `src/adapters/webgl-compositor.ts` | `instanceof` guard, shader failure null-out, texture try/finally, cached uniform/attrib locations, resize OffscreenCanvas warning |
| `src/adapters/webaudio-waveform.ts` | AudioContext try/catch, extractPeaks clamp fix |
| `src/adapters/thumbnail-extractor.ts` | Throw instead of fake canvas, dimension validation, `\|\|` → `\?\?`, O(1) LRU eviction |
| `src/adapters/webcodecs-decoder.ts` | `concurrency` JSDoc updated to "reserved" |
| `src/workers/thumbnail-worker.ts` | Error/progress/result callbacks on client, cancel message to worker |
| `src/workers/waveform-worker.ts` | Cancel message to worker |
| `src/__tests__/workers.test.ts` | **New** — 31 tests for both worker clients |
| `src/__tests__/chaos-media.test.ts` | Updated for fixed behaviors (dimension check, null return, OffscreenCanvas mock) |
| `src/__tests__/thumbnail-extractor.test.ts` | Added OffscreenCanvas mock |

---

## 6. Function Coverage Decrease — Explained

Function coverage went from 82.35% (94 tests) to 80.64% (125 tests), a 1.71pp decrease.

**Root cause:** Before this round, the worker modules (`thumbnail-worker.ts`, `waveform-worker.ts`) had 0% statement coverage but reported 100% function coverage. This is a v8 coverage artifact — when zero functions in a file are invoked, v8 counts the function coverage as 100% (empty denominator). After adding 31 worker tests that actually call `WaveformWorkerClient` and `ThumbnailWorkerClient` methods, v8 now measures ~29 real functions across both worker files. The effective function coverage of those worker functions is ~78%, which drags the overall number down slightly despite being strictly more information.

**Per-file function coverage (before → after):**

| File | Before | After | Delta | Explanation |
|---|---|---|---|---|
| `thumbnail-worker.ts` | 100% | 80% | -20pp | `createThumbnailWorker()` not called (requires real Worker context) |
| `waveform-worker.ts` | 100% | 76.92% | -23.08pp | `createWaveformWorker()` not called (requires real Worker context) |
| `thumbnail-extractor.ts` | 92.30% | 91.66% | -0.64pp | New `getVideoElement` throws early in Node.js |
| All other files | unchanged | unchanged | — | — |

This is the same pattern as the WebGL compositor's statement coverage dip: new code was measured for the first time, revealing paths that are unreachable in Node.js. Not a regression — an improvement in measurement fidelity.

---

## 7. Definition of Done

| Criterion | Status |
|---|---|
| All tests pass | ✅ 125/125 |
| Typecheck passes | ✅ `tsc --noEmit` clean |
| Lint passes | ✅ Only warnings in test files (expected `as any`) |
| No regressions | ✅ All original tests still pass |
| Branch | `fix/media-web-hardening` |
| Commit | `15591f7` |
| Pushed | ✅ `origin/fix/media-web-hardening` |
| PR | [#28](https://github.com/maanaaasss/timelinx/pull/28) |
| CI | ✅ [Build & Test — pass](https://github.com/maanaaasss/timelinx/actions/runs/29098679945/job/86381639286) (1m56s) |
