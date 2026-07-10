---
"@timelinx/react": minor
---

Caption gesture routing in `TimelineEngine`:
- `handlePointerDown` detects clicks on captions (`event.captionId != null`) and routes to the active tool if it supports captions, otherwise falls back to `SelectionTool`
- `handlePointerMove` and `handlePointerUp` continue routing through the same gesture tool until the pointer goes up
- Engine snapshot now includes `selectedCaptionIds`

Also adds keyboard shortcut activation: `handleKeyDown` now checks `tool.shortcutKey` on all registered tools and activates the matching tool. Previously, only the `KeyboardHandler`'s hardcoded bindings (J/K/L, Space, arrows) worked.
