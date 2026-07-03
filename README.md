# Timelinx

Professional open-source NLE (Non-Linear Editor) timeline engine for the web.

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| [`@timelinx/core`](packages/core) | Headless TypeScript engine | 1.0.0-beta.1 |
| [`@timelinx/react`](packages/react) | React adapter + hooks | 1.0.0-beta.1 |
| [`@timelinx/ui`](packages/ui) | Modern browser-native UI | 1.0.0-beta.1 |

## Quick Start

```bash
npm install @timelinx/ui @timelinx/react @timelinx/core
```

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

## Architecture

```
Your App
└── @timelinx/ui       → Modern browser-native components (React)
    └── @timelinx/react  → Hooks, context, TimelineEngine
        └── @timelinx/core   → Pure TypeScript engine (zero deps)
```

- **@timelinx/core** is framework-agnostic. Runs in browser, Node.js, Web Workers, Electron.
- **@timelinx/react** provides `TimelineEngine` (wires core's dispatcher, history, tools, playback) and 20+ hooks.
- **@timelinx/ui** provides drop-in `TimelineEditor` with toolbar, ruler, tracks, clips, playhead, and full keyboard shortcuts.

## Features

- 40+ atomic editing operations
- 12 professional tools (Selection, Razor, Trim, Slip, Slide, etc.)
- Undo/redo with transaction compression
- Playback engine with J/K/L shuttle
- Export to OTIO, EDL, AAF, FCP XML
- SRT/VTT subtitle import
- Snap system, virtual windowing, interval tree
- Full CSS variable theming
- 850+ tests, zero TypeScript errors

## Development

```bash
pnpm install
pnpm --filter @timelinx/core test    # Run core tests
pnpm --filter @timelinx/react test   # Run react tests
pnpm --filter @timelinx/ui build     # Build UI package
cd apps/demo && pnpm dev             # Run demo app
```

## Status

Beta kernel with production-facing APIs:

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Foundation — types, dispatch, history | ✅ |
| 1 | Tool scaffolding + React adapter | ✅ |
| 2 | Core tools — Select, Razor, Trim, Slip, Delete, Insert | ✅ |
| 3 | Markers, BeatGrid, Generators, Captions, SRT/VTT | ✅ |
| 4 | Effects, Keyframes, Transitions, Track Groups | ✅ |
| 5 | Serialization — JSON, OTIO, EDL, AAF, FCP XML | ✅ |
| 6 | Playback engine — PlayheadController, pipeline contracts | ✅ |
| 7 | Performance — interval tree, compression, benchmarks | ✅ |
| R | @timelinx/react — full adapter buildout | ✅ |
| U | @timelinx/ui — modern browser-native UI | ✅ |

## Contributing

See CONTRIBUTING.md (coming soon).

## License

MIT
