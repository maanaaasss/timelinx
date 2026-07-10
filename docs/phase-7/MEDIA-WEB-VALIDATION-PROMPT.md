You are validating `@timelinx/media-web` before it becomes a real dependency of the editor app. This package is currently private, early-stage, and was last measured at roughly 23% statement coverage — it has never been through the kind of adversarial review `@timelinx/core` got in this project's original Phase 1. Give it the same treatment now. You have no prior involvement in building this package — review it the way a skeptical outside engineer would review a stranger's code before trusting it.

## 1. Fresh-eyes architecture review

Read through `packages/media-web/src/` in full: `adapters/` (webcodecs-decoder, thumbnail-extractor, webaudio-waveform, simple-export, webgl-compositor), `workers/` (thumbnail-worker, waveform-worker), and `index.ts`. For each significant piece:

- What does it actually do, and does the implementation match what its name/API surface implies?
- Error handling — what happens when a video file is malformed, a codec is unsupported, a worker crashes, or the browser lacks WebCodecs support entirely (Safari's support has historically been inconsistent — check whether that's handled or assumed away)?
- Resource cleanup — do decoders, workers, and any GPU/WebGL resources get properly released, or are there likely leaks on repeated use (e.g., loading/unloading many video files in one session)?
- Async correctness — race conditions, unhandled promise rejections, worker message ordering assumptions that could break under real-world timing.
- Type safety — grep for `as any`/`as unknown` and assess whether each is justified or hiding a real gap.

Report findings the same way the original Phase 1 architecture review did: severity-rated, specific, with file/line references.

## 2. Adversarial/hostile-input testing

This package touches real, untrusted external input (video/audio files) in a way `core` never had to — that's actually a higher-risk surface, not lower. Test:

- Malformed/corrupt video files (truncated, wrong container, valid container with invalid codec data)
- Extremely large files, extremely small/zero-byte files
- Unsupported codecs and formats
- Rapid concurrent decode requests (multiple videos loading simultaneously)
- Worker termination mid-operation (what happens if a thumbnail/waveform worker is killed while processing?)
- Browser API absence (simulate `WebCodecs` or relevant APIs being unavailable) — does the package fail gracefully with a clear error, or crash/hang?

## 3. Real metrics

- Coverage (branch, not just statement) — actual current numbers, not the stale 23% figure.
- Identify any dead code or untested paths, same as the original Phase 1 pass found in `core`.
- Bundle size sanity check — this package will ship real decoder/worker code to a browser; check what's actually reasonable.

## 4. Output

Produce three reports mirroring the original Phase 1 structure: `docs/phase-7/MEDIA-ARCHITECTURE-REVIEW.md`, `docs/phase-7/MEDIA-CHAOS-ENGINEERING-REPORT.md`, `docs/phase-7/MEDIA-METRICS-VALIDATION.md`. Same standard as every prior round: real executed evidence for every claim, explicit "NOT RUN" where something couldn't be verified in this environment, no smoothing over uncomfortable findings.

Do not fix anything found in this pass yet — this is discovery only, matching how Phase 1 worked (audit first, produce a prioritized remediation plan, then fix in a separate round). Findings will be triaged into a remediation plan afterward.
