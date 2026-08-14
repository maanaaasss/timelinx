# @timelinx/core

Headless TypeScript engine for professional NLE timeline editing. Framework-agnostic, fully tested, zero dependencies.

## Install

```bash
npm install @timelinx/core
```

## Features

- **40+ atomic operations** — `MOVE_CLIP`, `RESIZE_CLIP`, `SLICE_CLIP`, `INSERT_CLIP`, `DELETE_CLIP`, `SET_MEDIA_BOUNDS`, `ADD_TRACK`, `DELETE_TRACK`, `ADD_MARKER`, `ADD_EFFECT`, `ADD_KEYFRAME`, `ADD_TRANSITION`, `LINK_CLIPS`, and more
- **Tool system** — Selection, Razor, Ripple Trim, Roll Trim, Slip, Slide, Ripple Delete, Ripple Insert, Hand, Transition, Keyframe, Zoom
- **Undo/redo** with transaction compression
- **Playback engine** with J/K/L shuttle control via `KeyboardHandler`
- **Snap system** — `SnapIndexManager` with configurable snap points
- **Virtual windowing** — `getVisibleClips()` / `getVisibleFrameRange()` for large timelines
- **Export** — OTIO, EDL (CMX 3600), AAF, FCP XML
- **Serialization** — versioned JSON with `serializeTimeline` / `deserializeTimeline`
- **Import** — SRT and VTT subtitle import
- **Project model** — multi-timeline container with bin/folder hierarchy
- **Interval tree** — O(log n) clip lookup via `IntervalTree` / `TrackIndex`
- **Branded types** — `TimelineFrame`, `ClipId`, `TrackId`, `FrameRate` are distinct at compile time
- **Zero dependencies**

## Quick Start

```typescript
import {
  createTimelineState,
  createTimeline,
  createTrack,
  createClip,
  dispatch,
  checkInvariants,
  toFrame,
  toTrackId,
  toClipId,
  toAssetId,
  frameRate,
} from '@timelinx/core';

// 1. Build initial state
const state = createTimelineState({
  timeline: createTimeline({
    id: 'tl-1',
    name: 'My Timeline',
    fps: frameRate(30),
    duration: toFrame(9000),
    tracks: [createTrack({ id: toTrackId('v1'), name: 'Video 1', type: 'video' })],
  }),
});

// 2. Dispatch an operation
const result = dispatch(state, {
  id: 'tx-1',
  label: 'Insert clip',
  timestamp: Date.now(),
  operations: [
    {
      type: 'INSERT_CLIP',
      trackId: toTrackId('v1'),
      clip: createClip({
        id: toClipId('clip-1'),
        assetId: toAssetId('asset-1'),
        trackId: toTrackId('v1'),
        timelineStart: toFrame(0),
        timelineEnd: toFrame(90),
        mediaIn: toFrame(0),
        mediaOut: toFrame(90),
        name: 'Intro',
      }),
    },
  ],
});

// 3. Validate
if (result.ok) {
  const violations = checkInvariants(result.state);
  console.log(violations); // []
}
```

## Playback

```typescript
import { PlaybackEngine, browserClock } from '@timelinx/core';

const playback = new PlaybackEngine(
  state,
  { videoDecoder, compositor }, // PipelineConfig
  { width: 1920, height: 1080 },
  browserClock,
);

playback.play();
```

## Serialization

```typescript
import {
  serializeTimeline,
  deserializeTimeline,
  exportToOTIO,
  exportToEDL,
  exportToAAF,
  exportToFCPXML,
} from '@timelinx/core';

// JSON round-trip
const json = serializeTimeline(state);
const restored = deserializeTimeline(json);

// Industry formats
const otio = exportToOTIO(state);
const edl = exportToEDL(state);
const aaf = exportToAAF(state);
const fcpxml = exportToFCPXML(state);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Consumers & Adapters                               │
│                (React, Headless Editors, Node, Workers)                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Public Surface (packages/core)                      │
│                index.ts  •  public-api.ts  •  subpath exports              │
├──────────────────────────────┬──────────────────────────────┬───────────────┤
│       Runtime Modules        │        Mutation Core         │  Specialized  │
│                              │                              │    Exports    │
│  TimelineEngine, tools,      │  dispatch(state, tx)         │               │
│  HistoryStack, snap index    │   ├─ validate (rolling)      │  serialization│
│                              │   ├─ apply (pure update)     │  media        │
│                              │   └─ invariants (full doc)   │  contracts    │
├──────────────────────────────┴──────────────────────────────┴───────────────┤
│                               Types & Factories                             │
│   TimelineState  •  Transaction  •  Clip  •  Track  •  Asset  •  Branded IDs│
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Single Mutation Entry** — `dispatch(state, transaction)` is the sole entry point for updating document state.
- **Rolling-State Validation** — each operation in a compound transaction is validated against the state produced by prior operations.
- **Two-Layer Invariants** — `validateOperation()` guards individual ops; `checkInvariants()` validates full-document health post-apply.
- **Strict Immutability** — state updates use structural sharing; unchanged clips maintain reference identity.
- **Branded Compile-Time Safety** — `TimelineFrame`, `ClipId`, `TrackId`, and `AssetId` prevent argument position bugs.
- **Zero DOM Dependencies** — runs in browser threads, Node.js, Web Workers, and server processes.

## API Reference

### Factories

`createTimeline`, `createTrack`, `createClip`, `createAsset`, `createTimelineState`

### Frame Utilities

`toFrame`, `frameRate`, `framesToTimecode`, `framesToSeconds`, `secondsToFrames`, `FrameRates`

### State Management

`dispatch`, `checkInvariants`, `HistoryStack`, `TransactionCompressor`

### Tools

`SelectionTool`, `RazorTool`, `RippleTrimTool`, `RollTrimTool`, `SlipTool`, `SlideTool`, `RippleDeleteTool`, `RippleInsertTool`, `HandTool`, `TransitionTool`, `KeyframeTool`, `ZoomTool`

### Playback

`PlaybackEngine`, `PlayheadController`, `KeyboardHandler`, `browserClock`, `nodeClock`

### Serialization & Export

`serializeTimeline`, `deserializeTimeline`, `exportToOTIO`, `importFromOTIO`, `exportToEDL`, `exportToAAF`, `exportToFCPXML`

### Performance

`IntervalTree`, `TrackIndex`, `SnapIndexManager`, `ThumbnailCache`, `ThumbnailQueue`, `getVisibleClips`

## Tests

```bash
pnpm --filter @timelinx/core test
# 852 tests, 0 TypeScript errors
```

## License

MIT
