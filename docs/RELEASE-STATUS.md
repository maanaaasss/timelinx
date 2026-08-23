# Timelinx Release Status

This is the live handoff ledger for implementation sessions. Read it with
[`PRODUCTION-RELEASE-PLAN.md`](./PRODUCTION-RELEASE-PLAN.md) before changing
the editor.

## Current milestone

**P1 — Establish the product shell and lifecycle**

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

## Next task

P1: Create `EditorWorkspace` product shell with project header, asset bin,
preview, timeline, inspector, toast area, modal layer, and error boundary.

## Latest verification

Run from repository root:

```bash
pnpm run editor:install    # frozen-lockfile install
pnpm run editor:verify     # lint + typecheck + 87 unit tests + build
pnpm run editor:e2e        # Playwright Chromium smoke test
```

All passing as of commit `69f7ad1`.

## Known limitations

- The editor is still a timeline demo: it lacks the complete import → preview
  → save/reopen → export product flow described in the production plan.
- `apps/editor` is intentionally excluded from the workspace. It must always
  be installed and validated with its own lockfile.
- Playwright smoke test covers shell loading only, not edit/export flows.
