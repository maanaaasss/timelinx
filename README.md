# Timelinx

[![CI](https://github.com/maanaaasss/timelinx/actions/workflows/ci.yml/badge.svg)](https://github.com/maanaaasss/timelinx/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@timelinx/core?label=@timelinx/core)](https://www.npmjs.com/package/@timelinx/core)
[![npm](https://img.shields.io/npm/v/@timelinx/react?label=@timelinx/react)](https://www.npmjs.com/package/@timelinx/react)
[![npm](https://img.shields.io/npm/v/@timelinx/ui?label=@timelinx/ui)](https://www.npmjs.com/package/@timelinx/ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Professional open-source NLE (Non-Linear Editor) timeline engine for the web. Framework-agnostic core with React bindings and browser-native UI components.

---

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| [`@timelinx/core`](packages/core) | Headless TypeScript engine — zero dependencies, runs anywhere | `npm i @timelinx/core` |
| [`@timelinx/react`](packages/react) | React adapter — `TimelineEngine`, 20+ hooks, context, tool routing | `npm i @timelinx/react` |
| [`@timelinx/ui`](packages/ui) | Browser-native React components — drop-in timeline editor | `npm i @timelinx/ui` |
| [`@timelinx/media-web`](packages/media-web) | WebCodecs, WebAudio, thumbnails, export | `npm i @timelinx/media-web` |
| [`@timelinx/collab`](packages/collab) | CRDT collaboration layer | `npm i @timelinx/collab` |
| [`@timelinx/ai`](packages/ai) | AI operation layer | `npm i @timelinx/ai` |

## Installation

### pnpm (recommended)

```bash
pnpm add @timelinx/ui @timelinx/react @timelinx/core
```

### npm

```bash
npm install @timelinx/ui @timelinx/react @timelinx/core
```

### yarn

```bash
yarn add @timelinx/ui @timelinx/react @timelinx/core
```

## Quick Start

```tsx
import { TimelineEditor } from '@timelinx/ui';
import '@timelinx/ui/styles/tokens';
import '@timelinx/ui/styles/structure';
import { TimelineEngine } from '@timelinx/react';
import { createTimelineState, createTimeline, toFrame, frameRate } from '@timelinx/core';

const engine = new TimelineEngine({
  initialState: createTimelineState({
    timeline: createTimeline({
      id: 'tl-1',
      name: 'My Timeline',
      fps: frameRate(30),
      duration: toFrame(9000),
    }),
  }),
});

export default function App() {
  return <TimelineEditor engine={engine} style={{ height: '100vh' }} />;
}
```

## Core-Only Usage

Use `@timelinx/core` without React for headless processing, server-side logic, or custom UI frameworks:

```ts
import {
  createTimelineState, createTimeline, createTrack, createClip,
  toFrame, frameRate, dispatch, validateInvariants,
} from '@timelinx/core';

const state = createTimelineState({
  timeline: createTimeline({
    id: 'tl-1',
    name: 'My Timeline',
    fps: frameRate(30),
    duration: toFrame(9000),
  }),
  tracks: [
    createTrack({
      id: 'tr-1',
      name: 'Video 1',
      timelineId: 'tl-1',
      type: 'video',
    }),
  ],
  clips: [
    createClip({
      id: 'cl-1',
      trackId: 'tr-1',
      timelineId: 'tl-1',
      startFrame: toFrame(0),
      endFrame: toFrame(300),
    }),
  ],
});

const result = dispatch(state, { type: 'MOVE_CLIP', payload: { clipId: 'cl-1', deltaFrames: 30 } });
console.log(result.timelineState);
```

## React Hooks

```tsx
import { useEngine, useTrackIds, useClip, usePlayheadFrame, useCanUndo, useCanRedo } from '@timelinx/react';

function TimelineControls() {
  const engine = useEngine();
  const trackIds = useTrackIds();
  const clip = useClip('cl-1');
  const frame = usePlayheadFrame();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  return (
    <div>
      <p>Frame: {frame}</p>
      <p>Tracks: {trackIds.length}</p>
      <p>Clip: {clip?.startFrame} → {clip?.endFrame}</p>
      <button disabled={!canUndo} onClick={() => engine.undo()}>Undo</button>
      <button disabled={!canRedo} onClick={() => engine.redo()}>Redo</button>
    </div>
  );
}
```

## Architecture

```
Your App
└── @timelinx/ui         → Browser-native React components
    └── @timelinx/react  → Hooks, context, TimelineEngine
        └── @timelinx/core → Pure TypeScript engine (zero deps)
```

- **@timelinx/core** is framework-agnostic. Runs in browser, Node.js, Web Workers, Electron.
- **@timelinx/react** provides `TimelineEngine` (wires core's dispatcher, history, tools, playback) and 20+ hooks.
- **@timelinx/ui** provides drop-in `TimelineEditor` with toolbar, ruler, tracks, clips, playhead, and full keyboard shortcuts.

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
- **1451+ tests** across 61 test files with 85%+ branch coverage

## Development

```bash
# Install dependencies
pnpm install

# Run the full validation pipeline
pnpm ci          # lint → typecheck → build → test

# Run individual steps
pnpm lint        # ESLint
pnpm typecheck   # TypeScript compilation check
pnpm build       # Build all packages
pnpm test        # Run all tests

# Development with demo app
pnpm dev         # Starts demo app at localhost:5173
```

## Project Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Foundation — types, dispatch, history | Complete |
| 1 | Tool scaffolding + React adapter | Complete |
| 2 | Core tools — Select, Razor, Trim, Slip, Delete, Insert | Complete |
| 3 | Markers, BeatGrid, Generators, Captions, SRT/VTT | Complete |
| 4 | Effects, Keyframes, Transitions, Track Groups | Complete |
| 5 | Serialization — JSON, OTIO, EDL, AAF, FCP XML | Complete |
| 6 | Playback engine — PlayheadController, pipeline contracts | Complete |
| 7 | Performance — interval tree, compression, benchmarks | Complete |
| R | @timelinx/react — full adapter buildout | Complete |
| U | @timelinx/ui — modern browser-native UI | Complete |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, branch conventions, commit standards, and the pull request process.

## License

[MIT](LICENSE) — Copyright 2026 Timeline Contributors
