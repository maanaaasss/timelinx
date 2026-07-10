---
"@timelinx/core": patch
---

Fix `validateClip` duration-mismatch check: relaxed from exact integer equality to a ±0.5 frame tolerance. Generator-backed clips and clips created through operations may have sub-frame duration rounding — the strict check incorrectly rejected valid states.
