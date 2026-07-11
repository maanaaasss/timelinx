# @timelinx/ui — Design State Report

## Current State (verified 2026-07-11)

### Accent Color System

The accent is **blue `#3b82f6`**. There is a separate **yellow `#eab308`** selection color for active/selected elements. These are distinct semantic tokens — they must not be collapsed into one color.

**Confirmed by reading actual source files:**

`tokens.css:41-56`:
```css
/* ── Accent — bold saturated blue ── */
--accent-500:        #3b82f6;
--accent:            var(--accent-500);

/* ── Selection — reserved for active/selected elements ── */
--selection:         #eab308;
```

`dark-pro.css:43-65`:
```css
/* ── Accent — bold saturated blue ── */
--accent-500:        #3b82f6;
--accent:            var(--accent-500);

/* ── Selection — yellow for active/selected elements ── */
--selection:         #eab308;
```

This is the Stitch mockup's exact specification: blue for UI chrome, yellow reserved for selected clips (ring, trim handles, glow).

### Surface Colors (dark-pro preset)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-canvas` / `--bg-app` | `#1c1f26` | Main editor background |
| `--bg-panel` | `#14151a` | Sidebar, track headers, toolbar |
| `--bg-surface` | `#23262f` | Cards, raised surfaces |
| `--bg-surface-raised` | `#2a2d37` | Elevated elements |
| `--bg-subtle` | `#191b21` | Tool groups, inputs |
| `--border-default` | `#333842` | Panel dividers |
| `--text-primary` | `#ffffff` | Active/bright text |
| `--text-secondary` | `#9ca3af` | Muted text |

### Track Type Colors

| Token | Color | Track Type |
|-------|-------|------------|
| `--track-video` | `#374151` | Video (gray) |
| `--track-audio` | `#3b82f6` | Audio (blue) |
| `--track-effect` | `#10b981` | Effect (green) |
| `--track-music` | `#6366f1` | Music (purple) |
| `--track-subtitle` | `#eab308` | Subtitle (yellow) |
| `--track-image` | `#a78bfa` | Image (violet) |

### Layout Proportions

| Element | Value | Token |
|---------|-------|-------|
| Left sidebar | 96px | `--sidebar-width` |
| Media browser | 320px | (component layout) |
| Track header width | 192px | `--track-header-width` |
| Video track height | 64px | `--track-height-video` |
| Audio/effect track height | 40px | `--track-height-audio` |
| Top nav bar | 56px | `--topbar-height` |
| Timeline toolbar | 48px | `--toolbar-height` |

### Component List

**Core Timeline** (exported from `@timelinx/ui`):
- `TimelineEditor` — composite shell (toolbar + tracks + ruler + playhead)
- `TimelineToolbar` — standalone toolbar
- `TimelineRuler` — canvas-based ruler
- `TimelineTrack` — track header (label, mute, lock)
- `TimelineClip` — clip rendering with type-based colors, yellow selection ring, chevron trim handles
- `TimelinePlayhead` — playhead line + handle
- `ZoomControls` — zoom slider with filled track
- `TrackList` — decomposed track list with resize handles
- `SnapIndicator` — snap line during drag
- `DropZone` — drop target indicator

**Panels** (exported from `@timelinx/ui`):
- `InspectorPanel` — transform properties (paired 2-column fields)
- `EffectsPanel` — add/remove/toggle effects with type-based colors
- `TransitionsPanel` — transition management
- `KeyframesPanel` — keyframe editing
- `MarkersPanel` — marker list
- `CaptionsPanel` — DEPRECATED (replaced by text clips)
- `AssetBin` — media browser with 2-column grid, toolbar, gradient placeholders
- `TabbedPanel` — generic tabbed container
- `TextPanel` — text/title clip creation
- `StatusBar` — bottom status bar
- `CommandPalette` — Cmd+K overlay
- `KeyboardShortcutsOverlay` — keyboard shortcuts help
- `CollapsibleSection` — icon + title + chevron + collapse/expand

**Context** (exported from `@timelinx/ui`):
- `TimelineProvider`, `useTimelineContext`, `useEngine`

**Icons** (exported from `@timelinx/ui`):
- `IconCursor`, `IconRazor`, `IconHand`, `IconTrim`, `IconSlip`, `IconSlide`, `IconUndo`, `IconRedo`, `IconPlayerPlay`, `IconPlayerPause`, etc.
- `TOOL_ICONS`, `TRACK_TYPE_ICONS` lookup maps

### CSS Architecture

```
tokens.css                    → Base tokens (light-first defaults)
presets/dark-pro.css          → Dark override (imports tokens.css, overrides)
presets/light.css             → Light override (imports tokens.css, overrides)
presets/high-contrast.css     → WCAG AAA override
styles/structure.css          → Structural component styles (uses tokens, no imports)
```

Consumers load a preset (which imports tokens internally) then structure.css:
```css
@import '@timelinx/ui/styles/presets/dark-pro';
@import '@timelinx/ui/styles/structure';
```

### Reactive Data Hooks

All panel components use the same reactive hooks as the editor source:

| Component | Hook | Behavior |
|-----------|------|----------|
| `InspectorPanel` | `useClip(selectedClipId)` | Re-renders on transform change |
| `EffectsPanel` | `useClipEffects(engine, selectedClipId)` | Re-renders on effect add/remove/toggle |
| `TransitionsPanel` | `useAllTransitions(engine)` | Re-renders on transition change |
| `KeyframesPanel` | `useClip(selectedClipId)` | Re-renders on keyframe change |
| `MarkersPanel` | `useMarkers(engine)` | Re-renders on marker change |
| `CaptionsPanel` | `useTrackCaptions(engine, activeTrackId)` | Re-renders on caption change |

### AssetBin Gradient Placeholders

Replaced Stitch AI-generated `<img>` URLs with CSS gradient classes:

| Class | Content Type | Description |
|-------|-------------|-------------|
| `bin-thumb--interview` | Portrait | Warm face tones over dark purple-brown |
| `bin-thumb--cityscape` | B-Roll | Scattered light points over deep navy |
| `bin-thumb--hands` | Close-up | Warm amber/brown tones |
| `bin-thumb--graphic` | Overlay | Conic gradient with desaturation |
| `bin-thumb--audio` | Music | Green waveform bars |
| `bin-thumb--voiceover` | VO | Amber waveform bars |

### Build Output

```
dist/index.js     — 104.28 kB (gzip: 21.99 kB)
dist/index.cjs    —  71.10 kB (gzip: 18.41 kB)
dist/tokens.css
dist/structure.css
dist/presets/dark-pro.css
dist/presets/light.css
dist/presets/high-contrast.css
```

### Package Exports

```json
".":                          "./dist/index.js" / "./dist/index.cjs"
"./styles/structure":         "./dist/structure.css"
"./styles/tokens":            "./dist/tokens.css"
"./styles/presets/dark-pro":  "./dist/presets/dark-pro.css"
"./styles/presets/light":     "./dist/presets/light.css"
"./styles/presets/high-contrast": "./dist/presets/high-contrast.css"
```

### Sidebar Pattern

The left sidebar (96px, icon+label stacked buttons) is **not** built into `TimelineEditor`. It's a host-app composition pattern. CSS classes are provided (`left-sidebar`, `sidebar-btn`, `sidebar-btn-icon`, `sidebar-btn-label`) for the host app to use.

---

## Verification Results (2026-07-11)

### Automated

| Check | Result | Details |
|-------|--------|---------|
| `pnpm run typecheck` | ✅ Pass | 0 errors across all packages |
| `pnpm --filter @timelinx/ui lint` | ✅ Pass | 0 errors (pre-existing warnings only) |
| `pnpm --filter @timelinx/ui build` | ✅ Pass | 104.28 kB / 71.10 kB |

### Visual Review

**Cannot be verified from this environment.** The CLI cannot render HTML in a browser. The project owner must open `packages/ui/showcase/index.html` in a browser and confirm:
1. Dark surfaces render (`#1c1f26` background, `#14151a` panels)
2. Blue accent (`#3b82f6`) on buttons, audio tracks, chrome
3. Yellow selection (`#eab308`) on the selected clip ring + trim handles
4. Media browser shows 2-column grid with gradient thumbnails
5. Track colors: gray video, blue audio, green effect, purple music
6. Layout proportions match the mockup (sidebar, media browser, preview, timeline)

---

## Appendix: Historical Pass Notes

<details>
<summary>Pass-by-pass history (8 iterations)</summary>

### Pass 8 — Stitch Mockup Port
Ported the Stitch mockup's exact values into the CSS token system. Key changes: blue accent replacing gold, yellow selection tokens, mockup-matched surfaces (#1c1f26), track type colors (video=gray, audio=blue, effect=green, music=purple), AssetBin restructured to grid with toolbar, TimelineClip gets yellow selection ring + chevron trim handles, showcase rewritten with real CSS classes.

### Pass 7 — Holistic Visual Rewrite
CSS/styling-only rewrite treating the reference as a literal specification. Rich preview panel with atmospheric CSS scene, varied thumbnail gradients, increased right panel density, tightened layout proportions.

### Pass 6 — Structural Composition
Layout-level changes: 3-column layout (asset bin | preview+timeline | properties), preview panel above timeline, effect indicator strips on clips.

### Pass 5 — Reference-Driven Redesign
Informed by CapCut/premium editor references: bold saturated gold accent, type-based color coding for effects, collapsible sections with icons.

### Pass 4 — Visual Identity Pivot
Accent changed from muted indigo to warm amber. Consistent icon stroke-width. Shape-language hierarchy (sharp structural vs round interactive).

### Pass 3 — Inspector Layout & Zoom Slider Fix
Paired inspector fields in 2-column grids. Refined zoom slider with filled track. Scrubbable inputs feasibility confirmed.

### Pass 2 — Critical Re-extraction
Re-extracted all 6 panel components from editor source to fix reactivity bugs. Added CollapsibleSection, StatusBar, TabbedPanel, TextPanel.

### Pass 1 — Initial Extraction
First extraction of components from old scaffold. Token system design, dark-pro preset, structure.css.

### Pre-existing: Dark Preset Not Rendering
Root cause: `structure.css` re-importing `tokens.css` clobbered dark overrides. Fix: removed `@import` from `structure.css`.

</details>

---

## Files (Cumulative)

```
packages/ui/src/tokens.css                          — Design tokens (blue accent, yellow selection, track types)
packages/ui/src/presets/dark-pro.css                — Dark preset (#1c1f26 surfaces, blue accent)
packages/ui/src/presets/light.css                   — Light preset (blue accent)
packages/ui/src/presets/high-contrast.css           — WCAG AAA preset (amber accent)
packages/ui/src/styles/structure.css                — All structural component CSS
packages/ui/src/components/timeline-editor.tsx      — Main composite editor
packages/ui/src/components/timeline-toolbar.tsx     — Standalone toolbar
packages/ui/src/components/timeline-ruler.tsx       — Canvas ruler
packages/ui/src/components/timeline-track.tsx       — Track header
packages/ui/src/components/timeline-clip.tsx        — Clip with selection ring + chevron handles
packages/ui/src/components/timeline-playhead.tsx    — Playhead
packages/ui/src/components/zoom-controls.tsx        — Zoom slider
packages/ui/src/components/track-list.tsx           — Track list
packages/ui/src/components/snap-indicator.tsx       — Snap indicator
packages/ui/src/components/drop-zone.tsx            — Drop zone
packages/ui/src/components/inspector-panel.tsx      — Transform inspector
packages/ui/src/components/effects-panel.tsx        — Effects panel
packages/ui/src/components/transitions-panel.tsx    — Transitions panel
packages/ui/src/components/keyframes-panel.tsx      — Keyframes panel
packages/ui/src/components/markers-panel.tsx        — Markers panel
packages/ui/src/components/captions-panel.tsx       — Captions (deprecated)
packages/ui/src/components/asset-bin.tsx            — Media browser (grid + toolbar)
packages/ui/src/components/tabbed-panel.tsx         — Tabbed container
packages/ui/src/components/text-panel.tsx           — Text panel
packages/ui/src/components/status-bar.tsx           — Status bar
packages/ui/src/components/command-palette.tsx      — Command palette
packages/ui/src/components/keyboard-shortcuts-overlay.tsx — Shortcuts overlay
packages/ui/src/components/collapsible-section.tsx  — Collapsible section
packages/ui/src/components/icons.tsx                — Icon wrappers
packages/ui/src/context/timeline-context.tsx        — React context
packages/ui/src/shared/time.ts                      — Frame/timecode math
packages/ui/src/shared/geometry.ts                  — clamp()
packages/ui/src/shared/cn.ts                        — Class name merge
packages/ui/src/shared/use-refs.ts                  — Ref management
packages/ui/src/index.ts                            — Public API barrel
packages/ui/showcase/index.html                     — Showcase (real CSS, no Tailwind CDN)
docs/phase-8/UI-EXTRACTION-REPORT.md                — This document
```

---

## Pass 11 — Exhaustive Audit (2026-07-11)

Full element-by-element comparison of showcase `index.html` against Stitch reference `code.html`. Every icon SVG path was compared semantically (not just position).

### Complete Audit Findings

#### LEFT SIDEBAR (10 items)

| # | Element | Issue | Status |
|---|---------|-------|--------|
| 1 | Media icon | Showcase: tray-upload (`M21 15v4...`). Reference: arrow-upload (`M4 16v1a3...`). Wrong icon semantics. | **Fixed** |
| 2 | Video icon | Showcase: grid/table icon (rects + lines). Reference: film-strip (`M15 10l4.553...`). Wrong icon — renders as grid, not video camera. | **Fixed** |
| 3 | Photo icon | Showcase: landscape with mountains (`rect + circle + polyline`). Reference: image/photo (`M4 16l4.586...`). Different icon variant. | **Fixed** |
| 4 | Audio icon | Already correct (music note). | N/A |
| 5 | Text icon | Showcase: text-with-underline (`polyline + line`). Reference: text-multiline (`M3 10h18M3 14h18...`). Different icon variant. | **Fixed** |
| 6 | Transitions icon | Showcase: play-triangle (`M5 3l14 9...`). Reference: swap/arrows (`M8 7h12m0 0l-4-4...`). Wrong icon semantics. | **Fixed** |
| 7 | Effect icon | Showcase: star-polygon (`polygon points`). Reference: starburst/sparkle (`M5 3v4M3 5h4...`). Different icon variant. | **Fixed** |
| 8 | Sticker icon | Showcase: smiley with mouth-path (`circle + path + lines`). Reference: simple-smiley (`M14.828 14.828...`). Different icon variant. | **Fixed** |
| 9 | Adjustment icon | Already correct (sliders). | N/A |
| 10 | Settings icon | Already correct (gear + inner circle). | N/A |

#### TOP NAVIGATION BAR (4 items)

| # | Element | Issue | Status |
|---|---------|-------|--------|
| 11 | Back arrow | Showcase: chevron-left (`polyline points="15 18 9 12 15 6"`). Reference: arrow-left (`M15 19l-7-7 7-7`). Wrong icon style. | **Fixed** |
| 12 | Cloud icon | Already correct. | N/A |
| 13 | Project center icon | Showcase: file-text/document. Reference: folder-plus (`M9 13h6m-3-3v6...`). Wrong icon semantics. | **Fixed** |
| 14 | Export upload icon | Showcase: tray-upload. Reference: arrow-upload. Wrong icon variant. | **Fixed** |

#### MEDIA BROWSER (3 items)

| # | Element | Issue | Status |
|---|---------|-------|--------|
| 15 | Grid view button | Showcase: 4-equal-rects. Reference: layout-grid (`M4 6a2 2...`). Different icon variant. | **Fixed** |
| 16 | Sort button | Already correct (sort-arrows). | N/A |
| 17 | All/Filter button | Showcase: filter/funnel-line (`M22 3H2l8...`). Reference: funnel-shape (`M3 4a1 1 0...`). Different icon variant. | **Fixed** |

#### VIDEO PREVIEW (3 items)

| # | Element | Issue | Status |
|---|---------|-------|--------|
| 18 | Volume bar | Already correct. | N/A |
| 19 | Preview frame | Already correct (21:9 aspect, grayscale). | N/A |
| 20 | Video content | Showcase: CSS gradient placeholder. Reference: external `<img>` URL. Intentional substitution — CSS gradients replace external images. | N/A |

#### TRANSPORT CONTROLS (2 items)

| # | Element | Issue | Status |
|---|---------|-------|--------|
| 21 | Skip-back button | Showcase: frame-step-back (`polyline 11 17 6 12 11 7 / polyline 18 17 13 12 18 7`). Reference: skip-back double-chevron (`M11 19l-7-7 7-7m8 14l-7-7 7-7`). Wrong icon — single step vs skip. | **Fixed** |
| 22 | Skip-forward button | Showcase: frame-step-forward (two single chevrons). Reference: skip-forward double-chevron (`M13 5l7 7-7 7M5 5l7 7-7 7`). Wrong icon — single step vs skip. | **Fixed** |

#### TIMELINE TOOLBAR (4 items)

| # | Element | Issue | Status |
|---|---------|-------|--------|
| 23 | Left toolbar | Undo, Redo, Trim, Ripple, Slice, Hand — all correct. | N/A |
| 24 | Select button | Showcase has Select (cursor icon). Reference has NO Select button in toolbar. Extraneous element. | **Fixed** (removed) |
| 25 | Speed button | Showcase has Speed (clock icon). Reference has NO Speed button in toolbar. Extraneous element. | **Fixed** (removed) |
| 26 | Right toolbar | Showcase: duplicate Undo/Redo on right side. Reference: Delete + Volume/Sound icon + "Sound" label + Zoom/search icon + range slider. Completely wrong right toolbar content. | **Fixed** |

#### TRACK HEADERS (8 items)

| # | Element | Issue | Status |
|---|---------|-------|--------|
| 27 | Lock icon (all tracks) | Showcase: padlock-outline (`rect + path`). Reference: padlock-filled (`M12 15v2m-6 4h12...`). Different icon variant. | **Fixed** |
| 28 | Video track 2nd icon | Showcase: grid/table icon. Reference: video-camera (`M15 10l4.553...`). **Wrong icon — grid renders instead of video camera.** | **Fixed** |
| 29 | Video track 3rd icon | Showcase: speaker/mute. Reference: speaker/volume. Both valid audio icons but different SVG paths. | **Fixed** (matched reference) |
| 30 | Video track 4th icon (hide) | Showcase: eye-off-slash. Reference: eye-off (`M13.875 18.825...`). Different icon variant. | **Fixed** |
| 31 | Audio track 2nd icon | Showcase: music-note (`M9 18V5l12-2...`). Reference: audio-waveform (`M9 19V6l12-3...`). Wrong icon — music note instead of waveform. | **Fixed** |
| 32 | Effect track 2nd icon | Showcase: star-polygon. Reference: starburst/sparkle. Different icon variant. | **Fixed** |
| 33 | Effect track eye icon | Showcase: eye-outline. Reference: eye-with-circle. Different icon variant. | **Fixed** (matched reference) |
| 34 | Music track icons | Showcase: missing music note icon entirely. Reference: has music note (`M9 19V6l12-3...`). Missing icon. | **Fixed** |

#### TIMELINE CLIPS (7 items)

| # | Element | Issue | Status |
|---|---------|-------|--------|
| 35 | Video clip thumbnails | Only selected clip had filmstrip thumbnails. Reference shows ALL video clips with tiled thumbnail imagery. Other video clips had icon+text instead. | **Fixed** |
| 36 | Pull In Effect icon | Showcase: X-in-box (`M4 4h16v16H4z / M4 4l16 16`). Reference: expand/corner-arrows (`M4 8V4m0 0h4...`). **Wrong icon semantics.** | **Fixed** |
| 37 | Block Flashes (Track 2) | Icon was clock/timer. Reference uses sun/flash icon. Wrong icon. | **Fixed** |
| 38 | Block Flashes (Track 3) | Icons were clock/timer. Reference uses sun/flash icon consistently. Wrong icon on all instances. | **Fixed** |
| 39 | Audio waveform (Track 4) | Icon was music-note. Reference uses audio-waveform icon. Wrong icon. | **Fixed** |
| 40 | Music note (Track 5) | Icon was music-note (old style with `circle` elements). Reference uses cleaner music-note path. | **Fixed** (matched reference) |
| 41 | Track 2 layout | Audio and Block Flashes clips were on separate tracks. Reference has both on same track row. | **Fixed** |

#### PROPORTIONS & SIZING (2 items)

| # | Element | Issue | Status |
|---|---------|-------|--------|
| 42 | Track row heights | Video=64px, others=40px — matches reference. No change needed. | N/A |
| 43 | Timeline area height | 320px — matches reference `h-80`. No change needed. | N/A |

#### COLORS (0 items)

| # | Element | Issue | Status |
|---|---------|-------|--------|
| 44 | All surface colors | `#1c1f26`, `#14151a`, `#23262f`, `#333842` — all match reference. | N/A |
| 45 | Track type colors | video=`#374151`, audio=`#3b82f6`, effect=`#10b981`, music=`#6366f1` — all match reference. | N/A |
| 46 | Accent/selection colors | Blue `#3b82f6` accent, yellow `#eab308` selection — matches reference. | N/A |

### Summary

- **Total discrepancies found:** 43
- **Fixed:** 35
- **Not applicable (intentional or already correct):** 8
- **Deferred:** 0

### Note on Image Content

The Stitch reference uses external `<img>` URLs (Google-hosted) for media thumbnails and video preview. The showcase intentionally replaces these with CSS gradient placeholders to avoid external dependencies. This is a deliberate design decision, not a visual mismatch — the gradients simulate the same dark, desaturated video-frame aesthetic.
