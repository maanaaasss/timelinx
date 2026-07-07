# Editor Milestone 2 — Report

## Summary

Completed Milestone 2: all five panels (Effects, Transitions, Keyframes, Captions, Inspector) now dispatch real operations through the engine. Fixed KeyframeTool to auto-create effects on effect-less clips. Added caption rendering on the S1 timeline track. Documented `workspace:*` publishing constraint. Fixed three real-browser bugs: TransitionTool not working, keyboard shortcuts not activating tools, and Inspector showing "no transform data".

**Note on manual verification:** The automated test suite covers engine logic and hook reactivity via jsdom, but real browser interaction was not verified. jsdom does not support canvas, pointer events, or CSS layout — so visual rendering and pointer-based interactions cannot be confirmed from tests alone. The "Manual Verification" column below reflects what the tests *assert* rather than what was observed in a browser.

## What Was Built

### New Components
| Component | File | Purpose |
|-----------|------|---------|
| `RightPanel` | `src/components/RightPanel.tsx` | Tabbed container switching between Inspector, Effects, Transitions, Keyframes, Captions |
| `InspectorPanel` | `src/components/InspectorPanel.tsx` | Shows + edits clip transform properties (position X/Y, scale, rotation, opacity) via `SET_CLIP_TRANSFORM` |
| `EffectsPanel` | `src/components/EffectsPanel.tsx` | Lists effects on selected clip, add/remove/toggle via `ADD_EFFECT`, `REMOVE_EFFECT`, `SET_EFFECT_ENABLED` |
| `TransitionsPanel` | `src/components/TransitionsPanel.tsx` | Shows outgoing transition, edit/delete via `DELETE_TRANSITION`, `SET_TRANSITION_DURATION`, `SET_TRANSITION_ALIGNMENT` |
| `KeyframesPanel` | `src/components/KeyframesPanel.tsx` | Lists keyframes on selected effect, add/delete via `ADD_KEYFRAME`, `DELETE_KEYFRAME` |
| `CaptionsPanel` | `src/components/CaptionsPanel.tsx` | View/add/edit/delete captions via `ADD_CAPTION`, `EDIT_CAPTION`, `DELETE_CAPTION` |

### Toolbar Updates
- Added **Transition (G)** button — activates `TransitionTool` for drag-to-add transitions on clip edges
- Added **Keyframe (P)** button — activates `KeyframeTool` (pen tool) for adding keyframes to effects

### Engine Factory Updates (`createEditorEngine.ts`)
- Added **S1 — Captions** subtitle track
- Added sample **effects** on `clip-1` (blur effect with params)
- Added sample **captions** (2 SRT-style caption entries)

### Core Package Exports (`public-api.ts`)
- Added caption type/function exports: `CaptionId`, `Caption`, `CaptionStyle`, `toCaptionId`, `parseSRT`, `parseVTT`, `subtitleImportToOps`, `defaultCaptionStyle`

### KeyframeTool Fix (`packages/core/src/tools/keyframe-tool.ts`)
- When clicking on a clip with no effects, auto-creates a default `brightness` effect and adds a keyframe to it
- Transaction includes both `ADD_EFFECT` and `ADD_KEYFRAME` operations
- Added `pendingCreateEffect` state to track the auto-created effect

### Caption Rendering (`apps/editor/src/components/TrackView.tsx`)
- Added `CaptionBlock` component that renders caption entries as labeled blocks on subtitle tracks
- Each block shows caption text, positioned by `startFrame`/`endFrame` with `translateX`
- Added CSS styles for `.caption-block` and `.caption-text`

### Dependency Fix
- Changed `@timelinx/react`'s dependency on `@timelinx/core` from `"^1.0.0-beta.1"` (npm range) to `"workspace:*"` to ensure the local workspace version is used instead of a stale pnpm store copy

### Publishing Constraint Documentation
- Added `CONTRIBUTING.md` section explaining `workspace:*` safety: only safe because `pnpm publish` rewrites `workspace:*` to real versions; plain `npm publish` would break consumers
- Documented the stale-type-error troubleshooting steps

## Feature Verification Table

| Feature | Automated Test | Manual Verification |
|---------|---------------|-------------------|
| Tabbed right panel (5 tabs) | Y — `App.test.tsx` "displays right panel with tabs" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Effects: ADD_EFFECT dispatch | Y — `features.test.tsx` "ADD_EFFECT adds an effect to a clip" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Effects: REMOVE_EFFECT dispatch | Y — `features.test.tsx` "REMOVE_EFFECT removes an effect from a clip" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Effects: SET_EFFECT_ENABLED toggle | Y — `features.test.tsx` "SET_EFFECT_ENABLED toggles effect enabled state" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Transitions: ADD_TRANSITION dispatch | Y — `features.test.tsx` "ADD_TRANSITION adds a transition to a clip" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Transitions: DELETE_TRANSITION dispatch | Y — `features.test.tsx` "DELETE_TRANSITION removes a transition from a clip" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Keyframes: ADD_KEYFRAME dispatch | Y — `features.test.tsx` "ADD_KEYFRAME adds a keyframe to an effect" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Keyframes: DELETE_KEYFRAME dispatch | Y — `features.test.tsx` "DELETE_KEYFRAME removes a keyframe from an effect" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Captions: ADD_CAPTION dispatch | Y — `features.test.tsx` "ADD_CAPTION adds a caption to a track" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Captions: EDIT_CAPTION dispatch | Y — `features.test.tsx` "EDIT_CAPTION updates caption text" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Captions: DELETE_CAPTION dispatch | Y — `features.test.tsx` "DELETE_CAPTION removes a caption from a track" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Inspector: SET_CLIP_TRANSFORM dispatch | Y — `features.test.tsx` "SET_CLIP_TRANSFORM updates clip transform properties" | **NOT VERIFIED IN BROWSER** — jsdom only |
| KeyframeTool: auto-create effect | Y — `features.test.tsx` "dispatching ADD_EFFECT + ADD_KEYFRAME to effect-less clip creates both" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Caption rendering on timeline | Y — `features.test.tsx` "renders caption blocks on subtitle track" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Keyboard shortcuts activate tools | Y — `features.test.tsx` 4 tests: engine-level + DOM end-to-end | **NOT VERIFIED IN BROWSER** — jsdom only |
| Clips have default transform | Y — `features.test.tsx` "all sample clips have transform with default values" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Multi-track timeline (4 tracks) | Y — `features.test.tsx` "renders 4 tracks" | **NOT VERIFIED IN BROWSER** — jsdom only |

## Automated Test Results

- **47 tests passing** across 2 test files
- `App.test.tsx` — 7 tests (UI rendering, right panel tabs)
- `features.test.tsx` — 40 tests (engine operations, hooks, dispatch, panel wiring, keyboard shortcuts, captions, transforms)

### New Tests (Milestone 2 completion)
- `11. Effects dispatch` — 3 tests: ADD_EFFECT, REMOVE_EFFECT, SET_EFFECT_ENABLED
- `12. Transitions dispatch` — 2 tests: ADD_TRANSITION, DELETE_TRANSITION
- `13. Keyframes dispatch` — 2 tests: ADD_KEYFRAME, DELETE_KEYFRAME
- `14. Captions dispatch` — 3 tests: ADD_CAPTION, EDIT_CAPTION, DELETE_CAPTION
- `15. Inspector dispatch` — 1 test: SET_CLIP_TRANSFORM
- `16. KeyframeTool auto-create effect` — 1 test: ADD_EFFECT + ADD_KEYFRAME on effect-less clip
- `17. Caption rendering` — 1 test: caption blocks rendered on S1 track
- `18. Keyboard shortcut → tool activation` — 4 tests: engine-level shortcut resolution (P→keyframe, G→transition, B→razor, V→selection) + DOM keyDown end-to-end
- `19. Clips have default transform data` — 1 test: all sample clips have transform with default values

## Lint/Typecheck/Build/Test

All pass:

```
pnpm --filter @timelinx/editor lint       ✅
pnpm --filter @timelinx/editor typecheck  ✅
pnpm --filter @timelinx/editor test       ✅ (47/47)
pnpm --filter @timelinx/core test         ✅ (1451/1451)
```

## Bug Fixes — Round 2

Three bugs identified from real browser testing (per `EDITOR-MILESTONE-2-BUGFIX-PROMPT.md`), all fixed:

### Bug 1: TransitionTool does nothing
- **Root cause:** `TransitionTool.findClipAtRightEdge` used its own 8px pixel-based edge detection, ignoring the pre-computed `event.edge = 'right'` from the tool-router.
- **Fix:** `packages/core/src/tools/transition-tool.ts` — check `event.edge === 'right'` first, fall back to pixel detection only when `event.edge === 'none'`.
- **Tests:** `features.test.tsx` "pressing G activates transition tool"

### Bug 2: Keyboard shortcuts don't activate tools
- **Root cause 1:** Every tool declares `shortcutKey` but no code read these properties to activate tools. `engine.handleKeyDown` only handled transport keys (J/K/L, Space, arrows).
- **Fix 1:** `packages/react/src/engine.ts` — added shortcut-key resolution loop after `KeyboardHandler` returns false, iterating `toolRegistry.tools` to match `tool.shortcutKey` against the pressed key.
- **Root cause 2 (missed during investigation):** `@timelinx/react` was **never rebuilt** after the source fix was added. The editor imported the old built dist, so the shortcut resolution code never ran.
- **Fix 2:** Ran `pnpm build` on `packages/react`.
- **Root cause 3:** `StatusBar` read `snapshot.activeToolId` directly from `engine.getSnapshot()` instead of subscribing via `useActiveToolId(engine)`. When `activateTool` ran, `useTimeline()` returned the same reference (state unchanged), so no re-render occurred.
- **Fix 3:** `apps/editor/src/components/StatusBar.tsx` — switched to `useActiveToolId(engine)` hook for subscribed reactivity.
- **Tests:** `features.test.tsx` 4 keyboard shortcut tests (3 engine-level + 1 DOM end-to-end)

### Bug 3: Inspector says "Clip has no transform data"
- **Root cause:** `createClip()` conditionally spread `transform` — if not provided, the property was omitted entirely. All sample clips omitted `transform`. The Inspector checked `{transform ? ... : ...}` which was falsy for `undefined`.
- **Fix:** `packages/core/src/types/clip.ts` — `createClip()` now applies `DEFAULT_CLIP_TRANSFORM` as the default.
- **Tests:** `features.test.tsx` "all sample clips have transform with default values"

## Remaining Known Limitations

### 1. TransitionTool requires real pointer events
- **Impact:** Cannot verify transition creation via automated tests
- **What exists:** `TransitionTool` registered in engine, toolbar button (G) wired
- **Recommendation:** Needs real browser testing for drag-from-edge interaction

### 2. No caption clip-type rendering on timeline
- **Impact:** Caption blocks render as generic labeled blocks, not styled like Premiere/Final Cut caption clips
- **What exists:** Simple `.caption-block` with blue background and text
- **Recommendation:** Refine styling to match NLE conventions (rounded corners, language badge, etc.)
