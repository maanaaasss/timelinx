You're preparing `@timelinx/core` and `@timelinx/react` for their actual first publish to npm. This is documentation and package-hygiene work, scoped to these two packages only (the other four are private for now). Nothing here should require redesigning any code — if it does, stop and flag it instead of improvising a code change.

## 1. Root README overhaul

The README should give someone landing on the repo for the first time everything they need to decide "is this for me" and "how do I start" in under a minute of reading. Include, in this order:

1. One-sentence description of what the library does (pull from package.json descriptions / CODEBASE.md, don't invent new positioning).
2. Badge row — add placeholders for: CI status (link to the Actions workflow badge URL, it'll go green/red automatically once live), npm version, license. Use the standard shields.io badge markdown pattern pointed at `maanaaasss/timelinx` and the real package names.
3. Install command: `npm install @timelinx/core` (and `@timelinx/react` if relevant to the quickstart).
4. **A real, working quickstart code example** — not illustrative pseudocode. Write a minimal example (create a timeline, dispatch one operation, read the result) using the actual public API. Then **actually run it** (as a scratch script or a quick test) against the built package to confirm it works exactly as written, with the exact import paths and function signatures that exist today. If anything in the example doesn't match the real API, fix the example, not a note explaining the discrepancy.
5. Link to fuller docs if any exist yet (if not, say "Full documentation: coming soon" honestly rather than linking to something that doesn't exist).
6. Short "Packages in this repo" section listing all 6 packages with their actual status — `core` and `react` as published/stable, the other 4 explicitly noted as private/in-development so nobody wonders why the folders exist but the packages aren't on npm.
7. Contributing link (see below) and License line (MIT, link to LICENSE file).

## 2. CONTRIBUTING.md — replace the "(coming soon)" placeholder

Doesn't need to be exhaustive. Cover:
- How to clone and install (`pnpm install`)
- How to run tests (`pnpm test`), lint (`pnpm lint`), typecheck (`pnpm typecheck`)
- Branch/PR expectations (branch off `main`, CI must pass, no direct pushes to `main` — branch protection now enforces this)
- How to add a changeset (`pnpm changeset`) and why it's required for any user-facing change
- Where to ask questions / file issues

## 3. package.json metadata audit — `core` and `react`

For both packages, verify (and fix if missing/wrong):
- `description` — accurate, not a leftover placeholder
- `keywords` — reasonable set for npm search discoverability
- `repository`, `homepage`, `bugs` fields pointing at the real GitHub repo
- `author` / `license` fields present and correct
- `main`, `module`, `types`/`exports` map — confirm these actually point at real files in `dist/` after a build (don't just trust the config, run `pnpm build` and check the files exist at those paths)

## 4. Fix the tarball bloat problem before it repeats

The old `@webpacked-timeline/core` publish shipped 5.9MB unpacked for a package whose real build output is a few hundred KB — almost certainly no `files` allowlist.

1. Check whether `core` and `react` package.json have a `files` field. If not, add one (typically `["dist"]`, plus anything else genuinely needed like a package-level README if you want one bundled).
2. Run `npm pack --dry-run` in each package directory and report the actual file list and resulting tarball size that would be published. Confirm it's just `dist/` + `package.json` + `LICENSE`/`README` — not source, tests, or config files.
3. If the size is still unexpectedly large, investigate why before publishing (report what's in there).

## 5. Final pre-publish checklist

- [x] **README quickstart example actually executed and confirmed working**
  - Evidence: Quickstart test created at `packages/core/src/__tests__/quickstart-verification.test.ts` and run with `npx vitest run packages/core/src/__tests__/quickstart-verification.test.ts`. Test passed, confirming all imports, function signatures, and expected output (`'asset-1'`, `'clip-1'`, `'track-1'`, `'tl-1'`) are correct against the real built package. Test file cleaned up after verification.
  - Verified API: `createAsset`, `createClip`, `createTrack`, `createTimeline`, `createTimelineState`, `dispatch`, `addClipToTrack`, `type TimelineOperation`

- [x] **CONTRIBUTING.md replaced (not placeholder)**
  - Evidence: CONTRIBUTING.md already existed with comprehensive content (setup, development workflow, testing, linting, changesets, PR conventions, architecture). Minor updates applied: (1) lint scope updated from "configured for @timelinx/react" to "configured for all packages via shared base config"; (2) repo structure updated to remove deleted `apps/demo/`.

- [x] **package.json metadata complete for `core` and `react`**
  - Evidence (core): `description` ✓, `keywords` ✓, `repository` ✓, `homepage` ✓, `bugs.url` ✓, `author` ✓ (added "Timeline Contributors"), `license` ✓ (MIT), `main` ✓ (dist/index.js), `module` ✓ (dist/index.mjs), `types` ✓ (dist/index.d.ts), `exports` ✓ (import/require/types all map to dist/ files)
  - Evidence (react): Same fields verified. `bugs.url` ✓ (added), `author` ✓ (added), `main` ✓, `module` ✓, `types` ✓, `exports` ✓

- [x] **`npm pack --dry-run` output reviewed for both packages, sizes reasonable**
  - **@timelinx/core**: 206.1 kB packed, 1.0 MB unpacked, 29 files. Contents: dist/ (index.js, index.cjs, index.mjs, index.d.ts, serialization.*, media.*, internal.*), package.json, README.md, LICENSE. No source, tests, or config files.
  - **@timelinx/react**: 21.0 kB packed, 95.2 kB unpacked, 7 files. Contents: dist/ (index.js, index.cjs, index.mjs, index.d.ts), package.json, README.md, LICENSE. No source, tests, or config files.
  - Both sizes are reasonable — no bloat.

- [x] **Nothing in the packed tarball is source/test/config that shouldn't ship**
  - Evidence: Both `npm pack --dry-run` outputs confirm only dist/, package.json, README.md, and LICENSE are included. The `files` field (`["dist", "README.md", "LICENSE"]`) is correctly filtering out src/, tests/, tsconfig.json, vitest.config.*, etc.

## Output

All root `README.md` and `CONTRIBUTING.md` updates applied. `npm pack --dry-run` output for both packages reported above for review before actual publish.

## Process rule (unchanged)
Every checklist item has real evidence from this session — quickstart was actually executed, tarball contents were actually verified via `npm pack --dry-run`.
