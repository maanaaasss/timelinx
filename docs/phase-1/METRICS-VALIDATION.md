# Metrics Validation — Empirical Quantitative Analysis

**Reviewer:** Senior QA & Performance Engineer
**Date:** 2026-07-04
**Scope:** `@timelinx/core` (primary), with coverage snapshots for `@timelinx/react`, `@timelinx/media-web`, `@timelinx/ai`, `@timelinx/collab`

---

## Thresholds

| Metric | Threshold | Source |
|---|---|---|
| Core Branch Coverage | ≥ 85% | CODEBASE.md / architecture review spec |
| Mutation Score (Core) | ≥ 80% | Architecture review spec |
| Zero Runtime Dependencies | 0 `dependencies` in core `package.json` | Architecture review spec |

---

## 1. Real Test Coverage (Vitest v8)

### 1.1 Tool & Configuration

- **Framework:** Vitest 2.1.9, v8 coverage provider
- **Config:** `packages/core/vitest.config.ts` — v8 provider, excludes `node_modules/`, `dist/`, `*.d.ts`, `*.config.*`, `mockData/`
- **Test execution:** `pnpm --filter @timelinx/core exec vitest run --exclude='.stryker-tmp/**'`
- **Date collected:** 2026-07-04

### 1.2 Overall Coverage Summary

| Package | Stmts | Branch | Funcs | Lines | Notes |
|---|---|---|---|---|---|
| **@timelinx/core** | **91.11%** | **89.44%** | 77.05% | 91.11% | 3 failing tests |
| @timelinx/react | 91.39% | 93.94% | 80.48% | 91.39% | |
| @timelinx/media-web | 23.56% | 68.96% | 63.49% | — | Early-stage package |
| @timelinx/ai | 43.44% | 63.44% | 68.08% | — | Early-stage package |
| @timelinx/collab | 48.55% | 69.72% | 36.58% | — | Early-stage package |

**PASS/FAIL — Branch Coverage:** 89.44% ≥ 85% → **PASS**

**Note:** Vitest config thresholds (`vitest.config.ts:17-20`) are set lower than audit targets (75% branch, 80% lines/functions). The config thresholds are a CI floor, not the quality target.

### 1.3 Per-File Branch Coverage (Core Only — Below 85% Files)

| File | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|
| `src/tools/selection.ts` | 4.84% | **0.00%** | 0.00% | 4.84% |
| `src/validation/validators.ts` | 78.88% | **73.60%** | 80.00% | 78.88% |
| `src/validation/invariants.ts` | 90.47% | 93.47% | 93.75% | 90.47% |
| `src/systems/queries.ts` | 92.16% | 79.41% | 100.00% | 92.16% |
| `src/tools/razor.ts` | 93.10% | 81.25% | 100.00% | 93.10% |
| `src/tools/provisional.ts` | 96.55% | 61.54% | 100.00% | 96.55% |

**Key finding:** `selection.ts` has 0% branch coverage because its 3 tests are failing (see §1.4). This is not "untested code" — the tests exist but assert wrong expected values, indicating the tool implementation or the tests are out of sync.

**Key finding:** `validators.ts` at 73.6% branch coverage is below the 85% threshold. The uncovered branches are the `default: return null` catch-all in the operation-type switch (line 78), which silently accepts unknown operation types.

### 1.4 Failing Tests

**File:** `src/__tests__/tools/selection.test.ts`

3 tests fail, all in drag-related scenarios:

| Test | Mode | Expected | Received | Root Cause |
|---|---|---|---|---|
| `drag produces MOVE_CLIP Transaction with correct newTimelineStart` | MODE 2: single clip drag | `MOVE_CLIP` | `RESIZE_CLIP` | Selection tool returns resize instead of move on drag |
| `dragging a selected clip when multiple are selected moves all` | MODE 3: multi-clip drag | 2 clips moved | 1 clip | Multi-clip drag produces single-clip result |
| `all selected clips move by identical delta` | MODE 3: multi-clip drag | 2 operations | 1 operation | Only one clip included in transaction |

**Impact:** These failures cascade:
1. Coverage for `selection.ts` is 0% (tests never reach assertions)
2. Mutation testing on `selection.ts` is impossible (Stryker requires passing tests)
3. The selection tool is the primary user-facing interaction — its test suite is unreliable

### 1.5 Test Suite Summary

| Metric | Value |
|---|---|
| Test files (core, clean run) | 52 pass, 1 fail |
| Individual tests (core) | 1,089 pass, 3 fail |
| Total test count (all packages, incl. stryker sandbox) | 6,552 (6,534 pass, 18 fail in sandbox) |

---

## 2. Mutation Testing (Stryker)

### 2.1 Configuration

- **Tool:** `@stryker-mutator/core` 9.6.1
- **Runner:** `command` (forks vitest per mutant)
- **Target:** `src/engine/dispatcher.ts` (sole mutation path — 71 lines)
- **Mutators:** Default Stryker mutators (StringLiteral, ArithmeticOperator, BooleanLiteral, etc.)
- **Timeout:** 10,000ms per mutant test run

### 2.2 Results — dispatcher.ts

| Metric | Value |
|---|---|
| Total Mutants | 22 |
| **Killed** | **19** |
| **Survived** | **3** |
| No Coverage | 0 |
| Timeout | 0 |
| RuntimeError | 0 |
| CompileError | 0 |
| **Mutation Score** | **86.36%** |

**PASS/FAIL — Mutation Score:** 86.36% ≥ 80% → **PASS**

### 2.3 Survived Mutants (Detail)

All 3 survived mutants are in the `violations.map().join()` chain of the rejection-reason assembly (lines 54-56):

| # | Mutator | Original | Replacement | Why It Survived |
|---|---|---|---|---|
| 14 | StringLiteral | `'INVARIANT_VIOLATED'` | `""` | Tests assert `{ accepted: false }` but never assert `{ reason: 'INVARIANT_VIOLATED' }` |
| 15 | ArrowFunction | `(v) => v.message` | `() => undefined` | Tests never inspect violation message content |
| 16 | StringLiteral | `'; '` (join separator) | `""` | Tests never assert on the formatted reason string |

**Interpretation:** The dispatcher's core logic (apply-or-reject) is well-tested. The 3 surviving mutants are all in the **error-reporting path** — the rejection reason is constructed but never asserted by tests. This is a test gap, not a code correctness gap. The rejected transaction is correctly rejected regardless of what the reason string says.

### 2.4 Broader Mutation Estimate

A partial Stryker run across 3 files (`dispatcher.ts`, `invariants.ts`, `validators.ts`) yielded:

- Tested: 107 mutants
- Killed: 93
- Survived: 14
- **Estimated score: 86.9%**

Note: Full `invariants.ts` run (379 mutants) timed out with the command runner. A dedicated mutation testing setup (in-process runner) would be needed for complete results.

---

## 3. Bundle & Dependency Sanity

### 3.1 Dependency Audit

| Check | Result | Evidence |
|---|---|---|
| `dependencies` field in `core/package.json` | **None** | No `dependencies` key present |
| `peerDependencies` | **None** | No `peerDependencies` key present |
| Third-party code in dist | **0 references** | `grep -r 'node_modules' dist/` → empty |
| `devDependencies` only | Build/test tooling | `vitest`, `typescript`, `@vitest/coverage-v8`, `esbuild`, `@stryker-mutator/core` |

**PASS/FAIL — Zero Runtime Dependencies:** 0 found → **PASS**

### 3.2 Bundle Size

**Build tool:** tsup (esbuild-based), multiple entry points

| Entry | Format | Raw Size | Gzipped |
|---|---|---|---|
| `index.js` (ESM) | ESM | 3,461 B | 870 B |
| `index.cjs` (CJS main) | CJS | 209,910 B | 37,555 B |
| `internal.cjs` | CJS | 219,533 B | 39,348 B |
| `internal.js` (ESM) | ESM | 5,923 B | 1,746 B |
| `serialization.cjs` | CJS | 42,981 B | 10,556 B |
| `media.cjs` | CJS | 9,899 B | 3,245 B |
| `chunk-HV6ACTCA.js` (shared) | ESM | 192,064 B | 52,440 B |

**ESM entry is 3.4KB** — this is a pure re-export barrel. The actual library code lives in the shared chunk.

### 3.3 Tree-Shaking Verification

**Test:** Import only `toFrame` from `@timelinx/core`, bundle with esbuild `--minify --bundle`.

```
import { toFrame } from "@timelinx/core";
```

| Metric | Value |
|---|---|
| Full CJS bundle | 209,910 B |
| Single-import ESM bundle | 524 B |
| **Reduction** | **99.7%** |

**PASS/FAIL — Tree-Shaking:** Works correctly → **PASS**

### 3.4 Dist Output Integrity

| Check | Result |
|---|---|
| Total files in `dist/` | 40 |
| No `.map` files shipped | ✅ (source maps excluded from dist) |
| TypeScript declarations | `.d.ts` and `.d.cts` present for all entry points |
| CJS + ESM dual format | ✅ Both `.js` and `.cjs` for each entry |

---

## 4. Summary & Verdict

| Metric | Threshold | Actual | Verdict |
|---|---|---|---|
| Core Branch Coverage | ≥ 85% | **89.44%** | ✅ PASS |
| Mutation Score (dispatcher.ts) | ≥ 80% | **86.36%** | ✅ PASS |
| Zero Runtime Dependencies | 0 | **0** | ✅ PASS |
| Tree-Shaking | Works | **99.7% reduction** | ✅ PASS |

### Blockers Identified

1. **Selection tool tests are broken** (3 tests fail) — `selection.ts` has 0% branch coverage as a result. The selection tool is the primary user interaction; its tests must be fixed before relying on coverage numbers.

2. **`validators.ts` branch coverage is 73.6%** — below the 85% threshold. The `default: return null` catch-all silently accepts unknown operation types (see Architecture Review §1e).

3. **Mutation testing is incomplete** — only `dispatcher.ts` has full results. `invariants.ts` (379 mutants) and `validators.ts` need dedicated mutation runs to validate the ≥80% threshold across the full validation layer.

### Recommendations

1. Fix the 3 failing selection tests (`selection.test.ts:326,343,356`) — these are likely caused by the selection tool returning `RESIZE_CLIP` where `MOVE_CLIP` is expected, indicating either a tool regression or stale test expectations.
2. Add assertions on rejection reason strings to kill survived mutants 14-16 in `dispatcher.ts`.
3. Complete Stryker runs for `invariants.ts` and `validators.ts` using an in-process runner (not the command runner).
4. Raise Vitest coverage thresholds in `vitest.config.ts` to match audit targets (85% branch, 85% lines).
