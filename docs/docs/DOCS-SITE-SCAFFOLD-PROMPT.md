Scaffold a new documentation site at `apps/docs` using Fumadocs (Next.js App Router + MDX), deployed to Vercel. This installs the real, published `@timelinx/core`/`@timelinx/react`/`@timelinx/ui` from npm — not workspace-linked — same discipline already established for `apps/demo` and `apps/editor`.

## 1. Scaffold

1. Set up `apps/docs` with Fumadocs (`create-fumadocs-app` or manual setup, whichever is cleaner) on Next.js App Router.
2. Install `@timelinx/core@^1.0.0-beta.3`, `@timelinx/react@^1.0.0-beta.6`, `@timelinx/ui@^1.0.0-beta.2` as real dependencies from the registry — confirm via the same `ls -la node_modules` check used before (real installed package, not a workspace symlink).
3. Exclude `apps/docs` from `pnpm-workspace.yaml`'s globs, same pattern as `demo`/`editor`.

## 2. Site structure

Top-level sections:
- **Getting Started** — install, quickstart (adapt from the existing `docs/guides/getting-started.md` content, but verify every code sample actually runs against the real published packages — don't just copy old content assuming it's still accurate)
- **Core** — concepts (dispatch model, operations, invariants, transactions — adapt from `docs/guides/core-concepts.md`), with a clear link out to the TypeDoc-generated API reference for full symbol-level detail (don't duplicate the API reference by hand — TypeDoc already generates it correctly; this site's job is guides and concepts, not reproducing the type signatures)
- **React** — hooks guide, adapted from `docs/guides/react-integration.md`, same TypeDoc-link-out pattern
- **UI** — this is the one that needs real, live component rendering (see Section 3)

## 3. UI component gallery — the most important section

For each significant exported component from `@timelinx/ui` (`TimelineEditor`, `TimelineClip`, `InspectorPanel`, `EffectsPanel`, etc.):
- A live, actually-rendered example on the page (real React component, real props, not a screenshot or a static description)
- The real prop/options table for that component (can be derived from the actual TypeScript types — check whether Fumadocs' TypeDoc integration or a similar tool can auto-generate this from the real source rather than hand-maintained, which would drift out of sync)
- The actual code snippet needed to use it, verified to be copy-pasteable and correct

## 4. Visual consistency

The docs site's own theme must use `@timelinx/ui`'s real design tokens/presets (`dark-pro` by default, matching the actual product) — not Fumadocs' default theme sitting inconsistently next to live-rendered `@timelinx/ui` components. Import and apply the real preset CSS the same way any real consumer app would.

## 5. Deployment

Set up for Vercel deployment (a `vercel.json` if needed, confirm the build works with `vercel build` locally if that tooling is available, or at minimum confirm `next build` succeeds cleanly).

## Verification
Real build check (`next build` succeeds), and confirm at least a few live component examples actually render correctly when the dev server runs — report specifically what you could/couldn't verify from this environment.

## Output
Produce `docs/phase-14/DOCS-SITE-SCAFFOLD-REPORT.md` covering the setup, structure, what's real vs. placeholder content at this stage, and real build verification.
