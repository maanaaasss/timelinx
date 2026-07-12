The project owner built a static HTML/Tailwind mockup using a tool called Stitch (attached: `index.html`) that captures exactly the visual direction wanted. Treat this as a literal specification — exact colors, spacing, layout proportions, component structure — not directional inspiration. Port its real design into the actual, functional, token-based `@timelinx/ui` components. Do not touch the underlying functional logic (reactive hooks, data-fetching) — this is a visual/structural port on top of working components.

## 0. Architecture decision — resolve before starting

The mockup uses Tailwind loaded via CDN, which cannot ship in a real package (runtime JIT compilation, external CDN dependency). Two options:
- **(Recommended) Translate the mockup's exact values into the existing CSS custom-property token system** — extract every color, spacing, and sizing decision from the mockup and express it as token values, keeping the current headless/swappable-preset architecture intact.
- Alternatively, adopt Tailwind as a real build-time dependency for `@timelinx/ui` going forward — a bigger architectural change, only do this if you judge it's clearly the better path, and flag it explicitly as a deliberate architecture change in the report rather than a quiet decision.

State which path you're taking and why before proceeding.

## 1. Extract and adopt the mockup's exact design values

From the mockup's Tailwind config and markup:
- Colors: `bg: #1c1f26`, `sidebar: #14151a`, `panel: #23262f`, `border: #333842`, `text: #9ca3af`, `textActive: #ffffff`, `accent: #3b82f6` (general UI accent — buttons, audio track), plus track-type colors (video `#374151`, audio `#3b82f6`, effect `#10b981`, music `#6366f1`, plus yellow/green variants)
- **Critically: the selected/active clip uses a distinct yellow/gold (`ring-yellow-400` + yellow resize handles), separate from the general blue accent.** Adopt this exact semantic split — general accent for UI chrome, a separate reserved color specifically for "this is the actively selected/active element." Don't collapse these into one accent color.
- Layout proportions: left icon sidebar (fixed narrow width, icon+label stacked buttons), media browser panel width, timeline track header width, track row heights (16 for video, 10 for audio/effect tracks) — match these exact proportions, not approximations.
- Component structure: the layered/stacked effect representation on tracks (colored blocks per effect type, positioned absolutely with percentage widths), the trim handles on the selected clip (colored tabs on left/right edges with chevron icons), the media browser's toolbar (Upload button, grid/sort/filter controls).

## 2. Replace placeholder imagery

The mockup's `<img>` tags point to Stitch's own AI-generated demo image URLs — these cannot be used. Replace with a proper placeholder strategy (generated gradients, or genuinely generated placeholder images bundled with the package) that achieves the same "this reads as real content" effect the mockup demonstrates.

## 3. Port structure into real, functional components

Apply this exact visual/structural design to the real, already-proven components (media bin, preview panel, timeline/tracks, trim handles, right panel) — the data behind them stays exactly as-is (real reactive hooks, real clip/effect/track data), only the visual layer and layout structure change to match the mockup.

## Verification
Real screenshot of the result placed directly next to the mockup (or a rendering of the mockup itself) for direct comparison.

## Output
Update `docs/phase-8/UI-EXTRACTION-REPORT.md` with the architecture decision from Step 0, the extracted design values adopted, and a direct comparison against the mockup.
