Captions have needed far more debugging rounds than any other feature and still don't work at all in the real browser (can't select, drag, or split). Rather than continue debugging that path, replace it: represent text/titles as ordinary `Clip`s (using whatever "generator" mechanism `core` already has for non-media-backed content), so they automatically inherit the already-proven select/drag/trim/split/ripple interactions instead of needing a separate, custom-built interaction path.

## Step 1 — Investigate what actually exists

1. Read `packages/core/src/types/generator.ts` and find `INSERT_GENERATOR` in the validators/operations — what generator types does `core` actually support? Specifically check for a text/title generator type, not just solid colors.
2. If a text generator type already exists: this pivot is close to free — a text clip is created via `INSERT_GENERATOR` with the text generator type, lands in `track.clips` like any other clip, and should immediately support every interaction `SelectionTool` already handles for clips, with zero new interaction code needed.
3. If no text generator type exists yet, but the generator mechanism exists for other types (e.g., solid color): check how hard it would be to add a text variant, OR consider the simpler fallback — a plain `Clip` with a synthetic/placeholder `Asset` and the actual text content stored in a field the editor can read for rendering (e.g., reusing or repurposing something in `clip-transform.ts` or a new lightweight property). Report which path is realistic and why.

## Step 2 — Implement text clips in the editor

1. Replace the "Add Caption" UI (in `CaptionsPanel` or wherever it lived) with an "Add Text Clip" action that dispatches through the real mechanism found in Step 1 — not a new ad-hoc operation.
2. The clip should render on the timeline exactly like any other clip (colored block, label) — reuse `ClipView`, don't build a new component type for it. If the S1 track was specifically typed as a "subtitle/caption" track type, consider whether it should now just be a normal track (e.g., a "Titles" video-type track) so text clips behave identically to every other clip in every way, including track controls (lock/mute/hide).
3. Confirm — and this should require little to no new code if Step 1's premise holds — that select, drag, trim, split, and delete all work on text clips the same way they work on any other clip, since they're going through the exact same `SelectionTool`/tool-router path.

## Step 3 — Deprecate, don't delete, the caption-specific editor code

Remove the caption-specific UI paths from active use in the editor (the broken drag-caption mode in `SelectionTool`, the caption hit-testing, `CaptionBlock`/`GhostCaption` components) — but don't delete `core`'s `Caption` type, SRT/VTT import, or the `ADD/EDIT/DELETE_CAPTION` operations themselves; those are validated and may be useful later for actual subtitle import/export (a different, easier feature than live drag-editing). Leave a brief comment/note explaining why the editor doesn't currently use them.

## Step 4 — Verify, the same standard as always

Real browser check: add a text clip, select it, drag it, split it, delete it. Confirm each works — given Step 1's premise, this should mostly "just work" because it's the same proven pipeline every other clip uses. If it doesn't just work, that's useful information (means the premise was wrong somewhere) — report specifically what broke rather than assuming success.

## Output
Update `docs/phase-5/EDITOR-MILESTONE-2-REPORT.md` with what Step 1 found, what was implemented, and real verification results. Note plainly that captions-as-a-separate-interactive-timeline-feature are deprioritized/parked, not abandoned from `core`.
