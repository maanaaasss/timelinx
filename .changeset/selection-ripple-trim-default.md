---
"@timelinx/core": minor
---

SelectionTool edge-drag behavior change: dragging a clip edge now defaults to **ripple trim** instead of simple resize.

**Before:** Edge-drag produced a single `RESIZE_CLIP` operation — only the dragged clip changed size.

**After:** Edge-drag produces `RESIZE_CLIP` + N×`MOVE_CLIP` for every downstream clip. Trimming a clip's end pushes all clips to its right rightward; trimming a start pulls all clips to its left leftward.

**Roll trim:** Alt/Option+edge-drag gives the previous behavior at cut points between adjacent clips (both clips resize to maintain adjacency, no downstream shift).

This changes existing behavior for any consumer already using SelectionTool's edge-drag. If you relied on edge-drag only resizing the target clip, add Alt/Option to the gesture.
