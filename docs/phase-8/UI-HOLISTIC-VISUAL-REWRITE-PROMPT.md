Six incremental rounds have gotten the structure roughly right but the visual execution still falls well short of the provided reference. This round is different: treat the reference screenshot as a literal specification to replicate as closely as possible — not directional inspiration, an actual target to match — and rewrite the visual/CSS layer holistically. Do NOT touch or rebuild the underlying functional logic (reactive hooks, data-fetching, component extraction from apps/editor) — that layer is proven and correct. This is a styling rewrite on top of unchanged, working components.

## Ground rule
You're allowed to delete and rewrite CSS/styling wholesale rather than patching incrementally. If the current `structure.css`/preset treatment for a section doesn't match the reference's actual density and richness, replace it, don't add another layer on top of it.

## 1. Preview panel — real visual richness, not a flat placeholder

Current: a plain solid-color rectangle with a dashed rule-of-thirds guide and "PREVIEW" text.
Target: something that reads as an actual image/frame — use a generated placeholder (CSS gradient designed to look like an atmospheric photo, or an actual placeholder image asset) so it has real tonal variation and visual weight, the way the reference's astronaut photo does. It should look like "a picture," not "an empty box labeled preview."

## 2. Media/asset bin — real thumbnail richness

Current: flat solid-color rectangles with a small generic icon per asset.
Target: thumbnails that read as actual content previews — varied, generated placeholder imagery per asset (different gradients/patterns per asset so they're visually distinguishable at a glance, the way real thumbnails would be), not uniform colored boxes. File type icon can remain as a small overlay/badge, but shouldn't be the only visual content of the thumbnail.

## 3. Right panel — match the reference's actual detail density

Add what's currently missing compared to the reference:
- A visible "Size" or dimension row alongside Position (if relevant to this app's data model — adapt sensibly, don't force fields that don't apply)
- Consider whether a compact 4-value radius-style control pattern is applicable anywhere relevant in this app, or whether that's specific to the reference's text-tool context — use judgment, don't force a mismatched feature
- Match the reference's actual spacing rhythm and information density between sections — measure it (padding, gap sizes, font sizes relative to container) and replicate proportionally, don't eyeball it

## 4. Overall layout proportions — match, don't approximate

Actually measure the reference's proportions — how much horizontal space the left panel, center area, and right panel each take; how much vertical space the preview takes relative to the timeline below it — and match those ratios, rather than an approximate/eyeballed layout.

## 5. Spacing, contrast, and polish pass

Go through every visible element and compare directly against the reference for: padding/gap consistency, border contrast (subtle vs. visible), text size hierarchy, icon sizing relative to text. Match what the reference does, don't approximate.

## Verification
Real screenshot, placed side by side with the reference in your own report for direct comparison. If it still falls short after this pass, say so plainly and specify exactly what still doesn't match rather than declaring success.

## Output
Update `docs/phase-8/UI-EXTRACTION-REPORT.md` with a direct side-by-side comparison (describe or embed both images) and an honest assessment of remaining gaps, if any.
