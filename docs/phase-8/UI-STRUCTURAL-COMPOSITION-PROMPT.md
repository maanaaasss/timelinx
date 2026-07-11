Every prior pass changed color/icon/spacing details on an unchanged layout skeleton. The project owner is asking for the actual structural composition from the references, not just their palette. This is a bigger, layout-level pass.

## 1. Add a real preview panel (placeholder content, no real decode needed)

Add a prominent preview area above the timeline — a large frame representing "what's currently under the playhead." Use placeholder/generated imagery (a gradient, a solid frame with the clip name overlaid, or a simple generated pattern) — this is purely cosmetic composition, not a real video decode feature (that's still deliberately deferred). The point is filling the current empty void with something that reads as "this is where the picture would be," matching both references' visual weight.

## 2. Add a real asset/media bin panel

Reference Image 2's left panel is a real asset browser — thumbnails, file names, durations. Add this as a genuine panel (could live below or alongside the current track list, or as its own tab) showing the sample assets (Interview_Final.mp4, B-Roll_Cityscape, etc.) as browsable thumbnail cards, not just names inside track headers. Use placeholder/generated thumbnail imagery, same reasoning as #1.

## 3. Represent effects/layers directly on the timeline, not only in a side tab

This is the most structurally significant change. Reference Image 1 shows effects and audio layers as stacked, colored horizontal lanes directly beneath/alongside the clip they apply to — visible at a glance without clicking into a panel. Implement something equivalent:
- When a clip has effects applied, show a slim colored indicator strip on or beneath the clip (using the type-based effect colors from the last pass) reflecting what's applied
- Consider whether a clip with multiple effects should show multiple thin colored bands, similar to the reference
- This should be additive to (not replace) the existing Effects panel — the panel remains for editing; the timeline representation is for at-a-glance awareness

## 4. Reassess overall density and visual weight

After 1-3, do a pass looking at the whole composition side-by-side with the two references: is there still a large amount of dead/empty space? Is content distributed with similar visual weight across the three main regions (left panel, center timeline+preview, right properties)? Adjust proportions/sizing so the overall composition reads as similarly rich, not just similarly colored.

## Verification
Real screenshot of the full composition, same standard as always. This is the round where a side-by-side comparison against the two reference images is the actual test — if it still reads as structurally sparser than the references, say so honestly.

## Output
Update `docs/phase-8/UI-EXTRACTION-REPORT.md` with what was added for each of the 4 points, and be explicit about what's placeholder/cosmetic (preview frame, thumbnails) versus real functionality (the on-timeline effect indicators, which should be genuinely driven by real effect state, not decorative).
