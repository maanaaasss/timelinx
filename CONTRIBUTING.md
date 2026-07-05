# Contributing to Timelinx

Thank you for your interest in contributing to Timelinx. This document covers the operational mechanics of the repository and the standards expected of all contributors.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Environment Setup](#local-environment-setup)
- [Repository Structure](#repository-structure)
- [Building Packages](#building-packages)
- [Running Tests](#running-tests)
- [Coverage Reports](#coverage-reports)
- [Linting & Typechecking](#linting--typechecking)
- [Branch Naming Convention](#branch-naming-convention)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Release Workflow](#release-workflow)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | `>=22` | Runtime |
| [pnpm](https://pnpm.io/) | `10.28.2` | Package manager (pinned via `packageManager` field) |
| [Git](https://git-scm.com/) | `>=2.40` | Version control |

Do **not** use npm or yarn to install dependencies. The lockfile is managed by pnpm and CI enforces `--frozen-lockfile`.

---

## Local Environment Setup

```bash
# 1. Fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/timelinx.git
cd timelinx

# 2. Install dependencies (respects lockfile)
pnpm install

# 3. Verify the environment
pnpm typecheck   # TypeScript compilation check across all packages
pnpm lint        # ESLint across packages with lint config
pnpm test        # Full test suite (1451+ tests)
```

If any of these fail, do not proceed with development until the base environment is green.

---

## Repository Structure

```
timelinx/
├── packages/
│   ├── core/          @timelinx/core      — Headless TypeScript engine
│   ├── react/         @timelinx/react     — React adapter + hooks
│   ├── ui/            @timelinx/ui        — Browser-native React components
│   ├── media-web/     @timelinx/media-web — WebCodecs, WebAudio, thumbnails
│   ├── collab/        @timelinx/collab    — CRDT collaboration layer
│   └── ai/            @timelinx/ai        — AI operation layer
├── docs/
│   ├── phase-1/       Phase 1 completion reports
│   └── phase-2/       Phase 2 CI/CD pipeline documentation
├── .github/
│   ├── workflows/     CI and Release pipelines
│   └── ISSUE_TEMPLATE/
├── .changeset/        Changesets configuration
├── CONTRIBUTING.md
├── LICENSE
└── package.json       Root workspace configuration
```

---

## Building Packages

Packages must be built in dependency order. The root `build` script handles this automatically:

```bash
# Build all packages in correct order
pnpm build

# Build a specific package (useful during development)
pnpm --filter @timelinx/core build
pnpm --filter @timelinx/react build
pnpm --filter @timelinx/ui build
```

The build pipeline:
1. `@timelinx/core` builds first (tsup, CJS + ESM + DTS)
2. `@timelinx/react` builds second (depends on core)
3. `@timelinx/media-web` builds third (depends on core)
4. `@timelinx/ai` builds fourth (depends on core)
5. `@timelinx/collab` builds fifth (depends on core)
6. `@timelinx/ui` builds last (depends on core + react)

---

## Running Tests

```bash
# Run all tests across all packages
pnpm test

# Run tests for a specific package
pnpm --filter @timelinx/core test
pnpm --filter @timelinx/react test
pnpm --filter @timelinx/media-web test
pnpm --filter @timelinx/ai test
pnpm --filter @timelinx/collab test

# Run tests in watch mode (development)
pnpm --filter @timelinx/core exec vitest
```

### Test Standards

- All tests use [Vitest](https://vitest.dev/).
- Core packages include fuzz testing (property-based), hostile consumer tests, and invariant validation.
- Target coverage threshold: **85% branch coverage** across all packages.
- New features must include tests. Bug fixes must include a regression test.

---

## Coverage Reports

```bash
# Generate coverage for a specific package
pnpm --filter @timelinx/core test:coverage

# Coverage is output in v8 format to each package's coverage/ directory
```

Coverage reports are gitignored. Do not commit them.

---

## Linting & Typechecking

```bash
# Lint (ESLint — configured for all packages via shared base config)
pnpm lint

# Typecheck all packages (tsc --noEmit)
pnpm typecheck

# Typecheck a single package
pnpm --filter @timelinx/core exec tsc --noEmit
```

### Code Style

- TypeScript strict mode is enabled across all packages.
- No `as any` casts without a documented justification.
- No `@ts-ignore` or `@ts-expect-error` without an accompanying issue reference.
- Follow existing patterns in the codebase. When in doubt, match the style of surrounding code.

---

## Branch Naming Convention

All branches must follow this naming convention:

| Pattern | Purpose | Example |
|---------|---------|---------|
| `feat/*` | New features | `feat/add-transition-effects` |
| `fix/*` | Bug fixes | `fix/nan-guard-validators` |
| `refactor/*` | Code restructuring | `refactor/simplify-provisional-manager` |
| `docs/*` | Documentation only | `docs/api-reference-core` |
| `test/*` | Test additions/fixes | `test/hostile-consumer-suite` |
| `chore/*` | Tooling, CI, config | `chore/add-changeset-config` |
| `perf/*` | Performance improvements | `perf/interval-tree-optimization` |

**Do not** use bare branch names (e.g., `my-feature`). Always use the `type/description` format.

---

## Commit Message Format

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Code style changes (formatting, semicolons, etc.) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build process, CI configuration, tooling |
| `revert` | Reverts a previous commit |

### Scope

The scope should reference the package affected:

```
feat(core): add transition effect system
fix(react): prevent stale snapshot in useClip
docs(ui): document keyboard shortcuts
test(core): add hostile consumer tests for validators
```

### Examples

```bash
feat(core): add transition effect system

Implements EffectTrack, KeyframeCurve, and TransitionManager.
Supports linear, bezier, and step interpolation modes.

Closes #42
```

```bash
fix(react): prevent stale snapshot in useClip

The useClip hook was returning a cached snapshot after
dispatch. Added subscription to engine change events.

Fixes #87
```

---

## Pull Request Process

### Before Opening a PR

1. **Rebase onto main** — Ensure your branch is up to date:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run the full validation pipeline locally:**
   ```bash
   pnpm ci   # Runs: lint → typecheck → build → test
   ```

3. **Add a changeset** (if your change affects publishable packages):
   ```bash
   pnpm changeset
   ```
   Select the affected package(s), the bump type (patch/minor/major), and provide a summary.

### PR Requirements

| Requirement | Enforced By |
|-------------|-------------|
| All CI status checks pass | GitHub branch protection |
| At least 1 approval from a maintainer | GitHub branch protection |
| No merge conflicts | CI + reviewer verification |
| Changeset added (if applicable) | Reviewer check |
| Breaking changes documented | PR template checklist |

### PR Title Format

PR titles must follow the same Conventional Commits format as commit messages:

```
feat(core): add transition effect system
fix(react): prevent stale snapshot in useClip
```

### Merging

- **Squash and merge** is the default for feature and fix branches.
- **Merge commit** may be used for release branches to preserve individual commits.
- Do not rebase and push to shared branches.

---

## Release Workflow

Releases are automated via [Changesets](https://changesets.dev/) and GitHub Actions.

1. When a PR with a changeset is merged to `main`, the release workflow creates a **"Version Packages" PR**.
2. When the version PR is merged, packages are published to npm with OIDC provenance.
3. Version bumps follow semantic versioning: `patch` for fixes, `minor` for features, `major` for breaking changes.

**Do not manually version or publish packages.** The automated pipeline handles this.

---

## Questions?

Open a [Discussion](https://github.com/maanaaasss/timelinx/discussions) or reach out on the issue tracker.
