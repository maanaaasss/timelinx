---
"@timelinx/core": minor
---

Add caption types and subtitle import to the public API:
- Types: `CaptionId`, `CaptionStyle`, `Caption`
- Functions: `toCaptionId`, `parseSRT`, `parseVTT`, `subtitleImportToOps`, `defaultCaptionStyle`

These were previously internal-only. Exporting them enables consumers to work with caption data and subtitle import without reaching into internal paths.

Also add generator types to the public API:
- Types: `GeneratorId`, `GeneratorType`, `Generator`
- Functions: `toGeneratorId`

Required for dispatching `INSERT_GENERATOR` operations from consumer code (e.g., text clip creation in the editor).
