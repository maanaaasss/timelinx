# Phase 13: Editor Real-Install Verification V2

## Summary

Re-ran the editor real-install verification against the fixed `@timelinx/react@1.0.0-beta.6`. The `workspace:*` regression that blocked `npm` installation in beta.5 is resolved. All 87 tests pass. Build and typecheck clean. CI action versions bumped across all workflows.

---

## 1. Published Versions (npm registry)

```
$ npm view @timelinx/core version
1.0.0-beta.3

$ npm view @timelinx/react version
1.0.0-beta.6

$ npm view @timelinx/ui version
1.0.0-beta.2
```

`@timelinx/react@1.0.0-beta.6` is the fixed version — published via OIDC Trusted Publishing.

---

## 2. Clean Install

```
$ cd apps/editor && rm -rf node_modules pnpm-lock.yaml
$ pnpm install --ignore-workspace

dependencies:
+ @timelinx/core 1.0.0-beta.3
+ @timelinx/react 1.0.0-beta.6
+ @timelinx/ui 1.0.0-beta.2
+ react 18.3.1
+ react-dom 18.3.1

Done in 5.7s using pnpm v10.17.1
```

### Registry resolution (not workspace symlinks)

```
$ readlink -f node_modules/@timelinx/react
.../node_modules/.pnpm/@timelinx+react@1.0.0-beta.6_@timelinx+core@1.0.0-beta.3_react@18.3.1/node_modules/@timelinx/react

$ cat node_modules/@timelinx/react/package.json | jq '{name, version, dependencies}'
{
  "name": "@timelinx/react",
  "version": "1.0.0-beta.6",
  "dependencies": {
    "@timelinx/core": "^1.0.0-beta.3"
  }
}
```

No `workspace:*` in the published package. The regression is fixed.

---

## 3. Build

```
$ pnpm build

vite v5.4.21 building for production...
✓ 42 modules transformed.
dist/index.html                   0.40 kB │ gzip:   0.28 kB
dist/assets/index-D-WKNEHO.css   54.68 kB │ gzip:   9.38 kB
dist/assets/index-B0y-pawD.js   367.12 kB │ gzip: 101.57 kB
✓ built in 683ms
```

**Result:** ✅ Clean

---

## 4. Typecheck

```
$ pnpm typecheck

> tsc --noEmit
(no output — clean)
```

**Result:** ✅ Zero errors

---

## 5. Tests

```
$ pnpm test

 ✓ src/__tests__/media-import.test.ts     (13 tests) 7ms
 ✓ src/__tests__/export-duration.test.ts  (10 tests) 7ms
 ✓ src/__tests__/App.test.tsx              ( 7 tests) 333ms
 ✓ src/__tests__/features.test.tsx        (57 tests) 647ms

 Test Files  4 passed (4)
      Tests  87 passed (87)
   Duration  2.09s
```

**Result:** ✅ 87/87 pass

---

## 6. Comparison with V1

| Aspect | V1 (beta.5) | V2 (beta.6) |
|---|---|---|
| `@timelinx/react` version | 1.0.0-beta.5 | 1.0.0-beta.6 |
| `workspace:*` in published deps | YES (broken) | NO (fixed) |
| npm installable | NO | YES |
| Build | ✅ | ✅ |
| Typecheck | ✅ | ✅ |
| Tests | 87/87 | 87/87 |
| Published via | manual npm publish | OIDC Trusted Publishing |

---

## 7. CI Fixes (applied alongside this verification)

### Action version bumps

All three workflows updated to eliminate Node 20 runtime deprecation warnings:

| Workflow | Action | Before | After |
|---|---|---|---|
| `release.yml` | `actions/checkout` | v4 | v6 |
| `release.yml` | `pnpm/action-setup` | v4 | v6 |
| `ci.yml` | `actions/checkout` | v4 | v6 |
| `ci.yml` | `pnpm/action-setup` | v4 | v6 |
| `ci.yml` | `actions/setup-node` | v4 | v7 |
| `deploy-demo.yml` | `actions/checkout` | v4 | v6 |
| `deploy-demo.yml` | `pnpm/action-setup` | v4 | v6 |
| `deploy-demo.yml` | `actions/setup-node` | v4 | v7 |

### Permission cleanup

Removed unused `id-token: write` from `deploy-demo.yml` (the demo workflow does not use OIDC).

---

## 8. Files Changed

| File | Change |
|---|---|
| `.github/workflows/release.yml` | `checkout@v4`→`v6`, `pnpm/action-setup@v4`→`v6` |
| `.github/workflows/ci.yml` | `checkout@v4`→`v6`, `pnpm/action-setup@v4`→`v6`, `setup-node@v4`→`v7` |
| `.github/workflows/deploy-demo.yml` | `checkout@v4`→`v6`, `pnpm/action-setup@v4`→`v6`, `setup-node@v4`→`v7`, removed `id-token: write` |
