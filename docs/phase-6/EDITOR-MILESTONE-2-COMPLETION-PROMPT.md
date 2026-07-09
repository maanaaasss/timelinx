Milestone 2's panels (Effects, Transitions, Keyframes, Captions, Inspector) currently only display data — none of them dispatch real operations. This is the actual scope of the milestone and needs to be completed, not deferred to "Milestone 3."

## 1. Wire every panel to real dispatch, through the real engine/tool APIs

For each panel, connect the UI actions to actual operations (check `public-api.ts` and the relevant operation types for exact names — don't guess):

- **EffectsPanel:** "Add effect" button actually dispatches an add-effect operation (pick from real effect types in `types/effect.ts`); "remove" button dispatches removal; toggle (enable/disable) dispatches whatever operation controls that.
- **TransitionsPanel:** edit/delete actually dispatch real operations on the transition.
- **KeyframesPanel:** add/delete keyframe actually dispatch through `KeyframeTool` or the equivalent operation, not just append to a local display list.
- **CaptionsPanel:** add/edit/delete actually dispatch caption operations (`ADD_CAPTION`/`EDIT_CAPTION`/similar — check `packages/core/src/validation/validators.ts` or `operations/` for the real names, referenced in earlier phase reports).
- **InspectorPanel:** input field changes (position, scale, rotation, opacity) actually dispatch a transform-update operation, not just render current values.

After wiring each one, confirm with a real test (not just "should dispatch") — assert that after clicking/interacting, the engine's actual state reflects the change (new effect present, caption text updated, etc.).

## 2. Fix the KeyframeTool default-effect gap

Per the project owner's direction: when a keyframe is added to a clip that has no effects yet, auto-create a default effect for the keyframed property rather than silently doing nothing. Implement this, and add a test confirming a keyframe added to an effect-less clip actually results in both a new effect and a keyframe on it.

## 3. Add caption rendering on the timeline

Per gap #4 — captions exist in state but don't render as visual clips on the subtitle track. Add rendering so `TrackView` shows caption entries visually on S1, similar to how video/audio clips render (simplified is fine — a labeled block showing caption text is enough for this milestone).

## 4. State the workspace:* publishing constraint explicitly, don't just leave it as a side-effect

`@timelinx/react`'s dependency on `@timelinx/core` is now `workspace:*` again (changed to fix a stale-pnpm-store issue). This is safe *only* because `pnpm publish`/`pnpm changeset publish` correctly rewrites `workspace:*` to a real version at publish time — a plain `npm publish` would reproduce the exact bug that caused the `beta.1` republish earlier. Add an explicit comment near this dependency (or in `CONTRIBUTING.md`'s publishing section) stating this constraint plainly, so it can't be forgotten and repeated a second time. Also confirm: was changing this dependency string actually necessary, or would clearing/reinstalling the pnpm store alone have fixed the stale-copy issue without permanently changing the dependency declaration? State which, with reasoning — if the workspace:* change wasn't strictly required, consider whether reverting it and just fixing the cache issue directly is cleaner.

## 5. Verification

Same standard as every round: real test assertions on actual state changes, explicit statement of what could/couldn't be checked in a real browser from this environment. Given this round is about wiring functional dispatch (not just visual rendering), automated tests asserting real engine state changes are actually quite meaningful here — prioritize those, in addition to the usual real-browser caveat for anything involving pointer-driven interaction (TransitionTool drag, KeyframeTool click-to-add).

## Output
Update `docs/phase-5/EDITOR-MILESTONE-2-REPORT.md`: replace the "read-only shells" gap with confirmation each panel now dispatches real operations (with test evidence), the keyframe default-effect fix, caption rendering, and the workspace:* constraint documented as described.
