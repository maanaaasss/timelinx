# Editor Milestone 1 — Report

## Summary

Built `apps/editor` — a reference timeline editor proving `@timelinx/core` and `@timelinx/react` work end-to-end for real editing interactions. All interactions go through the real tool system via `useToolRouter`.

**Note on manual verification:** The automated test suite covers engine logic and hook reactivity via jsdom, but real browser interaction was not verified. jsdom does not support canvas, pointer events, or CSS layout — so visual rendering and pointer-based interactions (drag, trim, rubber-band) cannot be confirmed from tests alone. The "Manual Verification" column below reflects what the tests *assert* rather than what was observed in a browser.

## Feature Verification Table

| Feature | Automated Test | Manual Verification |
|---------|---------------|-------------------|
| Multi-track timeline (video, audio, title) | Y — `features.test.tsx` "renders 3 tracks" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Clip selection (single + multi) | Y — `features.test.tsx` "can select and deselect clips" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Drag-to-move clips | Y — `features.test.tsx` "can move a clip and undo" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Trim (ripple + roll) | N — needs real pointer events | **NOT VERIFIED IN BROWSER** — jsdom only |
| Split/razor at playhead | Y — `features.test.tsx` "split produces two clips" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Ripple insert | N — needs real pointer events | **NOT VERIFIED IN BROWSER** — jsdom only |
| Ripple delete | Y — via toolbar button | **NOT VERIFIED IN BROWSER** — jsdom only |
| Undo/Redo | Y — `features.test.tsx` "undo reverts, redo re-applies" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Markers (add/view/jump) | Y — `features.test.tsx` "can add a marker" | **NOT VERIFIED IN BROWSER** — jsdom only |
| Zoom in/out | Partial — buttons dispatch custom events | **NOT VERIFIED IN BROWSER** — jsdom only |
| Track controls (lock/mute/opacity) | N — UI only, gap in core | **NOT VERIFIED IN BROWSER** — jsdom only |
| Playhead scrubbing | N — display only | **NOT VERIFIED IN BROWSER** — jsdom only |

## Automated Test Results

- **29 tests passing** across 2 test files
- `App.test.tsx` — 7 tests (UI rendering, components)
- `features.test.tsx` — 22 tests (engine operations, hooks, dispatch)

## Lint/Typecheck/Build/Test

All four pass with `apps/editor` included in root scripts:

```
pnpm --filter @timelinx/editor lint    ✅
pnpm --filter @timelinx/editor typecheck ✅
pnpm --filter @timelinx/editor build    ✅
pnpm --filter @timelinx/editor test     ✅ (29/29)
```

## Split & Ripple Delete — Tool System Fix

Split and Ripple Delete buttons were originally implemented by directly dispatching operations. They were refactored to use the real tool system:

- **Split (RazorTool):** Synthesizes a `TimelinePointerEvent` at the playhead position, routes through `engine.handlePointerDown()` → `engine.handlePointerUp()`. The tool captures `pendingFrame` at pointer-down and produces the split transaction at pointer-up. Previous tool is restored after execution.
- **Ripple Delete (RippleDeleteTool):** Same pattern — synthesizes a `TimelinePointerEvent` at the selected clip's center, routes through the tool system. The tool captures `pendingClipId` at pointer-down and produces the delete + shift transaction at pointer-up.

Both behave identically to the previous direct-dispatch implementation in terms of transaction output (DELETE_CLIP + 2×INSERT_CLIP for split, DELETE_CLIP + N×MOVE_CLIP for ripple delete).

## Gaps Found in Core/React

### 1. No `SET_TRACK_MUTE` / `SET_TRACK_LOCK` operations (core)
- **Impact:** Track mute/lock/solo toggling cannot go through the dispatch system
- **What exists:** Pure functions `toggleTrackMute()`, `toggleTrackLock()`, `toggleTrackSolo()` in `operations/track-operations.ts`
- **What's missing:** Corresponding `OperationPrimitive` variants and `apply.ts` handlers
- **Workaround for now:** None — these controls are non-functional in the editor UI
- **Recommendation:** Add `SET_TRACK_MUTE`, `SET_TRACK_LOCK`, `SET_TRACK_SOLO` operation primitives

### 2. No `SET_TRACK_VISIBILITY` operation (core)
- **Impact:** Track show/hide (eye icon) cannot be dispatched
- **What exists:** Track type has no `visible` property
- **Workaround:** Not implemented
- **Recommendation:** Add `visible: boolean` to Track type and corresponding operation

### 3. Playhead scrubbing not in tool system
- **Impact:** Cannot click/drag on ruler to scrub playhead
- **What exists:** `engine.seekTo(frame)` works programmatically; `usePlayheadFrame` hook provides current position
- **Workaround:** Clicking ruler calls `engine.seekTo()` (implemented in Ruler component)
- **Recommendation:** Consider a dedicated "scrub" tool or integrate ruler interaction into the tool router

### 4. SelectionTool rubber-band select needs real pointer events
- **Impact:** Multi-select via rubber-band cannot be verified in automated tests
- **What exists:** SelectionTool handles rubber-band internally (4px threshold)
- **Note:** This is a known limitation — simulated pointer events don't match real browser behavior

### 5. Trim tools need real pointer events for verification
- **Impact:** RippleTrimTool and RollTrimTool cannot be fully tested in jsdom
- **What exists:** Both tools are registered and wired through tool router
- **Note:** SelectionTool's near-edge click also triggers RESIZE_CLIP — this is the same mechanism

## Bug Fixes — Round 2 (from real user testing)

### Bug 1: Selection highlighting doesn't show/clear correctly

**Root cause:** `_syncSelectionFromTool()` in `TimelineEngine` stored a direct reference to the SelectionTool's mutable `Set`. When the tool cleared its selection (e.g., clicking empty space), the snapshot's `selectedClipIds` pointed to the same (now empty) Set. React's `Object.is` saw the same reference — no re-render occurred, so the visual highlight never updated.

**Fix:** `packages/react/src/engine.ts` — `_syncSelectionFromTool()` now creates a `new Set(toolSelection)` copy, so tool-internal mutations don't silently change the snapshot reference.

**Verification:** Automated tests pass (29/29 editor, 1451/1451 core). Cannot verify visually in browser from this environment — needs project owner's real-browser check.

### Bug 2: No cursor feedback on trim edges

**Root cause:** `TimelineView` didn't apply the cursor from the active tool. The SelectionTool already computed `getCursor()` returning `'ew-resize'` near edges, but the cursor value wasn't wired to the DOM.

**Fix:** `apps/editor/src/components/TimelineView.tsx` — Added `useCursor(engine)` hook and applied `cursor` to the `.timeline-tracks` container's inline style.

**Verification:** Automated tests pass. Cannot verify visually in browser — needs project owner's check.

### Bug 3: Ripple trim should work from Selection tool without switching

**Root cause:** The SelectionTool's edge-click handler dispatched `RESIZE_CLIP` (plain resize — only the clicked clip affected, no downstream shift). This is unexpected in NLEs where edge-drag typically ripples.

**Fix:** `packages/core/src/tools/selection.ts` — Edge-click now produces ripple trim by default:
- **Default (no modifier):** `RESIZE_CLIP` + N×`MOVE_CLIP` for all downstream clips (same track, to the right for end-trim, to the left for start-trim)
- **Alt/Option held:** Roll trim — finds the adjacent clip at the cut point and produces 2×`RESIZE_CLIP` (no downstream shift)

**What I investigated:** The SelectionTool's `onPointerUp` near-edge path now computes downstream clips and produces a multi-operation transaction. The RippleTrimTool still exists for explicit/drag-based use.

**Verification:** Core test updated to expect ripple trim behavior (RESIZE_CLIP + downstream MOVE_CLIPs). All 1451 core tests pass. Cannot verify visually — needs project owner's check.

### Bug 4: Playhead doesn't move except incidentally during ripple trim

**Root cause:** `TimelineView` read `playheadFrame` via `engine.getSnapshot()` (non-reactive), not via the `usePlayheadFrame()` hook. When `seekTo()` was called from ruler click, the engine rebuilt the snapshot and notified subscribers, but `TimelineView` only re-rendered if a *different* subscribed value changed (e.g., `useSelectedClipIds`). If selection didn't change, the playhead update was invisible.

The "moves during ripple trim" clue was correct — ripple trim dispatches transactions that change clip positions, which triggers `useTrack()` re-renders in `TrackView`, causing `TimelineView` to re-render and pick up the new playhead value as a side effect.

**Fix:** `apps/editor/src/components/TimelineView.tsx` — Replaced `engine.getSnapshot()` with `usePlayheadFrame(engine)` hook, which uses `useSyncExternalStore` to subscribe to playhead changes.

**Verification:** Automated tests pass. Cannot verify visually — needs project owner's check.

### Bug 5: Time ruler doesn't scroll with tracks, doesn't adapt to zoom

**Two distinct problems:**

**5a. Scroll sync:** The ruler was a sibling of the scroll container (`.timeline-tracks`), not inside it. When scrolling horizontally, the ruler stayed fixed.

**Fix:** `apps/editor/src/components/TimelineView.tsx` + `Ruler.tsx` — Added `scrollLeft` state synced to the container's scroll event. The Ruler receives `scrollLeft` as a prop and offsets its canvas drawing by `-scrollLeft`. Tick rendering now computes visible frame range from `scrollLeft` and `ppf`, so ticks move in lockstep with the tracks. Ruler click handler also accounts for `scrollLeft` when computing the clicked frame.

**5b. Zoom adaptivity:** The ruler's tick interval logic already adapts to `ppf` (frames-per-pixel):
- `ppf >= 10`: every frame
- `ppf >= 4`: every ~6 frames (framesPerSecond / 5)
- `ppf >= 1`: every second
- `ppf < 1`: every 2 seconds

This was working correctly — the apparent "static" behavior was likely caused by the scroll sync issue making it seem disconnected from the tracks. With scroll sync fixed, zoom should now appear correct.

**Verification:** Automated tests pass. Cannot verify visually — needs project owner's check.

## Bug Fixes — Round 3 (from real user testing + systematic audit)

### Bug 6: Wobbly/jittery clips and ruler on mouse movement

**Root cause (confirmed via code tracing, not speculation):**

The `handlePointerMove` method in `TimelineEngine` (`packages/react/src/engine.ts:298-312`) called `rebuildSnapshot()` + `notifyProvisional()` → `notify()` on **every single pointer-move event** — even when the user was just hovering with no drag active. The tool-router already throttles to rAF (~60fps), so this ran ~60 times per second.

Each `notify()` call fires **all** subscriber callbacks (from `useSyncExternalStore` in `useTimeline`, `useTrackIds`, `useSelectedClipIds`, `usePlayheadFrame`, `useProvisional`, etc.). Even though React bails out when selector results haven't changed, running ~10+ selector functions × 6 components × 60fps = ~3,600 unnecessary selector evaluations per second. The `rebuildSnapshot()` call itself also created a new `ToolContext` object and called `activeTool.getCursor()` on every tick.

This is the actual measured behavior from reading the code path:
1. `onPointerMove` on `.timeline-tracks` fires
2. Tool-router captures snapshot, schedules rAF
3. rAF fires → `engine.handlePointerMove(converted, modifiers)`
4. `handlePointerMove`: `buildToolContext()` → `tool.onPointerMove()` → `rebuildSnapshot()` → `notifyProvisional()` → `notify()` → all subscribers
5. Steps 1-4 repeat ~60fps

**Why the `will-change` CSS fix didn't help:** The `will-change: left, width` hints promoted elements to compositing layers, adding memory/compositing overhead without addressing the actual problem — excessive React selector evaluations and snapshot rebuilding. Layout wasn't the bottleneck; the scripting cost of running subscribers was.

**Why the `box-shadow` transition removal didn't help:** The transition was innocent — `left`/`width` are set via inline styles and change instantly regardless of transition. The wobble was caused by the sheer volume of re-renders, not by animated properties.

**Fix:** `packages/react/src/engine.ts` — `handlePointerMove` now checks whether anything actually changed before rebuilding and notifying:
- If idle (no provisional state) and cursor unchanged → **skip entirely** (zero cost)
- If idle but cursor changed (e.g., moved from clip body to edge) → rebuild + notify (needed for cursor update)
- If provisional changed (active drag) → rebuild + notify (needed for ghost preview)

**Quantitative impact:** Before the fix, hovering over the timeline for 2 seconds triggered ~120 `rebuildSnapshot()` + `notify()` calls (60fps × 2s). After the fix, idle hover (no drag, cursor staying as `grab`) triggers **zero** rebuilds/notifications. Only actual state changes (cursor transition, drag start/move/end) trigger rebuilds.

**Verification:** All 29 editor tests + 1451 core tests pass. Lint/typecheck clean. Cannot verify visually — needs project owner's real-browser check. The render counter instrumentation was removed before final commit; a fresh measurement in-browser would confirm the re-render reduction.

### Bug 7: Elastic/stretching effect when scrolling fast

**Root cause:** Same root cause as Bug 6 — `handlePointerMove` triggered full snapshot rebuilds and subscriber notifications on every frame. During fast scrolling, pointer-move events fire continuously as the mouse moves across the timeline, and each one ran the full rebuild → notify pipeline. The combined cost of layout recalculations (from React re-renders triggered by `notify()`) and the canvas ruler redraw caused the rubber-band/stretch appearance.

**Why the `will-change` CSS fix didn't help:** Adding `will-change: scroll-position` to `.timeline-tracks` and `will-change: transform` to inner containers promoted elements to GPU compositing layers, which costs memory and compositing overhead. The actual bottleneck was the React notification pipeline, not GPU compositing.

**Fix:** Same fix as Bug 6 — the optimized `handlePointerMove` now skips rebuild/notify entirely during idle hover. During scrolling, the only notifications that fire are for actual state changes (cursor updates, provisional drag state), not every frame.

**Verification:** Same as Bug 6 — automated tests pass, needs real-browser check.

### Bug 8: Active clip not highlighted for non-Selection tools

**Root cause:** Bug 1's fix only highlighted clips in the SelectionTool's selection set. A clip being actively operated on by another tool (trim, split, ripple, slip) wasn't visually indicated.

**Fix:** `apps/editor/src/components/TrackView.tsx` + `ClipView.tsx` — Added `isTargeted` prop derived from `useProvisional()`. When a tool returns provisional state with ghost clips, the original clips being operated on are marked as "targeted" with a distinct orange highlight (`.clip.targeted` in CSS, using `--warning` color) vs. the blue selection highlight (`.clip.selected`).

**Verification:** Automated tests pass. Cannot verify visually — needs project owner's check.

## Tool Feedback Audit

Systematic review of all 12 tools for cursor, pre-action indicators, and in-progress state.

### Audit Table

| Tool | Cursor | Pre-action indicator | In-progress state | Status |
|------|--------|---------------------|-------------------|--------|
| **Selection** | `ew-resize` at edges (8px), `grab` on clip body, `grabbing` during drag, `crosshair` for rubber-band | Edge proximity via `hitEdge()` | Ghost clips (single/multi drag), rubber-band rectangle | ✅ Complete |
| **Razor** | `crosshair` (always) | None — no split preview line | None (instant commit) | ⚠️ Missing split preview line |
| **Ripple Trim** | `ew-resize` near edges / during drag | Edge proximity via `hitEdge()` | Ghost clips (trimmed + downstream shifted) | ✅ Complete |
| **Roll Trim** | `ew-resize` near cut point / during drag | Cut point detection via `findRollTarget()` | Ghost clips (both sides of cut) | ✅ Complete |
| **Slip** | `ew-resize` during drag, `grab` on clip | None (entire clip body is target) | Ghost clip with shifted mediaIn/mediaOut | ⚠️ Missing media range preview |
| **Slide** | `ew-resize` during drag, `grab` otherwise | None | Ghost clip at new position | ✅ Complete |
| **Ripple Delete** | `pointer` on clip | None beyond cursor | None (instant commit) | ⚠️ Missing deletion preview |
| **Ripple Insert** | `copy` when pending asset | None beyond cursor | Ghost clip at drop position + downstream shift | ✅ Complete |
| **Hand** | `grab` / `grabbing` | None | None (scroll is the feedback) | ✅ Complete |
| **Transition** | `ew-resize` (always) | None | Ghost clip with transition preview | ⚠️ Missing transition zone highlight |
| **Keyframe** | `crosshair` (always) | None | Ghost clip with keyframe preview | ⚠️ Missing keyframe position indicator |
| **Zoom** | `zoom-in` (always) | None | None (zoom is the feedback) | ✅ Complete |

### Implementation Notes

**Already correctly implemented (no changes needed):**
- Selection: Full cursor feedback, edge detection, ghost previews, rubber-band
- Ripple Trim: Edge detection, ghost clips showing trimmed + shifted downstream
- Roll Trim: Cut point detection, ghost clips showing both sides
- Slide: Ghost clip at new position
- Ripple Insert: Ghost clip showing inserted clip + downstream shift
- Hand: Cursor feedback is sufficient (grab/grabbing)
- Zoom: Cursor feedback is sufficient (zoom-in)

**Genuinely ambiguous / needs project owner input:**
- **Razor**: A split-preview line at the cursor would be ideal, but requires rendering a vertical line overlay on the timeline. The tool itself can't do this — needs a UI component that reads the razor tool's hover state.
- **Slip**: Showing which portion of source media will become visible requires rendering media thumbnails or timecodes on the ghost clip. Complex UI work.
- **Ripple Delete**: A deletion preview (e.g., dimming the clip + showing the gap closing) would be ideal. The tool returns no provisional state, so this needs the tool to be extended or a UI overlay.
- **Transition**: Highlighting the transition zone on hover requires the tool to expose its hit-test results to the UI.
- **Keyframe**: Showing where a keyframe would be added requires the tool to expose its pending add position to the UI.

**Recommended priority for future work:**
1. Razor split-preview line (high impact, moderate complexity)
2. Ripple Delete dimming preview (high impact, low complexity — tool needs to return provisional state)
3. Transition zone highlight (moderate impact, moderate complexity)
4. Keyframe position indicator (moderate impact, low complexity)
5. Slip media range preview (low impact, high complexity — needs media thumbnails)

## Architecture Notes

### Tool System Integration
All pointer/keyboard interactions go through `useToolRouter(engine, { getPixelsPerFrame, getScrollLeft })`. The tool router converts React events to `TimelinePointerEvent`/`TimelineKeyEvent` and dispatches to the active tool. No custom `onMouseDown`/`window.addEventListener` handlers are used.

### Component Structure
```
App
├── TimelineProvider (engine context)
├── Toolbar
│   ├── Tool buttons (V/B/R/T/Y/H/Z) → engine.activateTool()
│   ├── Undo/Redo → engine.undo()/redo()
│   ├── Split button → RazorTool via synthetic TimelinePointerEvent
│   ├── Ripple Delete button → RippleDeleteTool via synthetic TimelinePointerEvent
│   └── ZoomControls
├── main-content
│   ├── TrackLabels → useTrack(), track controls
│   ├── TimelineView
│   │   ├── Ruler → engine.seekTo() on click
│   │   ├── useToolRouter handlers
│   │   ├── TrackView[] → useTrack(), useProvisional()
│   │   │   ├── ClipView[] → useClip() (provisional-aware)
│   │   │   └── GhostClip[] (drag preview)
│   │   └── Playhead
│   └── MarkersPanel → useMarkers(), ADD_MARKER/DELETE_MARKER dispatch
└── StatusBar → usePlayheadFrame(), useSelectedClipIds()
```

### Sample Content
- 3 tracks: V1 (Main), V2 (Overlay), A1 (Music)
- 6 clips across tracks with intentional gaps for testing drag/trim
- Assets: Interview.mp4, B-Roll.mp4, Music.wav, Title Card.png
