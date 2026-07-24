Build Phase 11 using Option A: a real canvas-based compositor driving both live preview and real export via `canvas.captureStream()` + `MediaRecorder`. This deliberately trades perfect frame-accuracy and MP4 output for something real, testable, and shippable soon — WebM output and real-time-speed export are acceptable for this round. Frame-accurate offline rendering (Option B) is a later, separate phase.

## 1. Build a real compositor (this also upgrades Phase 10's single-clip preview limitation)

Given the current playhead frame and the full timeline state, render every visible clip in correct z-order onto one `<canvas>`:
- **Video clips**: use the same hidden-`<video>`-element + seek technique from Phase 10, but generalized to support multiple simultaneous video clips (e.g. overlays, picture-in-picture), each drawn via `drawImage(videoElement, ...)` onto the canvas
- **Image clips**: `drawImage` directly
- **Text clips**: render via canvas text APIs (`fillText`/`strokeText`) using the clip's real text content and styling
- **Transform**: apply each clip's real transform data (position, scale, rotation, opacity) from the same data the Inspector panel already edits — this should make the Inspector's transform controls visibly affect the composited output for the first time
- **Basic effects**: Canvas2D's `ctx.filter` (e.g. `blur(Npx)`, `brightness()`, `contrast()`) can handle simple effects natively without needing WebGL — use this for whatever effect types already exist in the data model rather than building a shader pipeline. If an effect type doesn't map cleanly to a canvas filter, skip it for this round and note it as a gap rather than faking it.

Replace the current single-`<video>`-element `MediaPreview` with this compositor for live interactive preview. This is a natural upgrade, not scope creep — Phase 10 explicitly deferred multi-layer compositing to "later," and this is that later.

## 2. Real export via canvas capture

1. `canvas.captureStream(fps)` to get a live video stream from the compositor canvas
2. Audio: canvas capture doesn't include audio — set up a Web Audio `AudioContext` with a `MediaStreamAudioDestinationNode`, route all real audio/music track sources into it (mixed correctly if multiple), and combine its audio track(s) with the canvas's video track into one `MediaStream` for the recorder
3. `MediaRecorder` records that combined stream
4. Drive playback across the full timeline duration for the export (reuse the engine's real playback/clock mechanism from Phase 10 rather than building a separate driver) — export happens in real time, at the timeline's actual duration, not instantly
5. On completion, produce a downloadable file (WebM) via a blob URL

## 3. Export UI

- Progress indicator (based on elapsed time vs. total timeline duration)
- Cancel button that actually stops the `MediaRecorder` and playback cleanly
- Download link/auto-download when complete
- Clear error handling if `MediaRecorder`/`captureStream` aren't supported in the current browser

## Explicitly out of scope for this round
- WebGL/shader-based effects (Canvas2D `ctx.filter` only)
- Frame-accurate offline encoding
- MP4 output (WebM is fine for now)
- Effects that don't map to a canvas filter (note as a gap, don't fake)

## Verification
Real browser test is essential here — build a small timeline with a real imported video clip, a text clip, and a music track, export it, and actually play the resulting file in a real video player. Confirm: video and audio are in sync, the text clip appears correctly composited, any applied transform (position/scale/opacity) is visible in the output. State plainly what could/couldn't be verified from this environment vs. what needs the project owner's own test — same standard as every round before this.

## Output
Produce `docs/phase-11/REAL-EXPORT-REPORT.md` covering what was built, real test results, and any gaps (especially any effect types that don't map to Canvas2D filters).
