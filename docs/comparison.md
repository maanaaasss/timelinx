# Timelinx vs Alternatives

How Timelinx compares to other timeline and video editing libraries.

## TL;DR

**Timelinx is the only open-source, deterministic, headless NLE timeline kernel for the web.**

Other tools are either:
- Simple timeline widgets (drag blocks on rows)
- Full editor SDKs (bundled UI + rendering + AI + export)
- Video generation frameworks (code-driven, not interactive)
- Browser editor apps (not embeddable)

## Comparison Matrix

| Feature | Timelinx | xzdarcy | Twick | CE.SDK | Remotion |
|---------|----------|---------|-------|--------|----------|
| **Architecture** | Headless kernel | React component | Full SDK | Full SDK | Render framework |
| **Immutable state** | ✅ | ❌ | ❌ | ❌ | N/A |
| **Deterministic ops** | ✅ | ❌ | ❌ | ❌ | ✅ (for generation) |
| **Frame-accurate** | ✅ | Partial | ✅ | ✅ | ✅ |
| **40+ edit operations** | ✅ | ~5 | ~10 | ~15 | N/A |
| **12 pro tools** | ✅ | ❌ | ❌ | ❌ | N/A |
| **Undo/redo** | ✅ | ❌ | ✅ | ✅ | N/A |
| **Transaction log** | ✅ | ❌ | ❌ | ❌ | N/A |
| **OTIO/EDL/AAF/FCPXML** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **SRT/VTT import** | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Keyframe lanes** | ✅ | ❌ | ❌ | ✅ | N/A |
| **Effect lanes** | ✅ | ❌ | ✅ | ✅ | N/A |
| **Transitions** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Snap system** | ✅ | ❌ | ❌ | ✅ | N/A |
| **Virtual windowing** | ✅ | ❌ | ❌ | ❌ | N/A |
| **Worker-safe** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Framework-agnostic** | ✅ | React only | React only | React/Vue/etc. | React only |
| **Open source** | MIT | MIT | MIT | Commercial | MIT |
| **Pricing** | Free | Free | Free | $$$$ | Free |

## Detailed Comparisons

### Timelinx vs xzdarcy/react-timeline-editor

**xzdarcy** is a simple React timeline component. Install it, pass rows/actions/effects, get a timeline.

**Why Timelinx is different:**
- xzdarcy helps developers drag blocks on rows. Timelinx owns a professional NLE edit model.
- xzdarcy has no undo/redo, no multi-selection, no frame-accurate rendering.
- xzdarcy's open issues request features Timelinx already has.
- Timelinx provides an upgrade path: start with simple clips, grow into pro editing.

**When to use xzdarcy:** Simple animation timelines, non-editor use cases.
**When to use Timelinx:** Any case where you need real editing capabilities.

### Timelinx vs Twick

**Twick** is an open-source React SDK for timeline-based, AI-powered browser video editors.

**Why Timelinx is different:**
- Twick sells "complete editor SDK." Timelinx is lower-level and more durable.
- Timelinx is the engine behind many editors, not just a bundled editor.
- Twick hardcodes rendering, AI, and export. Timelinx lets you bring your own.
- Timelinx has stronger NLE primitives (40+ ops, 12 tools, transaction log).

**When to use Twick:** You want a batteries-included editor SDK.
**When to use Timelinx:** You need ownership, no lock-in, and custom workflows.

### Timelinx vs CE.SDK (IMG.LY)

**CE.SDK** is a commercial, full-featured creative/video editor SDK.

**Why Timelinx is different:**
- CE.SDK wins enterprise "drop in the full editor" deals.
- Timelinx wins open-source/extensible/kernel deals.
- CE.SDK is proprietary and expensive. Timelinx is MIT-licensed and free.
- Timelinx gives you ownership of the edit state. CE.SDK owns the stack.

**When to use CE.SDK:** Enterprise budget, need full editor UI immediately.
**When to use Timelinx:** Need ownership, no lock-in, custom rendering, self-hosted.

### Timelinx vs Remotion

**Remotion** is React-driven video creation and rendering.

**Why Timelinx is different:**
- Remotion excels at programmatic compositions and template-driven generation.
- Timelinx excels at interactive, frame-accurate NLE editing.
- They are complementary: Timelinx → edit state → Remotion → render.
- Timelinx has a Remotion bridge planned: `timelineState → Remotion Composition`.

**When to use Remotion:** Code-driven video generation, templates, automation.
**When to use Timelinx:** Interactive editing, real-time preview, pro NLE tools.

### Timelinx vs Browser Editor Apps (OpenReel, FreeCut)

**OpenReel/FreeCut** prove that browser-native WebCodecs/WebGPU editors are viable.

**Why Timelinx is different:**
- These are apps, not embeddable state engines.
- Timelinx provides the kernel that could power such apps.
- Timelinx is framework-agnostic and designed for embedding.

**When to use OpenReel/FreeCut:** You want a ready-made browser editor.
**When to use Timelinx:** You want to build your own editor.

## Decision Guide

| Your need | Best choice |
|-----------|-------------|
| Simple drag-and-drop timeline | xzdarcy |
| Complete editor SDK with AI | Twick |
| Enterprise editor with support | CE.SDK |
| Code-driven video generation | Remotion |
| Interactive NLE editing | **Timelinx** |
| Embeddable timeline kernel | **Timelinx** |
| Custom editor with ownership | **Timelinx** |
| Frame-accurate state engine | **Timelinx** |

## Why Timelinx Wins

1. **Deterministic state** — Every edit is replayable, inspectable, serializable.
2. **Headless architecture** — Bring your own UI, renderer, storage, AI.
3. **Professional tools** — 12 pro tools that real editors expect.
4. **Interchange formats** — OTIO, EDL, AAF, FCPXML export.
5. **Open source** — MIT licensed, no lock-in, community-driven.
6. **Worker-safe core** — Runs in browsers, Node.js, Web Workers, Electron.
7. **React hooks + optional UI** — Use the full UI or just the primitives.
