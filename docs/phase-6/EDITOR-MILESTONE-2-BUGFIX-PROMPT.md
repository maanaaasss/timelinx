Real browser testing found three features that don't work: Transition tool does nothing, Keyframe tool does nothing, Inspector says "Clip has no transform data." Diagnose each properly — don't assume, check.

## Bug 1 — Transition tool does nothing

First, check whether this is actually a silent-but-correct rejection rather than a broken tool:
1. Do `TransitionTool`'s validators/logic require the two clips to be directly adjacent (touching, `clip.timelineEnd === nextClip.timelineStart`, no gap)? Check the real tool code.
2. Check the editor's current sample clip layout — do any two clips on the same track actually touch with zero gap? (Milestone 1 deliberately added gaps between clips for drag/trim testing — if none of those gaps got closed for Milestone 2, there may be no valid adjacent pair anywhere in the sample data to create a transition on.)
3. If adjacency is required and no sample clips qualify: that's the bug (a data/sample-content gap, not a broken tool) — fix it two ways: (a) adjust sample data so at least one pair of clips is genuinely adjacent, so the feature is demonstrable, and (b) regardless of the data fix, add user-visible feedback when a transition attempt fails validation (e.g., a brief message or console-visible reason), since silently doing nothing with no explanation is a real UX bug on its own, independent of the adjacency question.
4. If clips ARE adjacent and it still does nothing: this is a real wiring bug — trace the same way the Split/Ripple-Delete bug was traced in Milestone 1 (is `engine.activateTool('transition')` actually happening on pressing G? Is the drag-from-edge pointer sequence actually reaching `TransitionTool.onPointerDown/Move/Up`? Add temporary logging if needed to find exactly where the chain breaks).

## Bug 2 — Keyframe tool does nothing in the UI despite a passing dispatch test

The existing automated test proves `ADD_EFFECT` + `ADD_KEYFRAME` works when dispatched directly — it does NOT prove that pressing P and clicking a clip in the real UI actually triggers that dispatch. This is the same class of gap as Milestone 1's Split/Ripple-Delete bug (a correct underlying operation, disconnected from the real UI trigger). Trace the actual chain:
1. Does pressing "P" actually call `engine.activateTool('keyframe')` (check the keyboard handler wiring)?
2. Once active, does clicking on a clip in the browser actually generate a pointer event that reaches `KeyframeTool.onPointerDown/onPointerUp` (same hit-testing/data-clip-id mechanism used elsewhere)?
3. Find exactly where the chain breaks and fix it. Report the specific broken link, not just "fixed it."

## Bug 3 — Inspector says "Clip has no transform data"

1. Check whether the sample clips created in `createEditorEngine.ts` actually have a `transform` property set at all. If they don't (likely, since Milestone 1 never needed one), that's the root cause — there's genuinely nothing to display.
2. Decide and implement one clear approach, consistent with how the KeyframeTool gap was handled (auto-create a default on first real use):
   - **Option A:** Give every clip a default transform (position 0,0; scale 1,1; rotation 0; opacity 1) at creation time, so Inspector always has something to show/edit.
   - **Option B:** Keep transform optional/absent until first edited, but have the Inspector panel show editable fields with sensible defaults anyway, and dispatch a create-transform operation (if one exists) or `SET_CLIP_TRANSFORM` with full default+new values on first actual edit, same pattern as the keyframe auto-create-effect fix.
   Pick one, implement it, and state which you chose and why (Option A is simpler and more consistent with the rest of the app already having sample data with defaults — probably preferable, but your call given what you find in the actual types/validators).

## Verification

For all three: after fixing, actually test in a real browser if this environment allows it, and describe specifically what you did and saw. If real browser testing still isn't possible from this environment, say so explicitly — but this time, also add automated tests that simulate the *actual UI trigger path* (keyboard shortcut → tool activation → simulated pointer event via Testing Library, even with its known limitations) rather than only testing the dispatch in isolation, so there's at least one more layer of evidence than last round.

## Output
Update `docs/phase-5/EDITOR-MILESTONE-2-REPORT.md` with a "Bug Fixes — Round 2" section: root cause found for each (adjacency/data gap vs. wiring break vs. missing default), the fix, and verification status.
