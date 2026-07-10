---
"@timelinx/core": patch
---

Fix `INSERT_GENERATOR`: the clip created by `applyOperation` now receives `name: op.generator.name` instead of `null`. Generator-backed clips (text, solid color, etc.) now display their generator name on the timeline instead of a generated ID like `gen-clip-gen-title-1`.

Also adds exhaustive `default` case to the `applyOperation` switch — unhandled operation types now throw at runtime instead of silently falling through.
