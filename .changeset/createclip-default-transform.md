---
"@timelinx/core": patch
---

`createClip()` now always applies `DEFAULT_CLIP_TRANSFORM` when no `transform` is provided, instead of omitting the field. Previously, clips created without an explicit `transform` had no `transform` property at all (`clip.transform === undefined`). Now every clip has a `transform` object with default values (`{ positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, anchorX: 0.5, anchorY: 0.5 }`).

This affects any code doing `clip.transform === undefined` checks, JSON serialization comparison, or referential equality checks on the transform field of freshly-created clips.
