The project owner provided two real reference screenshots (a CapCut-style editor and a premium modern editor) showing exactly the visual direction wanted. Three concrete, specific changes based on them — not vague "make it less generic" this time.

## 1. Make the accent color confident and saturated, not muted

Correction to prior guidance: the issue was never "purple specifically" — one reference uses a bold, saturated violet successfully against a near-black background and it reads as premium, not generic. The actual problem is desaturation/hesitancy. Revisit the current accent color (whatever it is now) and make it bolder and more saturated — fully committed to the hue rather than a soft/washed version of it. This can stay in the current direction or change; the key constraint is confidence and saturation, not a specific hue.

## 2. Extend type-based color coding beyond track dots

The token system already has distinct colors per track type (`--track-video`, `--track-audio`, `--track-subtitle`, etc.) — currently only really visible as small dots next to track names. Reference Image 1 shows each effect/audio layer getting its own distinct, saturated color as a full visual treatment (colored pill/badge, not just a dot). Apply this same idea to:
- The Effects panel — each effect type gets a distinct color identity (a colored icon, swatch, or accent border reflecting its category), not uniform gray/neutral rows for every effect regardless of type
- Consider whether clips themselves could lean harder into their track-type color (currently fairly subtle) the way Image 1's effect lanes use bold, clearly-differentiated colors per lane

## 3. Restructure Inspector (and other panels) into labeled sections with icons

Reference Image 2's right panel groups related fields under a labeled, iconed, collapsible section header ("Motion" with an icon and a collapse chevron, "Text style" similarly). Currently the Inspector just has a flat "TRANSFORM" caps-lock text label with no icon or structure.

1. Add a small icon next to each section label ("Transform", "Effects", etc.) — pick icons that clearly represent the section's purpose.
2. Add collapse/expand affordance (chevron) to each section header, even if collapsing isn't fully functional yet in this pass — the visual pattern matters as much as the behavior for this round; make it functional if reasonably in scope.
3. Apply this same sectioned structure to other panels where it makes sense (Effects, Keyframes) for consistency.

## Verification
Real screenshot, same standard as every round. Given how much subjective ground this covers, don't just assert improvement — show it and let the project owner react, the same way the last two references made the gap concrete when words alone hadn't.

## Output
Update `docs/phase-8/UI-EXTRACTION-REPORT.md` with the specific changes made in response to each of the 3 points above, referencing which parts of the provided images informed each decision.
