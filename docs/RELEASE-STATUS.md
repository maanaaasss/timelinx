# Timelinx Release Status

This is the live handoff ledger for implementation sessions. Read it with
[`PRODUCTION-RELEASE-PLAN.md`](./PRODUCTION-RELEASE-PLAN.md) before changing
the editor.

## Current milestone

**P1 — Establish the product shell and lifecycle** (implementation landed; browser acceptance E2E still pending)

## Completed

### P0 — Make the editor a first-class, reproducible application ✓

- Repaired the editor's standalone pnpm lockfile so frozen installs work.
- Aligned the editor with the current published Timelinx packages and React 19.
- Removed Vite workspace-source aliases from the registry-consumer editor.
- Made tests reflect the current V2 app shell and added browser API test stubs.
- Added root `editor:*` commands and a dedicated editor CI job.
- Added Playwright config and production-build smoke test (Chromium).
- Vitest excludes e2e directory; unit tests and e2e run independently.
- CI gates on `editor:verify` and `editor:e2e` in addition to workspace validation.

### P1 — Product shell and lifecycle (implementation)

- `EditorSession` (`src/session/EditorSession.ts`): the single lifecycle owner —
  creates/replaces the engine, tracks dirty state vs. a save baseline, owns
  imported-asset ids, and revokes blob URLs + destroys the old engine atomically
  on project replacement and unmount. DOM-free and unit-tested.
- `useEditorSession` (`src/session/useEditorSession.ts`): binds the session into
  React via `useSyncExternalStore`; wires blob-URL revocation to
  `MediaAssetsProvider.removeImportedAsset`; disposes on unmount.
- Capability preflight (`src/session/capabilities.ts` + `CapabilityPreflight.tsx`):
  detects Canvas2D, captureStream, MediaRecorder, AudioContext (WebGL informational)
  and shows an actionable unsupported screen before the editor mounts.
- `EditorWorkspace` (`src/components/EditorWorkspace.tsx`): product shell with
  project header (TopNav), asset bin, preview (CompositorPreview), timeline,
  inspector, toast area, modal layer, and a top-level `ErrorBoundary`.
  `MediaAssetsProvider` mounted exactly once; timeline providers keyed on session
  generation for clean remount on project replace.
- Removed the demo-mode toggle from the production shell; `createDemoEngine`
  retained for dev/E2E fixtures only.

## Next task

Write the P1 acceptance E2E (Playwright): create blank project → import test
media → place it → open a new project → assert old resources no longer
play/render, no uncaught console errors, and accessible labels on main controls.
Then begin P2 (canonical media + preview path).

## Latest verification

Run from repository root:

```bash
pnpm run editor:install    # frozen-lockfile install
pnpm run editor:verify     # lint + typecheck + unit tests + build
pnpm run editor:e2e        # Playwright Chromium smoke test
```

P1 implementation checks performed this session (commit `7da842b` + P1 changes):

- `tsc --noEmit` — PASS (0 errors).
- `eslint .` — PASS (0 errors/warnings).
- Core P1 logic executed under Node (compiled `EditorSession` + `capabilities`):
  16/16 assertions pass (dirty tracking, atomic replace, asset revocation,
  generation bump, failed-factory safety, dispose guards, capability gating).
- NOT run locally: `vitest`, `vite build`, Playwright. The checked-in
  `node_modules` was installed on macOS; its native bundler bindings (rolldown)
  are absent for Linux arm64 in this environment. New vitest specs
  (`editor-session.test.ts`, `capabilities.test.ts`) must be executed by CI.

## Known limitations

- P1 browser acceptance (the import → place → replace-project flow) is not yet
  automated; the existing Playwright test still covers shell loading only.
- The real media pipeline is still the stub (`bitmap: null`); preview shows the
  compositor shell, not decoded frames. That is P2 work.
- Effects/Transitions/Keyframes tabs remain in the inspector; pruning them to the
  v1 feature contract (plan §4) is deferred to P3 feature certification.
- `apps/editor` is intentionally excluded from the workspace. It must always be
  installed and validated with its own lockfile.
