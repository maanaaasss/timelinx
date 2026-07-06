You're building the project's first public demo — a small, real, working timeline editor that proves `@timelinx/core` and `@timelinx/react` work for an actual external consumer, not just inside the monorepo. This is the first thing most people will actually try, so scope it small and make sure every claim about it is backed by something you actually ran.

## 0. Ground rule: install from the real npm registry, not the workspace

This is the most important constraint. Do **not** let this app resolve `@timelinx/core`/`@timelinx/react` via pnpm workspace linking — that would test the monorepo's internal wiring, not what a real user experiences after `npm install`. Set up `apps/demo` so it installs the actual published versions from the npm registry (`@timelinx/core@^1.0.0-beta.2`, `@timelinx/react@^1.0.0-beta.2` or whatever's current), the same way an outside developer would. If pnpm's workspace auto-linking tries to override this, explicitly configure around it (e.g., exclude `apps/demo` from the workspace's package resolution for these two deps, or use `.npmrc` overrides) — report exactly what you did and confirm with `pnpm why @timelinx/core` (or equivalent) inside `apps/demo` that it's resolving to the registry version, not a symlinked workspace package.

## 1. Scope — deliberately minimal

Do NOT use `@timelinx/ui` — it's private and hasn't been through the same validation as `core`/`react`. Build plain, simple UI directly (basic CSS or a minimal utility framework, your call) — the point is proving the engine and React bindings work, not showcasing a polished editor.

Minimum feature set:
- A timeline with 2-3 tracks and a few clips, initialized on load
- Drag a clip to move it (using `@timelinx/react`'s real hooks/tool routing — check `docs/guides/react-integration.md` for the real API, don't invent one)
- Undo/redo buttons, wired to the real history API
- One additional operation exposed in the UI (e.g., split/razor a clip) — pick whichever is simplest to wire up correctly, don't force all of them in

Keep it visually clean and readable, but this is a functional proof, not a product launch — don't over-invest in styling polish at the expense of the underlying wiring actually being correct.

## 2. Build it in `apps/demo`

Vite + React + TypeScript, matching the stack already used elsewhere in the repo (check `packages/react`'s own Vite config for consistent conventions). Set it up as its own `package.json`, marked `"private": true` (it should never be published).

## 3. Verify it actually works — don't just claim it

1. `pnpm build` inside `apps/demo` — paste actual output, confirm it succeeds.
2. Run the dev server and actually exercise the app — since this is a visual app, describe the specific manual checks performed (loaded without console errors, clip drag actually moves the clip and the state updates, undo actually reverts, etc.) and report the real result of each, not an assumed one.
3. If there's a reasonable way to add even a minimal automated smoke test (e.g., a Vitest + Testing Library test that renders the app and confirms a clip drag dispatches the expected operation), add one — doesn't need to be exhaustive, just something that runs in CI and would catch a broken build later. If this isn't practical in scope, say so explicitly rather than skipping silently.

## 4. Deployment — GitHub Pages, automated

1. Add a separate GitHub Actions workflow (`.github/workflows/deploy-demo.yml`) that builds `apps/demo` and deploys it to GitHub Pages on push to `main` (only when files under `apps/demo` or the published package versions change, if you can scope the trigger reasonably — otherwise on every push to `main` is fine).
2. Configure Vite's `base` path correctly for GitHub Pages' subpath serving (`/timelinx/` or whatever the repo name requires) — get this right the first time, a wrong base path is the most common way GitHub Pages deploys silently render blank.
3. Report the exact manual step still required (enabling GitHub Pages in repo settings, pointing it at the right source) — this one genuinely can't be done from the repo alone, say so plainly rather than implying it's automated end-to-end.

## 5. Keep it out of the publish/release pipeline

Confirm `apps/demo` is excluded from anything changesets-related (it's not a package that gets versioned/published) and confirm it doesn't interfere with the existing `pnpm build`/`pnpm test` root scripts used by `ci.yml` — either integrate cleanly or explicitly scope it out, report which.

## Process rule (unchanged from every prior round)
Every claim needs real command output or an honestly-reported manual check. "The demo works" is not acceptable without saying specifically what was tried and what happened. If something doesn't work on the first attempt, report that and what you changed, don't smooth over the iteration.

## Output
Produce `docs/phase-4/DEMO-APP-REPORT.md` covering: confirmation of registry-based (not workspace) dependency resolution, what was built, the verification checks performed with real results, deployment setup status, and the one remaining manual step (enabling Pages) spelled out exactly.
