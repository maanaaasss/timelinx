The Bug 6/7 fix (removing a box-shadow transition, adding `will-change: left, width` and similar hints) did not fix the wobble/elastic effect, and made the app noticeably laggier. This was a speculative fix, not one based on actually observing the problem — every verification line in the last report said "cannot verify visually." Do not repeat that pattern. This round requires actually diagnosing the real cause with evidence, not another plausible-sounding guess.

## Why the previous fix likely made things worse (context, not something to just take on faith — confirm or refute it)

`will-change: left, width` hints the browser to pre-optimize those properties, but `left`/`width` are layout properties — changing them always forces a full layout recalculation regardless of `will-change`. The hint mainly causes the browser to promote the element to its own compositing layer, which costs memory/compositing overhead without avoiding the layout cost that's likely the actual source of jank. If many clips got this hint simultaneously, that's probably a meaningful new performance cost with no corresponding benefit.

## Step 1 — Actually measure what's happening, don't guess again

1. If you have access to a real browser with dev tools (or any way to run one in this environment — check for Playwright, Puppeteer, or similar), open the editor and use the Performance/Profiler tooling to record a trace while moving the mouse over the timeline (no clicking, just hover-movement). Report what you actually find: how many re-renders happen per second, what's taking the most time (layout, paint, scripting), and which specific React components are re-rendering.
2. If a full browser profiler isn't available, add temporary render-count logging (e.g., a `console.log` or render counter in `ClipView`, `TimelineView`, and whatever handles pointer-move/hover) and report actual counts during a mouse movement — e.g., "moving the mouse across the timeline for 2 seconds triggered 340 re-renders of ClipView across all 6 clips" or similar real numbers.
3. Specifically check: is there a per-pixel mouse-move handler (for cursor tracking, hover detection, edge-proximity detection, etc.) that updates React state on every single `pointermove` event? Pointer move events can fire 60+ times per second — if each one triggers a state update that re-renders clips (not just updates a lightweight cursor style), that alone would explain both the wobble (layout recalculating constantly) and the lag (far more re-renders than necessary), independent of any CSS `will-change` question.

## Step 2 — Based on actual findings, fix the real cause

Likely candidates to investigate and fix, in rough order of likelihood:

1. **Unthrottled state updates from pointer-move.** If hover/cursor state updates on every raw pointer-move event, throttle it (e.g., only update when crossing into/out of a meaningfully different hover target, not on every pixel) or ensure the update only re-renders the minimal component involved (e.g., a cursor style on a single container), not the whole clip list.
2. **Positioning via `left`/`width` instead of `transform`.** Consider switching clip positioning to `transform: translateX(px)` for horizontal position (transform doesn't trigger layout, only compositing) while keeping `width` as a real layout property only where it must actually change (e.g., during an actual resize/trim, not during scroll or hover). This is a more substantial change — only do it if Step 1's evidence actually points here.
3. **Remove the `will-change` hints from Bug 6/7's fix** if Step 1 shows they're not helping (or are actively hurting) — don't leave speculative CSS in place once there's real evidence it's not the right fix.

## Step 3 — Verify with the same rigor, not another guess

After the real fix: if you have any way to visually confirm in this environment (a screenshot tool, a headless browser with visual diffing, anything), use it. If not, state explicitly that this still needs the project owner's real-browser check — but this time, also report the concrete before/after evidence from Step 1's measurement (e.g., re-render counts, profiler trace summary) so there's at least quantitative evidence the fix addressed something real, even without a visual confirmation.

## Process rule (unchanged, and this round specifically failed it once already)
Do not propose or report a fix based on what sounds plausible. Every claim in this round needs to be backed by an actual measurement (render counts, profiler output, or equivalent) — the previous round's "removed a transition, added will-change hints" was reasoning from general web performance knowledge, not from evidence about what was actually happening in this specific app, and it didn't work.

## Output
Update `docs/phase-5/EDITOR-MILESTONE-1-REPORT.md`'s Bug 6/7 section with the actual diagnostic findings, the real fix applied, and why the previous `will-change` approach didn't help (confirm or refute the theory above with evidence either way).
