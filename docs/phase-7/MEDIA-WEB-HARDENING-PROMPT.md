Harden `@timelinx/media-web`'s current placeholder scaffold based on the Phase-7 validation reports. Do NOT implement real WebCodecs decode, real export, or real WebGL compositing — that's explicitly deferred to a future phase. This round fixes concrete bugs and gaps in the scaffold as it exists today.

## 1. Fix the two confirmed, reproduced bugs

- **Bug #1:** `instanceof HTMLCanvasElement` crashes with `ReferenceError` when `HTMLCanvasElement` doesn't exist in scope (`simple-export.ts:237`, `webgl-compositor.ts:310`). Fix: guard with `typeof HTMLCanvasElement !== 'undefined' && canvas instanceof HTMLCanvasElement` in both places.
- **Bug #2:** `extractPeaks` produces `Infinity`/`NaN` when `peaksPerSecond` exceeds what the buffer can support (`webaudio-waveform.ts:175-197`). Fix: clamp `totalPeaks` to `rawData.length`, or handle the `samplesPerPeak === 0` case explicitly by reading the single sample at that position.

## 2. Fix the HIGH findings that will matter regardless of whether real decode ever lands

- **H2 / Arch-H2:** Worker error messages are silently dropped (`thumbnail-worker.ts` client doesn't invoke any callback or reject any promise on a worker error). Fix so errors always propagate to the caller, not just when an optional `onError` happens to be provided.
- **H6 / Arch-H6 and M5:** `cancelRequest`/`cancelJob` remove local bookkeeping but never actually message the worker to stop. Fix by sending a real cancel message to the worker.
- **C1 (partial, scaffold-relevant):** `WebGLCompositor.drawLayer` leaks GPU textures if it throws between creation and deletion. Wrap the texture lifecycle in try/finally. Also cache `gl.getUniformLocation()` results in `initWebGL` rather than calling on every draw.
- **C2:** After a shader compile failure, `this.gl` stays non-null while `this.program` is null — a latent half-initialized state. Either throw on shader failure or explicitly null out `this.gl` too, so the fallback path is unambiguous everywhere, not just in `composite()`'s current check.
- **H3:** `getVideoElement`/`extractThumbnail`'s Node.js fallback creates a fake canvas via `as unknown as HTMLCanvasElement` that silently no-ops instead of clearly indicating "unsupported in this environment." Replace with an explicit typed result or thrown error instead of a duck-typed fake object.
- **H4:** `new AudioContext()` can throw (`NotAllowedError`/`NotSupportedError`) with no try/catch. Add one, surface a clear error rather than an uncaught exception.

## 3. Add real test coverage for the workers (currently 0%)

The worker modules (`thumbnail-worker.ts`, `waveform-worker.ts`, 677 lines combined) are the most complex code in the package — message passing, job queues, priority scheduling, pool management — and have zero tests. Add tests covering:
- Job queuing and priority ordering
- Pool concurrency limits actually being respected
- Error propagation from worker to client (ties into the Section 2 fix above)
- Cancel actually stopping in-progress work (ties into the Section 2 fix above)
- destroy()/cleanup idempotency

Use whatever real or mocked Worker harness is practical in this environment (vitest's worker support, or a manual mock) — real browser Worker testing may not be fully achievable here; if so, state that explicitly and note what's covered vs. what still needs browser-based testing.

## 4. Small fixes, low effort, worth doing while in this code

- **M2:** LRU cache eviction in `ThumbnailExtractorAdapter` is O(n) per insertion — fine at small scale, but cheap to note/fix if straightforward.
- **M6:** `WebGLCompositor.resize` silently no-ops for `OffscreenCanvas`. At minimum, make this failure visible (log/throw) rather than silent.
- **L1:** Remove the dead `concurrency` config option in `WebCodecsDecoderAdapter`, or clearly mark it as reserved for future use.
- **Dimension sanity check:** per the chaos report, a 100000×100000 thumbnail request would attempt a ~40GB allocation. Add a reasonable maximum dimension check that rejects with a clear error instead of letting the browser attempt it.

## 5. Do NOT do these (explicitly out of scope for this round)

- Real WebCodecs decode implementation
- Real MediaRecorder-based export (the actual frame-capture logic)
- Real WebGL shader/compositing implementation
- Safari-specific codec handling

These remain placeholder, by deliberate decision — just make sure the placeholder scaffold around them is honest, doesn't crash, doesn't leak, and reports errors clearly, so whenever real implementation does happen later, it's built on solid ground.

## Output
Produce `docs/phase-7/MEDIA-HARDENING-REPORT.md` — what was fixed, test results (before/after coverage numbers, worker coverage specifically), and confirm via the standing Definition of Done (commit, push, PR, CI green, reported explicitly).
