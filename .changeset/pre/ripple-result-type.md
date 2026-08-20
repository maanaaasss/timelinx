---
'@timelinx/core': minor
---

`TimelineEngine.rippleMove()` and `TimelineEngine.insertMove()` no longer **throw** on failure — they return `{ accepted: false, errors: [...] }` instead.

**Migration:** Code that catches exceptions from these methods must switch to checking the result:

```ts
// Before (now broken — catch never fires)
try {
  engine.rippleMove(clipId, newStart);
} catch (e) {
  handleError(e);
}

// After
const result = engine.rippleMove(clipId, newStart);
if (!result.accepted) {
  handleError(result.errors);
}
```

`rippleDelete()`, `rippleTrim()`, and `insertEdit()` were already non-throwing — no change needed for those.

Also adds:

- Prototype pollution guard in `deserializeTimeline()` — strips `__proto__`/`constructor`/`prototype` keys from untrusted JSON
- 50MB payload size limit in `deserializeTimeline()` to prevent OOM
