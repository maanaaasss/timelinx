# Phase 14 — Docs Site Scaffold Report

## Setup

**Framework**: Fumadocs 16.14.0 on Next.js 16.2.12 (Turbopack) with React 19.2.8  
**Location**: `apps/docs`  
**Package name**: `@timelinx/docs` (private)  
**Package manager**: npm (standalone, excluded from pnpm workspace)

### Dependencies

| Package | Version | Source |
|---------|---------|--------|
| `@timelinx/core` | 1.0.0-beta.3 | npm registry |
| `@timelinx/react` | 1.0.0-beta.6 | npm registry |
| `@timelinx/ui` | 1.0.0-beta.2 | npm registry |
| `fumadocs-core` | 16.14.0 | npm |
| `fumadocs-ui` | 16.14.0 | npm |
| `fumadocs-mdx` | 15.2.1 | npm |
| `fumadocs-typescript` | 5.3.0 | npm |

### Workspace Exclusion

`pnpm-workspace.yaml` now includes `!apps/docs` alongside `!apps/demo` and `!apps/editor`. The docs app installs `@timelinx/*` from the npm registry — confirmed real directories (not symlinks) at the expected versions.

## Site Structure

```
content/docs/
├── index.mdx                    # Introduction / landing
├── meta.json                    # Root sidebar config
├── getting-started/
│   ├── index.mdx                # Quickstart (adapted from docs/guides/getting-started.md)
│   └── meta.json
├── core/
│   ├── index.mdx                # Core concepts overview
│   ├── dispatch-model.mdx       # The 4-step dispatch algorithm
│   ├── transactions.mdx         # Multi-operation atomicity
│   ├── invariants.mdx           # 24 violation types
│   ├── undo-redo.mdx            # HistoryStack
│   └── meta.json
├── react/
│   ├── index.mdx                # React integration overview
│   ├── hooks.mdx                # Hook reference
│   ├── provider.mdx             # TimelineProvider setup
│   └── meta.json
├── ui/
│   ├── index.mdx                # Component gallery landing
│   ├── timeline-editor.mdx      # Live TimelineEditor example
│   ├── timeline-clip.mdx        # Live TimelineClip example
│   ├── inspector-panel.mdx      # Live InspectorPanel example
│   ├── effects-panel.mdx        # Live EffectsPanel example
│   ├── transport-controls.mdx   # Live TransportControls example
│   └── meta.json
└── api/
    ├── index.mdx                # API reference landing
    ├── core.mdx                 # @timelinx/core type-level API
    ├── react.mdx                # @timelinx/react type-level API
    └── meta.json
```

**Total pages**: 22 (including index pages and redirects)

## What's Real vs. Placeholder

### Real / Verified

- **All MDX content pages** — code samples verified against real `@timelinx/core@1.0.0-beta.3` types via strict `tsc --noEmit --strict`
- **Live component examples** — 5 real React components with correct dual-provider wrapping (`@timelinx/react` + `@timelinx/ui`)
- **API reference pages** — auto-generated from real `.d.ts` files via `fumadocs-typescript` (not hand-maintained)
- **Design tokens** — `@timelinx/ui/styles/presets/dark-pro` imported globally
- **Workspace exclusion** — confirmed `!apps/docs` in `pnpm-workspace.yaml`
- **npm packages** — confirmed real installed directories (not symlinks) at correct versions

### Placeholder / Needs Follow-up

- **Additional UI components** — only 5 of 30+ exported components have gallery pages. The remaining components (`ZoomControls`, `TrackList`, `Sidebar`, `TopNav`, `AssetBin`, `MediaPreview`, `ExportDialog`, `MarkersPanel`, `CaptionsPanel`, `TransitionsPanel`, `KeyframesPanel`, `CommandPalette`, `KeyboardShortcutsOverlay`, `StatusBar`, `TabbedPanel`, `TextPanel`, `CollapsibleSection`, `DropZone`, `SnapIndicator`, `CompositorPreview`) can be added incrementally.
- **Vercel deployment** — no `vercel.json` created (not needed for standard Next.js on Vercel). Deployment should work out of the box with `vercel` CLI.

## Build Verification

### What was verified

- `next build` succeeds cleanly (22 static pages generated)
- TypeScript type checking passes
- All 3 `@timelinx/*` packages are real installed directories (not workspace symlinks)
- Correct package versions: `core@1.0.0-beta.3`, `react@1.0.0-beta.6`, `ui@1.0.0-beta.2`
- MDX content compiles without errors
- Client components use `dynamic()` with `ssr: false` for proper static generation

### Dev server verification

Ran `next dev` on port 3456 and fetched all 5 UI component example pages via HTTP:

| Page | HTTP Status | Page shell renders | Live example behavior |
|------|-------------|-------------------|----------------------|
| `/docs/ui/timeline-editor` | 200 | Title, description, sidebar, prose content all render | SSR correctly bails to CSR via `next/dynamic` — component will render client-side in browser |
| `/docs/ui/timeline-clip` | 200 | Same — full page shell | Same CSR bailout pattern |
| `/docs/ui/inspector-panel` | 200 | Same | Same |
| `/docs/ui/effects-panel` | 200 | Same | Same |
| `/docs/ui/transport-controls` | 200 | Same | Same |

The `next/dynamic` with `ssr: false` pattern is working correctly: the server sends the full page shell (navigation, sidebar, title, description, prose content) and the live component examples hydrate client-side. No server-side errors in dev logs (only the expected `Bail out to client-side rendering: next/dynamic` which is the correct behavior).

### What still needs project-owner verification

**I cannot open a real browser from this environment.** The following require the project owner to run `cd apps/docs && npm run dev` and open in a browser:

- **Live component rendering** — do the 5 examples (`TimelineEditor`, `TimelineClip`, `InspectorPanel`, `EffectsPanel`, `TransportControls`) actually render visible component UI, or do they show blank/broken areas?
- **Visual consistency** — does the `dark-pro` preset CSS actually style the components to match the real product, or does it look unstyled/default?
- **Interactivity** — can you click on `TransportControls` buttons, does `InspectorPanel` show real fields for a selected clip?
- **Vercel deployment** — not tested; `next build` succeeding is the prerequisite

## Tier 1: Correctness (Completed)

### Code sample verification

Every code sample across all 17 MDX pages was extracted and verified against the real published packages. The following issues were found and fixed:

| File | Issue | Fix |
|------|-------|-----|
| `react/hooks.mdx` | `createEngine` imported from `@timelinx/react` — **does not exist** | Changed to `new TimelineEngine({ initialState })` |
| `react/provider.mdx` | Same `createEngine` issue | Same fix |
| `react/hooks.mdx` | `useTimelineContext()` documented as returning engine | Changed to `useEngine()` which is the correct `@timelinx/ui` hook |
| `api/core.mdx` | `createTimelineState({ assets: [...] })` — wrong param name | Changed to `assetRegistry: new Map(...)` |
| `api/react.mdx` | `useClip(engine, clipId)` — wrong signature | Corrected: context version is `useClip(clipId)`, engine version is `useClipWithEngine(engine, clipId)` |
| `api/react.mdx` | `useTimelineContext()` described as `@timelinx/ui` export | Removed — it exists in both packages with different return types |
| `core/invariants.mdx` | `CLIP_BEYOND_TIMELINE` used as `RejectionReason` | Fixed: it's a `ViolationType`, invariant violations surface as `reason: 'INVARIANT_VIOLATED'` |
| `getting-started/index.mdx` | `trackId: 'v1'` (string) in `INSERT_CLIP` operations | Changed to `track.id` (branded `TrackId`) |
| `getting-started/index.mdx` | `clipId: 'clip-1'` (string) in `MOVE_CLIP`/`DELETE_CLIP` | Changed to `clip.id` (branded `ClipId`) |
| `getting-started/index.mdx` | `.nextState` accessed without checking `result.accepted` | Added `if (!result.accepted) throw` guards |
| `core/transactions.mdx` | Same `trackId`/`clipId` string issues | Same fixes |
| `core/dispatch-model.mdx` | `trackId: 'v1'` in transaction example | Changed to `track.id` |

All corrected code samples pass `tsc --noEmit --strict` against the real `@timelinx/core@1.0.0-beta.3` types.

### API reference: auto-generated, not hand-maintained

The `api/core.mdx` and `api/react.mdx` pages now use `fumadocs-typescript`'s `AutoTypeTable` component to render type tables directly from the real `.d.ts` files in `node_modules/`. The manually-written tables have been removed.

- `createTimeline`, `createTimelineState`, `createAsset`, `createTrack`, `createClip`, `dispatch`, `createHistory`, `toFrame`, `frameRate`, `createEffect` — all auto-generated from `@timelinx/core/dist/index.d.ts`
- `TimelineProviderProps` — auto-generated from `@timelinx/react/dist/index.d.ts`

Spot-check confirmed the rendered tables contain real property names (`timeline`, `duration`, `id`, `fps`, `FrameRate`, etc.) from the actual types.

**PR**: [#51](https://github.com/maanaaasss/timelinx/pull/51) — `docs-site-scaffold` → `main`  
**CI**: `Build & Test` — **passed** (1m25s)  
**Commit**: `c7cf143` — `feat: scaffold Fumadocs documentation site at apps/docs`  
**Branch**: `docs-site-scaffold` (pushed to origin)

## Files Created

| File | Purpose |
|------|---------|
| `apps/docs/package.json` | Package config with real @timelinx/* deps |
| `apps/docs/next.config.mjs` | Next.js + Fumadocs MDX config |
| `apps/docs/source.config.ts` | Fumadocs MDX config |
| `apps/docs/tsconfig.json` | TypeScript config |
| `apps/docs/next-env.d.ts` | Next.js type declarations |
| `apps/docs/app/layout.tsx` | Root layout with RootProvider |
| `apps/docs/app/page.tsx` | Redirect to /docs |
| `apps/docs/app/global.css` | Fumadocs + dark-pro CSS imports |
| `apps/docs/app/docs/layout.tsx` | Docs layout with sidebar |
| `apps/docs/app/docs/[[...slug]]/page.tsx` | Catch-all docs page |
| `apps/docs/lib/source.ts` | Fumadocs source loader |
| `apps/docs/content/docs/**/*.mdx` | 17 content pages |
| `apps/docs/content/docs/**/meta.json` | 6 sidebar config files |
| `apps/docs/components/examples/*.tsx` | 5 live component examples |
| `apps/docs/components/examples/*.client.tsx` | 5 dynamic import wrappers |
| `pnpm-workspace.yaml` | Modified — added `!apps/docs` |
