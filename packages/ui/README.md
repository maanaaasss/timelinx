# @timelinx/ui

Professional React timeline editor. Drop-in components built on `@timelinx/core` and `@timelinx/react`.

## Install

```bash
npm install @timelinx/ui @timelinx/react @timelinx/core
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

## Components

| Component | Description |
|-----------|-------------|
| `TimelineEditor` | Full-layout editor (toolbar + ruler + tracks + playhead) |
| `TimelineToolbar` | Tool buttons, zoom controls, transport (undo/redo/play) |
| `TimelineRuler` | Timecode ruler with major/minor ticks |
| `TimelineTrack` | Track label row (name, type badge, lock, solo/mute) |
| `TimelineClip` | Clip block with label, trim handles |
| `TimelinePlayhead` | Red playhead line |

### TimelineEditor Props

```typescript
interface TimelineEditorProps {
  engine: TimelineEngine;      // from @timelinx/react
  initialPpf?: number;         // initial pixels per frame (default: 4)
  onPpfChange?: (ppf: number) => void;
  registerZoomHandler?: (handler: (ppf: number) => void) => void;
  onAssetDrop?: (drop: { assetId: string; trackId: string; frame: number }) => void;
  showToolbar?: boolean;       // show/hide built-in toolbar (default: true)
  className?: string;
  style?: React.CSSProperties;
}
```

### Context & Utilities

For custom layouts, use the context directly:

```tsx
import { TimelineProvider, useTimelineContext, useEngine } from '@timelinx/ui';
import { frameToPx, pxToFrame, frameToTimecode } from '@timelinx/ui';
```

## Theming

All visual properties are controlled by ~50 CSS custom properties.

### Theme Presets

```tsx
// Dark Pro (default — DaVinci-inspired)
import '@timelinx/ui/styles/presets/dark-pro';

// Light (Final Cut Pro-inspired)
import '@timelinx/ui/styles/presets/light';

// High Contrast (WCAG AAA accessible)
import '@timelinx/ui/styles/presets/high-contrast';
```

### Custom Theme

Override any token in your CSS:

```css
:root {
  --tl-clip-video-bg: hsl(270 70% 50%);
  --tl-track-height: 60px;
  --tl-playhead-color: hsl(120 60% 50%);
}
```

### Key Tokens

| Token | Default | Description |
|-------|---------|-------------|
| `--tl-app-bg` | `#111315` | App background |
| `--tl-panel-bg` | `#17191c` | Panel background |
| `--tl-toolbar-bg` | `#1b1d20` | Toolbar background |
| `--tl-toolbar-height` | `40px` | Toolbar height |
| `--tl-ruler-height` | `32px` | Ruler height |
| `--tl-track-height` | `80px` | Track row height |
| `--tl-track-bg-video` | `#202328` | Video track background |
| `--tl-track-bg-audio` | `#1d2422` | Audio track background |
| `--tl-clip-video-bg` | `#285f7b` | Video clip fill |
| `--tl-clip-audio-bg` | `#287256` | Audio clip fill |
| `--tl-clip-radius` | `2px` | Clip border radius |
| `--tl-clip-text` | `hsl(0 0% 92%)` | Clip label color |
| `--tl-playhead-color` | `#ff3b30` | Playhead line color |
| `--tl-timecode-color` | `hsl(0 0% 88%)` | Timecode text color |
| `--tl-label-width` | `200px` | Track label column width |
| `--tl-snap-color` | `hsl(45 90% 60%)` | Snap indicator color |

See [tokens.css](src/tokens.css) for the full list. All colors controlled by CSS variables — no hardcoded colors in components.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Selection tool |
| `C` | Razor tool |
| `T` | Ripple Trim |
| `R` | Roll Trim |
| `S` | Slip |
| `Y` | Slide |
| `H` | Hand (pan) |
| `Space` | Play/Pause |
| `←` / `→` | Step 1 frame |
| `Shift+←/→` | Step 10 frames |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Delete` | Delete selected clips |
| `Cmd+A` | Select all |
| `Escape` | Clear selection |

## License

MIT
