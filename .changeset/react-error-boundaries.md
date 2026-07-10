---
"@timelinx/react": patch
---

Add `onError` callback support to all pointer and keyboard event handlers in `TimelineEngine`. Tool errors (e.g., thrown by a tool's `onPointerDown`/`onPointerMove`/`onPointerUp`/`onKeyDown`) are now caught and forwarded to `options.onError(err, context)` instead of propagating to the caller. This prevents a single tool crash from breaking the entire event pipeline.

Also add dispatch rejection logging: when `coreDispatch` rejects a transaction, the engine logs `[TimelineEngine] Dispatch rejected: <reason> — <message>` with the transaction details.
