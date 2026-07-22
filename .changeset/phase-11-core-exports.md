---
"@timelinx/core": minor
---

Export compositor-facing types from the public API:
- Types: `ResolvedLayer`, `ResolvedCompositeRequest`, `FileAsset`, `GeneratorAsset`

`ResolvedLayer` and `ResolvedCompositeRequest` are the output of `resolveFrame()` and are needed by any host-side compositor implementation. `FileAsset` and `GeneratorAsset` are the discriminated-union members of `Asset` and are needed when branching on asset kind (file vs. generator) in compositor or export code.

Previously consumers had to reach into internal paths or cast through `Asset` to access these.
