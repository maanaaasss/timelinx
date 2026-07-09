The project owner personally tested `apps/editor` in a real browser (the check that was missing before) and found several real, specific bugs. Fix each one. Do not claim any of these "fixed" without explicitly stating you could not personally re-verify it in a real browser (same limitation as before) — the project owner will do the final real-browser check again, same pattern as the demo app's drag bug.

## Bug 1 — Selection highlighting doesn't show/clear correctly

Selected clips should be visually highlighted, and should un-highlight when deselected (clicking elsewhere, or another selection replacing it). Currently this isn't rendering correctly. Check: is the clip's "selected" visual state (`ClipView`) actually reading from the real current selection (`useSelectedClipIds()` or equivalent), and is a click on empty timeline space actually dispatching a clear-selection action? Fix the binding so selection state and visual highlight are never out of sync.

## Bug 2 — No cursor feedback on trim edges

Hovering near a clip's edge (where an edge-drag/trim would begin) should change the cursor to a resize indicator (e.g., `ew-resize`) so the user knows they're in the right spot before clicking. Add this — likely a CSS class toggled based on proximity to the edge (the same proximity logic the tool router/selection tool already uses to decide "is this an edge interaction" — reuse that, don't reimplement separate hit-testing just for the cursor).

## Bug 3 — Ripple trim should work directly from the Selection tool, not require switching tools

First, investigate and report plainly: when the Selection tool is active and the user drags a clip's edge, what actually happens right now — plain resize (just this clip, no ripple), roll trim (adjusts the edit point between two adjacent clips), or ripple trim (shifts all downstream clips)? Check the actual current behavior, don't assume.

Then: the desired UX is that edge-dragging from the Selection tool should work without forcing a tool switch to a dedicated Ripple Trim tool (the dedicated tool can still exist for explicit/precise use, but shouldn't be the *only* way). Propose and implement one clear, consistent default behavior for Selection-tool edge-drag (e.g., ripple trim by default, since that's the more common expectation in NLEs, with a modifier key like Alt/Option for the roll-trim variant — or vice versa). State clearly which behavior you implemented and why.

## Bug 4 — Playhead doesn't move except incidentally during ripple trim

This is the most important one — the playhead position isn't updating from normal interactions (e.g., clicking the ruler to seek), but its visual position sometimes shifts as an apparent side effect of a ripple trim operation elsewhere. This strongly suggests the playhead's rendered position isn't properly reactive to the real current playhead frame value — investigate:
1. Is `usePlayheadFrame()` (or equivalent) actually being called and its return value actually used to compute the Playhead component's CSS position (e.g., `left: frame * pixelsPerFrame`)?
2. Is the component re-rendering when the frame value changes, or is it possibly reading a stale/memoized value?
3. Does `engine.seekTo(frame)` (called from the Ruler's click handler, per the last report) actually update the same state that `usePlayheadFrame` reads, or could there be two disconnected sources of "current frame" in this app?
4. The "moves during ripple trim" clue suggests something IS correctly triggering a re-render/recompute in that case — compare what's different about that code path versus the normal seek path, that's likely where the actual bug is.

## Bug 5 — Time ruler doesn't scroll with tracks, and doesn't adapt to zoom level

Two distinct problems:
1. **Scroll sync:** when scrolling horizontally through the tracks (to see clips further along the timeline), the ruler above should scroll in lockstep, staying aligned with the same time positions. Right now it doesn't move at all. Check whether the ruler and the track area share the same scroll container/position, or are two separate elements that were never wired to sync.
2. **Zoom adaptivity:** the ruler's tick marks/labels (frame or time markers) should recompute their spacing and granularity based on the current zoom level (pixels-per-frame) — more zoomed in should show finer-grained ticks, more zoomed out should show coarser ones. Right now the ruler appears static regardless of zoom. Fix this, and while you're at it, confirm the zoom tool's actual effect on clip rendering is correct (per the note above, the user wasn't sure if zoom is fully working — it may just be the ruler mismatch making it seem broken; check both together and report which was actually the case).

## Verification

For each bug: describe what you found (root cause), what you changed, and explicitly state whether you were able to verify the fix yourself (and how — if it's a pure CSS/rendering fix you may be able to confirm via a screenshot-capable tool if available; if not, say so) versus what still needs the project owner's own real-browser check.

## Output
Update `docs/phase-5/EDITOR-MILESTONE-1-REPORT.md` with a new "Bug Fixes — Round 2 (from real user testing)" section covering all five bugs, root causes, fixes, and verification status per the above.
