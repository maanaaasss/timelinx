Captions can now be added/edited/deleted via the panel, but can't be dragged to move their position directly on the timeline (unlike video/audio clips). Investigate before building — this may be a `core` gap, not just an editor wiring gap.

## Step 1 — Check whether core even supports moving a caption

1. Check `Caption`'s type definition and the existing operations (`ADD_CAPTION`, `EDIT_CAPTION`, `DELETE_CAPTION`) — is there a `MOVE_CAPTION` operation, or does `EDIT_CAPTION` already support changing `startFrame`/`endFrame` (which would effectively be a move)?
2. Check whether `Caption` is a genuinely separate type from `Clip` in the engine, or shares enough structure that the existing clip-movement tools (`SelectionTool`) could reasonably be extended to handle it.

## Step 2 — Based on what you find

**If `EDIT_CAPTION` already supports repositioning (changing start/end frame):** the gap is purely in the editor — captions need pointer-drag wiring similar to how clips get dragged, dispatching `EDIT_CAPTION` with updated frame values instead of `MOVE_CLIP`. Implement this through the real tool system (either extending `SelectionTool` to recognize caption blocks as draggable targets, or a dedicated lightweight drag handler that still goes through the tool router pattern rather than a one-off `onMouseDown` — apply the Milestone 1 lesson here too).

**If there's no way to reposition a caption at all in `core` right now:** stop, and report this as a real engine-level gap (same treatment as Milestone 1's missing `SET_TRACK_MUTE`) rather than working around it — a `MOVE_CAPTION` operation (or extending `EDIT_CAPTION` to accept frame changes) would need to be added to `core` first, with its own validator/invariant coverage, before the editor can wire it up properly. Report this clearly as a recommendation, don't hack around it with something that bypasses validation.

## Step 3 — If you proceed with implementation

1. Wire the drag interaction through the real tool system, not an ad-hoc handler.
2. Apply the reactivity lessons from the last round — whatever component displays/updates caption position should subscribe properly (`useSyncExternalStore`-based hook), not read a snapshot directly.
3. Add both an automated test (asserting the underlying operation dispatches correctly with real pointer-event simulation, not just a direct dispatch call) and be explicit about what could/couldn't be verified in a real browser from this environment.
4. Follow the new "Definition of Done" — commit, push, open a PR, confirm CI passes, report the branch/PR/CI status explicitly.

## Output
Update `docs/phase-5/EDITOR-MILESTONE-2-REPORT.md` with what was found in Step 1, and either the implementation (Step 3) or the clearly-stated core-level gap (Step 2's second branch) — whichever applies.
