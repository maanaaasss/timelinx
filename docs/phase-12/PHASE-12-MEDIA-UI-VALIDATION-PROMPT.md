You are validating the real media import/export functionality built in Phases 10-11 — `packages/ui/src/utils/media-import.ts`, `packages/ui/src/components/canvas-compositor.tsx`, `packages/ui/src/hooks/use-export.ts`, `packages/ui/src/context/media-assets-context.tsx`, and their integration in `apps/editor`. This code has never been through adversarial review — it's had feature-by-feature bug fixes as issues surfaced, but no deliberate attempt to break it. You have no prior involvement in building this. Review it the way a skeptical outside engineer would, the same standard applied to `@timelinx/core` in this project's original Phase 1 and to `@timelinx/media-web`'s scaffold in Phase 7.

## 1. Fresh-eyes architecture review

Read through the four files in full. For each:
- Error handling — what happens with a genuinely malformed file, a file that partially loads then errors, a file that's technically valid but unusual (e.g., a video with no audio track, an image in an obscure format)?
- Resource cleanup — are blob URLs, pooled `<video>`/`<img>` elements (`MediaElementPool`), `AudioContext` nodes, and `MediaRecorder` instances actually released when clips are removed, when export is cancelled, or when the session ends? Trace this carefully — leaks here are cumulative and only show up after extended use, not in a quick test.
- Async correctness — race conditions in the import flow (e.g., rapid multi-file drops), in the compositor's per-frame rendering, in the export's audio scheduling under real timing pressure.
- Type safety — any `as any`/`as unknown` casts, and whether each is justified.
- Report findings severity-rated (CRITICAL/HIGH/MEDIUM/LOW), specific, with file/line references — same format as the original Phase 1 and Phase 7 reports.

## 2. Adversarial/hostile-input testing

Test scenarios specifically relevant to real user files, not synthetic test fixtures:

- **Large files**: a genuinely large video file (several hundred MB or more if feasible in this environment) — does import hang, does metadata extraction time out reasonably, does memory spike uncontrollably?
- **Long timelines / many assets**: import many files in one session, build a long timeline — does export still complete correctly? Does the `MediaElementPool` grow unboundedly, or does it actually reuse/evict?
- **Unusual but valid files**: a video with no audio track (confirm export doesn't fail or hang waiting for audio that doesn't exist), an image in an unusual format, a very short (sub-1-second) clip, an unusually high-resolution image far exceeding the canvas's 1920×1080 target.
- **Malformed/partial files**: a truncated video file (valid header, cut off mid-stream), a file renamed to a video extension but containing non-video data.
- **Rapid/concurrent operations**: multiple files dropped simultaneously, starting an export then immediately cancelling, cancelling and immediately re-starting.
- **Export-specific**: what happens if a file is deleted from the Asset Bin (or its blob URL revoked) while it's actively being used in an in-progress export?

## 3. Browser compatibility — specifically Safari

Safari's WebCodecs/media API support was flagged as inconsistent as far back as this project's Phase 7 review and has never actually been tested since real implementation landed. If Safari is available in this environment, test the full import → preview → export flow in it specifically. If it's not available here, state that explicitly and flag it as required manual testing for the project owner, rather than skipping silently.

## 4. Metrics

- Real coverage numbers (branch, not just statement) for the four files under review
- Confirm whether resource cleanup (Section 1) can be measured concretely — e.g., a repeated import/remove cycle with memory measurements before/after, to give real evidence rather than code-reading assurance about leaks

## Output

Produce three reports mirroring the established format from Phase 1 and Phase 7: `docs/phase-12/MEDIA-UI-ARCHITECTURE-REVIEW.md`, `docs/phase-12/MEDIA-UI-CHAOS-ENGINEERING-REPORT.md`, `docs/phase-12/MEDIA-UI-METRICS-VALIDATION.md`. Same standing rule as every round in this project: real executed evidence for every claim, explicit "NOT RUN" where something couldn't be verified in this environment (e.g., real Safari testing, extremely large file testing if resource-constrained here), no smoothing over uncomfortable findings.

Do not fix anything found in this pass — discovery only. Findings get triaged into a remediation plan afterward, the same pattern Phase 1 followed.
