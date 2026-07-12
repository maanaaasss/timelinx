Two rounds of targeted fixes (paired inspector fields, slider polish) were correct but didn't address the actual problem: the overall visual fingerprint — Inter + Lucide icons at default weight + muted purple/indigo accent + uniform rounded corners on every element — reads as the default aesthetic of AI/shadcn-scaffolded apps, regardless of how well each individual piece is executed. This round is a real identity change, not another micro-fix.

## 1. Replace the accent color — move away from purple/indigo entirely

Current `--accent-*` scale (muted indigo, ~#8b88d0 range) needs to change to something that doesn't read as "default AI app purple." Recommended direction: warm amber/orange (in the spirit of DaVinci Resolve's actual accent), but choose deliberately — the constraint is: NOT another shade of blue, purple, or indigo, since that family is the most overrepresented in generic AI-generated interfaces right now.

1. Design a new accent scale (50 through 600, matching the existing token structure) in the new color direction.
2. Update `dark-pro.css` (and `light.css`/`high-contrast.css` if they share the accent token) to use it.
3. Check every place the old accent color was hardcoded outside the token system (rather than referencing `--accent-*`) and fix those too — the whole point is consistency through the token system, not just changing one variable and missing hardcoded instances.
4. Confirm selected-clip borders, active-tool highlights, the zoom slider fill, and any other accent-colored UI all pick up the new color via tokens, not old hardcoded values.

## 2. Customize icon treatment — stop looking like default Lucide output

1. Audit current icon usage (`icons.tsx`) — confirm what's actually Lucide-react at default settings.
2. Establish a deliberate, consistent stroke-width and sizing rule that's NOT just the Lucide default (e.g., a specific stroke-width value applied consistently, sized to match the toolbar's actual proportions rather than whatever ships by default).
3. For the most prominent, most-seen icons specifically (the tool cluster: selection/razor/hand/zoom), consider whether custom-drawn SVGs would read as more considered than stock icons — your call on effort/value tradeoff, but at minimum apply #2's consistent treatment everywhere.

## 3. Introduce shape-language hierarchy — stop uniform rounding everywhere

Currently every element (clips, buttons, inputs, panels, badges, slider thumb) uses the same soft rounded treatment. Introduce actual variation:
- Structural/chrome elements (toolbar container, panel dividers, the main layout regions) — consider sharper, more rectangular treatment, less/no rounding
- Interactive elements (buttons, inputs, clips) — keep rounding, since that's appropriate there
- The goal is visual hierarchy through shape variation, not "make everything sharp" or "make everything round" — deliberate contrast between structural and interactive elements

## Verification
Real screenshot of the result, same standard as every prior round. This is a genuine aesthetic pivot — if it still reads as generic after this, say so honestly rather than defending the choices, and we'll iterate again.

## Output
Update `docs/phase-8/UI-EXTRACTION-REPORT.md` with the new accent color values and reasoning, the icon treatment change, and the shape-hierarchy decisions made.
