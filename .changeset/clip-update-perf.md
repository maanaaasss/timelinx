---
"@timelinx/core": patch
---

Performance improvements to clip and marker operations:
- `updateClip` (both `apply.ts` and `clip-operations.ts`) now only re-sorts the track's clip array when position-affecting fields (`timelineStart`/`timelineEnd`) actually changed — metadata-only updates skip the sort entirely
- `shiftLinkedMarkers` now returns early when no markers reference the clip being moved, avoiding an unnecessary `map` allocation
