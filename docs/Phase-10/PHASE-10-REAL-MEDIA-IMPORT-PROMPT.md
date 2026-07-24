Start Phase 10 (real media import) scoped narrowly: real file import with real metadata, and a simple, low-risk preview approach — not WebCodecs yet. That's deliberately saved for Phase 11 (export), where it's actually required.

## 1. Real file import flow

1. Build a real "Upload" action in the editor's Media/Asset panel — a file picker (`<input type="file">`) and drag-and-drop onto the panel, accepting video/audio/image files.
2. When a file is selected/dropped, read it (via `File`/`URL.createObjectURL`), extract real metadata:
   - Video: use a hidden `<video>` element, load the file, read `duration`, `videoWidth`, `videoHeight` from its `loadedmetadata` event
   - Audio: use `decodeAudioData` (already partially wired per `webaudio-waveform.ts`) to get real duration
   - Images: read natural dimensions via `Image.onload`
3. Register the file as a real `Asset` in `core`'s `AssetRegistry` with this real metadata (duration, dimensions) — replacing the current hardcoded sample assets entirely for anything the user actually imports.
4. Handle realistic failure cases: unsupported file type, corrupt file (metadata never loads), zero-duration file — with clear, real error messages, not silent failure.

## 2. Real thumbnails (simple approach, not WebCodecs)

For video: use the same hidden `<video>` element, seek to a representative timestamp (e.g., 10% into the clip), draw the current frame to a `<canvas>` via `drawImage`, and use that as the thumbnail. This is simpler and more broadly supported than WebCodecs-based extraction — no need to touch the existing placeholder `WebCodecsDecoderAdapter`/`ThumbnailExtractorAdapter` for this step; a straightforward video-element approach is fine for now and can be optimized later if performance demands it.

For audio: real waveform generation using the existing `WebAudioWaveformAdapter` (already has real `decodeAudioData` logic per the Phase-7 hardening pass) — confirm this is fully wired to real imported files, not just placeholder-driven.

For images: the image itself, scaled down, is the thumbnail — no decode needed.

## 3. Real preview/scrubbing (video-element based, not WebCodecs)

1. When a video clip is under the playhead, render a real `<video>` element (or a pool of them, reused across clips) with its `currentTime` bound to the playhead's position within that clip.
2. Scrubbing the playhead should update `currentTime` and show the real corresponding frame.
3. This does not need to be frame-perfect or support real-time compositing of multiple layers yet — a single clip's real video showing correctly when it's the only/topmost visible layer is the right scope for this round. Multi-layer real-time compositing is a harder problem that can wait.

## 4. Explicitly out of scope for this round
- WebCodecs decode (saved for Phase 11's export pipeline)
- Real export/rendering
- Multi-layer real-time preview compositing (effects, transitions, transforms affecting the live preview)

## Verification
Real browser test, the same standard as everything else: import an actual video file you own, confirm real duration/thumbnail/dimensions appear, confirm scrubbing shows real video frames. State plainly what you could/couldn't verify from this environment vs. what needs the project owner's own test.

## Output
Produce `docs/phase-10/REAL-MEDIA-IMPORT-REPORT.md` covering what was built, real test results, and any gaps found.
