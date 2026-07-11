Two things, both real: re-extract the 5 panels from the actual proven source (not the stale scaffold), and fix the showcase's presentation plus the Effects panel's visual design.

## 1. Re-extract all 5 panels from `apps/editor/src/components/*`

Source of truth for each — replace the scaffold-derived version entirely:
- `InspectorPanel` — use the editor's `useClip(selectedClipId)`-based version
- `EffectsPanel` — extract as its OWN component (it was never actually extracted before — only reimplemented inline inside `InspectorPanel` from the scaffold). Editor's version uses `useClipEffects(engine, selectedClipId)`.
- `TransitionsPanel` — editor's `useAllTransitions(engine)`-based version
- `KeyframesPanel` — editor's `useClip`-based version
- `CaptionsPanel` — editor's `useTrackCaptions`-based version — **carry over the `DEPRECATED` notice from the text-clip pivot, don't drop it**
- `MarkersPanel` — editor's `useMarkers(engine)`-based version

For each: extract the real component, generalize it for headlessness (remove editor-app-specific assumptions, clean up the public prop API), but keep the actual data-fetching/reactivity logic intact exactly as proven. Do not patch the old scaffold versions to functionally match — replace them.

Decide and state explicitly: does `InspectorPanel` compose `EffectsPanel` as a child (tabbed), or do they stay fully separate exported components that a consumer composes themselves? Either is fine — just make it a real decision, not an accident of which file happened to get copied.

Verify: run the same reactivity check that mattered in Milestone 2 — dispatch a change to something a panel displays from *outside* the panel's own UI (e.g., programmatically add an effect, or change a transform value via direct dispatch) and confirm the panel actually re-renders to reflect it.

## 2. Fix the showcase page's presentation

Currently it's a light-background documentation page with small dark-colored swatches inside it — that doesn't let anyone actually judge whether the Dark Pro preset reads as professional-tool-tier, since it's never shown as an immersive environment. Rebuild the showcase so:
- The page itself runs inside the dark theme as its actual environment (dark page background using the real tokens, not a white doc-page wrapper)
- Include a real, substantial section showing the components composed together as they'd actually appear (e.g., the "Mini Timeline" section, but larger and more complete — real toolbar + tracks + panel, side by side, as an actual mini-editor layout) so it can be judged as a whole interface, not just isolated swatches
- Keep the token/scale reference sections (colors, typography, spacing) as a secondary reference section, but they shouldn't be the primary thing on screen

## 3. Redesign the Effects panel's visual treatment specifically

The current design (plain text label + category subtext + generic pill toggle, no visual anchor) reads as a default/generic dashboard template. Improve it with real visual hierarchy:
- Some visual anchor per effect row — an icon representing the effect type, or a small color-coded swatch, so the list isn't purely two lines of same-weight text
- A toggle control that matches the rest of the design system's actual visual language (check what toggle/switch styling exists elsewhere in the token system or established components) rather than a generic default pill switch
- Clear visual separation between the effect's name (primary) and its metadata/category (secondary) — differentiate weight/size/color meaningfully, not just stack two similarly-weighted lines
- Consider whether category text ("PreComposite") is even the right secondary information to surface, or whether something more useful (a brief parameter summary, an expand affordance) would serve better — your call, but make it a considered choice

## Verification

Real browser check on the rebuilt showcase — confirm the immersive dark presentation actually renders correctly, confirm panel reactivity works as described in Step 1, and provide fresh screenshots (or ask the project owner to) for visual review, same as before.

## Output
Update `docs/phase-8/UI-EXTRACTION-REPORT.md` with what was re-extracted, the InspectorPanel/EffectsPanel composition decision, the showcase rebuild, and the Effects panel redesign — with before/after reasoning for the visual changes, not just a description of what changed.
