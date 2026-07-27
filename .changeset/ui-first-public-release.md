---
"@timelinx/ui": minor
---

First public release of `@timelinx/ui` — browser-native React timeline editor UI built on `@timelinx/core` and `@timelinx/react`.

## What's included

### Core Timeline Components
- **`TimelineEditor`** — full-layout editor with toolbar, ruler, tracks, clips, and playhead
- **`TimelineToolbar`** — tool buttons, zoom controls, transport (undo/redo/play/pause)
- **`TimelineRuler`** — timecode ruler with configurable major/minor tick marks
- **`TimelineTrack`** — track label row with name, type badge, lock, solo/mute
- **`TimelineClip`** — clip block with trim handles, label, type-specific styling
- **`TimelinePlayhead`** — red playhead with frame-accurate positioning

### Decomposed Components (custom layouts)
- `TrackList`, `ZoomControls`, `TransportControls`, `SnapIndicator`, `DropZone`

### Panel Components
- `AssetBin` — browsable media asset library
- `InspectorPanel` — clip property inspector
- `EffectsPanel` — effect chain editor
- `KeyframesPanel` — keyframe curve editor
- `CaptionsPanel` — caption track editor
- `MarkersPanel` — timeline markers manager
- `TransitionsPanel` — transition browser and applier
- `ExportDialog` — export settings and progress UI
- `CompositorPreview` — canvas-based real-time compositor preview
- `MediaPreview` — file preview before import
- `CommandPalette`, `KeyboardShortcutsOverlay`, `StatusBar`, `TabbedPanel`, `TextPanel`, `CollapsibleSection`

### Media compositor and import utilities
- `extractMetadata`, `extractVideoMetadata`, `extractAudioMetadata`, `extractImageMetadata` — metadata extraction from `File` objects, with blob-URL revocation and timeout handling
- `useExport` hook — frame-clock-driven export runner that drives `@timelinx/core`'s render pipeline
- `MediaAssetsProvider` / `useMediaAssets` — context for managing the media asset bin

### Context and utilities (for custom layouts)
- `TimelineProvider`, `useTimelineContext`, `useEngine` — engine integration context
- `frameToPx`, `pxToFrame`, `frameToTimecode`, `rulerTickInterval`, `clamp`, `cn` — shared timeline math utilities

### Theming
- CSS variable system with ~50 tokens (`@timelinx/ui/styles/tokens`)
- `structure.css` — layout styles (`@timelinx/ui/styles/structure`)
- Three bundled presets:
  - **dark-pro** — DaVinci Resolve-inspired dark theme (`@timelinx/ui/styles/presets/dark-pro`)
  - **light** — Final Cut Pro-inspired light theme (`@timelinx/ui/styles/presets/light`)
  - **high-contrast** — WCAG AAA accessible theme (`@timelinx/ui/styles/presets/high-contrast`)

### Keyboard shortcuts built in
Selection/razor/ripple-trim/roll/slip/slide/hand tools, Space for play, arrow-key scrubbing, Cmd+Z/Shift+Z, Delete, Cmd+A, Escape.
