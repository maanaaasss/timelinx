---
"@timelinx/react": patch
---

Add `destroy()` method to `ToolRouterHandlers` returned by `createToolRouter`. Cancels any pending rAF and clears snapshot state. Should be called on component unmount to prevent state updates on an unmounted component.

Fix `useToolRouter` memoization: now includes `getPixelsPerFrame` and `getScrollLeft` in the deps array, so the router is recreated when these callbacks change.
