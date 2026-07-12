The dark preset now renders correctly (confirmed). One specific, high-value visual fix remains, identified from direct review of a real screenshot.

## 1. Inspector panel — pair related numeric fields into 2-column grids

Currently: Position X, Position Y, Scale X, Scale Y, Rotation, Opacity each render as a full-width labeled input, stacked vertically, one per row. This is the single clearest "generic form builder" tell in the whole interface.

Fix: group naturally paired properties side by side —
- Position X + Position Y in one row (2-column grid)
- Scale X + Scale Y in one row (2-column grid)
- Rotation and Opacity can stay full-width/single, or be paired together if that reads cleanly — your call, but Position and Scale pairing is the important one.

Check whether this same "one full-width labeled input per row" pattern appears anywhere else in the extracted components (other panels, forms) and apply the same fix wherever paired/related values exist — don't just fix this one instance if the pattern repeats elsewhere.

## 2. Zoom slider — give it real visual character

Currently a plain default-looking range input with a circular thumb. Refine it to feel considered rather than default-browser — options: tick marks at intervals, a track that visually fills/reflects the current zoom percentage rather than a plain thin line, a thumb styled consistently with the rest of the toolbar's visual language (matching button/icon treatment elsewhere).

## 3. Note for later (do not implement now, just confirm feasibility)

Real NLEs typically support "scrubbable" numeric inputs — click-dragging directly on the label/value to change it, not just click-to-type. This is a meaningful functional addition, not just visual, and a strong signal of tool-grade polish. Don't build this now — just note in the report whether the current input components would reasonably support this as a future enhancement, or whether the underlying structure would need rework first.

## Verification
Real screenshot showing the corrected Inspector layout (paired fields) and the refined zoom slider — same standard as before, an actual image, not a description.

## Output
Update `docs/phase-8/UI-EXTRACTION-REPORT.md` with what changed and why, plus the note from Section 3.
