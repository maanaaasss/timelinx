---
"@timelinx/core": patch
---

`KeyboardHandler` constructor now accepts `PlaybackEngine | null` instead of requiring a non-null engine. The handler silently no-ops transport actions (play/pause, seek, jog) when the engine is null, instead of throwing. This fixes a crash when constructing `TimelineEngine` without a `PlaybackEngine`.
