You're building Milestone 2 of `apps/editor` — the richer features: effects, transitions, keyframes, and captions. These exist and are tested in `@timelinx/core` but have never been exercised through a real UI. Same app, same workspace-linked setup as Milestone 1 (not registry-installed — you're still developing against the local engine).

## Lessons from Milestone 1 — apply these from the start, don't relearn them

1. **Use the real tools, always.** `TransitionTool` and `KeyframeTool` already exist in `packages/core/src/tools/`. Route every interaction through them via the tool router, exactly like Milestone 1's corrected Split/Ripple-Delete implementation. Do not hand-roll effect/transition/keyframe logic with direct dispatches as a shortcut — if a real tool doesn't support something a UI needs, stop and report the gap rather than working around it.
2. **"Verified" means actually observed, not asserted.** If you can't test in a real browser from this environment, say so explicitly every time, the same honest way the last two reports did — don't describe test/dispatch-level checks as if they were visual confirmation.
3. **Diagnose before fixing, especially anything performance- or rendering-related.** If you hit another jank/wobble-type issue, trace the actual code path and/or measure real render counts before proposing a fix — a plausible-sounding CSS/browser-hint guess cost two extra rounds last time. Apply the same discipline already built into `handlePointerMove` (skip rebuild/notify when nothing changed) to any new pointer-heavy interactions here (dragging a transition boundary, dragging a keyframe).
4. **You may look at `@timelinx/ui`'s existing scaffolded components** (`captions-panel.tsx`, `keyframes-panel.tsx`, `transitions-panel.tsx`, `inspector-panel.tsx`) purely for structural/design inspiration — but do not import from `@timelinx/ui` itself (still private, still unvalidated). Treat it as a sketch, not a dependency.

## Scope for this milestone

**Effects:**
- View the list of effects applied to a selected clip
- Add an effect to a clip (pick from whatever effect types `core` actually defines — check `types/effect.ts`)
- Remove an effect from a clip

**Transitions:**
- Add a transition between two adjacent clips on the same track, using `TransitionTool` via the tool router
- View existing transitions visually on the timeline (distinct from a plain clip boundary)
- Remove a transition

**Keyframes:**
- For a selected clip, choose a keyframeable property (check `types/keyframe.ts` and `clip-transform.ts` for what's actually keyframeable — likely position/scale/opacity or similar)
- Add a keyframe at the current playhead position via `KeyframeTool`
- View keyframe markers on the clip's timeline representation
- Delete a keyframe
- (Full curve/easing editing UI is NOT in scope for this milestone — just add/view/delete points. Easing curve visualization can be a follow-up.)

**Captions:**
- Add a caption at the current playhead position with text content
- View a caption track/list
- Edit caption text
- Delete a caption
- If `core`'s subtitle import (SRT/VTT, mentioned in the architecture docs) is straightforward to wire up, include a basic "import captions from file" action — if it turns out to be non-trivial, defer it and report why rather than forcing it in.

## Verification — same standard as Milestone 1's later rounds

For every feature above:
1. Automated test where practical.
2. Explicit statement of what could/couldn't be verified in a real browser from this environment.
3. A short table row (feature | test | real-browser status) same format as before.

## Output
Produce `docs/phase-5/EDITOR-MILESTONE-2-REPORT.md` — same structure as the Milestone 1 report (feature table, gaps found in core/react, architecture notes). If any of the four feature areas turns out to need something `core` doesn't currently expose cleanly, report it as a gap the same way Milestone 1 did (e.g., the missing `SET_TRACK_MUTE` operation) rather than working around it silently.
