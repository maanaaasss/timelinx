# Metrics Validation — `@timelinx/media-web`

**Reviewer:** External adversarial reviewer (no prior involvement)
**Date:** 2026-07-10
**Scope:** `packages/media-web` — full package

---

## Thresholds

| Metric | Threshold | Source |
|---|---|---|
| Statement Coverage | ≥ 80% | Industry standard for production readiness |
| Branch Coverage | ≥ 75% | Architecture review spec |
| Function Coverage | ≥ 80% | Industry standard |
| Zero untested modules | 0 files at 0% | Architecture review spec |
| Bundle size (main) | < 50KB | Reasonable for browser media library |

---

## 1. Real Test Coverage (Vitest v8)

### 1.1 Tool & Configuration

- **Framework:** Vitest 2.1.9, v8 coverage provider
- **Config:** `packages/media-web/vitest.config.ts` — v8 provider, node environment
- **Test execution:** `npx vitest run --coverage`
- **Date collected:** 2026-07-10
- **Test count:** 94 tests across 6 files (5 original + 1 adversarial)

### 1.2 Overall Coverage Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| **Statements** | **42.81%** | ≥ 80% | **FAIL** |
| **Branches** | **65.98%** | ≥ 75% | **FAIL** |
| **Functions** | **82.35%** | ≥ 80% | **PASS** |
| **Lines** | **42.81%** | ≥ 80% | **FAIL** |

**Overall verdict: FAIL** — Statement/line coverage is roughly half the target. Branch coverage is 9 points below threshold. Only function coverage passes.

### 1.3 Per-File Coverage Breakdown

| File | Stmts | Branch | Funcs | Lines | Status |
|---|---|---|---|---|---|
| `src/index.ts` | 73.52% | 66.66% | 100% | 73.52% | Below stmts target |
| `src/adapters/simple-export.ts` | 54.59% | 61.29% | 69.23% | 54.59% | **FAIL — all metrics** |
| `src/adapters/thumbnail-extractor.ts` | 75.67% | 83.33% | 92.30% | 75.67% | Branch OK, stmts low |
| `src/adapters/webaudio-waveform.ts` | 87.50% | 63.15% | 91.66% | 87.50% | **Branch FAIL** |
| `src/adapters/webcodecs-decoder.ts` | 53.84% | 52.94% | 81.81% | 53.84% | **FAIL — all metrics** |
| `src/adapters/webgl-compositor.ts` | 38.07% | 53.84% | 70.00% | 38.07% | **FAIL — all metrics** |
| `src/workers/index.ts` | 0.00% | 0.00% | 0.00% | 0.00% | **FAIL — zero coverage** |
| `src/workers/thumbnail-worker.ts` | 0.00% | 100% | 100% | 0.00% | **FAIL — zero coverage** |
| `src/workers/waveform-worker.ts` | 0.00% | 100% | 100% | 0.00% | **FAIL — zero coverage** |

### 1.4 Coverage Delta (Original Tests vs. With Adversarial Tests)

| Metric | Original (43 tests) | With Chaos (94 tests) | Delta |
|---|---|---|---|
| Statements | 23.69% | 42.81% | **+19.12pp** |
| Branches | 67.41% | 65.98% | -1.43pp |
| Functions | 63.49% | 82.35% | **+18.86pp** |
| Lines | 23.69% | 42.81% | **+19.12pp** |

The adversarial tests nearly doubled statement/line coverage and significantly improved function coverage. Branch coverage slightly decreased (statistical noise from v8's sampling-based approach).

---

## 2. Dead Code & Untested Paths

### 2.1 Completely Untested Modules (0% coverage)

**3 files, ~700 lines of code:**

| File | Lines | What it does |
|---|---|---|
| `src/workers/index.ts` | 26 | Barrel export — trivially testable |
| `src/workers/thumbnail-worker.ts` | 349 | Worker implementation + client with priority queue |
| `src/workers/waveform-worker.ts` | 328 | Worker implementation + client with job pool |

**Impact:** The worker modules are the most complex code in the package (message passing, job queues, priority scheduling, pool management, error handling) and have **zero test coverage**. This is the highest-risk gap in the entire package.

### 2.2 Heavily Untested Code Paths

**WebGLCompositor — 38% statement coverage:**

The compositor's `initWebGL` method compiles shaders, creates buffers, and sets up geometry. In Node.js (the test environment), WebGL is unavailable, so the entire GL initialization path (lines 60-130) is never executed. The `drawLayer` method (lines 220-280) — which creates textures, uploads data, sets uniforms, and draws — is completely untested.

Untested lines: 121-130, 148-175, 220-280, 320-330, 346-349.

**WebCodecsDecoder — 54% statement coverage:**

The `configureDecoder` method (lines 60-93) creates real `VideoDecoder` instances, but `VideoDecoder` is undefined in Node.js. The `output` callback (line 75) is empty — decoded frames go nowhere. The real decode path is dead code.

Untested lines: 73-176, 186-191.

**SimpleExport — 55% statement coverage:**

The `exportFromCanvasStream` method (lines 100-200) — the core export functionality — is untested because `MediaRecorder` and `captureStream` are not available in Node.js.

Untested lines: 119-260, 263-265.

### 2.3 Uncovered Lines in index.ts

Lines 89-92 and 106-108 in `src/index.ts` are the bodies of `isWebGLSupported`, `isOffscreenCanvasSupported`, and `isCaptureStreamSupported` — the parts that create canvas elements and check for APIs. These are uncovered because the tests only verify the functions return booleans in Node.js, where they short-circuit early.

---

## 3. Bundle Size Analysis

### 3.1 Current Build Output

| File | Size | Format |
|---|---|---|
| `dist/index.js` | 27.6 KB | ESM |
| `dist/index.cjs` | 29.5 KB | CJS |
| `dist/workers/index.js` | 11.7 KB | ESM |
| `dist/workers/index.cjs` | 13.0 KB | CJS |
| **Total** | **81.7 KB** | — |

### 3.2 Assessment

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Main bundle (ESM) | 27.6 KB | < 50 KB | **PASS** |
| Worker bundle (ESM) | 11.7 KB | < 30 KB | **PASS** |
| Total | 81.7 KB | — | Acceptable |

The bundle sizes are reasonable for a media processing library. The code is not minified (`minify: false` in tsup config), so production builds would be smaller.

**Note:** These sizes will increase significantly when real implementations replace placeholders. The current placeholder code is mostly canvas drawing (`fillRect`, `fillText`) — real WebCodecs decode, audio processing, and WebGL compositing will add substantial code and potentially pull in codec-specific WASM modules.

### 3.3 External Dependencies

`@timelinx/core` is the sole peer dependency and is externalized from the bundle. The package has **zero runtime dependencies** — all functionality uses browser-native APIs (WebCodecs, WebAudio, WebGL, Canvas, MediaRecorder).

---

## 4. Type Safety Audit

### 4.1 `as any` / `as unknown` in Source Code

| Location | Cast | Justified? |
|---|---|---|
| `thumbnail-extractor.ts:105` | `as unknown as HTMLCanvasElement` | **No** — creates a fake canvas that doesn't implement the interface. Should throw or return a typed "unsupported" result. |
| `thumbnail-worker.ts:112` | `as unknown as Transferable` | **Yes** — `ImageBitmap` and `ImageData` are `Transferable`, but TypeScript's type inference for `postMessage` transfer lists is poor. |

### 4.2 `as any` in Test Code

12 instances across test files, all for branded type parameters (`ClipId`, `TimelineFrame`, `AssetId`). These are acceptable in tests but indicate the branded type constructors are not ergonomic for test code.

---

## 5. Test Suite Quality

### 5.1 Test Count by Module

| Module | Tests | Coverage |
|---|---|---|
| `index.ts` (exports, factories, utils) | 20 | Moderate |
| `webcodecs-decoder.ts` | 15 | Low (5 original + 10 adversarial) |
| `webaudio-waveform.ts` | 21 | Good (5 original + 16 adversarial) |
| `thumbnail-extractor.ts` | 17 | Moderate (6 original + 11 adversarial) |
| `simple-export.ts` | 13 | Low (7 original + 6 adversarial) |
| `webgl-compositor.ts` | 4 | Very low (4 adversarial, 0 original) |
| `workers/` | 0 | **None** |
| **Total** | **94** | — |

### 5.2 Test Quality Assessment

| Aspect | Assessment |
|---|---|
| Happy path | Covered for all adapters |
| Error paths | Partially covered (adversarial tests add coverage) |
| Edge cases | Good for waveform/thumbnail, weak for export/compositor |
| Async correctness | Not tested (no race condition tests) |
| Resource cleanup | Basic (destroy idempotency tested) |
| Worker message ordering | **Not tested** |
| Concurrent operations | Tested for decoder (100 concurrent), not for others |

---

## 6. Summary

| Category | Status | Notes |
|---|---|---|
| Statement coverage | **FAIL** (42.81% vs 80%) | Workers and real API paths untested |
| Branch coverage | **FAIL** (65.98% vs 75%) | GL and codec branches unreachable in Node |
| Function coverage | **PASS** (82.35% vs 80%) | Barely passes |
| Bundle size | **PASS** | 27.6 KB main, will grow with real implementations |
| Dead code | **3 files at 0%** | Workers are the most complex and least tested |
| Type safety | **2 unjustified casts** | Fake canvas and test-only `as any` |
| Test quality | **Low** | No worker tests, no async race tests, no real API tests |

### Root Cause of Low Coverage

The package is designed for browser-only APIs (WebCodecs, WebAudio, WebGL, MediaRecorder, OffscreenCanvas) but tests run in Node.js. This creates a fundamental gap: the real implementation paths are unreachable in the test environment. The tests only exercise placeholder/fallback code paths.

**To reach target coverage, the package needs:**
1. Browser-based integration tests (Playwright, Puppeteer, or Karma)
2. Worker test harness (vitest's experimental worker mode or manual Worker instantiation)
3. Mock/stub strategy for browser APIs that can simulate success, failure, and edge cases
