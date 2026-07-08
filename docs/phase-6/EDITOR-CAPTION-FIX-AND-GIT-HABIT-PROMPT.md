Two things: fix a specific remaining bug, and establish a process habit that's been missing.

## 1. Fix: Adding a new caption doesn't work, but editing an existing one does

This pattern (works on pre-existing/seeded data, fails on newly created data) has shown up before in this project — usually because creating something from scratch skips a step that pre-seeded sample data already had done correctly (e.g., proper unique ID generation, a required field, correct branding via a type helper like `toCaptionId`).

1. Trace exactly what the "Add Caption" button in `CaptionsPanel` actually dispatches — the full `ADD_CAPTION` payload it constructs.
2. Compare that against what the real `ADD_CAPTION` validator actually requires (check `packages/core/src/validation/validators.ts` and the `Caption` type) — every required field, correct ID generation/branding, valid frame range.
3. Find the actual mismatch (don't guess) and fix it.
4. Add a test that specifically creates a *new* caption via the UI trigger (not editing a seeded one) and confirms it appears — this exact gap (tests only covering edit-of-existing, not create-new) may be why this slipped through.

## 2. Systemic improvement: surface dispatch rejections instead of failing silently

Several bugs across this project's history (this one included, likely) have had the same shape: an operation gets rejected by validation, and nothing tells the user or developer why — it just looks like "nothing happened." This has cost real debugging time repeatedly. Fix this generally, not just for captions:

1. Check whether `engine.dispatch()` (or wherever the app-level dispatch wrapper lives) currently surfaces rejection reasons anywhere.
2. At minimum, add a `console.error` (or equivalent) logging the rejection reason/message whenever a dispatch is rejected, app-wide — so from now on, "it doesn't work" comes with an actual reason visible in dev tools instead of silence.
3. If reasonably in scope, consider a lightweight visible indicator too (e.g., a brief toast/status message), but the console logging alone would already meaningfully speed up all future debugging — don't skip that part even if the UI part gets deferred.

## 3. New standing rule: commit and push after every verified fix or completed phase

This hasn't been happening consistently. Going forward:

1. After this fix (and the rejection-logging change) are made and tests pass, commit them with a clear message and push to a branch, open a PR (following the existing `chore/*` or `milestone-2/*` branch naming pattern already used), and confirm CI passes on it — do not leave verified work sitting uncommitted locally.
2. Report the branch name, PR number, and CI status explicitly in the output, the same way earlier phases did (e.g., "PR #6", "commit e85b89a") — this got dropped somewhere in recent rounds and needs to come back as standard practice.
3. Add a line to `CONTRIBUTING.md` (or reinforce if already present) stating this explicitly: work is not considered done until it's committed, pushed, and passing CI on a real PR — local-only verification is a checkpoint, not a finish line.

## Output
Update `docs/phase-5/EDITOR-MILESTONE-2-REPORT.md` with: the caption-creation root cause and fix, the rejection-visibility improvement, and the actual branch/PR/CI status for this round's changes.
