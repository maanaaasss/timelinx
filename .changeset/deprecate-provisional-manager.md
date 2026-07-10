---
"@timelinx/core": patch
---

Deprecate `ProvisionalManager` wrapper type and its helper functions (`createProvisionalManager`, `setProvisional`, `clearProvisional`). Use `ProvisionalState | null` directly instead. The functions still work but are marked `@deprecated`. The `resolveClip` function now accepts the new type signature.
