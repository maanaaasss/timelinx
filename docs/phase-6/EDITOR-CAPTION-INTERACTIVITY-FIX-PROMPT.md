Real browser testing (screenshot evidence) shows two problems with captions on the timeline: (1) they're completely non-interactive despite prior reports claiming drag/CRUD support, and (2) one caption block renders with its text overflowing past the timeline's left boundary, bleeding into the track-label sidebar area.

## Bug 1 — Caption positioning is wrong

One caption's text is cut off and rendering outside the timeline area, overlapping the track-label sidebar. Compare `CaptionBlock`'s position calculation directly against `ClipView`'s — clips render correctly within bounds, so whatever offset/scroll math they use correctly, `CaptionBlock` is likely missing or applying differently. Find the actual discrepancy (don't guess) and fix it so captions respect the exact same coordinate system as clips.

## Bug 2 — Captions are non-interactive in the real browser

Despite the last report claiming caption selection, drag-to-move (via `SelectionTool`'s `drag-caption` mode), and panel-based edit/delete were implemented and tested, none of it works when actually clicked on in a browser. Trace this for real, the same way past UI-wiring gaps were traced:

1. Does a caption block in the DOM have the same kind of hit-testable attribute clips use (e.g., `data-clip-id` equivalent — check what identifies a caption for hit-testing, likely needs a `data-caption-id` or similar)? If it's missing entirely, that alone would explain total non-interactivity — the tool router's hit-testing wouldn't be able to find it.
2. Does clicking a caption actually select it — check whether `useSelectedClipIds` (or whatever tracks selection) even has a concept of "selected caption," or whether selection state was only ever built for clips, with captions bolted on incompletely.
3. Does the `CaptionsPanel` reflect a selected caption when clicked on the timeline (bidirectional — timeline click → panel shows it selected; panel selection → timeline highlights it)?
4. Test drag specifically: activate nothing special (default Selection tool), click and drag an existing caption block, and trace whether `SelectionTool`'s `drag-caption` mode is actually reachable from this exact interaction, or whether it's dead code that the automated test reached artificially (by simulating the internal tool call directly) without the real DOM click path actually routing there.
5. Fix whatever's actually broken. Given the pattern so far, this is likely another instance of "the operation works when triggered directly, but the real UI trigger was never actually connected" — confirm or refute that specifically.

## Bug 3 — Finish the caption visual styling (deprioritized in Milestone 2, do it now)

Design and implement a clear, intentional visual style for caption blocks — distinct from clips (that's normal/expected in real NLEs for a subtitle/caption track), but should look deliberately styled, not unfinished. At minimum: consistent border/fill matching the app's existing design language, clear text truncation with ellipsis when text is too long for the block width (rather than overflowing), and a visual state for selected vs. unselected once Bug 2 makes selection real.

## Verification

For all three: real browser check required, first-person description of what you did and saw (click, drag, delete each). If real browser access still isn't available in this environment, say so explicitly and this becomes something the project owner tests personally once again — but at minimum, add Testing Library tests that go through the actual DOM click/drag path (not a direct internal tool call) so there's stronger automated evidence than before.

## Output
Update `docs/phase-5/EDITOR-MILESTONE-2-REPORT.md` with a "Caption Interactivity & Styling Fix" section: root cause for the positioning bug, root cause for the non-interactivity (with specific finding on whether it's a missing hit-test attribute, incomplete selection-state support, or dead-code drag path), and the styling implementation.
