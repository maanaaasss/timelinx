---
"@timelinx/ui": minor
---

Add Timeline V2 components: TimelineLayout, TimelineToolbarV2, TimelineRulerV2, TimelineTrackAreaV2, TrackRow, TrackHeader, TrackBody, ClipV2, PlayheadV2, RulerPlayhead, ZoomSlider, and useTimelineKeyboard hook.

These components provide a professional NLE-style timeline with:
- Click-to-seek and click-to-select clips
- Drag-to-move and trim handles on clips
- Snap-to-frame during drag
- Playhead dragging (ruler triangle + track area line)
- Zoom slider with adaptive ruler label density
- Keyboard shortcuts (arrows, delete, zoom)
- Focus rings, active states, selection flash animation
- Empty track placeholder
- Engine integration via @timelinx/react hooks (no local mutable state)

New CSS tokens added: --state-hover, --state-active, --transition-fast/base/slow, --tl-grid-line, --tl-clip-selected-border, --tl-ring-accent, --space-7.
