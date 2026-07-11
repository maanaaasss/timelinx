You're building the real `@timelinx/ui` package: headless component primitives + a CSS custom-property token contract + one fully polished preset, extracted from the proven components in `apps/editor` (Milestones 1-2). This is now a real target for public release, so hold it to the same standard as `core` — real testing, real verification, no unproven claims.

## 0. Investigate existing scaffolding first

`packages/ui/src/tokens.css`, `presets/dark-pro.css`, `presets/light.css`, `presets/high-contrast.css` already exist from early, unvalidated scaffolding — predating all the Milestone 1-2 work. Before building anything new:
1. Read all of it. Assess: is `tokens.css`'s token set well-structured (semantic naming, reasonable scale for spacing/color/typography) and worth keeping as a foundation, or is it thin/inconsistent and better rebuilt?
2. Same assessment for `dark-pro.css` specifically, since that's the closest match to "one fully polished dark preset."
3. Report this assessment plainly before proceeding — don't silently discard working prior effort, and don't silently keep weak prior effort out of inertia.

## 1. Architecture — headless primitives + token contract

1. Components carry structure, behavior, accessibility (keyboard nav, ARIA where relevant), and semantic class names / data attributes — no hardcoded colors, fonts, or spacing values baked into component logic.
2. All visual values come from CSS custom properties (design tokens) — color, spacing, typography, radii, shadows, transitions. Define a clean, well-organized token set (reuse/refine `tokens.css` per Step 0's findings) covering at minimum: background/surface layers (for depth/elevation), text (primary/secondary/muted), accent/interactive states, borders, spacing scale, radius scale, font family/sizes/weights.
3. A "preset" is purely a CSS file that sets token values — the components never know or care which preset is active.

## 2. Extract real components from apps/editor

Pull the components that have actually been proven through Milestones 1-2 — `ClipView`, `TrackView`, `Timeline`/ruler, `Toolbar`, the panel system (Inspector/Effects/Transitions/Keyframes), selection/highlight states, cursor feedback, ghost-drag previews — into `packages/ui` as the real, headless, reusable versions. This is extraction and generalization (removing app-specific assumptions, making props/API clean and documented), not a rewrite from scratch — the interaction logic already works and is hard-won; don't discard it and reimplement.

## 3. Build one fully polished preset — modern, dark, professional-tool-grade

This is the one to get genuinely right, not just functional. Target the visual quality bar of tools like Resolve, Figma, Linear, Raycast — specifically:
- Restrained, purposeful color palette — not default browser colors, not arbitrary bright accents
- Real depth via subtle elevation/shadow layering between surfaces (timeline vs. panels vs. toolbar), not just flat colors with hard borders
- Deliberate typography — a real font stack and considered size/weight scale, not default system font at default sizes
- Consistent spacing discipline throughout
- Polished interactive states — hover, active, selected, disabled should all feel considered, not default/missing
- Avoid generic "AI-generated UI" tells: default purple gradients, uniform border-radius everywhere with no variation, center-everything layouts, generic sans-serif with no personality

## 4. Build a visual showcase page for review

Since this is fundamentally visual work, the project owner needs an efficient way to review it — not hunting through the full editor app. Build a simple showcase/gallery page (in `apps/editor` temporarily, or a new minimal `apps/ui-showcase` if cleaner) displaying every extracted component in its various states (default, hover, selected, disabled, etc.) with the preset applied, so it can be reviewed in one pass.

## 5. Verification

1. Automated tests for component logic/behavior (same rigor as everything else — real interaction simulation, not just render checks).
2. Explicit real-browser check requirement for visual/interactive correctness — same standing rule as the editor work. State plainly what could/couldn't be verified from this environment.
3. Typecheck, lint, build clean.

## Output
Produce `docs/phase-8/UI-EXTRACTION-REPORT.md`: what was kept vs. rebuilt from the existing scaffold (Step 0), the token system design, which components were extracted, the showcase page location/URL, and the standing Definition of Done (branch, PR, CI).

Do not mark this "done" — this is a first pass for the project owner's visual review. Real completion means the project owner has actually looked at the showcase page and confirmed it meets the bar, the same way every interactive feature in this project has needed real human eyes before being trusted.
