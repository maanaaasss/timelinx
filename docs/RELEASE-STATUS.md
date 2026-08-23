# Timelinx Release Status

This is the live handoff ledger for implementation sessions. Read it with
[`PRODUCTION-RELEASE-PLAN.md`](./PRODUCTION-RELEASE-PLAN.md) before changing
the editor.

## Current milestone

**P0 — make the standalone editor a first-class release gate**

## Completed in this branch

- Repaired the editor's standalone pnpm lockfile so frozen installs work.
- Aligned the editor with the current published Timelinx packages and React 19.
- Removed Vite workspace-source aliases from the registry-consumer editor.
- Made tests reflect the current V2 app shell and added browser API test stubs.
- Added root `editor:*` commands and a dedicated editor CI job.

## Next task

Add Playwright configuration and a production-build smoke test, then make the
editor CI job run it. Do not add media editing features before that gate exists.

## Latest verification

Run from repository root:

```bash
pnpm run editor:install
pnpm run editor:verify
```

At the time of this update, the underlying editor checks pass: lint, typecheck,
87 Vitest tests, and Vite production build.

## Known limitations

- There is no browser E2E/Playwright suite yet.
- The editor is still a timeline demo: it lacks the complete import → preview
  → save/reopen → export product flow described in the production plan.
- `apps/editor` is intentionally excluded from the workspace. It must always
  be installed and validated with its own lockfile.
