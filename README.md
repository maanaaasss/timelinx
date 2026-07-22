# Timelinx

[![CI](https://github.com/maanaaasss/timelinx/actions/workflows/ci.yml/badge.svg)](https://github.com/maanaaasss/timelinx/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@timelinx/core?label=@timelinx/core)](https://www.npmjs.com/package/@timelinx/core)
[![npm version](https://img.shields.io/npm/v/@timelinx/react?label=@timelinx/react)](https://www.npmjs.com/package/@timelinx/react)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Framework-agnostic TypeScript engine for professional NLE timeline editing, with React bindings for building browser-native video editors.

---

## Install

```bash
npm install @timelinx/core
# or with React bindings:
npm install @timelinx/core @timelinx/react
```

## Quick Start

```ts
import {
  createTimeline, createTimelineState, createTrack, createClip,
  createAsset, dispatch, toFrame, frameRate,
} from '@timelinx/core';

// 1. Create an asset (represents a media file)
const asset = createAsset({
  id: 'asset-1',
  name: 'Interview.mp4',
  mediaType: 'video',
  filePath: '/media/Interview.mp4',
  intrinsicDuration: toFrame(6000),
  nativeFps: frameRate(30),
  sourceTimecodeOffset: toFrame(0),
});

// 2. Create a clip and track
const clip = createClip({
  id: 'clip-1', assetId: asset.id, trackId: 'track-1',
  timelineStart: toFrame(0), timelineEnd: toFrame(300),
  mediaIn: toFrame(0), mediaOut: toFrame(300),
});
const track = createTrack({
  id: 'track-1', name: 'Video 1', type: 'video', clips: [clip],
});

// 3. Assemble initial state
const state = createTimelineState({
  timeline: createTimeline({
    id: 'tl-1', name: 'My Timeline', fps: frameRate(30),
    duration: toFrame(9000), tracks: [track],
  }),
  assetRegistry: new Map([[asset.id, asset]]),
});

// 4. Dispatch operations (the only way to mutate state)
const result = dispatch(state, {
  id: 'tx-1', label: 'Rename track', timestamp: Date.now(),
  operations: [{ type: 'SET_TRACK_NAME', trackId: 'track-1', name: 'Interview Cam A' }],
});

console.log(result.nextState.timeline.tracks[0].name);
// → "Interview Cam A"
```

This example was verified against the actual built package — the imports, function signatures, and output above are exact.

Full documentation: coming soon.

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [`@timelinx/core`](packages/core) | Headless TypeScript engine — zero dependencies, runs anywhere | Published |
| [`@timelinx/react`](packages/react) | React adapter — `TimelineEngine`, 20+ hooks, context, tool routing | Published |
| [`@timelinx/ui`](packages/ui) | Browser-native React components — drop-in timeline editor | Private (in development) |
| [`@timelinx/media-web`](packages/media-web) | WebCodecs, WebAudio, thumbnails, export | Private (in development) |
| [`@timelinx/collab`](packages/collab) | CRDT collaboration layer | Private (in development) |
| [`@timelinx/ai`](packages/ai) | AI operation layer | Private (in development) |

## Features

- **40+ atomic editing operations** — move, trim, slip, slide, delete, insert, split, link, group
- **12 professional tools** — Selection, Razor, Trim, Slip, Slide, Hand, Zoom, Rate, Markers, Split, Insert, Delete
- **Undo/redo** with transaction compression and rolling-state validation
- **Playback engine** with J/K/L shuttle, frame-accurate seek, and variable speed
- **Export** to OTIO, EDL (CMX 3600), AAF, FCP XML
- **Import** SRT/VTT subtitle files
- **Snap system** with configurable snap points
- **Virtual windowing** for efficient rendering of large timelines
- **Interval tree** for O(log n) clip overlap queries
- **Full CSS variable theming** with Dark Pro, Light, and High Contrast presets
- **1451+ tests** across 64 test files with 97%+ statement coverage

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, branch conventions, and the pull request process.

## License

[MIT](LICENSE) — Copyright 2026 Timeline Contributors
