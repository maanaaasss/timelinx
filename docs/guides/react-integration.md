# React Integration

This guide shows how to use `@timelinx/react` to build a minimal timeline component. Every code example is verified against the test suite.

## Setup

```bash
npm install @timelinx/core @timelinx/react
```

Peer dependencies: `react ^18 || ^19`.

## Minimal Component

```tsx
import { useState } from 'react';
import {
  createAsset, createClip, createTrack, createTimeline, createTimelineState,
  TimelineEngine, toFrame, frameRate,
} from '@timelinx/core';
import { TimelineProvider, useTimeline, useTrackIds, useClip } from '@timelinx/react';
```

### 1. Create the Engine

The `TimelineEngine` is the central orchestrator. It wraps core's dispatch, history, tools, and playback into a React-compatible object that implements the `useSyncExternalStore` contract:

```tsx
function createEditorEngine() {
  const asset = createAsset({
    id: 'asset-v',
    name: 'Video.mp4',
    mediaType: 'video',
    filePath: '/media/video.mp4',
    intrinsicDuration: toFrame(6000),
    nativeFps: frameRate(30),
    sourceTimecodeOffset: toFrame(0),
  });

  const timeline = createTimeline({
    id: 'tl-1',
    name: 'My Timeline',
    fps: frameRate(30),
    duration: toFrame(10800),
  });

  const state = createTimelineState({ timeline, assetRegistry: new Map([[asset.id, asset]]) });

  return new TimelineEngine(state);
}
```

### 2. Mount with TimelineProvider

```tsx
function App() {
  const [engine] = useState(() => createEditorEngine());

  return (
    <TimelineProvider engine={engine}>
      <TimelineEditor />
    </TimelineProvider>
  );
}
```

`TimelineProvider` is a thin React context wrapper. It does not manage state — the engine owns all state. The provider just makes the engine available to hooks.

### 3. Read State with Hooks

Every hook uses `useSyncExternalStore` with a selector for granular re-renders. Changing clip A does **not** re-render a component subscribed to clip B:

```tsx
function TimelineEditor() {
  const timeline = useTimeline();
  const trackIds = useTrackIds();

  return (
    <div>
      <h1>{timeline.name}</h1>
      <p>{trackIds.length} tracks, {timeline.duration} frames</p>
      {trackIds.map(id => <TrackView key={id} trackId={id} />)}
    </div>
  );
}

function TrackView({ trackId }: { trackId: string }) {
  const track = useTrack(trackId);
  if (!track) return null;

  return (
    <div>
      <h3>{track.name}</h3>
      {track.clips.map(clip => (
        <ClipView key={clip.id} clipId={clip.id} />
      ))}
    </div>
  );
}

function ClipView({ clipId }: { clipId: string }) {
  const clip = useClip(clipId);
  if (!clip) return null;

  return (
    <span style={{ margin: '0 4px', padding: 4, background: '#333', color: '#fff' }}>
      {clip.timelineStart}–{clip.timelineEnd}
    </span>
  );
}
```

### 4. Dispatch Operations

Use `useEngine()` to get the engine and call `dispatch()` directly:

```tsx
import { useEngine } from '@timelinx/react';

function AddClipButton() {
  const engine = useEngine();

  const handleAdd = () => {
    engine.dispatch({
      id: 'add-clip',
      label: 'Add clip',
      timestamp: Date.now(),
      operations: [{
        type: 'INSERT_CLIP',
        trackId: 'v1',
        clip: createClip({
          id: `clip-${Date.now()}`,
          assetId: 'asset-v',
          trackId: 'v1',
          timelineStart: toFrame(0),
          timelineEnd: toFrame(300),
          mediaIn: toFrame(0),
          mediaOut: toFrame(300),
        }),
      }],
    });
  };

  return <button onClick={handleAdd}>Add Clip</button>;
}
```

### 5. Undo/Redo

```tsx
function UndoRedoButtons() {
  const { canUndo, canRedo } = useCanUndoRedo();
  const engine = useEngine();

  return (
    <div>
      <button disabled={!canUndo} onClick={() => engine.undo()}>Undo</button>
      <button disabled={!canRedo} onClick={() => engine.redo()}>Redo</button>
    </div>
  );
}
```

### 6. Hook Isolation (Performance)

Each hook uses a selector pattern. `useClip(clipId)` only re-renders when **that specific clip** changes. This is verified by the test suite:

```ts
// From packages/react/src/__tests__/integration.test.tsx
it('useClip isolation: dispatch MOVE_CLIP on clip A -> render count for clip B unchanged', () => {
  const clipAId = 'v1-c1';
  const clipBId = 'v2-c1';
  let clipBRenderCount = 0;
  const { result } = renderHook(() => {
    const clipB = useClip(engine, clipBId);
    clipBRenderCount++;
    return clipB;
  });
  expect(clipBRenderCount).toBe(1);
  act(() => {
    engine.dispatch({
      id: 'move', label: 'Move A', timestamp: 0,
      operations: [
        { type: 'MOVE_CLIP', clipId: toClipId(clipAId), newTimelineStart: toFrame(20) },
      ],
    });
  });
  expect(result.current!.id).toBe(clipBId);
  expect(clipBRenderCount).toBe(1); // still 1 — no re-render
});
```

## Available Hooks

### Context-Based (read engine from `<TimelineProvider>`)

| Hook | Returns |
|------|---------|
| `useEngine()` | `TimelineEngine` |
| `useTimeline()` | `Timeline` object |
| `useTrackIds()` | `readonly string[]` |
| `useTrack(id)` | `Track \| null` |
| `useClip(id)` | `Clip \| null` (provisional-aware) |
| `useClips(trackId)` | `readonly Clip[]` |
| `useMarkers()` | `readonly Marker[]` |
| `useHistory()` | `{ canUndo, canRedo }` |
| `useActiveTool()` | `{ id: string, cursor: string }` |
| `useActiveToolId()` | `string` |
| `useCanUndo()` | `boolean` |
| `useCanRedo()` | `boolean` |
| `useCanUndoRedo()` | `{ canUndo, canRedo }` |
| `useCursor()` | `string` (CSS cursor) |
| `useProvisional()` | `ProvisionalState \| null` |
| `useSelectedClipIds()` | `ReadonlySet<string>` |

### Engine-First (require explicit `engine` argument)

| Hook | Returns |
|------|---------|
| `useTimelineWithEngine(engine)` | `Timeline` |
| `useTrackIdsWithEngine(engine)` | `readonly string[]` |
| `useTrackWithEngine(engine, id)` | `Track \| null` |
| `useClipWithEngine(engine, id)` | `Clip \| null` |
| `useProvisionalWithEngine(engine)` | `ProvisionalState \| null` |
| `usePlayheadFrame(engine)` | `TimelineFrame` |
| `useIsPlaying(engine)` | `boolean` |
| `useChange(engine)` | `StateChange` |
| `usePlaybackEngine(engine)` | `PlaybackEngine \| null` |

### Playback & Tool Routing

| Hook / Function | Purpose |
|-----------------|---------|
| `usePlayhead(engine)` | Full playhead state + stable action callbacks (play, pause, seek) |
| `usePlayheadEvent(engine, type, handler)` | Subscribe to specific playhead events |
| `useToolRouter(engine, options)` | Stable pointer/keyboard handlers from `createToolRouter` |
| `useVirtualWindow(engine, width, scroll, ppf)` | Viewport-aware frame range |
| `useVisibleClips(engine, window)` | Clips visible in the current viewport |

## Verified Example Test

This test from the suite confirms the full round-trip works:

```ts
// From packages/react/src/__tests__/integration.test.tsx
it('dispatch INSERT_CLIP -> useClips returns new clip', () => {
  const trackId = toTrackId('v1');
  const { result } = renderHook(() => useClips(engine, trackId));
  const countBefore = result.current.length;
  const newClip = createClip({
    id: 'v1-new', assetId: toAssetId('asset-v'), trackId: 'v1',
    timelineStart: toFrame(300), timelineEnd: toFrame(400),
    mediaIn: toFrame(0), mediaOut: toFrame(100),
  });
  act(() => {
    engine.dispatch({
      id: 'add', label: 'Add clip', timestamp: 0,
      operations: [{ type: 'INSERT_CLIP', trackId, clip: newClip }],
    });
  });
  expect(result.current.length).toBe(countBefore + 1);
  expect(result.current.some((c) => c.id === 'v1-new')).toBe(true);
});
```

## Next Steps

- [Core Concepts](./core-concepts.md) — dispatch model, invariants, history, tools
- [Getting Started](./getting-started.md) — core-only walkthrough without React
- [API Reference](../api/) — generated TypeDoc reference for every export
