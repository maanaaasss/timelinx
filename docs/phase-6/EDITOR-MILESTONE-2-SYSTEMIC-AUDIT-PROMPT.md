Multiple panels report "doesn't work" from real browser testing, despite passing dispatch-level tests. The likely explanation is systemic, not five separate bugs: `StatusBar` was just found reading `engine.getSnapshot()` directly instead of subscribing via a proper hook (`useActiveToolId`), causing it to silently fail to re-render on real state changes. Audit every Milestone 2 component for the same pattern, plus a second, distinct bug in numeric input handling.

## Step 1 — Audit every panel for the non-reactive-read anti-pattern

For each of `InspectorPanel`, `EffectsPanel`, `TransitionsPanel`, `KeyframesPanel`, `CaptionsPanel`, and anything else added in Milestone 2:

1. Check exactly how it reads the data it displays — is it calling a proper subscribed hook (`useSelectedClipIds`, `useClip`, `useTrack`, or whatever the real equivalent is for effects/keyframes/captions/transitions), or is it reading `engine.getSnapshot()` or similar directly, which won't trigger a re-render when the underlying value changes but the object reference technique doesn't flag it as different?
2. Fix every instance found — this is likely the single highest-impact fix in this whole round. Report exactly which panels had this bug and which didn't (don't assume all of them do — verify each one individually).
3. This likely explains: Keyframes panel not updating on clip selection, Captions appearing broken, Transitions not reflecting a delete. Confirm or refute this for each specific complaint.

## Step 2 — Fix the Inspector numeric input dispatch-on-every-keystroke problem

1. Confirm: does the Inspector currently dispatch `SET_CLIP_TRANSFORM` on every `onChange` keystroke, using the raw (possibly incomplete/invalid) parsed value?
2. If so, this collides with Phase 1's `NaN` validation guards — an incomplete number like `-` or an empty string parses to `NaN`, gets correctly rejected, and the displayed value snaps back to the last committed state, making it look like typing does nothing.
3. Fix: give the input its own local state buffer (uncontrolled from the engine's perspective while actively typing), and only dispatch `SET_CLIP_TRANSFORM` on blur or on a valid, complete parse (e.g., Enter key, or debounced with validation) — not on every raw keystroke. This is standard practice for numeric inputs bound to a validated backing store; implement it for all four transform fields (position X/Y, scale, rotation, opacity).

## Step 3 — Actually test the Transition tool's real behavior, not just tool activation

The previous round's test for "TransitionTool does nothing" only checked that pressing G activates the tool — it never tested that dragging from a clip edge actually creates a transition. Fix this test gap:
1. Using Testing Library (or equivalent), simulate the actual sequence: activate the tool, pointer-down near a clip's right edge, pointer-up (or pointer-move + up if the tool requires a drag distance) on/near the adjacent clip, and assert a transition transaction was actually dispatched and the state reflects a new transition.
2. Confirm real adjacency exists in the sample data for this to even be possible (per the last round's investigation) — if clips still have gaps, add at least one genuinely adjacent pair.
3. If this simulated test still doesn't reveal a working path, that's real evidence the tool itself has a remaining bug beyond the edge-detection fix already made — investigate further, don't declare success on the strength of the tool-activation test alone this time.

## Step 4 — Confirm the Transition delete path specifically

Trace `TransitionsPanel`'s delete button end to end: does clicking it call `DELETE_TRANSITION` with the correct transition/clip identifier, and does the panel's list re-render afterward (tying back to Step 1's reactivity audit)? Report the specific finding.

## Step 5 — Stronger verification standard for this round

For every fix in this round, add a test that goes through the actual UI trigger (button click via Testing Library's `fireEvent`/`userEvent`, not a direct engine dispatch call) and asserts the panel's rendered output actually changes — e.g., "clicking 'Add Caption' causes a new caption block to appear in the rendered DOM," not just "ADD_CAPTION updates engine state." This is a meaningfully stronger test than what's been used so far and should catch the reactivity-gap class of bug directly, going forward.

## Output
Update `docs/phase-5/EDITOR-MILESTONE-2-REPORT.md` with a "Bug Fixes — Round 3 (systemic reactivity audit)" section: which panels had the non-reactive-read bug (and which didn't), the input-handling fix, the strengthened transition test and its real result, and the transition-delete trace.
