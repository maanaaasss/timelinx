---
"@timelinx/core": minor
---

Add new sub-path exports for better code organization:
- `@timelinx/core/serialization` — timeline serialization (`serializeTimeline`, `deserializeTimeline`), OTIO import/export, EDL export, AAF export, FCP XML export, project model
- `@timelinx/core/media` — subtitle import (`parseSRT`, `parseVTT`), marker search (`findMarkersByColor`, `findMarkersByLabel`), thumbnail cache/queue, worker contracts

These exports are moved from the main `@timelinx/core` entry point to dedicated sub-paths. The main entry point retains all tool, clip, track, effect, and keyframe APIs.
