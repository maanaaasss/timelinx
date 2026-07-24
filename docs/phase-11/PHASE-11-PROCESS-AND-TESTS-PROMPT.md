Three process/verification gaps to close on the Phase 11 export work before it's trustworthy.

## 1. Commit, push, PR, and confirm real CI

This exact gap has recurred multiple times in this project. Do it now, and going forward this should happen automatically at the end of every round without being asked each time:

```bash
git checkout -b feature/phase-11-real-export
git add -A -- packages/ui/src/components/canvas-compositor.tsx \
               packages/ui/src/hooks/use-export.ts \
               packages/ui/src/components/export-dialog.tsx \
               packages/ui/src/components/timeline-editor.tsx \
               packages/ui/src/index.ts \
               packages/core/src/public-api.ts \
               packages/ui/src/styles/structure.css
git commit -m "feat: real canvas compositor + export via captureStream/MediaRecorder (Phase 11)"
git push -u origin feature/phase-11-real-export
gh pr create --title "Phase 11: Real export via canvas compositor" --body "Multi-layer Canvas2D compositor, real audio mixing, MediaRecorder-based export. Effect types without a clean canvas-filter mapping (colorCorrect, custom types) are explicitly skipped, not faked."
```
Wait for CI to actually go green on the PR. Report the PR number and real CI status — do not report this phase as complete without it.

## 2. Add a changeset for the new `core` public API exports

`ResolvedLayer`, `ResolvedCompositeRequest`, `FileAsset`, `GeneratorAsset` were added to `packages/core/src/public-api.ts` with no changeset — same gap the retroactive changeset-catchup round was specifically meant to prevent going forward. Run `pnpm changeset` now and describe this addition properly (minor bump, new public API surface for compositor consumers).

## 3. Add real unit tests for the audio scheduling math — the highest-risk, least-tested part of this whole feature

`AudioBufferSourceNode.start(when, offset, duration)` scheduling is easy to get subtly wrong in ways that are invisible in a quick check and very noticeable as audio drift in real use. Add tests — pure logic tests on "given this clip data, what arguments get computed for `.start()`," not requiring a real browser — covering:

1. A clip that starts partway through the export window (not at frame 0) — confirm the `when` argument correctly reflects its actual position in the export timeline.
2. A clip that's trimmed (non-zero `mediaIn`) — confirm `offset` correctly seeks into the source audio at the trimmed point, not from the beginning of the raw file.
3. Two overlapping audio clips (e.g., music + voiceover playing simultaneously) — confirm both get scheduled correctly without one clobbering the other's timing.
4. A clip that ends before the export window ends (confirm `duration` is capped correctly, doesn't play past its trimmed out-point).

If any of these reveal the current implementation doesn't handle the case correctly, fix it — that's the point of writing the test first.

## 4. Confirm export always starts from frame 0, independent of playhead position

Verify (and if not already true, fix) that clicking Export renders the full timeline from its actual start, regardless of wherever the playhead happened to be positioned in the editor UI at the time. Export correctness should never depend on incidental UI state.

## Output
Update `docs/phase-11/REAL-EXPORT-REPORT.md` with the PR/CI status, the changeset added, the new scheduling tests and their results, and confirmation of item 4.
