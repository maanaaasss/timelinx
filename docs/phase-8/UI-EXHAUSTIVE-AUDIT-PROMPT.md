The project owner compared the showcase directly against the original reference screenshot (not the Stitch approximation) and found multiple concrete mismatches, with more likely unlisted. Do a full, literal, element-by-element audit — don't assume the items below are the complete list.

## Known mismatches to fix

1. **Icon semantics are wrong in several places:**
   - "Pull In Effect" should use an expand/corner-arrows icon, not an X-in-box
   - "Block Flashes" should consistently use a sun/flash icon on every instance of it — currently one instance shows a clock icon, a clear inconsistency even within the current build itself
   - Track header icon row should read lock / video-camera / speaker(mute) / eye(visibility) — the second icon currently renders as a grid/table icon instead of a video camera
   - Go through every icon in the reference image and confirm the current build's icon choice matches its semantic meaning exactly, not just "some icon in the right position"

2. **Timeline clips are missing filmstrip thumbnail imagery.** In the reference, every clip block on the timeline (not just Asset Bin cards) shows tiled/repeated video-frame thumbnail imagery across its width. The current build only applies this treatment to Asset Bin cards — timeline clips render as flat gradients with no thumbnail content. Apply the same "simulated real content" thumbnail treatment used in the Asset Bin to the actual `TimelineClip` component's video track rendering.

3. **Row height proportions don't match.** The selected/main clip row reads noticeably taller relative to the effect track rows beneath it than in the reference, where the height relationship between the main track and effect tracks is more compact and consistent. Measure the actual proportions in the reference and match them.

## Do a full audit beyond this list

Go through the reference image region by region (left sidebar, media browser thumbnails, preview area, transport controls, timeline toolbar, track headers, every track row, every clip/effect block) and compare directly against the current showcase for:
- Icon choice and correctness
- Spacing and alignment (are elements starting/ending at the same relative positions?)
- Color accuracy (does each element's color match the reference's actual value?)
- Sizing (heights, widths, proportions)
- Typography (size, weight)

Catalog every discrepancy found, including ones not listed above, before fixing anything — produce the full list first, then work through it.

## Verification
Real screenshot after fixes, placed directly next to the reference for line-by-line comparison. List each item from your audit and its fix status (fixed / not applicable / deferred with reason).

## Output
Update `docs/phase-8/UI-EXTRACTION-REPORT.md` with the full audit findings (the complete list, not just the 3 items above) and fix status for each.
