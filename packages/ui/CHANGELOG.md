# Changelog

## 1.0.0-beta.2

### Minor Changes

- [#40](https://github.com/maanaaasss/timelinx/pull/40) [`9aae6d9`](https://github.com/maanaaasss/timelinx/commit/9aae6d9bb9bc76e85b4baf52ee34d9659543f10b) Thanks [@maanaaasss](https://github.com/maanaaasss)! - First public release of `@timelinx/ui` — browser-native React timeline editor UI built on `@timelinx/core` and `@timelinx/react`.

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

## 1.0.0-beta.3

### Patch Changes

- Updated dependencies [[`bb0538a`](https://github.com/maanaaasss/timelinx/commit/bb0538a23ea8534f2868a71ee2c209c8428ac8c1)]:
  - @timelinx/core@1.0.0-beta.3
  - @timelinx/react@1.0.0-beta.5

## 1.0.0-beta.2

### Patch Changes

- Updated dependencies [[`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72), [`9d4cea5`](https://github.com/maanaaasss/timelinx/commit/9d4cea51374b360369dd9a73053c1035b88fcc72)]:
  - @timelinx/core@1.0.0-beta.2
  - @timelinx/react@1.0.0-beta.4

All notable changes to `@webpacked-timeline/ui` are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0-beta.1] - 2026-03-07

### Added

- DaVinci Resolve-style preset with 6 components:
  - `DaVinciEditor` — full-layout editor (toolbar + ruler + tracks + clips + playhead)
  - `DaVinciToolbar` — tool buttons, zoom controls, undo/redo, play/pause
  - `DaVinciRuler` — timecode ruler with major/minor tick marks
  - `DaVinciTrack` — track label row with name, type badge, lock/visibility, solo/mute (audio), clip count
  - `DaVinciClip` — clip block with waveform visualization, label, trim handles, accent strip
  - `DaVinciPlayhead` — red playhead line
- `TimelineProvider` context and `useTimelineContext` / `useEngine` for custom layouts
- Shared utilities: `frameToPx`, `pxToFrame`, `frameToTimecode`, `rulerTickInterval`, `clamp`, `cn`
- CSS variable theming system with ~50 tokens in `tokens.css`
- DaVinci dark theme override in `davinci.css`
- Style entry points: `@webpacked-timeline/ui/styles/davinci` and `@webpacked-timeline/ui/styles/tokens`
- Full keyboard shortcut support (V/C/T/R/S/Y/H for tools, Space for play, arrow keys for scrubbing, Cmd+Z for undo)
- Track resize (drag handle between tracks)
- Clip selection, multi-select (Cmd+A), and deletion (Delete/Backspace)
- Virtual windowing for clips outside viewport
- Snap indicator lines during drag operations
- Add/delete tracks from the label column
- Add clips to tracks
- Zoom slider with logarithmic scale
- Playhead auto-scroll during playback
- Hand tool for panning
- Tabler-based SVG icon set
