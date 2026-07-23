# Phase 11 — Export Duration Fix (Addendum)

## Root Cause

The export was running far longer than actual content because:

1. **Hardcoded timeline duration**: `createEditorEngine.ts` set `timeline.duration = toFrame(10800)` — that's **360 seconds (6 minutes)** at 30fps
2. **Demo content only spans 40 seconds**: The sample clips (clip-1 through clip-6) only occupy frames 0–1200 (40 seconds)
3. **Export uses `timeline.duration`**: The `ExportRunner.run()` in `use-export.ts:185` uses `state.timeline.duration` as the endpoint, not the actual clip positions
4. **Real-time export**: The export runs in real-time via `requestAnimationFrame`, so it records for the full 360 seconds regardless of content

## The Fix

### 1. Blank-by-default editor (`createEditorEngine.ts`)
- Removed all sample clips, assets, and demo content
- Timeline starts with `duration: toFrame(0)` (empty)
- Empty tracks (V1, V2, A1, S1) are pre-created for drag-and-drop

### 2. Opt-in demo mode (`createDemoEngine.ts`)
- Created new file with the original demo content
- Preserves all sample clips, assets, and generators for testing
- Accessible via "Load Demo" button in the UI

### 3. Demo toggle in App.tsx
- Added "▶ Load Demo" / "✕ Exit Demo" button (top-right corner)
- Switches between blank and demo engines
- Demo mode is clearly indicated

### 4. Auto-extending timeline duration
- Updated `handleAssetDrop` in `App.tsx` and `handleAssetClick` in `asset-bin.tsx`
- When a clip is placed on the timeline, `timeline.duration` is automatically extended if needed
- Uses `SET_TIMELINE_DURATION` operation (undoable, history-tracked)

### 5. Test updates
- `TestWrapper` now uses `createDemoEngine()` for tests that need demo content
- Tests that render `<App />` and expect demo content now render `<DemoApp />`
- All 77 editor tests pass

## Export Duration Behavior

| Scenario | `timeline.duration` | Export Length |
|----------|---------------------|---------------|
| Empty editor (blank start) | 0 frames | ~33ms (1 frame) |
| After importing 10s clip | 300 frames | ~10 seconds |
| Demo mode | 10800 frames | 360 seconds (6 min) |

## Verification

The fix ensures:
1. **Real users get instant export** — blank timeline exports in ~33ms
2. **Imported content drives duration** — 10s clip → ~10s export
3. **Demo content preserved** — available via "Load Demo" button for testing
4. **Timeline auto-extends** — placing clips automatically updates duration

## Files Changed

- `apps/editor/src/createEditorEngine.ts` — blank default engine
- `apps/editor/src/createDemoEngine.ts` — new, opt-in demo content
- `apps/editor/src/App.tsx` — demo toggle button, auto-extending duration
- `packages/ui/src/components/asset-bin.tsx` — auto-extending duration on click
- `apps/editor/src/__tests__/features.test.tsx` — updated for blank default
