Three more real bugs from the project owner's browser testing, plus a request to stop finding these one at a time and do a systematic pass instead.

## Bug 6 — Wobbly/jittery clips and ruler on mouse movement

Moving the cursor left/right over the timeline causes clips and the ruler to visibly wobble rather than staying fixed. Likely cause: a CSS `transition` on position/size properties (`left`, `width`, `transform`) that's meant for deliberate animations (like the ghost-drag preview) but is also firing on incidental re-renders triggered by hover/cursor-tracking state changes. Investigate:
1. Find every place `transition` is applied to clip/ruler positioning CSS.
2. Determine which of those are intentional (e.g., ghost clip preview during an active drag) vs. accidentally blanket-applied to all renders.
3. Scope transitions narrowly — only active during the specific interaction they're meant for (e.g., via a conditional class like `.dragging` that's added/removed at the right moments), not applied unconditionally.
4. Also check whether hover/cursor-tracking (from the Bug 2 fix) is causing more re-rendering than necessary — a cursor style change should ideally be a cheap CSS-only update, not something that recomputes layout for clips that aren't involved.

## Bug 7 — Elastic/stretching effect when scrolling fast

Scrolling quickly through the tracks makes clips appear to stretch/rubber-band rather than moving cleanly with the scroll. Same likely root cause as Bug 6 — a transition/animation on position or width that can't keep up with fast, discrete scroll-driven updates, so it visibly animates toward a moving target instead of snapping instantly. Fix using the same approach: ensure scroll-driven position updates are transition-free (instant), reserving any transition/animation for genuinely animated interactions only.

## Bug 8 — Active clip isn't highlighted when using tools other than Selection

The Bug 1 fix correctly highlights clips in the Selection tool's selection set, but a clip being actively operated on by a different tool (trim, split, ripple, slip) isn't necessarily in that set — it needs its own visual indicator for "this is the current target of the active tool's operation," independent of formal selection state. Investigate how each tool currently tracks "what clip am I acting on" internally (e.g., `pendingClipId`, `pendingTrimEdge`, similar per-tool state from earlier phases) and surface that as a distinct visual state (e.g., a different highlight color/style than "selected," so a user can tell the two apart) wherever it exists.

## Systematic task — Tool Feedback Audit (do this instead of waiting for more rounds of individual bug reports)

Go through every tool in `packages/core/src/tools/` (selection, razor, ripple-insert, ripple-delete, ripple-trim, roll-trim, slip, slide, transition-tool, keyframe-tool, hand, zoom-tool) and, for each one, define and implement the correct visual affordances:

1. **Cursor** — what should the mouse cursor look like when this tool is active and/or hovering a relevant target (e.g., `ew-resize` at trim edges, `grab`/`grabbing` for the hand/pan tool, a crosshair or custom cursor for razor/split, etc.)? Implement consistently.
2. **Hover/pre-action indicator** — before a click/drag commits anything, does the user get a preview of what will happen? Examples the project owner specifically asked for: a visible line on the clip showing exactly where a trim/split will occur; left/right arrows specifically at trim edges. Extend this thinking to every tool — e.g., slip tool might show a preview of which portion of source media will become visible; keyframe tool might highlight the exact point a keyframe would be added.
3. **Active/in-progress state** — while a drag/operation is actually happening (mouse still down), what should be visible (ghost preview, highlight, a live-updating value like "trimmed 15 frames")?

Produce a table (tool × cursor × pre-action indicator × in-progress state) as part of the report, implement each row, and note any tool where a decision was genuinely ambiguous or needs the project owner's input rather than assuming.

## Verification (same rule as every round)
State plainly what you could verify yourself vs. what needs the project owner's real-browser check. Don't claim visual fixes are confirmed without an actual observed check — if there's any way to capture a screenshot in this environment to self-verify at least the static (non-interactive) parts, use it; for anything requiring real mouse movement/dragging, say so explicitly.

## Output
Update `docs/phase-5/EDITOR-MILESTONE-1-REPORT.md` with "Bug Fixes — Round 3" (bugs 6-8) and a new "Tool Feedback Audit" section with the full table and implementation notes.
