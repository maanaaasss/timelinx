# Timelinx Architecture

How Timelinx is structured and how the pieces fit together.

## Package Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Application                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    @timelinx/ui                          │   │
│  │  Drop-in React components (TimelineEditor, Toolbar,      │   │
│  │  Ruler, Tracks, Clips, Playhead, Inspector, Panels)      │   │
│  │  CSS tokens + structure + theme presets                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   @timelinx/react                        │   │
│  │  TimelineEngine orchestrator                             │   │
│  │  20+ hooks (useTrackIds, useClip, usePlayhead, etc.)    │   │
│  │  TimelineProvider context                                │   │
│  │  Tool router (pointer/keyboard → engine)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    @timelinx/core                        │   │
│  │  Deterministic edit model (TimelineState)                │   │
│  │  dispatch(state, transaction) → nextState                │   │
│  │  40+ operations, 12 tools, undo/redo                     │   │
│  │  Snap index, interval tree, virtual window               │   │
│  │  Serialization: JSON, OTIO, EDL, AAF, FCPXML            │   │
│  │  Zero dependencies, framework-agnostic                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Core Architecture

### Immutable State Model

```
TimelineState
├── timeline
│   ├── id, name, fps, duration, startTimecode
│   ├── tracks[]
│   │   ├── id, name, type, height, muted, locked
│   │   └── clips[]
│   │       ├── id, assetId, trackId
│   │       ├── timelineStart, timelineEnd (TimelineFrame)
│   │       ├── mediaIn, mediaOut (TimelineFrame)
│   │       ├── name, effects[], transitions[]
│   │       └── transform, audioProperties
│   └── markers[]
│       ├── id, frame, label, color, duration
│       └── type, metadata
├── assets[]
│   ├── id, name, mediaType, filePath
│   ├── intrinsicDuration, nativeFps
│   └── status, metadata
└── version (monotonic counter)
```

### Mutation Flow

```
User Action / Tool / AI Agent
         │
         ▼
    Transaction { id, label, timestamp, operations[] }
         │
         ▼
    dispatch(state, transaction)
         │
         ├─► validateOperation(rollingState, op) → reject?
         │
         ├─► applyOperation(proposedState, op)
         │
         ├─► checkInvariants(proposedState) → violations?
         │
         └─► return { accepted: true, nextState }
```

### Tool System

```
ITool
├── onPointerDown(event, context) → Transaction | null
├── onPointerMove(event, context) → ProvisionalState | null
├── onPointerUp(event, context) → Transaction | null
├── onKeyDown(event, context) → Transaction | null
├── onKeyUp(event, context) → Transaction | null
└── onCancel() → void

Tools:
├── SelectionTool      (V) — click, marquee, add/remove
├── RazorTool          (C) — split clips at playhead/cursor
├── RippleTrimTool     (T) — trim with ripple
├── RollTrimTool       (R) — trim with roll
├── SlipTool           (S) — slip media in/out
├── SlideTool          (Y) — slide clip in timeline
├── RippleDeleteTool   — delete with ripple
├── RippleInsertTool   — insert with ripple
├── HandTool           (H) — pan timeline
├── TransitionTool     — add transitions between clips
├── KeyframeTool       — add/edit keyframes
└── ZoomTool           — zoom to selection
```

## React Architecture

### TimelineEngine

The central orchestrator class:

```
TimelineEngine
├── coreDispatch (from @timelinx/core)
├── HistoryStack (undo/redo with compression)
├── PlaybackEngine (optional, pipeline-based)
├── SnapIndexManager (async snap index rebuild)
├── TrackIndex (fast track-level queries)
├── KeyboardHandler (configurable key bindings)
├── ProvisionalManager (ghost/drag preview state)
├── ToolRegistry (12 default tools)
└── EngineSnapshot (for useSyncExternalStore)
```

### Hook System

All hooks use `useSyncExternalStore` for React 18+ concurrent features:

```
Context-based hooks (inside TimelineProvider):
├── useEngine() → TimelineEngine
├── useTimeline() → Timeline
├── useTrackIds() → string[]
├── useTrack(id) → Track | null
├── useClip(id) → Clip | null
├── useClips(trackId) → Clip[]
├── useMarkers() → Marker[]
├── useHistory() → { canUndo, canRedo }
├── usePlayheadFrame() → TimelineFrame
├── useIsPlaying() → boolean
├── useActiveToolId() → string
├── useProvisional() → ProvisionalState | null
├── useSelectedClipIds() → ReadonlySet<string>
└── useCursor() → string

Engine-first hooks (without context):
├── useTimelineWithEngine(engine)
├── useTrackIdsWithEngine(engine)
├── useTrackWithEngine(engine, id)
├── useClipWithEngine(engine, id)
└── useProvisionalWithEngine(engine)
```

## UI Architecture

### Component Tree

```
TimelineEditor
├── TimelineToolbar
│   ├── Tool buttons (Selection, Razor, Slip, Slide, Trim, Hand)
│   ├── Zoom controls (slider, +/-)
│   ├── Undo/Redo buttons
│   └── Play/Pause button
├── TimelineRuler (canvas-rendered timecodes)
├── Track Area
│   ├── Track Headers (name, type, mute/lock)
│   └── Clip Rows
│       ├── TimelineClip (with trim handles)
│       ├── Snap indicators
│       └── Drop zones
├── TimelinePlayhead
└── Keyboard shortcuts handler
```

### CSS Token System

All visual properties controlled by CSS custom properties:

```
Tokens (tokens.css):
├── Surfaces (bg-app, bg-panel, bg-surface, bg-raised)
├── Borders (border-faint, border-subtle, border-default)
├── Text (text-primary, text-secondary, text-tertiary)
├── Accent (accent, accent-hover, accent-active)
├── Semantic (color-danger, color-success, color-warning)
├── Track types (track-video, track-audio, track-subtitle)
├── Typography (font-sans, font-mono, text-xs → text-xl)
├── Spacing (space-1 → space-8, 4px grid)
├── Radius (radius-sm, radius-md, radius-lg)
├── Shadows (shadow-sm, shadow-md, shadow-lg)
└── Motion (duration-fast, duration-normal, duration-slow)

Presets:
├── dark-pro.css (default, DaVinci-inspired)
├── light.css (Final Cut Pro-inspired)
└── high-contrast.css (WCAG AAA accessible)
```

## Media Pipeline (Planned)

### @timelinx/media-web

```
@timelinx/media-web
├── WebCodecsDecoderAdapter (VideoDecoder contract)
├── WebAudioWaveformAdapter (waveform extraction)
├── ThumbnailAdapter (canvas-based frame extraction)
├── MediabunnyAdapter (mux/demux)
├── FFmpegWasmAdapter (fallback encoding)
└── Worker architecture (off-main-thread processing)
```

### Pipeline Contracts

```typescript
interface VideoDecoder {
  decode(config: VideoDecoderConfig): Promise<void>;
  requestFrame(request: VideoFrameRequest): Promise<VideoFrameResult>;
}

interface AudioDecoder {
  decode(config: AudioDecoderConfig): Promise<void>;
  requestChunk(request: AudioChunkRequest): Promise<AudioChunkResult>;
}

interface Compositor {
  composite(request: CompositeRequest): Promise<CompositeResult>;
}
```

## Data Flow

### Edit Flow

```
1. User clicks on clip
2. Tool router converts pointer event → TimelinePointerEvent
3. SelectionTool.onPointerDown → selects clip
4. Engine dispatches transaction → core validates → applies → returns new state
5. HistoryStack.push → stores for undo
6. SnapIndexManager.rebuild → updates snap points
7. React hooks re-render → UI updates
```

### Playback Flow

```
1. User presses Space
2. PlayheadController.play()
3. PlaybackEngine starts clock
4. Each frame:
   a. Clock tick → new frame
   b. FrameResolver → which clips at this frame?
   c. VideoDecoder → decode frames
   d. Compositor → composite layers
   e. Render to canvas
5. User pauses → clock stops
```

## Design Principles

1. **Immutable state** — Every operation returns a new state object.
2. **Single mutation path** — Only `dispatch()` can change state.
3. **Framework-agnostic core** — No DOM, no React, runs anywhere.
4. **Rolling validation** — Each op validated against previous result.
5. **Branded types** — `TimelineFrame`, `ClipId`, `TrackId` are distinct at compile time.
6. **Zero dependencies** — Core has no runtime dependencies.
7. **Worker-safe** — Core runs in Web Workers, Node.js, Electron.
