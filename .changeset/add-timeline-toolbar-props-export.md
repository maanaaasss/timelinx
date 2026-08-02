---
"@timelinx/ui": patch
---

Export `TimelineToolbarProps` type from the public API barrel (`src/index.ts`). Previously the type existed in the component module but was not re-exported, preventing consumers from importing it for typing.
