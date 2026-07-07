You're building Milestone 1 of the project's real reference editor — a full-featured (for this milestone's scope) timeline editing tool built directly on `@timelinx/core` and `@timelinx/react`. This is a new app, separate from `apps/demo` (which stays as-is — its job is proving registry-install correctness, don't touch or scope-creep it). This new app's job is proving the engine's actual editing features work end-to-end in a real, usable tool, and will later be the source material for extracting `@timelinx/ui`.

## 0. Setup decisions (deliberate, different from apps/demo)

1. Create `apps/editor` (Vite + React + TypeScript, same stack as elsewhere).
2. Unlike `apps/demo`, this app SHOULD use pnpm workspace linking to `packages/core`/`packages/react` (not registry versions) — you're actively developing against the current local engine, including possibly needing hooks/APIs that haven't been published yet. Include it normally in `pnpm-workspace.yaml`.
3. Mark `"private": true`. Include it in root `pnpm lint`/`typecheck`/`build`/`test` scripts and therefore in CI (`ci.yml`) — unlike the demo, this app will keep evolving and should be protected by the same regression net as everything else from now on.
4. No `@timelinx/ui` — build your own components. Write them in a reasonably clean, componentized way (e.g., a real `Clip`, `Track`, `Timeline`, `Toolbar` component structure) since this code will likely inform `@timelinx/ui`'s design later — but don't over-engineer for reusability yet, correctness and real functionality come first.

## 1. Feature scope for this milestone (do not go beyond this — richer features like effects/transitions/keyframes/captions are Milestone 2)

- Multi-track timeline (video, audio, at least one more track type), rendering real tracks/clips from `core` state
- Clip selection (single + multi-select via shift-click)
- Drag-to-move clips (single and multi-select drag)
- Trim (both edges) — using the real trim tools in `packages/core/src/tools/` (roll-trim and/or ripple-trim, check what's actually available and appropriate)
- Split/razor at playhead or a chosen frame
- Ripple insert and ripple delete
- Undo/redo, with visible enabled/disabled state (not just always-clickable buttons)
- Markers — add, view, jump to
- Zoom in/out on the timeline
- Track controls: lock, mute, hide, opacity
- A playhead that can be moved/scrubbed (no real media playback yet — this is Milestone 3's job — but the playhead position itself should work)

## 2. Build it using the real tool system, not ad-hoc handlers

This is the most important lesson from the demo app's 3-round drag bug: the demo initially reimplemented drag manually instead of going through `@timelinx/react`'s tool router, and it silently produced something that looked plausible but didn't work. Do not repeat this. Every interaction above should go through the real tool system (`useToolRouter` or equivalent, check `docs/guides/react-integration.md` and the actual current hook exports) — not custom `onMouseDown`/`window.addEventListener` reimplementations. If a needed interaction genuinely isn't supported by the existing tool system, stop and report that as a gap rather than building a parallel ad-hoc system around it.

## 3. Verification — learn from what already went wrong three times on this exact class of bug

For every feature in the scope list:
1. Add an automated test (Testing Library or equivalent) — but explicitly note this project has already discovered that simulated pointer events in these tools don't always match real browser behavior closely enough to catch real bugs. So automated tests alone are not sufficient sign-off.
2. **Also manually test every single feature in a real running browser**, and report specifically what you did and observed for each one (e.g., "dragged clip-2 from frame 500 to frame 800, it moved and stayed there, undo reverted it, redo reapplied it" — not "drag works"). Do this for all ~10 features in the scope list individually, not just once and extrapolated.
3. If any feature doesn't work, fix it and re-verify with the same real-browser check before moving to the next one — don't batch everything and report all-at-once success at the end.

## 4. Report format

Produce `docs/phase-5/EDITOR-MILESTONE-1-REPORT.md` with:
- A table: feature | automated test added (Y/N + file) | manual verification result (specific description, not a checkmark)
- Any features that had to be scoped down or deferred, and why
- Any gaps found in the tool system itself (features the UI wants that `core`/`react` don't currently expose cleanly) — this is valuable signal for what `@timelinx/ui` and even `core` itself might need later, report it even if you worked around it for now
- Confirm `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` all pass with `apps/editor` included

## Process rule (unchanged, and this one especially matters here)
Do not report a feature as working without the specific real-browser observation described in Step 3.2. "Should work based on the code" is exactly the failure pattern that cost three debugging rounds on the demo's drag feature — don't repeat it here on a much larger surface area.
