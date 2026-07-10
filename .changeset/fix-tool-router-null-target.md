---
"@timelinx/react": patch
---

Fix `tool-router.ts` null `currentTarget` crash: pointer events are now snapshot at fire time (fields like `clientX`, `target`, `currentTarget`, `getBoundingClientRect()` captured immediately) instead of reading `e.currentTarget` inside the rAF callback. The rAF callback had been reading `e.currentTarget` after React's synthetic event pool recycled the event, causing null reference errors.

Also snapshot the event in `onPointerMove` for the same reason — React nullifies `currentTarget` after the handler returns.
