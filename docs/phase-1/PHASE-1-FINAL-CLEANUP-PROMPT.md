You are closing the final item from PHASE-1-CLOSEOUT.md: removing confirmed dead code in `selection.ts` to close the branch coverage gap. This is mechanical cleanup, not a design change — but it touches the same file as the Tier 0 selection-tool regression (item #7), so treat it with proportionate care.

## Step 1 — Public API check (do this first, before deleting anything)

Check whether `DragMode`, `trimEdge`, `trimOrigStart`, or `trimOrigEnd` are exported from `@timelinx/core`'s public entry points (check the package's `index.ts`/barrel exports, and `packages/react`/`packages/ui` for any references or re-exports).

- If none are exported/public: proceed to Step 2 with no special handling.
- If `DragMode` (or any of these) IS part of the public API: removing `'trim-edge'` from the union is a breaking type change. Still proceed (the project is pre-1.0 beta), but explicitly flag this as a breaking change in your output so it can be noted for changelog purposes later, and grep the whole monorepo for any other consumer that references `'trim-edge'` as a literal or switches on `DragMode` exhaustively (which would itself now fail to compile if not updated).

## Step 2 — Remove the confirmed dead code

Per PHASE-1-CLOSEOUT.md's findings:
1. Remove `collectClips()` (lines ~74-81) — confirmed never called.
2. Remove `trimEdge`, `trimOrigStart`, `trimOrigEnd` private properties (lines ~145-147).
3. Remove the `if (this.mode === 'trim-edge' ...)` block in `onPointerMove` (lines ~259-286).
4. Remove `'trim-edge'` from the `DragMode` type (line ~43).
5. Remove the dead `else` branch at lines ~434-436 (unreachable click-deselect path).

Do these as one coherent change, not five disconnected edits — after each removal, check whether it exposes further now-unused code (e.g., removing the trim-edge block might leave other trim-related helpers unused too). Report anything additional you find.

## Step 3 — Verify nothing broke

1. Run the full `selection.ts` test suite (27 tests) and confirm all still pass.
2. Run the full core + react test suite and confirm zero regressions.
3. Re-run coverage on `selection.ts` specifically and report the actual before/after branch coverage number — confirm it's actually ≥85%, don't estimate it.
4. Run `tsc` across the whole monorepo (not just `core`) to catch any consumer that referenced the removed type members.

## Step 4 — Final Phase 1 status

Update (or append to) `docs/phase-1/PHASE-1-CLOSEOUT.md` with:
- What was removed and why (link back to the original finding)
- The public API check result from Step 1
- Actual before/after coverage numbers for `selection.ts`
- Full test suite result (pass/fail counts)
- One explicit closing line: **"Phase 1 is fully closed, zero open items"** — only write this if it's actually true. If anything is still open (even something small and newly discovered), say exactly what, rather than declaring closure prematurely.

## Process rule (same as before, still binding)

Every number and pass/fail claim must come from something you actually ran in this session. No estimates presented as measurements.
