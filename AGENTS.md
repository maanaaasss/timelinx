# Agent Instructions — Timelinx

## Definition of Done

Every task is not done until ALL of these are true:

1. **Code works** — `next build`, `pnpm build`, or equivalent passes
2. **Types pass** — `pnpm typecheck` or equivalent passes
3. **Committed** — all changes are committed with a conventional commit message
4. **Pushed** — branch is pushed to origin
5. **PR opened** — a pull request exists targeting `main`
6. **CI passes** — the PR's CI checks are green

Do not stop at "code works and build passes." Always commit, push, open a PR, and confirm CI.

## Commit Conventions

- Use [Conventional Commits](https://www.conventionalcommits.org/) format: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `ci:`
- Subject line ≤ 72 characters
- Body explains _why_, not _what_ (the diff shows the what)

## Branch Naming

- Feature: `feat/<short-description>` or `docs/<short-description>`
- Fix: `fix/<short-description>`
- If `feat/` branch prefix conflicts with an existing `feat` ref, use the short description directly (e.g., `docs-site-scaffold`)

## Package Discipline

- `apps/editor` is **excluded** from the pnpm workspace
- It installs `@timelinx/*` from the **npm registry**, not workspace links
- `apps/docs` is **included** in the workspace and uses `workspace:*` links
- Any new standalone app must follow this same pattern: add `!apps/<name>` to `pnpm-workspace.yaml`

## CI

The CI workflow (`.github/workflows/ci.yml`) runs on PRs to `main`:

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm build`
- `pnpm typecheck`
- `pnpm test`

Since excluded apps are not in the workspace, they don't affect CI. CI only validates workspace packages.
