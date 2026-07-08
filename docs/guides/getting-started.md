# Getting Started

This guide walks through the core workflow of `@timelinx/core`: creating a timeline, adding tracks and clips, moving clips, and undoing changes. It expands on the README quickstart with more detail.

## Prerequisites

- Node.js >= 22
- pnpm 10.28.2

## Install

```bash
npm install @timelinx/core
# or with React bindings:
npm install @timelinx/core @timelinx/react
```

## Complete Walkthrough

### Step 1: Create a Timeline

Every timeline needs an asset registry, a timeline definition, and a state container:

```ts
import {
  createAsset,
  createClip,
  createTrack,
  createTimeline,
  createTimelineState,
  dispatch,
  toFrame,
  frameRate,
} from '@timelinx/core';

// Register media assets
const asset = createAsset({
  id: 'my-video',
  name: 'Interview.mp4',
  mediaType: 'video',
  filePath: '/media/interview.mp4',
  intrinsicDuration: toFrame(6000), // 5 min at 30fps
  nativeFps: frameRate(30),
  sourceTimecodeOffset: toFrame(0),
});

// Create the timeline
const timeline = createTimeline({
  id: 'tl-1',
  name: 'My Edit',
  fps: frameRate(30),
  duration: toFrame(10800), // 6 min
});

// Create the initial state
const state = createTimelineState({ timeline });
```

This is verified against the test suite — `createTimelineState` produces a valid state with version 0, an empty tracks array, and the asset registry you pass in.

### Step 2: Add a Track

Tracks hold clips. There are `video` and `audio` track types:

```ts
const track = createTrack({
  id: 'v1',
  name: 'V1',
  type: 'video',
  clips: [],
});

const result = dispatch(state, {
  id: 'add-track',
  label: 'Add video track',
  timestamp: Date.now(),
  operations: [{ type: 'ADD_TRACK', track }],
});

if (!result.accepted) {
  throw new Error(`Failed: ${result.reason} — ${result.message}`);
}

const withTrack = result.nextState;
```

### Step 3: Add a Clip

Clips reference an asset and define a time range on the timeline:

```ts
const clip = createClip({
  id: 'clip-1',
  assetId: 'my-video',
  trackId: 'v1',
  timelineStart: toFrame(0),
  timelineEnd: toFrame(300), // 10 seconds at 30fps
  mediaIn: toFrame(0),
  mediaOut: toFrame(300),
});

const result = dispatch(withTrack, {
  id: 'add-clip',
  label: 'Add first clip',
  timestamp: Date.now(),
  operations: [{ type: 'INSERT_CLIP', trackId: 'v1', clip }],
});

const withClip = result.nextState;
```

The invariant system verifies:
- The asset exists in the registry
- The clip fits within the timeline duration
- No overlap with other clips on the track
- Media bounds are within the asset's intrinsic duration

### Step 4: Move the Clip

```ts
const result = dispatch(withClip, {
  id: 'move-clip',
  label: 'Move clip forward',
  timestamp: Date.now(),
  operations: [{
    type: 'MOVE_CLIP',
    clipId: 'clip-1',
    newTimelineStart: toFrame(150), // move 5 seconds forward
  }],
});

const moved = result.nextState;
// clip-1 is now at frames [150..450]
```

### Step 5: Undo

```ts
import { createHistory, pushHistory, undo, getCurrentState, canUndo } from '@timelinx/core';

let history = createHistory(state);
history = pushHistory(history, withTrack);
history = pushHistory(history, withClip);
history = pushHistory(history, moved);

if (canUndo(history)) {
  history = undo(history);
  const restored = getCurrentState(history);
  // restored is the state before the move
}
```

## Multi-Operation Transactions

Complex edits batch multiple operations into a single atomic transaction:

```ts
const result = dispatch(state, {
  id: 'razor-split',
  label: 'Split clip at frame 150',
  timestamp: Date.now(),
  operations: [
    // Delete the original clip
    { type: 'DELETE_CLIP', clipId: 'clip-1' },
    // Insert left half
    { type: 'INSERT_CLIP', trackId: 'v1', clip: createClip({
      id: 'clip-1-left', assetId: 'my-video', trackId: 'v1',
      timelineStart: toFrame(0), timelineEnd: toFrame(150),
      mediaIn: toFrame(0), mediaOut: toFrame(150),
    })},
    // Insert right half
    { type: 'INSERT_CLIP', trackId: 'v1', clip: createClip({
      id: 'clip-1-right', assetId: 'my-video', trackId: 'v1',
      timelineStart: toFrame(150), timelineEnd: toFrame(300),
      mediaIn: toFrame(150), mediaOut: toFrame(300),
    })},
  ],
});
```

If any operation fails validation, all three are rejected — the original clip remains intact.

## Rejection Handling

`dispatch()` returns a `DispatchResult` that tells you exactly why an operation was rejected:

```ts
const result = dispatch(state, transaction);
if (!result.accepted) {
  switch (result.reason) {
    case 'OVERLAP':
      // Two clips would overlap on the same track
      break;
    case 'ASSET_MISSING':
      // A clip references an asset not in the registry
      break;
    case 'CLIP_BEYOND_TIMELINE':
      // A clip extends past the timeline duration
      break;
    case 'INVARIANT_VIOLATED':
      // The proposed state broke an invariant (result.message has details)
      break;
    // ... 28 total rejection reasons
  }
}
```

## Next Steps

- [Core Concepts](./core-concepts.md) — dispatch model, invariants, history, tools
- [React Integration](./react-integration.md) — hooks, provider, tool routing
- [API Reference](../api/) — generated TypeDoc reference for every export
