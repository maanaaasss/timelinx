The showcase page labels itself "dark-pro preset" in the header, but the screenshot shows a fully light-mode interface — white background, black text, pale colors. The preset is not actually being applied visually. Find out why and fix it before any further visual/design work happens — nothing about visual quality can be judged while the wrong theme is rendering.

## Investigate

1. Confirm `presets/dark-pro.css` is actually being imported/loaded by the showcase page — check the actual `<link>`/`import` in the HTML/entry point, not just that the file exists.
2. Check CSS specificity/cascade order — is something loading AFTER `dark-pro.css` that resets custom properties back to `tokens.css`'s light defaults (recall `tokens.css` was described as "light-first defaults")? E.g., if `structure.css` or component-level styles are loaded after the preset and redeclare `:root` variables, or if the preset is scoped to a class (`.dark-pro`) that never actually gets applied to a parent element wrapping the showcase content.
3. Check whether the preset requires an activating class/attribute (e.g., `<html class="dark-pro">` or `data-theme="dark-pro"`) that the showcase page's markup never actually sets, even though it displays a label claiming it's active.
4. Open the actual computed styles in a browser (or reason through the cascade if browser access isn't available) for a specific element — e.g., the page background — and trace exactly which CSS rule is winning and why it's not the dark-pro value.

## Fix

Once the actual break point is found, fix it there — not by increasing specificity as a workaround, but by correcting whatever the real mechanism should be (proper class/attribute application, correct load order, correct scoping).

## Verify

After the fix, this needs an actual screenshot showing genuinely dark surfaces, light text, and the accent colors described in the original extraction report (muted indigo, etc.) — not a claim that it's fixed. If real browser/screenshot capability isn't available in this environment, say so explicitly and this goes back to the project owner to confirm visually, same as every other visual check in this project.

## Output
Update `docs/phase-8/UI-EXTRACTION-REPORT.md` with the root cause (which specific mechanism was broken) and the fix. Once this is confirmed actually rendering dark, we'll revisit the design-quality questions (generic-looking chrome, Effects panel, etc.) — those can't be meaningfully evaluated against the wrong theme.
