---
"@timelinx/core": minor
---

Add caption support to `SelectionTool`, `RazorTool`, `RippleDeleteTool`, `RippleTrimTool`, and `RollTrimTool`:

- **SelectionTool**: new `drag-caption` mode for moving captions via pointer drag, with snap-to-edges, ghost preview, collision avoidance, and shift-click multi-selection
- **RazorTool**: clicking a caption with the razor tool slices it into two halves at the click point
- **RippleDeleteTool**: deleting a caption ripples all subsequent captions leftward to close the gap
- **RippleTrimTool**: trimming a caption's edge via drag, with ripple behavior for subsequent captions
- **RollTrimTool**: rolling the trim boundary between adjacent captions

New `ITool` interface method: `supportsCaptions?(): boolean` — when a tool declares this, the engine routes caption pointer events to it instead of always routing to `SelectionTool`.

Also adds `findClipWithTrack(state, clipId)` to the query surface — a utility that returns the clip, its parent track, and the track index in one call.
