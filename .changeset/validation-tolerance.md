---
"@timelinx/core": patch
---

Relax `validateClip` duration-mismatch check from exact equality (`timelineDuration !== mediaDuration`) to ±0.5 frame tolerance (`Math.abs(timelineDuration - mediaDuration) > 0.5`).

**Origin:** This change arrived in a large mixed commit (`4aa7828`) alongside unrelated feature work. No focused rationale was recorded at the time, and no test was added for the 0.5 boundary. The existing DURATION_MISMATCH tests (systems-validation, hostile-consumer, invariants/global) all use 50–70 frame mismatches, so they pass identically under both the strict and relaxed checks — they don't exercise the boundary.

**What the strict check caught:** The exact-equality check was a Phase 1 safety invariant that survived adversarial chaos-engineering. It catches real duration corruption: a clip whose media-out doesn't match its timeline span, which would cause playback to desync from the timeline.

**Risk assessment:** The tolerance could let a real 0.3-frame mismatch slip through as a false negative. However, such a mismatch is below perceptual threshold at any practical FPS (< 17ms at 30fps). The more likely source of sub-frame drift is floating-point arithmetic in frame-rate conversions, which the strict check would incorrectly reject. No existing test asserts the strict boundary, and the fuzz/hostile suites don't exercise sub-frame mismatches specifically.

**Recommendation:** If this relaxation stays, add a boundary test that creates clips with 0.4-frame and 0.6-frame mismatches and asserts the correct accept/reject behavior. If the original strict check was intentional and the relaxation was accidental, revert it.
