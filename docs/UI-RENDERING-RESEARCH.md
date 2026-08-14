# UI Design System & Canvas Engine — Research

**Date:** August 2026  
**Project:** TimeLinX — Frame-accurate video timeline editor  
**Goal:** Lean, efficient UI package with zero unnecessary dependencies

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [UI Layer Decision](#2-ui-layer-decision)
3. [Canvas Layer Decision](#3-canvas-layer-decision)
4. [State & Data Flow](#4-state--data-flow)
5. [Accessibility & Input](#5-accessibility--input)
6. [Testing Plan](#6-testing-plan)
7. [Bundle & Performance Budget](#7-bundle--performance-budget)
8. [Risk Register](#8-risk-register)

---

## 1. Executive Summary

### Decision

- **UI components:** Build from scratch. Zero external UI dependencies.
- **Canvas compositor:** Keep existing Canvas2D (already optimized).
- **Canvas editor:** Custom `CanvasEditor` abstraction (~900 lines), not Konva.
- **One exception:** `@radix-ui/react-popover` (~4KB) for color picker positioning.

### Cost

| Metric             | Estimate                                 |
| ------------------ | ---------------------------------------- |
| New UI components  | ~1,400–1,800 lines (production-hardened) |
| CanvasEditor       | ~800–1,000 lines                         |
| Testing            | ~400–600 lines                           |
| **Total new code** | **~2,600–3,400 lines**                   |
| Bundle impact      | ~155KB total (`@timelinx/ui`)            |
| New npm deps       | 1 (`@radix-ui/react-popover`)            |

### Key Risks

- Maintenance burden for input handling (pointer capture, touch, high-DPI)
- Positioning bugs in DIY popovers (viewport edge collisions)
- Accessibility gaps if deferred
- CanvasEditor coordinate math complexity (rotation + anchor points)

---

## 2. UI Layer Decision

### 2.1 What You Already Have

| Asset                                          | Status      | Coverage                             |
| ---------------------------------------------- | ----------- | ------------------------------------ |
| `tokens.css` — 250+ CSS custom properties      | ✅ Complete | Colors, spacing, typography, shadows |
| `structure.css` — 2460 lines                   | ✅ Complete | All timeline component styles        |
| Theme presets (dark-pro, light, high-contrast) | ✅ Complete | Theme switching                      |
| 34 React components                            | ✅ Complete | Timeline-specific                    |
| `CollapsibleSection`                           | ✅ Exists   | Generic, reusable                    |
| `ToolButton`                                   | ✅ Exists   | 30×30px, active/hover states         |
| `ZoomSlider`                                   | ✅ Exists   | Custom range input                   |
| `cn()` utility                                 | ✅ Exists   | Class name merge                     |

### 2.2 What You Need to Build

Element-by-element from the Paper/Figma-style inspector screenshot:

| Component                  | Where Used                                            | Naive Est. | Production Est. | Key Complexity                                                                       |
| -------------------------- | ----------------------------------------------------- | ---------- | --------------- | ------------------------------------------------------------------------------------ |
| **NumberScrubber**         | X, Y, W, H, rotation, opacity, shadow (~20 instances) | ~250       | **~400**        | Pointer capture, non-linear acceleration, frame stepping, undo grouping, touch input |
| **SegmentedControl**       | Solid/Gradient/Image fill tabs                        | ~120       | **~180**        | Arrow key nav, `role="radiogroup"`, disabled states                                  |
| **ColorSwatchInput**       | Fill, Outline, Border, Shadow colors                  | ~180       | **~250**        | Color space math, popover positioning (use Radix), focus trapping                    |
| **CompactSelect**          | Blend mode, border style, filter type                 | ~100       | **~140**        | Keyboard nav, search filtering, portal rendering                                     |
| **MultiFieldRow**          | Shadow (X Y ⬡ ⊡), Outline (width offset)              | ~80        | **~100**        | Flex layout, label alignment                                                         |
| **KeyboardBadge**          | ⌘L, ⇧A, ⌥C                                            | ~25        | **~30**         | Pure display                                                                         |
| **VisibilityToggle**       | Eye icon per section                                  | ~20        | **~25**         | Simple toggle                                                                        |
| **InspectorRow**           | Generic row layout                                    | ~40        | **~50**         | Flex container                                                                       |
| **CompactCheckbox**        | Clip content ☑                                        | ~30        | **~40**         | Styled checkbox                                                                      |
| **SectionHeader**          | Layout, Radius, Fill headers with +                   | ~50        | **~60**         | Extend CollapsibleSection                                                            |
| **Popover** (color picker) | ColorSwatchInput dropdown                             | —          | **~0 (Radix)**  | Use `@radix-ui/react-popover`                                                        |
| **Tooltip**                | Hover hints on controls                               | ~50        | **~80**         | Positioning, delay, collision                                                        |
| **ContextMenu**            | Right-click on layers/objects                         | ~150       | **~200**        | Keyboard nav, sub-menus, icons                                                       |

**Naive total: ~895 lines → Production total: ~1,400–1,800 lines**

The gap comes from: pointer capture edge cases, touch/pen input, high-DPI cursor drift, undo integration, focus management, popover collision detection, and keyboard navigation across 20+ scrubbers.

### 2.3 NumberScrubber — Detailed Spec (Riskiest Component)

This is the workhorse. 20 instances in the inspector. Every subtle bug multiplies 20×.

**Interaction model:**

```
Drag left/right on label → scrub value
Click input → type exact value
Arrow keys → ±1 (±10 with Shift)
Frame stepping → ±1 frame (±10 with Shift) for timeline values
Tab → next field
Escape → revert to original value
Enter → commit value
```

**Production requirements:**

| Requirement                 | Why                                                                  | Implementation                                                        |
| --------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Pointer capture**         | Scrubbing must continue even if cursor leaves window                 | `setPointerCapture(pointerId)` on pointerdown                         |
| **Non-linear acceleration** | 1px = 1 unit is too slow for large ranges; too fast for small ranges | Accelerate after 100px travel: 1px = 1, then 1px = 10, then 1px = 100 |
| **Frame stepping**          | Timeline values (X, Y, rotation) should step by frame, not pixel     | Shift+Arrow = ±1 frame; Shift+drag = frame-snapped scrubbing          |
| **Undo grouping**           | Don't emit 60 undo actions per second during scrub                   | Batch on `pointerup` — single undo action for entire drag             |
| **Text selection**          | Disable during scrub to prevent accidental text highlight            | `user-select: none` while `isScrubbing`                               |
| **Value validation**        | Reject NaN, clamp to min/max, handle empty string                    | Parse on commit, revert on blur if invalid                            |
| **High-DPI**                | Cursor drift on Retina displays                                      | Use `devicePixelRatio` for delta calculation                          |
| **Touch/pen input**         | Tablet users need scrubbing too                                      | Handle `pointerType === 'touch'` and `pointerType === 'pen'`          |

**Keyboard navigation:**

```
Tab → next NumberScrubber (or next control)
Shift+Tab → previous
ArrowRight/Left → ±1 (±10 with Shift)
Enter → commit, move to next
Escape → revert, stay on field
```

### 2.4 Dependency Exception — Radix Popover

**Decision:** Use `@radix-ui/react-popover` for the color picker dropdown only.

**Why:**

- Color pickers appear near viewport edges, inside scrollable inspectors
- Need collision detection (flip, shift, hide when offscreen)
- Need focus trapping, `Escape` to close, click-outside to dismiss
- DIY positioning in a scrollable, dense inspector is a bug factory
- 4KB gzipped is cheap insurance

**Everything else:** Build yourself. Tooltips (~80 lines), context menus (~200 lines), and simple dropdowns (~140 lines) don't have the same positioning complexity.

---

## 3. Canvas Layer Decision

### 3.1 What the Previewer Needs

| Feature                                | Status       | Implementation                  |
| -------------------------------------- | ------------ | ------------------------------- |
| Video rendering at 1920×1080           | ✅ Existing  | Canvas2D `ctx.drawImage(video)` |
| Image rendering with aspect ratio      | ✅ Existing  | Canvas2D `ctx.drawImage(img)`   |
| Text rendering with word wrap          | ✅ Existing  | Canvas2D `ctx.fillText()`       |
| Multi-layer compositing                | ✅ Existing  | Canvas2D save/restore           |
| Transforms (position, scale, rotation) | ✅ Existing  | Canvas2D translate/rotate/scale |
| Effects (blur, brightness, contrast)   | ✅ Existing  | Canvas2D `ctx.filter`           |
| Per-layer opacity                      | ✅ Existing  | Canvas2D `ctx.globalAlpha`      |
| 60fps playback                         | ✅ Existing  | requestAnimationFrame loop      |
| Selection handles (blue corners)       | ❌ Not built | CanvasEditor                    |
| Dimension badge ("W × H")              | ❌ Not built | CanvasEditor                    |
| Pan/zoom viewport                      | ❌ Not built | CanvasEditor                    |
| Object hit testing                     | ❌ Not built | CanvasEditor                    |
| Drag objects                           | ❌ Not built | CanvasEditor                    |
| Snap indicators                        | ❌ Not built | CanvasEditor                    |

### 3.2 Why Not Konva

| Concern          | Detail                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bundle**       | 52KB gzipped (full), ~15-20KB (minimal core with tree-shaking)                                                                                          |
| **Overhead**     | Two abstraction layers (React → Konva → Canvas). Vanilla canvas is faster.                                                                              |
| **Event gotcha** | All shapes listen to all events by default. Must opt-in to avoid performance hits.                                                                      |
| **Overkill**     | You need ~5 shape types (rect, line, text, image, circle). Konva ships animation system, filters, SVG parsing, free drawing, groups with sub-targeting. |
| **Integration**  | Existing Canvas2D compositor stays untouched with Konva. Two rendering systems coexisting adds complexity.                                              |

**When Konva would make sense:** Dozens of interactive objects, complex grouping, real-time collaboration, rich text on canvas. None of these apply to a video timeline editor.

### 3.3 CanvasEditor Spec

**What it needs:**

```
CanvasEditor class:
  viewport: { x, y, scale }           — pan/zoom state
  objects: SceneObject[]               — objects on canvas
  selectedId: string | null            — current selection

  // Coordinate transforms
  screenToCanvas(sx, sy) → { x, y }   — screen → canvas coords
  canvasToScreen(cx, cy) → { x, y }   — canvas → screen coords
  canvasToObject(cx, cy, obj) → { x, y } — canvas → object-local coords
  objectToCanvas(ox, oy, obj) → { x, y } — object-local → canvas coords

  // Hit testing
  getHandleAtPoint(sx, sy) → HandleType | null  — which handle (if any)
  getObjectAtPoint(sx, sy) → string | null       — which object

  // Interaction
  onPointerDown(e)   — start selection, drag, or resize
  onPointerMove(e)   — update drag/resize
  onPointerUp(e)     — commit action, emit undo

  // Rendering (overlay canvas on top of compositor)
  render()           — draw selection outline, handles, badge, snaps
```

**Revised line estimate:**

| Module                              | Lines    | Notes                                                         |
| ----------------------------------- | -------- | ------------------------------------------------------------- |
| Coordinate transforms (4 functions) | ~120     | Screen↔Canvas↔Object, including rotation around anchor        |
| Hit testing                         | ~80      | Point-in-rect, point-on-handle, z-order priority              |
| Selection rendering                 | ~120     | Blue outline, 8 handles, rotation handle, hover/active states |
| Drag/resize handlers                | ~150     | Pointer capture, delta calculation, undo grouping             |
| Dimension badge                     | ~40      | Position near selection, show "W × H"                         |
| Snap indicators                     | ~60      | Alignment guides, threshold detection                         |
| Cursor management                   | ~30      | `nwse-resize`, `grab`, `default` per handle                   |
| React integration (hook)            | ~80      | `useCanvasEditor` hook, state sync                            |
| Touch/pen support                   | ~50      | Pinch-to-zoom, two-finger pan, large touch targets            |
| **Total**                           | **~730** |                                                               |

**Realistic with polish:** ~800–1,000 lines.

### 3.4 Performance Target

| Metric                            | Target                                |
| --------------------------------- | ------------------------------------- |
| Selection handle drag             | 60fps, < 16ms per frame               |
| Pan/zoom                          | 60fps, smooth inertial scrolling      |
| Hit testing                       | < 1ms for 50 objects                  |
| Full re-render (selection change) | < 5ms                                 |
| Memory                            | No leaks from pointer event listeners |

---

## 4. State & Data Flow

### 4.1 The Synchronization Problem

Inspector and canvas must share a single source of truth:

```
User drags handle on canvas
  ↓
CanvasEditor emits "resize object" action
  ↓
State store updates width/height
  ↓
Inspector NumberScrubbers re-render with new values
  ↓
CanvasEditor re-renders selection outline
```

And the reverse:

```
User types new value in NumberScrubber
  ↓
NumberScrubber emits "set property" action on commit
  ↓
State store updates
  ↓
CanvasEditor re-renders with new dimensions
```

### 4.2 Recommended Pattern

Use the existing engine dispatch pattern (already in `@timelinx/core`):

```typescript
// Inspector commits a value
engine.dispatch({
  id: `set-transform-${Date.now()}`,
  label: 'Set positionX',
  timestamp: Date.now(),
  operations: [
    {
      type: 'SET_CLIP_TRANSFORM',
      clipId,
      transform: {
        ...currentTransform,
        positionX: { ...currentTransform.positionX, value: numValue },
      },
    },
  ],
});

// Canvas emits a resize action (same dispatch path)
engine.dispatch({
  id: `resize-clip-${Date.now()}`,
  label: 'Resize clip',
  timestamp: Date.now(),
  operations: [
    {
      type: 'SET_CLIP_TRANSFORM',
      clipId,
      transform: { ...currentTransform, scaleX: { ...currentTransform.scaleX, value: newScale } },
    },
  ],
});
```

### 4.3 Draft vs. Committed State

| Interaction             | State Type            | Commit Trigger                |
| ----------------------- | --------------------- | ----------------------------- |
| NumberScrubber drag     | Draft (local state)   | `pointerup` → single dispatch |
| NumberScrubber type     | Draft (local state)   | `Enter` or `blur` → dispatch  |
| Canvas handle drag      | Draft (local state)   | `pointerup` → single dispatch |
| SegmentedControl click  | Committed (immediate) | `click` → dispatch            |
| ColorSwatchInput change | Draft (local state)   | Picker close → dispatch       |

### 4.4 Undo/Redo

The engine already has history management. Key rule: **batch during continuous interactions** (scrub, drag). One undo action per gesture, not one per frame.

---

## 5. Accessibility & Input

### 5.1 Keyboard Navigation Map

| Component          | Tab             | Arrow Keys            | Enter          | Escape         | Other           |
| ------------------ | --------------- | --------------------- | -------------- | -------------- | --------------- |
| NumberScrubber     | Next/prev field | ±1 (±10 Shift)        | Commit         | Revert         | —               |
| SegmentedControl   | Next control    | Move between segments | Select segment | —              | —               |
| ColorSwatchInput   | Next control    | —                     | Open picker    | Close picker   | `#` to type hex |
| CompactSelect      | Next control    | Move options          | Select option  | Close dropdown | Type to search  |
| CollapsibleSection | Next control    | —                     | Toggle         | —              | —               |
| VisibilityToggle   | Next control    | —                     | Toggle         | —              | —               |
| ContextMenu        | —               | Move items            | Select item    | Close menu     | Submenu arrow   |

### 5.2 Screen Reader Requirements

| Element            | ARIA                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------ |
| NumberScrubber     | `role="spinbutton"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-label` |
| SegmentedControl   | `role="radiogroup"`, each segment `role="radio"`, `aria-checked`                     |
| CompactSelect      | `role="listbox"`, options `role="option"`, `aria-selected`                           |
| VisibilityToggle   | `role="switch"`, `aria-checked`                                                      |
| CollapsibleSection | `aria-expanded` on trigger, `aria-controls` pointing to content                      |
| Canvas selection   | Live region announcing "Selected: Clip 1, position X: 217, Y: 238"                   |

### 5.3 Focus Management

| Scenario                      | Behavior                               |
| ----------------------------- | -------------------------------------- |
| Popover closes (color picker) | Focus returns to trigger swatch        |
| CollapsibleSection collapses  | Focus stays on header button           |
| ContextMenu closes            | Focus returns to right-clicked element |
| Dialog closes                 | Focus returns to trigger element       |

### 5.4 High Contrast & Reduced Motion

| Feature                  | Implementation                                                                |
| ------------------------ | ----------------------------------------------------------------------------- |
| `forced-colors: active`  | Selection handles use `currentColor` instead of hardcoded blue                |
| `prefers-reduced-motion` | Disable scrubber smooth transitions, snap animation, panel collapse animation |
| `prefers-contrast: more` | Increase border contrast on NumberScrubber, SegmentedControl                  |

---

## 6. Testing Plan

### 6.1 Unit Tests

| Component             | What to Test                                                                                      | Approach                            |
| --------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------- |
| NumberScrubber        | Value mapping (1px → 1 unit), acceleration curve, frame stepping, min/max clamping, NaN rejection | Vitest + Testing Library            |
| SegmentedControl      | Arrow key navigation, `role="radiogroup"` presence, disabled state                                | Vitest + Testing Library            |
| ColorSwatchInput      | Hex validation (#FFF, #FF0000, invalid), opacity clamping (0-100)                                 | Vitest                              |
| CompactSelect         | Keyboard nav, option selection, search filtering                                                  | Vitest + Testing Library            |
| Coordinate transforms | `screenToCanvas`, `canvasToScreen`, `canvasToObject` with rotation                                | Pure math tests (Vitest)            |
| Hit testing           | Point-in-rect, point-on-handle, z-order priority                                                  | Property-based testing (fast-check) |

### 6.2 Integration Tests

| Scenario                                        | What to Verify                                             |
| ----------------------------------------------- | ---------------------------------------------------------- |
| Drag handle → state update → inspector reflects | End-to-end: pointer event → dispatch → re-render           |
| NumberScrubber commit → canvas updates          | Type value → Enter → canvas re-renders with new dimensions |
| Undo/redo after scrub                           | Scrub → pointerup → undo → value reverts                   |
| Multi-field row consistency                     | Change shadow X → all dependent UI updates                 |

### 6.3 Visual Regression

| Target                                              | Method                                     |
| --------------------------------------------------- | ------------------------------------------ |
| Selection handles at various scales                 | Screenshot comparison at 1x, 2x, 0.5x zoom |
| NumberScrubber states (idle, focused, scrubbing)    | Screenshot comparison                      |
| SegmentedControl states (selected, hover, disabled) | Screenshot comparison                      |
| High contrast theme                                 | Screenshot comparison with `forced-colors` |

---

## 7. Bundle & Performance Budget

### 7.1 Bundle Breakdown

| Item                         | Size (gzipped) | Notes                    |
| ---------------------------- | -------------- | ------------------------ |
| `tokens.css`                 | ~8KB           | CSS custom properties    |
| `structure.css`              | ~45KB          | All component styles     |
| New inspector components     | ~22KB          | ~1,400–1,800 lines TSX   |
| CanvasEditor                 | ~12KB          | ~800–1,000 lines TSX     |
| Existing timeline components | ~60KB          | 30 components            |
| `lucide-react`               | ~15KB          | Already installed        |
| `@radix-ui/react-popover`    | ~4KB           | Color picker positioning |
| **Total `@timelinx/ui`**     | **~166KB**     |                          |

### 7.2 Comparison

| Alternative                | Additional Bundle |
| -------------------------- | ----------------- |
| + Konva (minimal core)     | +15-20KB          |
| + Radix (full overlay set) | +11-36KB          |
| + Mantine                  | +45-68KB          |
| + Blueprint                | +85-195KB         |

### 7.3 Performance Targets

| Metric                          | Target        | Measurement                      |
| ------------------------------- | ------------- | -------------------------------- |
| Inspector render (20 scrubbers) | < 16ms        | Chrome DevTools Performance      |
| CanvasEditor full re-render     | < 5ms         | requestAnimationFrame timing     |
| Selection handle drag           | 60fps         | Frame rate monitor               |
| Pan/zoom                        | 60fps, smooth | Visual inspection + frame timing |
| Bundle parse/eval               | < 50ms        | Lighthouse                       |
| First contentful paint          | < 200ms       | Lighthouse                       |

---

## 8. Risk Register

| #   | Risk                                                                                                        | Impact | Likelihood | Mitigation                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------- | ------ | ---------- | ----------------------------------------------------------------------------------- |
| 1   | **NumberScrubber interaction bugs** — pointer capture, value drift, undo spam                               | High   | High       | Detailed spec (§2.3), property-based testing, manual QA on touch/pen                |
| 2   | **Popover positioning in dense inspector** — color picker appears offscreen or behind panels                | Medium | High       | Use Radix Popover for this one case (§2.4)                                          |
| 3   | **CanvasEditor coordinate math errors** — rotation + anchor point transforms produce wrong handle positions | High   | Medium     | Pure math unit tests with known inputs/outputs                                      |
| 4   | **Accessibility audit failure** — missing ARIA, broken keyboard nav, no screen reader support               | High   | Medium     | Spec all ARIA roles (§5.2), test with screen reader, automated axe checks           |
| 5   | **Maintenance burden** — 1,800+ lines of custom input handling with no community fixes                      | Medium | High       | Document all edge cases, comprehensive test suite, code review checklist            |
| 6   | **Touch/pen input gaps** — 8×8px handles unusable on tablet                                                 | Medium | Medium     | Enforce minimum 44×44px touch targets, enlarge handles on `pointerType === 'touch'` |
| 7   | **Performance regression** — 20 NumberScrubbers cause unnecessary re-renders                                | Medium | Low        | Use `React.memo`, `useCallback`, avoid passing new objects/arrays as props          |
| 8   | **Theme consistency** — new components don't match existing NLE aesthetic                                   | Low    | Low        | Use existing `tokens.css` exclusively, no inline colors                             |

---

## Appendix A: NumberScrubber Validation Checklist

Before shipping, verify every item:

- [ ] **Pointer capture:** `setPointerCapture` on pointerdown, works when cursor leaves window
- [ ] **Non-linear acceleration:** 1px = 1 unit for first 100px, then 1px = 10, then 1px = 100
- [ ] **Frame stepping:** Shift+Arrow = ±1 frame, Shift+drag = frame-snapped
- [ ] **Undo grouping:** Single undo action per drag gesture, not per frame
- [ ] **Text selection disabled:** `user-select: none` while scrubbing
- [ ] **Value validation:** NaN rejected, empty string reverted, min/max clamped
- [ ] **High-DPI:** Delta calculation accounts for `devicePixelRatio`
- [ ] **Touch/pen:** Works with `pointerType === 'touch'` and `'pen'`
- [ ] **Keyboard:** Tab, Arrow, Enter, Escape all work correctly
- [ ] **Focus:** Focus ring visible, focus management correct
- [ ] **Screen reader:** `role="spinbutton"`, `aria-valuemin/max/now`, `aria-label`
- [ ] **Reduced motion:** No smooth transitions when `prefers-reduced-motion: reduce`
- [ ] **High contrast:** Visible in `forced-colors: active` mode

## Appendix B: CanvasEditor Transform Functions

```typescript
// Screen → Canvas coordinates (accounts for viewport pan/zoom)
function screenToCanvas(sx: number, sy: number, viewport: Viewport): { x: number; y: number };

// Canvas → Screen coordinates
function canvasToScreen(cx: number, cy: number, viewport: Viewport): { x: number; y: number };

// Canvas → Object-local coordinates (accounts for object position + rotation)
function canvasToObject(cx: number, cy: number, obj: SceneObject): { x: number; y: number };

// Object-local → Canvas coordinates
function objectToCanvas(ox: number, oy: number, obj: SceneObject): { x: number; y: number };

// Hit test: which handle is at this screen point?
function getHandleAtPoint(
  sx: number,
  sy: number,
  obj: SceneObject,
  viewport: Viewport,
): HandleType | null;

// Hit test: which object is at this screen point? (z-order priority)
function getObjectAtPoint(
  sx: number,
  sy: number,
  objects: SceneObject[],
  viewport: Viewport,
): string | null;
```
