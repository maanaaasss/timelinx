Two problems with the Milestone 1 report need fixing before this milestone is actually done.

# Problem 1: Split and Ripple Delete bypass the real tool system

The prompt for this milestone explicitly said: route every interaction through the real tool system, and if something isn't supported, stop and report it as a gap rather than building an ad-hoc workaround. Two features didn't follow this:

- **Split button** currently dispatches `DELETE_CLIP` + 2×`INSERT_CLIP` manually, instead of using the real `RazorTool` (`packages/core/src/tools/razor.ts`).
- **Ripple delete** currently dispatches `DELETE_CLIP` + N×`MOVE_CLIP` manually, instead of using the real `RippleDeleteTool` (`packages/core/src/tools/ripple-delete.ts`).

Fix both to use the actual tools via the tool router / `engine.activateTool()`, the same pattern used correctly elsewhere (e.g., `RippleInsertTool` was wired correctly). If there's a real reason the actual tool couldn't be used as-is (missing UI trigger mechanism, tool needs a different kind of event than a button click can provide, etc.), explain that specifically — don't just silently keep the hand-rolled version. If after investigating you find the real tools genuinely can't be triggered from a simple toolbar button (e.g., they're designed for pointer-driven interaction only), say so explicitly and propose the right fix (e.g., wiring a synthetic pointer event through the tool router, or adding a proper programmatic entry point to the tool if one doesn't exist) rather than leaving the primitive-operation workaround in place.

After fixing, confirm the behavior still matches (dispatch the split/ripple-delete through the real tool, verify clip counts/positions end up identical to before) — real tools may have slightly different edge-case behavior than the hand-rolled version, which is exactly why using them matters.

# Problem 2: Get genuine real-browser verification, not restated automated-test results

The "Manual Verification" column in the last report described calling functions/dispatches directly (`setSelectedClipIds(...)`, checking dispatch results) — this is not different from what the automated tests already check, and it does not catch the class of bug this project has already been burned by (state updates correctly while the actual rendered DOM does nothing, which is exactly what happened in the demo app's drag bug).

For each of these specific interactive/pointer-driven features, actually run the app in a real browser (not jsdom, not a script calling functions) and describe, first-person, exactly what you did with the mouse/keyboard and exactly what you saw on screen:

1. Drag-to-move a clip (single clip)
2. Multi-select drag (shift-click two clips, drag both)
3. Trim via dragging a clip's edge (both directions — roll and ripple trim, whichever is bound to plain edge-drag vs. a modifier key, check the actual current binding)
4. Split via the (now tool-router-based) split action
5. Ripple insert via the (now tool-router-based) ripple insert action
6. Ripple delete via the (now tool-router-based) ripple delete action
7. Rubber-band multi-select (click-drag on empty timeline space to select multiple clips)
8. Zoom in/out via the actual buttons and via keyboard shortcut

For each: describe the before state, the exact interaction performed, and the after state you actually observed — including whether it visually rendered correctly, not just whether an eventual state value was correct. If something doesn't work, say so plainly, fix it, and re-check in the browser again before moving to the next item.

# Output

Update `docs/phase-5/EDITOR-MILESTONE-1-REPORT.md`:
- Replace the "Manual Verification" column with the real first-person browser observations from this session
- Add a note on the Split/Ripple Delete fix (or the specific reason a full fix wasn't possible, with a proposed real solution)
- Keep the existing Gaps section (the track mute/lock/visibility gaps were correctly reported as real gaps rather than worked around — that part was done right, don't change it)

## Process rule (unchanged)
"Manual verification" means you, in a real rendered browser, doing the interaction and watching what happens — not a test file, not a dispatch call, not a state assertion. If you cannot actually do this (e.g., no real browser access in this environment), say so explicitly rather than substituting a programmatic check and calling it manual.
