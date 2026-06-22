# Demo Product Roadmap

## What the library already demonstrates

- Frame-accurate video and audio tracks with a synchronized playhead.
- Selection, move, razor, ripple trim, roll trim, slip, slide, and hand tools.
- Undo and redo, keyboard routing, snapping, zooming, track resizing, and virtualized clips.
- Track creation/deletion, clip deletion, markers, playback, and timeline seeking.
- Asset registration and image, video, and audio references through the core asset registry.

## Demo workflow implemented

- Import multiple images, videos, and audio files from the media pool.
- Read duration metadata for timed media and use a five-second default for still images.
- Preview real images and videos, play real audio, and synchronize media time to the playhead.
- Append media with Add/double-click or drag it to a compatible track at a chosen frame.
- Avoid overlaps when placing media and truncate placement at the timeline boundary.
- Present drop position feedback from the reusable DaVinci editor preset.

## Next production milestones

### 1. Media persistence

- Replace object URLs with a host-provided media resolver and persisted asset handles.
- Restore imported assets when a serialized project is reopened.
- Add missing/offline states, relink actions, and explicit object URL disposal.

### 2. Media intelligence

- Generate cached image/video thumbnails through the existing thumbnail queue.
- Decode real audio peaks instead of the deterministic placeholder waveform.
- Expose codec, resolution, channels, sample rate, frame rate, and proxy status.

### 3. Editing workflow

- Add drag ghosts with clip duration, collision, and compatibility feedback.
- Support insert versus overwrite placement and linked video/audio imports.
- Add a clip inspector for transform, speed, opacity, audio gain, and enabled state.
- Surface context menus for duplicate, split, ripple delete, disable, and reveal asset.

### 4. Viewer and playback

- Compose stacked video tracks instead of selecting one active video clip.
- Respect clip transforms, opacity, effects, speed, reverse, and transitions.
- Add viewer scaling, fit/fill controls, volume, loop playback, and in/out playback.
- Route decoding through a production WebCodecs or host pipeline integration.

### 5. Demo credibility

- Ship a small, redistributable media project instead of generator placeholders.
- Add first-run project reset and a deterministic guided sample edit.
- Add Playwright coverage for import, drop, playback, razor, move, trim, undo, and delete.
- Measure large-project rendering, drag latency, playback drift, and memory cleanup.

## Package ownership

- `packages/core`: deterministic state, operations, assets, playback contracts, validation.
- `packages/react`: subscriptions, engine lifecycle, hooks, and DOM event adaptation.
- `packages/ui`: reusable editor visuals, drop coordinates, interaction feedback, preset tokens.
- `apps/demo`: browser file access, media elements, host pipeline wiring, and product shell.

The demo should not grow media decoding or timeline mutation rules that belong in the packages.
